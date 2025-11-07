import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import StagingModal from './components/StagingModal';
import EditTransactionModal from './components/EditTransactionModal';
import { Transaction, AnalysisResult } from './types';
import { processXlsData, analyzeTransactions, getCategory } from './utils';

const emptyAnalysisResult: AnalysisResult = {
  summary: { totalIncome: 0, totalExpenses: 0, netSavings: 0 },
  transactions: [],
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>(emptyAnalysisResult);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Staging transactions from file upload
  const [stagedTransactions, setStagedTransactions] = useState<Transaction[]>([]);
  const [isStagingModalOpen, setIsStagingModalOpen] = useState(false);
  const [stagedFileName, setStagedFileName] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  
  // Editing transaction
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  /*
  // Original Supabase auth logic
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);
  */

  // MOCK USER - LOGIN BYPASS
  useEffect(() => {
    console.log("Using mock user session to bypass login.");
    const mockSession: Session = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: '0f8b9ddd-58bd-4d54-ad5b-8938936bce06', // User-provided ID
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      },
    };
    setSession(mockSession);
  }, []);


  const fetchTransactions = useCallback(async () => {
    if (!session?.user) return;

    setLoading(true);
    setError(null);
    try {
      let allTransactionsData: any[] = [];
      let page = 0;
      const pageSize = 1000; // Max rows per Supabase request

      while (true) {
        const { data, error: dbError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', session.user.id)
          .order('date', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (dbError) throw dbError;

        if (data) {
          allTransactionsData = allTransactionsData.concat(data);
        }

        // If fewer than max rows are returned, we've reached the last page
        if (!data || data.length < pageSize) {
          break;
        }

        page++;
      }
      
      const transactions: Transaction[] = allTransactionsData.map((t: any) => ({
          id: t.id,
          user_id: t.user_id,
          date: t.date,
          description: t.Description,
          amount: t.Amount,
          category: t.Category,
          type: t.Amount >= 0 ? 'credit' : 'debit'
      }));

      setAnalysisResult(analyzeTransactions(transactions));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transactions.');
      console.error('Error fetching transactions:', err);
      setAnalysisResult(emptyAnalysisResult);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchTransactions();
    } else {
      setAnalysisResult(emptyAnalysisResult);
      setLoading(false);
    }
  }, [session, fetchTransactions]);

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
        const transactionsToInsert = stagedTransactions.map(t => ({
            date: t.date,
            Description: t.description,
            Amount: t.amount,
            Category: t.category,
            user_id: session.user.id,
        }));

        const { error: dbError } = await supabase.from('transactions').insert(transactionsToInsert);
        if (dbError) throw dbError;
        
        setIsStagingModalOpen(false);
        setStagedTransactions([]);
        setStagedFileName(null);
        await fetchTransactions(); // Refresh data
    } catch(err: any) {
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
            Description: updatedTransaction.description,
            Amount: updatedTransaction.amount,
            Category: category,
        };

        const { error: dbError } = await supabase
            .from('transactions')
            .update(transactionToUpdate)
            .eq('id', updatedTransaction.id);
        
        if (dbError) throw dbError;
        
        setIsEditModalOpen(false);
        setEditingTransaction(null);
        await fetchTransactions();
    } catch (err: any) {
        setError(err.message || 'Failed to update transaction.');
        console.error('Error updating transaction:', err);
    }
  };


  const handleDeleteTransaction = async (transactionId: number) => {
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (dbError) throw dbError;
      
      await fetchTransactions();
    } catch (err: any) {
      setError(err.message || 'Failed to delete transaction.');
      console.error('Error deleting transaction:', err);
    }
  };

  if (!session) {
    // With login bypass, this will only show briefly before the mock session is set.
    return (
        <div className="flex justify-center items-center h-screen">
            <p>Initializing...</p>
        </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text font-sans">
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="flex justify-center items-center h-screen">
            <p>Loading transactions...</p>
          </div>
        ) : (
          <Dashboard
            analysisResult={analysisResult}
            onFileUpload={handleFileUpload}
            isUploading={isUploading}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
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