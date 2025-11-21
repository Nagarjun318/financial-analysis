import React from 'react';
const { useState, useEffect } = React;
import { supabase } from '../services/supabaseClient';
import { Plus, Trash2, ShoppingCart, Loader2, AlertTriangle, Minus, ChevronDown, ChevronRight, Check, Sparkles, Send, Bot, Edit2, X } from 'lucide-react';
import { getKitchenAssistance, KitchenAssistanceResult, suggestGroceryItemDetails } from '../services/geminiService';
import { formatCurrency } from '../utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Types
interface GroceryItem {
    id: number;
    user_id: string;
    item_name: string;
    category: string;
    current_stock: number;
    min_stock: number;
    unit: string;
    package_size?: string;
    price: number;
    last_purchased_date: string | null;
    created_at?: string;
    updated_at?: string;
}

interface ShoppingListItem {
    id: number;
    user_id: string;
    grocery_id: number | null;
    item_name: string;
    category: string;
    quantity: number;
    unit: string;
    package_size?: string;
    price?: number;
    is_picked?: boolean;
    is_auto_added: boolean;
    created_at?: string;
}

const BASE_CATEGORIES = ['Dairy', 'Produce', 'Meat', 'Bakery', 'Pantry', 'Beverages', 'Frozen', 'Snacks', 'Household', 'Personal Care', 'Stationery', 'General'];

