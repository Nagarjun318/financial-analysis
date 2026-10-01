// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { createMockClient, type MockClientState } from '../test/mockNeonClient.ts';
import { useGoals } from './useGoals.ts';

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

const seedGoals = [
  { id: 'g1', user_id: 'u1', name: 'Emergency fund', target: 100000 },
  { id: 'g2', user_id: 'u1', name: 'Japan trip', target: 200000 },
];

beforeEach(() => {
  mockModule.state.tables = { financial_goals: { data: seedGoals, error: null } };
  mockModule.state.singleResult = { data: seedGoals[0], error: null };
  mockModule.state.calls = [];
});

describe('useGoals', () => {
  it('loads goals for the user', async () => {
    const { result } = renderHook(() => useGoals('u1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.goals).toHaveLength(2);
    expect(result.current.goals[0].name).toBe('Emergency fund');
  });

  it('returns empty without a user id and never queries', async () => {
    const { result } = renderHook(() => useGoals(undefined), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.goals).toEqual([]);
    expect(mockModule.state.calls).toEqual([]);
  });

  it('addGoal inserts with the user id', async () => {
    const { result } = renderHook(() => useGoals('u1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.addGoal({ user_id: 'ignored', name: 'New car', target: 500000 } as never);
    });
    const inserts = mockModule.state.calls.filter((c) => c.op === 'insert');
    expect(inserts).toHaveLength(1);
    expect(inserts[0].table).toBe('financial_goals');
  });

  it('deleteGoal deletes by id', async () => {
    const { result } = renderHook(() => useGoals('u1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.deleteGoal('g1');
    });
    const deletes = mockModule.state.calls.filter((c) => c.op === 'delete');
    expect(deletes).toHaveLength(1);
    expect(deletes[0].table).toBe('financial_goals');
  });
});
