import React from 'react';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import SetupInstructions from './components/SetupInstructions.tsx';
import { Session } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar.tsx';
import HomePage from './components/HomePage.tsx';
// import DocumentsPage from './components/DocumentsPage.tsx';
import AboutPage from './components/AboutPage.tsx';
import ServicesPage from './components/ServicesPage.tsx';
import InvestmentPage from './components/InvestmentPage.tsx';
import GroceriesPage from './components/GroceriesPage.tsx';
import NetWorthPage from './components/NetWorthPage.tsx';
import GoalsPage from './components/GoalsPage.tsx';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import StagingModal from './components/StagingModal';
import EditTransactionModal from './components/EditTransactionModal';
import { AnalyticsPage } from './components/AnalyticsPage';
import { Transaction, AnalysisResult } from './types';
import { processXlsData, analyzeTransactions, getCategory } from './utils';
import { useTransactions } from './hooks/useTransactions.ts';
import { makeTransactionKey, filterDuplicateStaged } from './domain/transactions/dedupe.ts';
import DocumentsPage from './components/DocumentsPage.tsx';
import WeatherBackground from './components/WeatherBackground.tsx';
import { getWeatherData } from './services/weatherService';
import { WeatherProvider, useWeather } from './contexts/WeatherContext.tsx';

const emptyAnalysisResult: AnalysisResult = {
  summary: { totalIncome: 0, totalExpenses: 0, netSavings: 0 },
  transactions: [],
};