const GroceriesPage: React.FC<{ userId: string }> = ({ userId }) => {
    const [items, setItems] = useState([] as GroceryItem[]);
    const [shoppingList, setShoppingList] = useState([] as ShoppingListItem[]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('inventory' as 'inventory' | 'shopping' | 'ai-chef');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Dynamic categories: base categories + user-created categories from existing items
    const [availableCategories, setAvailableCategories] = useState(BASE_CATEGORIES as string[]);
    const [expandedCategories, setExpandedCategories] = useState(new Set(BASE_CATEGORIES));

    // AI Chat State
    const [aiMessages, setAiMessages] = useState([
        { role: 'assistant', content: "Hi! I'm your AI Kitchen Assistant. I can help you plan meals, suggest recipes based on your inventory, or manage your shopping list. What's on your mind?" }
    ] as Array<{ role: 'user' | 'assistant', content: string, suggestedItems?: any[] }>);
    const [aiInput, setAiInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isSuggestingDetails, setIsSuggestingDetails] = useState(false);

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

    // Fetch data
    useEffect(() => {
        fetchData();
    }, [userId]);

    const fetchData = async () => {
        await Promise.all([fetchGroceries(), fetchShoppingList()]);
    };

    const fetchGroceries = async () => {
        if (!supabase) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('groceries')
                .select('*')
                .eq('user_id', userId)
                .order('category', { ascending: true })
                .order('item_name', { ascending: true });

            if (error) throw error;
            setItems(data || []);

            // Extract unique categories from existing items and merge with base categories
            if (data && data.length > 0) {
                const uniqueCategories = [...new Set(data.map((item: GroceryItem) => item.category))];
                const allCategories = [...new Set([...BASE_CATEGORIES, ...uniqueCategories])].sort();
                setAvailableCategories(allCategories);
            }
        } catch (error) {
            console.error('Error fetching groceries:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchShoppingList = async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase
                .from('shopping_list')
                .select('*')
                .eq('user_id', userId)
                .order('is_picked', { ascending: true })
                .order('category', { ascending: true })
                .order('item_name', { ascending: true });

            if (error) throw error;
            setShoppingList(data || []);
        } catch (error) {
            console.error('Error fetching shopping list:', error);
        }
    };

    // AI Item Details Suggestion with debounce
    useEffect(() => {
        const suggestDetails = async () => {
            if (newItem.item_name.trim().length >= 3 && newItem.category !== 'Custom') {
                setIsSuggestingDetails(true);
                try {
                    const suggested = await suggestGroceryItemDetails(newItem.item_name, availableCategories);

                    // Update category
                    if (suggested.category) {
                        // If AI suggests a new category not in our list, add it
                        if (!availableCategories.includes(suggested.category)) {
                            setAvailableCategories((prev: string[]) => [...prev, suggested.category].sort());
                        }

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
    }, [newItem.item_name]);

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;

        try {
            setIsSubmitting(true);

            const finalCategory = newItem.category === 'Custom' ? newItem.custom_category : newItem.category;
            if (!finalCategory.trim()) {
                alert("Please enter a category name");
                setIsSubmitting(false);
                return;
            }

            const { data, error } = await supabase
                .from('groceries')
                .insert([
                    {
                        user_id: userId,
                        item_name: newItem.item_name,
                        category: finalCategory,
                        current_stock: newItem.current_stock,
                        min_stock: newItem.min_stock,
                        unit: newItem.unit,
                        package_size: newItem.package_size || null,
                        price: newItem.price ? parseFloat(newItem.price) : 0,
                        last_purchased_date: newItem.purchase_date || null
                    }
                ])
                .select();

            if (error) throw error;

            if (data) {
                const addedItem = data[0];
                setItems([...items, addedItem]);

                // Add new category to available categories if it's not already there
                if (!availableCategories.includes(finalCategory)) {
                    setAvailableCategories((prev: string[]) => [...prev, finalCategory].sort());
                }

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
                    await addToShoppingListAuto(addedItem, addedItem.min_stock || 1);
                }

                // If it's a new custom category, add it to expanded categories
                if (newItem.category === 'Custom') {
                    setExpandedCategories((prev: Set<string>) => new Set(prev).add(finalCategory));
                }
            }
        } catch (error) {
            console.error('Error adding item:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateStock = async (item: GroceryItem, delta: number) => {
        if (!supabase) return;

        const newStock = Math.max(0, item.current_stock + delta);

        try {
            const { error } = await supabase
                .from('groceries')
                .update({ current_stock: newStock })
                .eq('id', item.id);

            if (error) throw error;

            // Update local state
            setItems(items.map((i: GroceryItem) => i.id === item.id ? { ...i, current_stock: newStock } : i));

            // Check if we need to add to shopping list
            if (newStock < item.min_stock) {
                await addToShoppingListAuto(item, item.min_stock - newStock);
            }
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
        if (!supabase || !editingItem) return;

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('groceries')
                .update({
                    item_name: editingItem.item_name,
                    category: editingItem.category,
                    current_stock: editingItem.current_stock,
                    min_stock: editingItem.min_stock,
                    unit: editingItem.unit,
                    package_size: editingItem.package_size || null,
                    price: editingItem.price || 0,
                    last_purchased_date: editingItem.last_purchased_date || null
                })
                .eq('id', editingItem.id);

            if (error) throw error;

            // Update local state
            setItems(items.map((i: GroceryItem) => i.id === editingItem.id ? editingItem : i));
            setEditingItem(null);
        } catch (error) {
            console.error('Error updating item:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const addToShoppingListAuto = async (item: GroceryItem, quantity: number) => {
        if (!supabase) return;

        // Check if already in shopping list
        const existing = shoppingList.find((sl: ShoppingListItem) => sl.grocery_id === item.id);
        if (existing) return;

        try {
            const { data, error } = await supabase
                .from('shopping_list')
                .insert([{
                    user_id: userId,
                    grocery_id: item.id,
                    item_name: item.item_name,
                    category: item.category,
                    quantity: quantity,
                    unit: item.unit,
                    package_size: item.package_size || null,
                    price: item.price || 0,
                    is_auto_added: true
                }])
                .select();

            if (error) throw error;
            if (data) {
                setShoppingList([...shoppingList, data[0]]);
            }
        } catch (error) {
            console.error('Error adding to shopping list:', error);
        }
    };

    const moveToShoppingList = async (item: GroceryItem) => {
        if (!supabase) return;

        // Check if already in shopping list
        const existing = shoppingList.find((sl: ShoppingListItem) => sl.grocery_id === item.id);
        if (existing) {
            alert('Item already in shopping list');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('shopping_list')
                .insert([{
                    user_id: userId,
                    grocery_id: item.id,
                    item_name: item.item_name,
                    category: item.category,
                    quantity: item.min_stock,
                    unit: item.unit,
                    package_size: item.package_size || null,
                    price: item.price || 0,
                    is_auto_added: false
                }])
                .select();

            if (error) throw error;
            if (data) {
                setShoppingList([...shoppingList, data[0]]);
            }
        } catch (error) {
            console.error('Error moving to shopping list:', error);
        }
    };

    const handleDeleteItem = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this item?') || !supabase) return;

        try {
            const { error } = await supabase
                .from('groceries')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setItems(items.filter((item: GroceryItem) => item.id !== id));
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };



    const [editingShoppingItem, setEditingShoppingItem] = useState(null as ShoppingListItem | null);

    const handleEditShoppingItem = (item: ShoppingListItem) => {
        setEditingShoppingItem(item);
    };

    const handleCancelEditShoppingItem = () => {
        setEditingShoppingItem(null);
    };

    const handleUpdateShoppingItem = async () => {
        if (!supabase || !editingShoppingItem) return;

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('shopping_list')
                .update({
                    item_name: editingShoppingItem.item_name,
                    category: editingShoppingItem.category,
                    quantity: editingShoppingItem.quantity,
                    unit: editingShoppingItem.unit,
                    package_size: editingShoppingItem.package_size || null,
                    price: editingShoppingItem.price || 0
                })
                .eq('id', editingShoppingItem.id);

            if (error) throw error;

            // Update local state
            setShoppingList(shoppingList.map((i: ShoppingListItem) => i.id === editingShoppingItem.id ? editingShoppingItem : i));
            setEditingShoppingItem(null);
        } catch (error) {
            console.error('Error updating shopping item:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const togglePicked = async (item: ShoppingListItem) => {
        if (!supabase) return;
        try {
            const { error } = await supabase
                .from('shopping_list')
                .update({ is_picked: !item.is_picked })
                .eq('id', item.id);

            if (error) throw error;

            setShoppingList(shoppingList.map((i: ShoppingListItem) =>
                i.id === item.id ? { ...i, is_picked: !item.is_picked } : i
            ));
        } catch (error) {
            console.error('Error toggling picked status:', error);
        }
    };

    const markAsPurchased = async (shoppingItem: ShoppingListItem) => {
        if (!supabase) return;

        try {
            // If linked to inventory, update stock
            if (shoppingItem.grocery_id) {
                const inventoryItem = items.find((i: GroceryItem) => i.id === shoppingItem.grocery_id);
                if (inventoryItem) {
                    const newStock = inventoryItem.current_stock + shoppingItem.quantity;
                    await supabase
                        .from('groceries')
                        .update({
                            current_stock: newStock,
                            last_purchased_date: new Date().toISOString().split('T')[0]
                        })
                        .eq('id', inventoryItem.id);

                    setItems(items.map((i: GroceryItem) =>
                        i.id === inventoryItem.id
                            ? { ...i, current_stock: newStock, last_purchased_date: new Date().toISOString().split('T')[0] }
                            : i
                    ));
                }
            }

            // Remove from shopping list
            const { error } = await supabase
                .from('shopping_list')
                .delete()
                .eq('id', shoppingItem.id);

            if (error) throw error;
            setShoppingList(shoppingList.filter((item: ShoppingListItem) => item.id !== shoppingItem.id));
        } catch (error) {
            console.error('Error marking as purchased:', error);
        }
    };

    const handlePurchaseAllPicked = async () => {
        if (!supabase) return;

        const pickedItems = shoppingList.filter((item: ShoppingListItem) => item.is_picked);
        if (pickedItems.length === 0) return;

        if (!window.confirm(`Mark ${pickedItems.length} items as purchased?`)) return;

        try {
            setIsSubmitting(true);

            // Process each item
            for (const item of pickedItems) {
                // 1. Update inventory if linked
                if (item.grocery_id) {
                    const inventoryItem = items.find((i: GroceryItem) => i.id === item.grocery_id);
                    if (inventoryItem) {
                        const newStock = inventoryItem.current_stock + item.quantity;
                        await supabase
                            .from('groceries')
                            .update({
                                current_stock: newStock,
                                last_purchased_date: new Date().toISOString().split('T')[0]
                            })
                            .eq('id', inventoryItem.id);
                    }
                }

                // 2. Remove from shopping list
                await supabase
                    .from('shopping_list')
                    .delete()
                    .eq('id', item.id);
            }

            // Refresh data
            await fetchData();

        } catch (error) {
            console.error('Error purchasing all picked:', error);
        } finally {
            setIsSubmitting(false);
        }
    };



    const deleteShoppingItem = async (id: number) => {
        if (!supabase) return;

        try {
            const { error } = await supabase
                .from('shopping_list')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setShoppingList(shoppingList.filter((item: ShoppingListItem) => item.id !== id));
        } catch (error) {
            console.error('Error deleting shopping item:', error);
        }
    };

    const handleAiSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiInput.trim() || isAiLoading) return;

        const userMessage = aiInput.trim();
        setAiMessages((prev: any[]) => [...prev, { role: 'user', content: userMessage }]);
        setAiInput('');
        setIsAiLoading(true);

        try {
            const result = await getKitchenAssistance(
                userMessage,
                items,
                shoppingList
            );

            setAiMessages((prev: any[]) => [...prev, {
                role: 'assistant',
                content: result.response,
                suggestedItems: result.suggestedShoppingItems
            }]);
        } catch (error) {
            console.error('AI error:', error);
            setAiMessages((prev: any[]) => [...prev, {
                role: 'assistant',
                content: "I'm sorry, I encountered an error while processing your request. Please try again."
            }]);
        } finally {
            setIsAiLoading(false);
        }
    };

    const addSuggestedItems = async (suggestedItems: any[]) => {
        if (!supabase) return;

        try {
            const newItems = suggestedItems.map(item => ({
                user_id: userId,
                grocery_id: null,
                item_name: item.item_name,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit,
                is_auto_added: false
            }));

            const { data, error } = await supabase
                .from('shopping_list')
                .insert(newItems)
                .select();

            if (error) throw error;

            if (data) {
                setShoppingList([...shoppingList, ...data]);
                alert(`Added ${data.length} items to your shopping list!`);
                setActiveTab('shopping');
            }
        } catch (error) {
            console.error('Error adding suggested items:', error);
            alert('Failed to add items to shopping list.');
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

    const shoppingByCategory = [...shoppingList]
        .sort((a, b) => {
            if (a.is_picked !== b.is_picked) return a.is_picked ? 1 : -1;
            return a.item_name.localeCompare(b.item_name);
        })
        .reduce((acc: Record<string, ShoppingListItem[]>, item: ShoppingListItem) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
        }, {});

    const lowStockCount = items.filter((i: GroceryItem) => i.current_stock < i.min_stock).length;

    // ... (keep existing state and logic)

    return (
        <div className="space-y-8 animate-fadeIn pb-20">
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
                    <button
                        onClick={() => setActiveTab('ai-chef')}
                        className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${activeTab === 'ai-chef'
                            ? 'bg-white dark:bg-gray-700 text-brand-primary shadow-sm scale-[1.02]'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/30'
                            }`}
                    >
                        <Sparkles className="h-4 w-4" />
                        <span>AI Chef</span>
                    </button>
                </div>
            </div>

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
                                        {availableCategories.map((cat: string) => (
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
                            <div className="p-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-brand-primary" />
                                <p className="text-lg font-medium">Loading your pantry...</p>
                            </div>
                        ) : Object.keys(itemsByCategory).length === 0 ? (
                            <div className="p-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="bg-gray-100 dark:bg-gray-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ShoppingCart className="h-8 w-8 text-gray-400" />
                                </div>
                                <p className="text-lg font-medium text-gray-900 dark:text-white">No items found</p>
                                <p className="mt-1">Add some items to get started!</p>
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
                                    onClick={handleCancelEditShoppingItem}
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
                                        value={editingShoppingItem.item_name}
                                        onChange={e => setEditingShoppingItem({ ...editingShoppingItem, item_name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Category</label>
                                    <select
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
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Quantity</label>
                                    <input
                                        type="number"
                                        value={editingShoppingItem.quantity}
                                        onChange={e => setEditingShoppingItem({ ...editingShoppingItem, quantity: parseInt(e.target.value) || 1 })}
                                        className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                        min="1"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Unit</label>
                                    <input
                                        type="text"
                                        value={editingShoppingItem.unit}
                                        onChange={e => setEditingShoppingItem({ ...editingShoppingItem, unit: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                        placeholder="pcs"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Package Size</label>
                                    <input
                                        type="text"
                                        value={editingShoppingItem.package_size || ''}
                                        onChange={e => setEditingShoppingItem({ ...editingShoppingItem, package_size: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                        placeholder="e.g., 500ml, 1kg"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Price (₹)</label>
                                    <input
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
                                    onClick={handleCancelEditShoppingItem}
                                    className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateShoppingItem}
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

            {activeTab === 'shopping' && (
                <div className="space-y-6 animate-slideUp">
                    {/* Bulk Purchase Button */}
                    {shoppingList.some((item: ShoppingListItem) => item.is_picked) && (
                        <div className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md py-2 -mx-4 px-4 md:mx-0 md:px-0 md:bg-transparent md:backdrop-blur-none md:static mb-4 transition-all">
                            <button
                                onClick={handlePurchaseAllPicked}
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
                            <div className="p-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                                </div>
                                <p className="text-lg font-medium text-gray-900 dark:text-white">All caught up!</p>
                                <p className="mt-1">Your shopping list is empty.</p>
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {(Object.entries(shoppingByCategory) as [string, ShoppingListItem[]][]).map(([category, categoryItems]) => (
                                    <div key={category} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                        <div className="px-6 py-3 bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                                            <span className="font-bold text-gray-800 dark:text-white">{category}</span>
                                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                                                {categoryItems.length}
                                            </span>
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
                                                                        onClick={() => togglePicked(item)}
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
                                                                    onClick={() => markAsPurchased(item)}
                                                                    className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-all font-medium text-sm"
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                    <span className="hidden sm:inline">Purchased</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEditShoppingItem(item)}
                                                                    className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                                    title="Edit item"
                                                                >
                                                                    <Edit2 className="h-5 w-5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteShoppingItem(item.id)}
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
            )}

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

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {aiMessages.map((msg: any, idx: number) => (
                            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-brand-primary/10 text-brand-primary'}`}>
                                    {msg.role === 'user' ? <div className="w-2 h-2 bg-gray-500 rounded-full" /> : <Sparkles className="h-4 w-4" />}
                                </div>
                                <div className={`flex flex-col gap-2 max-w-[80%]`}>
                                    <div className={`p-4 rounded-2xl ${msg.role === 'user'
                                        ? 'bg-brand-primary text-white rounded-tr-none'
                                        : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-tl-none text-gray-800 dark:text-gray-200'
                                        }`}>
                                        <div className="prose dark:prose-invert text-sm max-w-none">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
                                                    ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-2" {...props} />,
                                                    li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
                                                    strong: ({ node, ...props }: any) => <strong className="font-semibold text-brand-primary dark:text-brand-secondary" {...props} />,
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                    {msg.suggestedItems && msg.suggestedItems.length > 0 && (
                                        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 animate-fadeIn">
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                                <ShoppingCart className="h-4 w-4 text-brand-primary" />
                                                Suggested Shopping List
                                            </h4>
                                            <ul className="space-y-2 mb-4">
                                                {msg.suggestedItems.map((item: any, i: number) => (
                                                    <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                                        <span>{item.item_name}</span>
                                                        <span className="text-xs font-medium bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                                            {item.quantity} {item.unit}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <button
                                                onClick={() => addSuggestedItems(msg.suggestedItems!)}
                                                className="w-full py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary/90 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Add All to Shopping List
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isAiLoading && (
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                                    <span className="text-sm text-gray-500">Thinking...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md">
                        {/* Suggestion Chips */}
                        {!isAiLoading && aiMessages.length <= 2 && (
                            <div className="mb-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {[
                                    "🍳 Suggest recipes with my ingredients",
                                    "📋 Create a weekly meal plan",
                                    "🛒 What should I buy this week?",
                                    "💡 Quick dinner ideas"
                                ].map((suggestion, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            setAiInput(suggestion.replace(/^[^\s]+\s/, '')); // Remove emoji
                                            setTimeout(() => {
                                                const form = document.querySelector('form');
                                                if (form) {
                                                    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                                                }
                                            }, 100);
                                        }}
                                        className="px-3 py-1.5 text-xs rounded-full bg-gradient-to-r from-brand-primary/10 to-purple-100 dark:from-brand-primary/20 dark:to-purple-900/30 text-brand-primary dark:text-brand-secondary hover:from-brand-primary/20 hover:to-purple-200 dark:hover:from-brand-primary/30 dark:hover:to-purple-800/40 transition-all hover:scale-105 border border-brand-primary/20 dark:border-brand-primary/30"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        )}

                        <form onSubmit={handleAiSend} className="flex gap-2">
                            <input
                                type="text"
                                value={aiInput}
                                onChange={e => setAiInput(e.target.value)}
                                placeholder="Ask for recipes, meal plans, or shopping advice..."
                                className="flex-1 px-4 py-3 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                disabled={isAiLoading}
                            />
                            <button
                                type="submit"
                                disabled={!aiInput.trim() || isAiLoading}
                                className="px-4 py-3 bg-brand-primary text-white rounded-xl hover:bg-brand-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default GroceriesPage;
