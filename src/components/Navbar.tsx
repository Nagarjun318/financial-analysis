import React from 'react';
import { Menu, X, Home, User, Briefcase, TrendingUp, PieChart, LogOut, ShoppingCart } from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher.tsx';

interface NavbarProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
  userEmail?: string;
  onSignOut?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentSection, onSectionChange, userEmail, onSignOut }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'about', label: 'About', icon: User },
    { id: 'services', label: 'Services', icon: Briefcase },
    { id: 'finance', label: 'Finance', icon: PieChart },
    { id: 'investment', label: 'Investment', icon: TrendingUp },
    { id: 'groceries', label: 'Groceries', icon: ShoppingCart },
  ];

  const handleNavClick = (sectionId: string) => {
    onSectionChange(sectionId);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="glass-panel sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold gradient-text">MyAllInOne</h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-baseline space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                      ? 'rainbow-text bg-indigo-50 dark:bg-indigo-900/30'
                      : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            {userEmail && (
              <>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                <span className="text-sm text-gray-600 dark:text-gray-300">{userEmail}</span>
              </>
            )}
            <ThemeSwitcher />
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-red-500 transition border border-red-200 dark:border-red-800"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeSwitcher />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md transition-colors"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden animate-fadeIn">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200 dark:border-gray-700">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${isActive
                      ? 'rainbow-text bg-indigo-50 dark:bg-indigo-900/30'
                      : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
              {userEmail && (
                <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 mt-2 pt-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Signed in as:</div>
                  <div className="text-sm text-gray-700 dark:text-gray-200 mb-3">{userEmail}</div>
                  {onSignOut && (
                    <button
                      onClick={onSignOut}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-red-500 transition border border-red-200 dark:border-red-800"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;