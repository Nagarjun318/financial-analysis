import React from 'react';
const { useState, useMemo } = React;
import { Trash2, Check, Edit2, X, Loader2 } from 'lucide-react';
import { formatCurrency } from '../utils';
import { EmptyState } from './ui';
import type { GroceryItem, ShoppingListItem } from '../hooks/useGroceries.ts';

interface ShoppingListSectionProps {
  shoppingList: ShoppingListItem[];
  items: GroceryItem[];
  availableCategories: string[];
  isSubmitting: boolean;
  onTogglePicked: (item: ShoppingListItem) => void;
  onPickAllInCategory: (items: ShoppingListItem[]) => void;
  onPurchase: (item: ShoppingListItem) => void;
  onPurchaseAllPicked: () => void;
  onUpdateItem: (id: number, updates: Partial<ShoppingListItem>) => Promise<void>;
  onDeleteItem: (id: number) => void;
}

/**
 * Shopping-list tab (extracted from GroceriesPage). Owns the edit-draft
 * state; all persistence flows through the page's hook-backed callbacks.
 */
const ShoppingListSection: React.FC<ShoppingListSectionProps> = ({
  shoppingList,
  items,
  availableCategories,
  isSubmitting,
  onTogglePicked,
  onPickAllInCategory,
  onPurchase,
  onPurchaseAllPicked,
  onUpdateItem,
  onDeleteItem,
}) => {
  const [editingShoppingItem, setEditingShoppingItem] = useState(null as ShoppingListItem | null);
  const [isSaving, setIsSaving] = useState(false);

  const shoppingByCategory = useMemo(() => {
    return [...shoppingList]
      .sort((a, b) => {
        if (a.is_picked !== b.is_picked) return a.is_picked ? 1 : -1;
        return a.item_name.localeCompare(b.item_name);
      })
      .reduce((acc: Record<string, ShoppingListItem[]>, item: ShoppingListItem) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {});
  }, [shoppingList]);

  const handleUpdateShoppingItem = async () => {
    if (!editingShoppingItem) return;
    try {
      setIsSaving(true);
      await onUpdateItem(editingShoppingItem.id, {
        item_name: editingShoppingItem.item_name,
        category: editingShoppingItem.category,
        quantity: editingShoppingItem.quantity,
        unit: editingShoppingItem.unit,
        package_size: editingShoppingItem.package_size || null,
        price: editingShoppingItem.price || 0,
      });
      setEditingShoppingItem(null);
    } catch (error) {
      console.error('Error updating shopping item:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Edit Shopping Item Modal */}
      {editingShoppingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-brand-primary to-brand-secondary p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Edit2 className="h-6 w-6" />
                  Edit Shopping Item
                </h3>
                <button
                  onClick={() => setEditingShoppingItem(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="Close edit dialog"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="shop-edit-name" className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Item Name</label>
                  <input
                    id="shop-edit-name"
                    type="text"
                    value={editingShoppingItem.item_name}
                    onChange={e => setEditingShoppingItem({ ...editingShoppingItem, item_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="shop-edit-category" className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Category</label>
                  <select
                    id="shop-edit-category"
                    value={editingShoppingItem.category}
                    onChange={e => setEditingShoppingItem({ ...editingShoppingItem, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  >
                    {availableCategories.map((cat: string) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="shop-edit-qty" className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Quantity</label>
                  <input
                    id="shop-edit-qty"
                    type="number"
                    value={editingShoppingItem.quantity}
                    onChange={e => setEditingShoppingItem({ ...editingShoppingItem, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    min="1"
                  />
                </div>

                <div>
                  <label htmlFor="shop-edit-unit" className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Unit</label>
                  <input
                    id="shop-edit-unit"
                    type="text"
                    value={editingShoppingItem.unit}
                    onChange={e => setEditingShoppingItem({ ...editingShoppingItem, unit: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    placeholder="pcs"
                  />
                </div>

                <div>
                  <label htmlFor="shop-edit-pack" className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Package Size</label>
                  <input
                    id="shop-edit-pack"
                    type="text"
                    value={editingShoppingItem.package_size || ''}
                    onChange={e => setEditingShoppingItem({ ...editingShoppingItem, package_size: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    placeholder="e.g., 500ml, 1kg"
                  />
                </div>

                <div>
                  <label htmlFor="shop-edit-price" className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Price (₹)</label>
                  <input
                    id="shop-edit-price"
                    type="number"
                    step="0.01"
                    value={editingShoppingItem.price || ''}
                    onChange={e => setEditingShoppingItem({ ...editingShoppingItem, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditingShoppingItem(null)}
                  className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateShoppingItem}
                  disabled={isSaving}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      Update Item
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 animate-slideUp">
        {/* Bulk Purchase Button */}
        {shoppingList.some((item: ShoppingListItem) => item.is_picked) && (
          <div className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md py-2 -mx-4 px-4 md:mx-0 md:px-0 md:bg-transparent md:backdrop-blur-none md:static mb-4 transition-all">
            <button
              onClick={onPurchaseAllPicked}
              disabled={isSubmitting}
              className="w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all font-bold text-base disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}
              Purchase {shoppingList.filter((i: ShoppingListItem) => i.is_picked).length} Picked Items
            </button>
          </div>
        )}

        {/* Shopping List */}
        <div className="space-y-4">
          {shoppingList.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <EmptyState
                icon={<Check className="h-8 w-8" aria-hidden="true" />}
                title="All caught up!"
                description="Your shopping list is empty."
              />
            </div>
          ) : (
            <div className="grid gap-6">
              {(Object.entries(shoppingByCategory) as [string, ShoppingListItem[]][])
                .sort(([catA, itemsA], [catB, itemsB]) => {
                  const allPickedA = itemsA.every(i => i.is_picked);
                  const allPickedB = itemsB.every(i => i.is_picked);
                  if (allPickedA && !allPickedB) return 1;
                  if (!allPickedA && allPickedB) return -1;
                  return catA.localeCompare(catB);
                })
                .map(([category, categoryItems]) => (
                  <div key={category} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-3 bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 dark:text-white">{category}</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                          {categoryItems.length}
                        </span>
                      </div>
                      <button
                        onClick={() => onPickAllInCategory(categoryItems)}
                        className="text-xs font-medium text-brand-primary hover:text-brand-secondary transition-colors"
                      >
                        {categoryItems.every(i => i.is_picked) ? 'Unpick All' : 'Pick All'}
                      </button>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {categoryItems.map((item: ShoppingListItem) => {
                        const inventoryItem = items.find((i: GroceryItem) => i.id === item.grocery_id);
                        return (
                          <div
                            key={item.id}
                            className="px-6 py-4 group transition-all hover:bg-gray-50/80 dark:hover:bg-gray-700/30"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <div className={`h-5 w-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${item.is_picked ? 'bg-gray-400 border-gray-400' : 'border-gray-300 dark:border-gray-600 hover:border-brand-primary'
                                    }`}
                                    onClick={() => onTogglePicked(item)}
                                  >
                                    {item.is_picked && <Check className="h-3 w-3 text-white" />}
                                  </div>
                                  <h4 className={`text-base font-medium decoration-gray-400 ${item.is_picked ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                                    {item.item_name}
                                    {item.package_size && (
                                      <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                                        ({item.package_size})
                                      </span>
                                    )}
                                  </h4>
                                  {item.is_auto_added && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">
                                      Auto
                                    </span>
                                  )}
                                </div>
                                <div className="ml-8 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                                  <span className="font-medium text-gray-700 dark:text-gray-300">
                                    Qty: {item.quantity} {item.unit}
                                  </span>

                                  {/* Price Display */}
                                  {(item.price || (inventoryItem && inventoryItem.price > 0)) && (
                                    <>
                                      <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                                      <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4 sm:items-center">
                                        <span>
                                          {formatCurrency(item.price || (inventoryItem ? inventoryItem.price : 0))} each
                                        </span>
                                        <span className="text-xs font-semibold text-brand-primary dark:text-brand-light">
                                          Total: {formatCurrency((item.price || (inventoryItem ? inventoryItem.price : 0)) * item.quantity)}
                                        </span>
                                      </div>
                                    </>
                                  )}

                                  {inventoryItem && inventoryItem.last_purchased_date && (
                                    <>
                                      <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                                      <span className="text-xs text-gray-400">
                                        Last: {new Date(inventoryItem.last_purchased_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 ml-8 sm:ml-0">
                                <button
                                  onClick={() => onPurchase(item)}
                                  className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-all font-medium text-sm"
                                >
                                  <Check className="h-4 w-4" />
                                  <span className="hidden sm:inline">Purchased</span>
                                </button>
                                <button
                                  onClick={() => setEditingShoppingItem(item)}
                                  className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                  title="Edit item"
                                >
                                  <Edit2 className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => onDeleteItem(item.id)}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Remove from list"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ShoppingListSection;
