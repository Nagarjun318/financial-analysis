import React from 'react';
import { Menu, X, Home, User, Briefcase, TrendingUp, PieChart, LogOut, ShoppingCart, Wallet, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';

interface SidebarProps {
    currentSection: string;
    onSectionChange: (section: string) => void;
    userEmail?: string;
    onSignOut?: () => void;
    isOpen: boolean;
    onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentSection, onSectionChange, userEmail, onSignOut, isOpen, onToggle }) => {
    const navGroups = [
        {
            id: 'general',
            label: 'General',
            items: [
                { id: 'home', label: 'Home', icon: Home },
                { id: 'about', label: 'About', icon: User },
            ]
        },
        {
            id: 'lifestyle',
            label: 'Lifestyle',
            items: [
                { id: 'services', label: 'Services', icon: Briefcase },
                { id: 'groceries', label: 'Groceries', icon: ShoppingCart },
            ]
        },
        {
            id: 'finance',
            label: 'Finance',
            items: [
                { id: 'finance', label: 'Finance', icon: PieChart },
                { id: 'investment', label: 'Investment', icon: TrendingUp },
                { id: 'networth', label: 'Net Worth', icon: Wallet },
                { id: 'goals', label: 'Goals', icon: Target },
            ]
        }
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`fixed top-0 left-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-50 transition-all duration-300 ease-in-out flex flex-col ${isOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0'
                    }`}
            >
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
                    {isOpen ? (
                        <h1 className="text-xl font-bold gradient-text truncate">MyAllInOne</h1>
                    ) : (
                        <span className="text-xl font-bold gradient-text">M</span>
                    )}
                    <button
                        onClick={onToggle}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                    >
                        {isOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                    {navGroups.map((group) => (
                        <div key={group.id}>
                            {isOpen && (
                                <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {group.label}
                                </h3>
                            )}
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = currentSection === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => onSectionChange(item.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                                }`}
                                            title={!isOpen ? item.label : undefined}
                                        >
                                            <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`} />
                                            {isOpen && <span>{item.label}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    {/* Theme Switcher */}
                    <div className={`flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
                        {isOpen && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</span>}
                        <ThemeSwitcher />
                    </div>

                    {/* User Profile */}
                    {userEmail && (
                        <div className={`flex items-center gap-3 ${!isOpen && 'justify-center'}`}>
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400 font-medium">
                                {userEmail[0].toUpperCase()}
                            </div>
                            {isOpen && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {userEmail.split('@')[0]}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {userEmail}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sign Out */}
                    {onSignOut && (
                        <button
                            onClick={onSignOut}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${!isOpen && 'justify-center'
                                }`}
                            title={!isOpen ? 'Sign Out' : undefined}
                        >
                            <LogOut className="w-5 h-5 flex-shrink-0" />
                            {isOpen && <span>Sign Out</span>}
                        </button>
                    )}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
