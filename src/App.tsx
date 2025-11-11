import React from 'react';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import SetupInstructions from './components/SetupInstructions.tsx';
import { Session } from '@supabase/supabase-js';
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
  const [analysisResult, setAnalysisResult] = React.useState(emptyAnalysisResult as AnalysisResult);
  const [loading, setLoading] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState(null as string | null);

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
        user_id: string;
      };

      const transactionsToInsert: TransactionInsertRow[] = newOnes.map(t => ({
        date: t.date,
        Description: t.description,
        Amount: t.amount,
        Category: t.category,
        user_id: session.user.id,
      }));

      await insert(transactionsToInsert.map(r => ({
        user_id: r.user_id,
        date: r.date,
        description: r.Description,
        amount: r.Amount,
        category: r.Category,
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
        const category = getCategory(updatedTransaction.description);
    const transactionToUpdate = {
      date: updatedTransaction.date,
      description: updatedTransaction.description,
      amount: updatedTransaction.amount,
      category: category,
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
            } catch {}
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
      <header className="w-full mb-4 rounded-b-2xl bg-gradient-to-r from-brand-primary via-fuchsia-600 to-rose-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-600 shadow-lg shadow-indigo-600/30 dark:shadow-indigo-900/40 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 mix-blend-overlay animate-[headerShift_24s_linear_infinite] motion-reduce:animate-none" style={{background:'linear-gradient(120deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05), rgba(255,255,255,0.2))'}}></div>
        <div className="container mx-auto p-4 flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-pink-200 to-purple-200 drop-shadow-sm">Finance Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm opacity-80">{session.user?.email}</span>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-md text-sm font-semibold bg-white/15 backdrop-blur-sm text-white hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="flex justify-center items-center h-[60vh]">
            <p className="text-lg font-medium bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 animate-pulse">Loading transactions...</p>
          </div>
        ) : (
          <Dashboard
            analysisResult={analysisResult}
            onFileUpload={handleFileUpload}
            isUploading={isUploading}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            userId={session.user.id}
          />
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
  );
};

export default App;