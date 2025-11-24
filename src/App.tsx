import React from 'react';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import SetupInstructions from './components/SetupInstructions.tsx';
import { Session } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar.tsx';
import HomePage from './components/HomePage.tsx';
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
import { Transaction, AnalysisResult } from './types';
import { processXlsData, analyzeTransactions, getCategory } from './utils';
import { useTransactions } from './hooks/useTransactions.ts';
import { makeTransactionKey, filterDuplicateStaged } from './domain/transactions/dedupe.ts';

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
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

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
      if (supabase) {
        // Try standard global scope signout first
        const { error: signOutErr } = await supabase.auth.signOut({ scope: 'global' } as any);
        if (signOutErr) {
          // Fallback: basic signOut (some versions expect no args)
          const { error: fallbackErr } = await (supabase.auth as any).signOut();
          if (fallbackErr) {
            // As last resort, clear local storage tokens manually
            try {
              Object.keys(localStorage)
                .filter(k => k.toLowerCase().includes('supabase'))
                .forEach(k => localStorage.removeItem(k));
            } catch { }
            setError('Sign out encountered an auth 403. Local session cleared locally.');
          }
        }
      }
      setSession(null);
      setAnalysisResult(emptyAnalysisResult);
    } catch (e: any) {
      console.error('[signout] unexpected error', e);
      setError(e.message || 'Unexpected sign out error');
      setSession(null);
    }
  };

  if (!isSupabaseConfigured) {
    return <SetupInstructions />;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text font-sans">
      <Sidebar
        currentSection={currentSection}
        onSectionChange={setCurrentSection}
        userEmail={session.user?.email}
        onSignOut={handleSignOut}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex justify-center items-center h-[60vh]">
              <p className="text-lg font-medium text-gray-600 dark:text-gray-300 animate-pulse">Loading transactions...</p>
            </div>
          ) : (
            <>
              <div className="container mx-auto px-4 py-8">
                {currentSection === 'home' && <HomePage />}
                {currentSection === 'about' && <AboutPage />}
                {currentSection === 'services' && <ServicesPage />}
                {currentSection === 'finance' && (
                  <Dashboard
                    analysisResult={analysisResult}
                    onFileUpload={handleFileUpload}
                    isUploading={isUploading}
                    onEditTransaction={handleEditTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                    onRefreshData={refetch}
                    userId={session.user.id}
                  />
                )}
                {currentSection === 'investment' && <InvestmentPage />}
                {currentSection === 'groceries' && <GroceriesPage userId={session.user.id} />}
                {currentSection === 'networth' && (
                  <NetWorthPage
                    transactions={analysisResult.transactions}
                    userId={session.user.id}
                  />
                )}
                {currentSection === 'goals' && (
                  <GoalsPage
                    userId={session.user.id}
                    transactions={analysisResult.transactions}
                  />
                )}
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
      </div>
    </div>
  );
};

export default App;