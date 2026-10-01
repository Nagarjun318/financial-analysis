import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client as neonClient, isNeonConfigured } from '../services/neonClient';

/**
 * Unified data layer for the groceries feature (two tables: `groceries`
 * inventory + `shopping_list`). Cross-table flows (auto-add on low stock,
 * purchase → inventory) live here so pages never hand-roll them.
 */

export interface GroceryItem {
  id: number;
  user_id: string;
  item_name: string;
  category: string;
  current_stock: number;
  min_stock: number;
  unit: string;
  package_size?: string | null;
  price: number;
  last_purchased_date: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ShoppingListItem {
  id: number;
  user_id: string;
  grocery_id: number | null;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  package_size?: string | null;
  price?: number;
  is_picked?: boolean;
  is_auto_added: boolean;
  created_at?: string;
}

export const GROCERIES_QUERY_KEY = ['groceries'];
export const SHOPPING_LIST_QUERY_KEY = ['shopping_list'];

export const BASE_CATEGORIES = [
  'Dairy',
  'Produce',
  'Meat',
  'Bakery',
  'Pantry',
  'Beverages',
  'Frozen',
  'Snacks',
  'Household',
  'Personal Care',
  'Stationery',
  'General',
];

export interface NewGroceryInput {
  item_name: string;
  category: string;
  current_stock: number;
  min_stock: number;
  unit: string;
  package_size?: string | null;
  price: number;
  last_purchased_date?: string | null;
}

export interface NewShoppingRow {
  grocery_id: number | null;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  package_size?: string | null;
  price?: number;
  is_auto_added: boolean;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function useGroceries(userId: string | undefined) {
  const queryClient = useQueryClient();
  const enabled = Boolean(userId) && isNeonConfigured;

  const itemsQuery = useQuery({
    queryKey: [...GROCERIES_QUERY_KEY, userId],
    enabled,
    queryFn: async (): Promise<GroceryItem[]> => {
      if (!userId) return [];
      const { data, error } = await (neonClient as any)
        .from('groceries')
        .select('*')
        .eq('user_id', userId)
        .order('category', { ascending: true })
        .order('item_name', { ascending: true });
      if (error) throw error;
      return (data || []) as GroceryItem[];
    },
  });

  const shoppingQuery = useQuery({
    queryKey: [...SHOPPING_LIST_QUERY_KEY, userId],
    enabled,
    queryFn: async (): Promise<ShoppingListItem[]> => {
      if (!userId) return [];
      const { data, error } = await (neonClient as any)
        .from('shopping_list')
        .select('*')
        .eq('user_id', userId)
        .order('is_picked', { ascending: true })
        .order('category', { ascending: true })
        .order('item_name', { ascending: true });
      if (error) throw error;
      return (data || []) as ShoppingListItem[];
    },
  });

  const invalidateAll = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: GROCERIES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_QUERY_KEY }),
    ]);

  const cachedItems = (): GroceryItem[] =>
    queryClient.getQueryData<GroceryItem[]>([...GROCERIES_QUERY_KEY, userId]) ?? [];
  const cachedShopping = (): ShoppingListItem[] =>
    queryClient.getQueryData<ShoppingListItem[]>([...SHOPPING_LIST_QUERY_KEY, userId]) ?? [];

  const requireUser = () => {
    if (!userId) throw new Error('Missing user id');
  };

  // --- Inventory mutations ---------------------------------------------------

  const addItemMutation = useMutation({
    mutationFn: async (input: NewGroceryInput): Promise<GroceryItem> => {
      requireUser();
      const { data, error } = await (neonClient as any)
        .from('groceries')
        .insert([{ ...input, user_id: userId }])
        .select();
      if (error) throw error;
      if (!data?.[0]) throw new Error('Insert returned no row.');
      return data[0] as GroceryItem;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GROCERIES_QUERY_KEY }),
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<GroceryItem> }) => {
      requireUser();
      const { error } = await (neonClient as any)
        .from('groceries')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GROCERIES_QUERY_KEY }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      requireUser();
      const { error } = await (neonClient as any).from('groceries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GROCERIES_QUERY_KEY }),
  });

  // --- Shopping-list mutations -------------------------------------------------

  const addShoppingRowsMutation = useMutation({
    mutationFn: async (rows: NewShoppingRow[]): Promise<ShoppingListItem[]> => {
      requireUser();
      if (rows.length === 0) return [];
      const { data, error } = await (neonClient as any)
        .from('shopping_list')
        .insert(rows.map((r) => ({ ...r, user_id: userId })))
        .select();
      if (error) throw error;
      return (data || []) as ShoppingListItem[];
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_QUERY_KEY }),
  });

  const updateShoppingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<ShoppingListItem> }) => {
      requireUser();
      const { error } = await (neonClient as any)
        .from('shopping_list')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_QUERY_KEY }),
  });

  const deleteShoppingMutation = useMutation({
    mutationFn: async (id: number) => {
      requireUser();
      const { error } = await (neonClient as any).from('shopping_list').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_QUERY_KEY }),
  });

  const setPickedMutation = useMutation({
    mutationFn: async ({ ids, picked }: { ids: number[]; picked: boolean }) => {
      requireUser();
      if (ids.length === 0) return;
      const { error } = await (neonClient as any)
        .from('shopping_list')
        .update({ is_picked: picked })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_QUERY_KEY }),
  });

  // --- Compound flows (read fresh cache, never stale closures) -----------------

  /** Silent auto-add (low stock, new items); skips when already listed. */
  const autoAddToShopping = async (item: GroceryItem, quantity: number): Promise<void> => {
    if (cachedShopping().some((sl) => sl.grocery_id === item.id)) return;
    await addShoppingRowsMutation.mutateAsync([
      {
        grocery_id: item.id,
        item_name: item.item_name,
        category: item.category,
        quantity,
        unit: item.unit,
        package_size: item.package_size ?? null,
        price: item.price ?? 0,
        is_auto_added: true,
      },
    ]);
  };

  /** Manual move with feedback handled by the caller. Returns false when already listed. */
  const moveToShoppingList = async (item: GroceryItem): Promise<boolean> => {
    if (cachedShopping().some((sl) => sl.grocery_id === item.id)) return false;
    await addShoppingRowsMutation.mutateAsync([
      {
        grocery_id: item.id,
        item_name: item.item_name,
        category: item.category,
        quantity: item.min_stock,
        unit: item.unit,
        package_size: item.package_size ?? null,
        price: item.price ?? 0,
        is_auto_added: false,
      },
    ]);
    return true;
  };

  const updateStock = async (id: number, delta: number): Promise<void> => {
    const item = cachedItems().find((i) => i.id === id);
    if (!item) return;
    const newStock = Math.max(0, item.current_stock + delta);
    await updateItemMutation.mutateAsync({ id, updates: { current_stock: newStock } });
    if (newStock < item.min_stock) {
      await autoAddToShopping(item, item.min_stock - newStock);
    }
  };

  /** Purchase one shopping row: restock/create inventory, remove the row. */
  const purchaseItem = async (shoppingItem: ShoppingListItem): Promise<void> => {
    requireUser();
    if (shoppingItem.grocery_id) {
      const inventoryItem = cachedItems().find((i) => i.id === shoppingItem.grocery_id);
      if (inventoryItem) {
        await updateItemMutation.mutateAsync({
          id: inventoryItem.id,
          updates: {
            current_stock: inventoryItem.current_stock + shoppingItem.quantity,
            last_purchased_date: today(),
          },
        });
      }
    } else {
      await addItemMutation.mutateAsync({
        item_name: shoppingItem.item_name,
        category: shoppingItem.category || 'General',
        current_stock: shoppingItem.quantity,
        min_stock: 1,
        unit: shoppingItem.unit || 'units',
        package_size: shoppingItem.package_size ?? null,
        price: shoppingItem.price ?? 0,
        last_purchased_date: today(),
      });
    }
    await deleteShoppingMutation.mutateAsync(shoppingItem.id);
  };

  /** Purchase every picked row. Returns the purchased count. */
  const purchaseAllPicked = async (): Promise<number> => {
    const picked = cachedShopping().filter((i) => i.is_picked);
    for (const row of picked) {
      await purchaseItem(row);
    }
    await invalidateAll();
    return picked.length;
  };

  // --- Derived ---------------------------------------------------------------

  const items = itemsQuery.data ?? [];
  const shoppingList = shoppingQuery.data ?? [];

  const availableCategories = useMemo(() => {
    const unique = new Set(items.map((i) => i.category));
    return [...new Set([...BASE_CATEGORIES, ...unique])].sort();
  }, [items]);

  return {
    items,
    shoppingList,
    isLoading: itemsQuery.isLoading,
    isError: itemsQuery.isError || shoppingQuery.isError,
    availableCategories,
    refetch: () => invalidateAll(),
    addItem: addItemMutation.mutateAsync,
    updateItem: (id: number, updates: Partial<GroceryItem>) =>
      updateItemMutation.mutateAsync({ id, updates }),
    deleteItem: deleteItemMutation.mutateAsync,
    updateStock,
    autoAddToShopping,
    moveToShoppingList,
    addShoppingRows: addShoppingRowsMutation.mutateAsync,
    updateShoppingItem: (id: number, updates: Partial<ShoppingListItem>) =>
      updateShoppingMutation.mutateAsync({ id, updates }),
    togglePicked: (row: ShoppingListItem) =>
      updateShoppingMutation.mutateAsync({ id: row.id, updates: { is_picked: !row.is_picked } }),
    setPicked: (ids: number[], picked: boolean) =>
      setPickedMutation.mutateAsync({ ids, picked }),
    deleteShoppingItem: deleteShoppingMutation.mutateAsync,
    purchaseItem,
    purchaseAllPicked,
  };
}