const App: React.FC = () => {
  const [session, setSession] = React.useState(null as Session | null);
  const [currentSection, setCurrentSection] = React.useState('home');
  const [analysisResult, setAnalysisResult] = React.useState(emptyAnalysisResult as AnalysisResult);
  const [loading, setLoading] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState(null as string | null);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [weatherCondition, setWeatherCondition] = React.useState<string>();
  const [weatherTemperature, setWeatherTemperature] = React.useState<number>();

  // Fetch weather on initial load
  React.useEffect(() => {
    handleWeatherRefresh();
  }, []);

  // Weather refresh handler
  const handleWeatherRefresh = async () => {
    try {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const location = `${latitude},${longitude}`;
          const weather = await getWeatherData(location);
          
          if (weather && weather.temperature !== undefined) {
            setWeatherCondition(weather.condition);
            setWeatherTemperature(weather.temperature);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not get your location. Please enable location services.');
        }
      );
    } catch (error) {
      console.error('Error refreshing weather:', error);
      alert('Failed to refresh weather data');
    }
  };

  // Debug weather state changes
  React.useEffect(() => {
    console.log('[App] Weather updated:', { weatherCondition, weatherTemperature });
  }, [weatherCondition, weatherTemperature]);

  // Staging transactions from file upload
  const [stagedTransactions, setStagedTransactions] = React.useState([] as Transaction[]);
  const [isStagingModalOpen, setIsStagingModalOpen] = React.useState(false);
  const [stagedFileName, setStagedFileName] = React.useState(null as string | null);
  const [isConfirming, setIsConfirming] = React.useState(false);

  // Editing transaction
  const [editingTransaction, setEditingTransaction] = React.useState(null as Transaction | null);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);

  // Supabase auth logic
  React.useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);


  const { transactions, isLoading, insert, update, remove, refetch } = useTransactions(session?.user?.id);

  React.useEffect(() => {
    if (!session) {
      setAnalysisResult(emptyAnalysisResult);
      setLoading(false);
      return;
    }
    if (isLoading) {
      setLoading(true);
      return;
    }
    setLoading(false);
    setAnalysisResult(analyzeTransactions(transactions));
  }, [session, isLoading, transactions]);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const transactions = await processXlsData(file);
      setStagedTransactions(transactions);
      setStagedFileName(file.name);
      setIsStagingModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to process file.');
      console.error('File processing error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmStagedTransactions = async () => {
    if (!session?.user || stagedTransactions.length === 0) return;
    setIsConfirming(true);
    setError(null);
    try {
      // Build existing key set for dedupe (client-side only)
      const existingKeySet = new Set<string>(analysisResult.transactions.map((t: Transaction) => makeTransactionKey({
        date: t.date,
        description: t.description,
        amount: t.amount,
        category: t.category,
        type: t.type,
      })));

      const { newOnes, duplicateCount } = filterDuplicateStaged(stagedTransactions, existingKeySet);
      if (newOnes.length === 0) {
        setError(`All ${stagedTransactions.length} staged transactions are duplicates of existing records. Nothing inserted.`);
        setIsConfirming(false);
        return;
      }

      type TransactionInsertRow = {
        date: string;
        Description: string;
        Amount: number;
        Category: string;
        AI_Category?: string | null;
        user_id: string;
      };

      const transactionsToInsert: TransactionInsertRow[] = newOnes.map(t => ({
        date: t.date,
        Description: t.description,
        Amount: t.amount,
        Category: t.category,
        AI_Category: t.ai_category || null,
        user_id: session.user.id,
      }));

      await insert(transactionsToInsert.map(r => ({
        user_id: r.user_id,
        date: r.date,
        description: r.Description,
        amount: r.Amount,
        category: r.Category,
        ai_category: r.AI_Category,
      })) as any);

      setIsStagingModalOpen(false);
      setStagedTransactions([]);
      setStagedFileName(null);
      await refetch();

      if (duplicateCount > 0) {
        setError(`Inserted ${transactionsToInsert.length} new transactions. Skipped ${duplicateCount} duplicates.`);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An unknown database error occurred. Please check the console.';
      setError(`Failed to save transactions. Reason: ${errorMessage}`);
      console.error('Error saving transactions:', err);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleConfirmEdit = async (updatedTransaction: Transaction) => {
    if (!updatedTransaction.id) return;
    setError(null);
    try {
      // Recalculate category in case description changed
      const transactionToUpdate = {
        date: updatedTransaction.date,
        description: updatedTransaction.description,
        amount: updatedTransaction.amount,
        category: updatedTransaction.category,
        ai_category: updatedTransaction.ai_category,
      };

      await update({ id: updatedTransaction.id, values: transactionToUpdate } as any);
      setIsEditModalOpen(false);
      setEditingTransaction(null);
      await refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to update transaction.');
      console.error('Error updating transaction:', err);
    }
  };


  const handleDeleteTransaction = async (transactionId: number) => {
    setError(null);
    try {
      await remove(transactionId as any);
      await refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to delete transaction.');
      console.error('Error deleting transaction:', err);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      // Clear Supabase session from all storage locations manually
      // This avoids 403 errors from the signOut API
      if (typeof window !== 'undefined') {
        // Clear from localStorage
        Object.keys(localStorage)
          .filter(k => k.toLowerCase().includes('supabase'))
          .forEach(k => localStorage.removeItem(k));

        // Clear from sessionStorage
        Object.keys(sessionStorage)
          .filter(k => k.toLowerCase().includes('supabase'))
          .forEach(k => sessionStorage.removeItem(k));

        // Clear Supabase cookies
        document.cookie.split(';').forEach(cookie => {
          const cookieName = cookie.split('=')[0].trim();
          if (cookieName.toLowerCase().includes('supabase') || cookieName.includes('sb-')) {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
          }
        });
      }

      // Clear application state
      setSession(null);
      setAnalysisResult(emptyAnalysisResult);
      setCurrentSection('home');
    } catch (e: any) {
      console.warn('[signout]', e);
      // Ensure session is cleared even if there's an error
      setSession(null);
      setAnalysisResult(emptyAnalysisResult);
      setCurrentSection('home');
    }
  };

  if (!isSupabaseConfigured) {
    return <SetupInstructions />;
  }

  return (
    <div className="min-h-screen text-light-text dark:text-dark-text font-sans relative">
      {/* Weather Background */}
      <WeatherBackground 
        condition={weatherCondition} 
        temperature={weatherTemperature}
      />
      
      <Sidebar
        currentSection={currentSection}
        onSectionChange={(section) => {
          if (section === 'auth' && !session) {
            setShowAuthModal(true);
          } else {
            setCurrentSection(section);
          }
        }}
        userEmail={session?.user?.email}
        onSignOut={session ? handleSignOut : undefined}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        weatherCondition={weatherCondition}
        weatherTemperature={weatherTemperature}
        onWeatherRefresh={handleWeatherRefresh}
      />

      <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex justify-center items-center h-[60vh]">
              <p className="text-lg font-medium text-gray-600 dark:text-gray-300 animate-pulse">
                {currentSection === 'finance'
                  ? 'Loading transactions...'
                  : currentSection === 'home'
                    ? 'Loading your dashboard...'
                    : currentSection === 'about'
                      ? 'Loading about page...'
                      : currentSection === 'services'
                        ? 'Loading services...'
                        : currentSection === 'investment'
                          ? 'Loading investment data...'
                          : currentSection === 'groceries'
                            ? 'Loading groceries...'
                            : currentSection === 'networth'
                              ? 'Loading net worth overview...'
                              : currentSection === 'goals'
                                ? 'Loading goals...'
                                : currentSection === 'analytics'
                                  ? 'Loading analytics...'
                                  : 'Loading...'}
              </p>
            </div>
          ) : (
            <>
              <div className="container mx-auto px-4 py-8">
                {currentSection === 'home' && <HomePage />}
                {currentSection === 'about' && <AboutPage />}
                {currentSection === 'services' && <ServicesPage userId={session?.user?.id} />}
                {currentSection === 'finance' && (
                  <Dashboard
                    analysisResult={analysisResult}
                    onFileUpload={handleFileUpload}
                    isUploading={isUploading}
                    onEditTransaction={handleEditTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                    onRefreshData={refetch}
                    userId={session?.user?.id || ''}
                    isLoggedIn={!!session}
                  />
                )}
                {currentSection === 'investment' && <InvestmentPage userId={session?.user?.id} />}
                {currentSection === 'groceries' && (
                  <GroceriesPage 
                    userId={session?.user?.id} 
                    onWeatherUpdate={(condition, temp) => {
                      setWeatherCondition(condition);
                      setWeatherTemperature(temp);
                    }}
                  />
                )}
                {currentSection === 'networth' && (
                  <NetWorthPage
                    transactions={analysisResult.transactions}
                    userId={session?.user?.id}
                  />
                )}
                {currentSection === 'goals' && (
                  <GoalsPage
                    userId={session?.user?.id}
                    transactions={analysisResult.transactions}
                  />
                )}
                {currentSection === 'analytics' && (
                  <AnalyticsPage
                    transactions={analysisResult.transactions}
                    userId={session?.user?.id}
                  />
                )}
                {currentSection === 'documents' && <DocumentsPage session={session} />}
              </div>
            </>
          )}
          {error &&
            <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50">
              <div className="flex items-center justify-between">
                <p className="font-semibold pr-4">{error}</p>
                <button onClick={() => setError(null)} className="text-xl font-bold leading-none">&times;</button>
              </div>
            </div>
          }
        </main>

        <StagingModal
          isOpen={isStagingModalOpen}
          onClose={() => setIsStagingModalOpen(false)}
          transactions={stagedTransactions}
          onConfirm={handleConfirmStagedTransactions}
          onTransactionsUpdate={setStagedTransactions}
          fileName={stagedFileName}
          isConfirming={isConfirming}
        />

        {editingTransaction && (
          <EditTransactionModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            transaction={editingTransaction}
            onConfirm={handleConfirmEdit}
          />
        )}

        {/* Auth Modal */}
        {showAuthModal && !session && (
          <Auth isModal={true} onClose={() => setShowAuthModal(false)} />
        )}
      </div>
    </div>
  );
};

export default App;