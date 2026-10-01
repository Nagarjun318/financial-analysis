// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { createMockClient, type MockClientState } from '../test/mockNeonClient.ts';
import { useGroceries } from './useGroceries.ts';

const { mockModule } = vi.hoisted(() => {
  const state: MockClientState = { tables: {}, singleResult: { data: null, error: null }, calls: [] };
  return { mockModule: { state } };
});

vi.mock('../services/neonClient.ts', () => ({
  client: createMockClient(mockModule.state),
  isNeonConfigured: true,
  authClient: null,
}));

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

const seedItems = [
  { id: 1, user_id: 'u1', item_name: 'Milk', category: 'Dairy', current_stock: 2, min_stock: 1, unit: 'litres', price: 60, last_purchased_date: null },
  { id: 2, user_id: 'u1', item_name: 'Eggs', category: 'Dairy', current_stock: 0, min_stock: 6, unit: 'units', price: 80, last_purchased_date: null },
];

const seedShopping = [
  { id: 11, user_id: 'u1', grocery_id: 2, item_name: 'Eggs', category: 'Dairy', quantity: 6, unit: 'units', is_auto_added: true, is_picked: false },
  { id: 12, user_id: 'u1', grocery_id: null, item_name: 'Bread', category: 'Bakery', quantity: 1, unit: 'units', is_auto_added: false, is_picked: true },
];

beforeEach(() => {
  mockModule.state.tables = {
    groceries: { data: seedItems, error: null },
    shopping_list: { data: seedShopping, error: null },
  };
  mockModule.state.singleResult = { data: seedItems[0], error: null };
  mockModule.state.calls = [];
});

describe('useGroceries', () => {
  it('loads inventory + shopping list and derives categories', async () => {
    const { result } = renderHook(() => useGroceries('u1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(2);
    expect(result.current.shoppingList).toHaveLength(2);
    expect(result.current.availableCategories).toContain('Dairy');
    expect(result.current.availableCategories).toContain('General');
  });

  it('addItem inserts scoped to the user', async () => {
    const { result } = renderHook(() => useGroceries('u1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.addItem({
        item_name: 'Rice',
        category: 'Pantry',
        current_stock: 1,
        min_stock: 1,
        unit: 'kg',
        price: 70,
      });
    });
    const inserts = mockModule.state.calls.filter(
      (c) => c.table === 'groceries' && c.op === 'insert'
    );
    expect(inserts).toHaveLength(1);
    expect(inserts[0].args[0]).toEqual([
      expect.objectContaining({ user_id: 'u1', item_name: 'Rice' }),
    ]);
  });

  it('togglePicked flips is_picked for the row', async () => {
    const { result } = renderHook(() => useGroceries('u1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.togglePicked(result.current.shoppingList[0]);
    });
    const updates = mockModule.state.calls.filter(
      (c) => c.table === 'shopping_list' && c.op === 'update'
    );
    expect(updates).toHaveLength(1);
    expect(updates[0].args[0]).toEqual({ is_picked: true });
  });

  it('purchaseItem for an unlinked row creates inventory and deletes the row', async () => {
    const { result } = renderHook(() => useGroceries('u1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const bread = result.current.shoppingList.find((r) => r.grocery_id === null)!;
    await act(async () => {
      await result.current.purchaseItem(bread);
    });
    const inventoryInserts = mockModule.state.calls.filter(
      (c) => c.table === 'groceries' && c.op === 'insert'
    );
    const shoppingDeletes = mockModule.state.calls.filter(
      (c) => c.table === 'shopping_list' && c.op === 'delete'
    );
    expect(inventoryInserts).toHaveLength(1);
    expect(inventoryInserts[0].args[0]).toEqual([
      expect.objectContaining({ item_name: 'Bread' }),
    ]);
    expect(shoppingDeletes).toHaveLength(1);
  });

  it('autoAddToShopping skips items already listed', async () => {
    const { result } = renderHook(() => useGroceries('u1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.autoAddToShopping(result.current.items[1], 6);
    });
    const inserts = mockModule.state.calls.filter(
      (c) => c.table === 'shopping_list' && c.op === 'insert'
    );
    expect(inserts).toHaveLength(0);
  });
});
