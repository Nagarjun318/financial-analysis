import React from 'react';
const { useState, useEffect, useRef } = React;
import { Plus, Trash2, ShoppingCart, Loader2, AlertTriangle, Minus, ChevronDown, ChevronRight, Check, Edit2, X, Sparkles, Bot, Settings } from 'lucide-react';
import { suggestGroceryItemDetails, GEMINI_MODELS, GeminiModel } from '../services/geminiService';
import { formatCurrency } from '../utils';
import { getLocationName } from '../services/weatherService.ts';
import { showToast } from '../utils/toast';
import { EmptyState, Skeleton } from './ui';
import { GroceryAdvisorChat } from './GroceryAdvisorChat';
import WeatherSmartAssistant from './WeatherSmartAssistant';
import ShoppingListSection from './ShoppingListSection.tsx';
import {
    useGroceries,
    BASE_CATEGORIES,
    type GroceryItem,
    type ShoppingListItem,
} from '../hooks/useGroceries.ts';

const GroceriesPage: React.FC<{ userId?: string; onWeatherUpdate?: (condition: string, temp: number) => void }> = ({ userId, onWeatherUpdate }) => {
    // Shared data layer (was hand-rolled fetch + local-state updates, now unified).
    const {
        items,
        shoppingList,
        isLoading: loading,
        availableCategories,
        addItem,
        updateItem,
        deleteItem,
        updateStock: updateStockQty,
        autoAddToShopping,
        moveToShoppingList: moveItemToShoppingList,
        addShoppingRows,
        updateShoppingItem: persistShoppingItem,
        togglePicked: togglePickedRow,
        setPicked,
        deleteShoppingItem: removeShoppingItem,
        purchaseItem,
        purchaseAllPicked,
    } = useGroceries(userId);

    const [activeTab, setActiveTab] = useState('inventory' as 'inventory' | 'shopping' | 'ai-chef');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const [expandedCategories, setExpandedCategories] = useState(new Set(BASE_CATEGORIES));
    const [isSuggestingDetails, setIsSuggestingDetails] = useState(false);
    const [selectedModel, setSelectedModel] = useState<GeminiModel>(GEMINI_MODELS.FLASH_LITE);
    const [showModelSelector, setShowModelSelector] = useState(false);

    const modelSelectorRef = useRef<HTMLDivElement>(null);

    const [newItem, setNewItem] = useState({
        item_name: '',
        category: 'General',
        current_stock: 0,
        min_stock: 1,
        unit: 'units',
        package_size: '',
        price: '',
        purchase_date: new Date().toISOString().split('T')[0],
        custom_category: ''
    });



    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingItem, setEditingItem] = useState(null as GroceryItem | null);
    const [chatPanelWidth, setChatPanelWidth] = useState(0);
    const [weatherLocation, setWeatherLocation] = useState(''); // Coordinates for API
    const [weatherLocationName, setWeatherLocationName] = useState(''); // Display name

    // Get user's location on mount for weather
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    const coords = `${latitude},${longitude}`;
                    setWeatherLocation(coords);
                    
                    // Reverse geocode to get location name (Function proxy;
                    // the old direct /api/geocode path only worked under the
                    // Vite dev proxy and leaked the client key).
                    try {
                        setWeatherLocationName(await getLocationName(latitude, longitude));
                    } catch (err) {
                        console.error('[GroceriesPage] Error reverse geocoding:', err);
                        setWeatherLocationName('Current Location');
                    }
                    
                },
                (error) => {
                    console.warn('[GroceriesPage] Geolocation error, using default:', error);
                    setWeatherLocation('13.0827,80.2707'); // Chennai coordinates as fallback
                    setWeatherLocationName('Chennai, India');
                }
            );
        } else {
            setWeatherLocation('13.0827,80.2707'); // Chennai coordinates as fallback
            setWeatherLocationName('Chennai, India');
        }
    }, []);

    // Fetching is owned by useGroceries (scoped per userId, cached by query).

    // Click outside to close model selector
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
                setShowModelSelector(false);
            }
        };

        if (showModelSelector) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showModelSelector]);

    // AI Item Details Suggestion with debounce
    useEffect(() => {
        const suggestDetails = async () => {
            if (newItem.item_name.trim().length >= 3 && newItem.category !== 'Custom') {
                setIsSuggestingDetails(true);
                try {
                    const suggested = await suggestGroceryItemDetails(newItem.item_name, availableCategories, selectedModel);

                    // Update category (availableCategories derives from items,
                    // so a suggested new category appears once saved)
                    if (suggested.category) {
                        // Update all fields
                        setNewItem((prev: typeof newItem) => ({
                            ...prev,
                            category: suggested.category,
                            unit: suggested.unit || prev.unit,
                            package_size: suggested.packageSize || prev.package_size,
                            price: suggested.estimatedPrice > 0 ? suggested.estimatedPrice.toString() : prev.price
                        }));
                    }
                } catch (error) {
                    console.error('Item details suggestion error:', error);
                } finally {
                    setIsSuggestingDetails(false);
                }
            }
        };

        const timeoutId = setTimeout(suggestDetails, 800);
        return () => clearTimeout(timeoutId);
    }, [newItem.item_name, newItem.category, availableCategories, selectedModel]);

    const getModelDisplayName = (model: GeminiModel): string => {
        switch (model) {
            case GEMINI_MODELS.PRO_LATEST: return 'Pro';
            case GEMINI_MODELS.FLASH_LATEST: return 'Flash';
            case GEMINI_MODELS.FLASH_2_0: return 'Flash 2.0';
            case GEMINI_MODELS.FLASH_LITE: return 'Flash Lite';
            case GEMINI_MODELS.GEMMA_3: return 'Gemma 3';
            default: return 'Flash Lite';
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setIsSubmitting(true);

            const finalCategory = newItem.category === 'Custom' ? newItem.custom_category : newItem.category;
            if (!finalCategory.trim()) {
                showToast('Please enter a category name', 'error');
                setIsSubmitting(false);
                return;
            }

            const addedItem = await addItem({
                item_name: newItem.item_name,
                category: finalCategory,
                current_stock: newItem.current_stock,
                min_stock: newItem.min_stock,
                unit: newItem.unit,
                package_size: newItem.package_size || null,
                price: newItem.price ? parseFloat(newItem.price) : 0,
                last_purchased_date: newItem.purchase_date || null,
            });

            setNewItem({
                item_name: '',
                category: 'General',
                current_stock: 0,
                min_stock: 1,
                unit: 'units',
                package_size: '',
                price: '',
                purchase_date: new Date().toISOString().split('T')[0],
                custom_category: ''
            });

            // Auto-add to shopping list if stock is 0
            if (newItem.current_stock === 0) {
                await autoAddToShopping(addedItem, addedItem.min_stock || 1);
            }

            // If it's a new custom category, add it to expanded categories
            if (newItem.category === 'Custom') {
                setExpandedCategories((prev: Set<string>) => new Set(prev).add(finalCategory));
            }
        } catch (error) {
            console.error('Error adding item:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateStock = async (item: GroceryItem, delta: number) => {
        try {
            await updateStockQty(item.id, delta);
        } catch (error) {
            console.error('Error updating stock:', error);
        }
    };

    const handleEditItem = (item: GroceryItem) => {
        setEditingItem(item);
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
    };

    const handleUpdateItem = async () => {
        if (!editingItem) return;

        try {
            setIsSubmitting(true);

            await updateItem(editingItem.id, {
                item_name: editingItem.item_name,
                category: editingItem.category,
                current_stock: editingItem.current_stock,
                min_stock: editingItem.min_stock,
                unit: editingItem.unit,
                package_size: editingItem.package_size || null,
                price: editingItem.price || 0,
                last_purchased_date: editingItem.last_purchased_date || null
            });

            setEditingItem(null);
        } catch (error) {
            console.error('Error updating item:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const moveToShoppingList = async (item: GroceryItem) => {
        try {
            const moved = await moveItemToShoppingList(item);
            if (!moved) {
                showToast('Item already in shopping list', 'info');
            }
        } catch (error) {
            console.error('Error moving to shopping list:', error);
        }
    };

    const handleDeleteItem = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;

        try {
            await deleteItem(id);
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };



    const togglePicked = async (item: ShoppingListItem) => {
        try {
            await togglePickedRow(item);
        } catch (error) {
            console.error('Error toggling picked status:', error);
        }
    };

    const markAsPurchased = async (shoppingItem: ShoppingListItem) => {
        try {
            await purchaseItem(shoppingItem);
        } catch (error) {
            console.error('Error marking as purchased:', error);
        }
    };

    const handlePurchaseAllPicked = async () => {
        const pickedCount = shoppingList.filter((item: ShoppingListItem) => item.is_picked).length;
        if (pickedCount === 0) return;

        if (!window.confirm(`Mark ${pickedCount} items as purchased?`)) return;

        try {
            setIsSubmitting(true);
            await purchaseAllPicked();
        } catch (error) {
            console.error('Error purchasing all picked:', error);
        } finally {
            setIsSubmitting(false);
        }
    };



    const deleteShoppingItem = async (id: number) => {
        try {
            await removeShoppingItem(id);
        } catch (error) {
            console.error('Error deleting shopping item:', error);
        }
    };

    const handleUpdateShoppingItem = async (id: number, updates: Partial<ShoppingListItem>) => {
        await persistShoppingItem(id, updates);
    };

    const addSuggestedItems = async (suggestedItems: any[]) => {
        try {
            const added = await addShoppingRows(suggestedItems.map(item => ({
                grocery_id: null,
                item_name: item.item_name,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit,
                is_auto_added: false
            })));

            if (added.length > 0) {
                showToast(`Added ${added.length} items to your shopping list!`, 'success');
                setActiveTab('shopping');
            }
        } catch (error) {
            console.error('Error adding suggested items:', error);
            showToast('Failed to add items to shopping list.', 'error');
        }
    };

    // Handler for adding items from weather suggestions
    const handleAddWeatherItems = async (itemNames: string[]) => {
        if (!itemNames || itemNames.length === 0) return;

        try {
            const added = await addShoppingRows(itemNames.map(itemName => ({
                grocery_id: null,
                item_name: itemName,
                category: 'General',
                quantity: 1,
                unit: 'units',
                is_auto_added: false
            })));

            if (added.length > 0) {
                showToast(`Added ${added.length} weather-suggested items to your shopping list!`, 'success');
                setActiveTab('shopping');
            }
        } catch (error) {
            console.error('Error adding weather items:', error);
            showToast('Failed to add items. Please try again.', 'error');
        }
    };

    const toggleCategory = (category: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    const pickAllInCategory = async (categoryItems: ShoppingListItem[]) => {
        const allPicked = categoryItems.every(i => i.is_picked);
        const targetState = !allPicked;
        const idsToUpdate = categoryItems.map(i => i.id);

        try {
            await setPicked(idsToUpdate, targetState);
        } catch (error) {
            console.error('Error updating category items:', error);
        }
    };

    // Filter items
    const filteredItems = items.filter((item: GroceryItem) => {
        const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Group by category
    const itemsByCategory = filteredItems.reduce((acc: Record<string, GroceryItem[]>, item: GroceryItem) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    const lowStockCount = items.filter((i: GroceryItem) => i.current_stock < i.min_stock).length;

    // ... (keep existing state and logic)

    return (
        <div className="space-y-8 animate-fadeIn pb-20" style={{ marginRight: `${chatPanelWidth}px`, transition: 'margin-right 0.3s ease-in-out' }}>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-brand-primary to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                        <ShoppingCart className="h-10 w-10 text-brand-primary" />
                        Home Inventory
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
                        Manage your groceries and shopping list efficiently.
                    </p>
                </div>

                {/* Modern Segmented Control Tabs */}
                <div className="bg-gray-100 dark:bg-gray-800/50 p-1.5 rounded-2xl inline-flex self-start md:self-center backdrop-blur-sm border border-gray-200 dark:border-gray-700/50">
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${activeTab === 'inventory'
                            ? 'bg-white dark:bg-gray-700 text-brand-primary shadow-sm scale-[1.02]'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/30'
                            }`}
                    >
                        <span>Inventory</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'inventory'
                            ? 'bg-brand-primary/10 text-brand-primary'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                            {items.length}
                        </span>
                        {lowStockCount > 0 && (
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('shopping')}
                        className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${activeTab === 'shopping'
                            ? 'bg-white dark:bg-gray-700 text-brand-primary shadow-sm scale-[1.02]'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/30'
                            }`}
                    >
                        <span>Shopping List</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'shopping'
                            ? 'bg-brand-primary/10 text-brand-primary'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                            {shoppingList.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* Weather-Smart Grocery Assistant */}
            {weatherLocation && (
                <WeatherSmartAssistant 
                    location={weatherLocation}
                    locationName={weatherLocationName}
                    onAddItems={handleAddWeatherItems}
                    onLocationChange={(coords, name) => {
                        setWeatherLocation(coords);
                        setWeatherLocationName(name);
                    }}
                    onWeatherUpdate={onWeatherUpdate}
                />
            )}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
                <div className="space-y-6 animate-slideUp">
                    {/* Add Item Card */}
                    <div className="glass-panel p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <div className="p-2 bg-brand-primary/10 rounded-lg">
                                    <Plus className="h-5 w-5 text-brand-primary" />
                                </div>
                                Add New Item
                            </h3>
                            {/* Model Selector */}
                            {!editingItem && (
                                <div className="relative" ref={modelSelectorRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowModelSelector(!showModelSelector)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        title={`AI Model: ${getModelDisplayName(selectedModel)}`}
                                    >
                                        <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                    </button>

                                    {showModelSelector && (
                                        <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
                                            {Object.values(GEMINI_MODELS).map((model) => (
                                                <button
                                                    key={model}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedModel(model);
                                                        setShowModelSelector(false);
                                                    }}
                                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                                        selectedModel === model
                                                            ? 'text-brand-primary font-medium bg-brand-primary/5'
                                                            : 'text-gray-700 dark:text-gray-300'
                                                    }`}
                                                >
                                                    {getModelDisplayName(model)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                            <div className="md:col-span-3 space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Item Name</label>
                                <input
                                    type="text"
                                    value={newItem.item_name}
                                    onChange={e => setNewItem({ ...newItem, item_name: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                    placeholder="e.g., Organic Milk"
                                    required
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                                    Category
                                    {isSuggestingDetails && (
                                        <span className="flex items-center gap-1 text-brand-primary animate-pulse">
                                            <Sparkles className="h-3 w-3" />
                                            <span className="text-[10px] font-normal normal-case">AI suggesting...</span>
                                        </span>
                                    )}
                                </label>
                                <div className="relative">
                                    <select
                                        value={newItem.category}
                                        onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all appearance-none"
                                    >
                                        {/* Include the pending AI-suggested category so the select never blanks */}
                                        {[...new Set([...availableCategories, newItem.category])].map((cat: string) => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                        <option value="Custom">Custom...</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                </div>
                                {newItem.category === 'Custom' && (
                                    <input
                                        type="text"
                                        value={newItem.custom_category}
                                        onChange={e => setNewItem({ ...newItem, custom_category: e.target.value })}
                                        className="w-full mt-2 px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                        placeholder="Enter category name"
                                        required
                                    />
                                )}
                            </div>
                            <div className="md:col-span-1 space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Stock</label>
                                <input
                                    type="number"
                                    value={newItem.current_stock}
                                    onChange={e => setNewItem({ ...newItem, current_stock: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                    min="0"
                                />
                            </div>
                            <div className="md:col-span-1 space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Min</label>
                                <input
                                    type="number"
                                    value={newItem.min_stock}
                                    onChange={e => setNewItem({ ...newItem, min_stock: parseInt(e.target.value) || 1 })}
                                    className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                    min="1"
                                />
                            </div>
                            <div className="md:col-span-1 space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Unit</label>
                                <input
                                    type="text"
                                    value={newItem.unit}
                                    onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                    placeholder="pcs"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Package Size</label>
                                <input
                                    type="text"
                                    value={newItem.package_size}
                                    onChange={e => setNewItem({ ...newItem, package_size: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                    placeholder="e.g., 500ml, 1kg, 400g"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Price (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newItem.price}
                                    onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Purchase Date</label>
                                <input
                                    type="date"
                                    value={newItem.purchase_date}
                                    onChange={e => setNewItem({ ...newItem, purchase_date: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                />
                            </div>
                            <div className="md:col-span-12 md:col-start-1 mt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-2.5 bg-gradient-to-r from-brand-primary to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-brand-primary/25 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 font-medium"
                                >
                                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                                    Add Item
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Search and Filter */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400 group-focus-within:text-brand-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search inventory..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-sm"
                            />
                        </div>
                        <div className="relative min-w-[200px]">
                            <select
                                value={selectedCategory}
                                onChange={e => setSelectedCategory(e.target.value)}
                                className="w-full pl-4 pr-10 py-3 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-sm appearance-none"
                            >
                                <option value="All">All Categories</option>
                                {availableCategories.map((cat: string) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Inventory List */}
                    <div className="space-y-4">
                        {loading ? (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">Loading your pantry...</p>
                                <Skeleton variant="text" lines={5} />
                            </div>
                        ) : Object.keys(itemsByCategory).length === 0 ? (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <EmptyState
                                    icon={<ShoppingCart className="h-8 w-8" aria-hidden="true" />}
                                    title="No items found"
                                    description="Add some items to get started!"
                                />
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {(Object.entries(itemsByCategory) as [string, GroceryItem[]][]).map(([category, categoryItems]) => (
                                    <div key={category} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md">
                                        <button
                                            onClick={() => toggleCategory(category)}
                                            className="w-full px-6 py-4 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-lg transition-transform duration-300 ${expandedCategories.has(category) ? 'rotate-90 bg-brand-primary/10 text-brand-primary' : 'text-gray-400'}`}>
                                                    <ChevronRight className="h-5 w-5" />
                                                </div>
                                                <span className="text-lg font-bold text-gray-800 dark:text-white">{category}</span>
                                                <span className="px-2.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                                                    {categoryItems.length}
                                                </span>
                                            </div>
                                        </button>

                                        {expandedCategories.has(category) && (
                                            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                                {categoryItems.map((item: GroceryItem) => {
                                                    const isLowStock = item.current_stock < item.min_stock;
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className={`px-6 py-4 group transition-all hover:bg-gray-50/80 dark:hover:bg-gray-700/30 ${isLowStock ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                                                                }`}
                                                        >
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-3">
                                                                        <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                                                                            {item.item_name}
                                                                            {item.package_size && (
                                                                                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                                                                                    ({item.package_size})
                                                                                </span>
                                                                            )}
                                                                        </h4>
                                                                        {isLowStock && (
                                                                            <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full border border-red-200 dark:border-red-800">
                                                                                <AlertTriangle className="h-3 w-3" /> Low Stock
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                                                                        <span className="flex items-center gap-1.5">
                                                                            <span className={`font-medium ${isLowStock ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                                {item.current_stock} / {item.min_stock}
                                                                            </span>
                                                                        </span>
                                                                        {(item.price > 0 || item.last_purchased_date) && (
                                                                            <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                                                                        )}
                                                                        {item.price > 0 && (
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <span className="font-medium text-gray-600 dark:text-gray-300">
                                                                                    {formatCurrency(item.price)} each
                                                                                </span>
                                                                                <span className="text-xs font-semibold text-brand-primary dark:text-brand-light">
                                                                                    Total: {formatCurrency(item.price * item.current_stock)}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {item.last_purchased_date && (
                                                                            <span className="text-xs text-gray-400">
                                                                                Last: {new Date(item.last_purchased_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-3 self-end sm:self-center">
                                                                    <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-1">
                                                                        <button
                                                                            onClick={() => updateStock(item, -1)}
                                                                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-500 hover:text-red-500 transition-colors"
                                                                            title="Decrease stock"
                                                                        >
                                                                            <Minus className="h-4 w-4" />
                                                                        </button>
                                                                        <span className="w-12 text-center font-mono font-semibold text-gray-700 dark:text-gray-200">
                                                                            {item.current_stock}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => updateStock(item, 1)}
                                                                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-500 hover:text-green-500 transition-colors"
                                                                            title="Increase stock"
                                                                        >
                                                                            <Plus className="h-4 w-4" />
                                                                        </button>
                                                                    </div>

                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            onClick={() => handleEditItem(item)}
                                                                            className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                                            title="Edit item"
                                                                        >
                                                                            <Edit2 className="h-5 w-5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => moveToShoppingList(item)}
                                                                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                                            title="Add to shopping list"
                                                                        >
                                                                            <ShoppingCart className="h-5 w-5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteItem(item.id)}
                                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                            title="Delete item"
                                                                        >
                                                                            <Trash2 className="h-5 w-5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Item Modal */}
            {editingItem && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-r from-brand-primary to-brand-secondary p-6 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <Edit2 className="h-6 w-6" />
                                    Edit Item
                                </h3>
                                <button
                                    onClick={handleCancelEdit}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <X className="h-6 w-6 text-white" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Item Name</label>
                                    <input
                                        type="text"
                                        value={editingItem.item_name}
                                        onChange={e => setEditingItem({ ...editingItem, item_name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Category</label>
                                    <select
                                        value={editingItem.category}
                                        onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                    >
                                        {availableCategories.map((cat: string) => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Current Stock</label>
                                    <input
                                        type="number"
                                        value={editingItem.current_stock}
                                        onChange={e => setEditingItem({ ...editingItem, current_stock: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Min Stock</label>
                                    <input
                                        type="number"
                                        value={editingItem.min_stock}
                                        onChange={e => setEditingItem({ ...editingItem, min_stock: parseInt(e.target.value) || 1 })}
                                        className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                        min="1"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Unit</label>
                                    <input
                                        type="text"
                                        value={editingItem.unit}
                                        onChange={e => setEditingItem({ ...editingItem, unit: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                        placeholder="pcs"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Package Size</label>
                                    <input
                                        type="text"
                                        value={editingItem.package_size || ''}
                                        onChange={e => setEditingItem({ ...editingItem, package_size: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                        placeholder="e.g., 500ml, 1kg"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Price (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editingItem.price || ''}
                                        onChange={e => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Purchase Date</label>
                                    <input
                                        type="date"
                                        value={editingItem.last_purchased_date || ''}
                                        onChange={e => setEditingItem({ ...editingItem, last_purchased_date: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleCancelEdit}
                                    className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateItem}
                                    disabled={isSubmitting}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
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
            <ShoppingListSection
                shoppingList={shoppingList}
                items={items}
                availableCategories={availableCategories}
                isSubmitting={isSubmitting}
                onTogglePicked={togglePicked}
                onPickAllInCategory={pickAllInCategory}
                onPurchase={markAsPurchased}
                onPurchaseAllPicked={handlePurchaseAllPicked}
                onUpdateItem={handleUpdateShoppingItem}
                onDeleteItem={deleteShoppingItem}
            />
            {/* AI Chef Tab */}
            {activeTab === 'ai-chef' && (
                <div className="glass-panel rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl overflow-hidden flex flex-col h-[600px] animate-slideUp">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-brand-primary to-purple-600 rounded-xl text-white shadow-lg shadow-brand-primary/20">
                            <Bot className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">AI Kitchen Assistant</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Powered by Gemini AI</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Grocery Advisor Chat Component */}
            <GroceryAdvisorChat
                groceries={items}
                onAddToShoppingList={addSuggestedItems}
                onOpenChange={setChatPanelWidth}
            />

        </div>
    );
};

export default GroceriesPage;
