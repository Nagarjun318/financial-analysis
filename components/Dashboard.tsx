import React, { useState, useMemo, useCallback, useRef } from 'react';
import { AnalysisResult, Transaction } from '../types';
import Summary from './Summary';
import CategoryChart from './CategoryChart';
import TransactionList from './TransactionList';
import MonthlySummaryTable from './MonthlySummaryTable';
import TrendsChart from './TrendsChart';
import { Upload } from 'lucide-react';

interface DashboardProps {
  analysisResult: AnalysisResult;
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: number) => Promise<void>;
}

export interface TransactionFilters {
  globalSearch: string;
  date: string;
  description: string;
  category: string;
  amount: string;
  type: 'debit' | 'credit' | 'all';
  monthYear: string | null; // YYYY-MM
}

const initialFilters: TransactionFilters = {
  globalSearch: '',
  date: '',
  description: '',
  category: '',
  amount: '',
  type: 'all',
  monthYear: null,
};

const Dashboard: React.FC<DashboardProps> = ({ 
    analysisResult, 
    onFileUpload, 
    isUploading,
    onEditTransaction,
    onDeleteTransaction,
}) => {
  const { summary, transactions: allTransactions } = analysisResult;
  const [filters, setFilters] = useState<TransactionFilters>(initialFilters);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          onFileUpload(file);
          // Reset file input to allow re-uploading the same file
          if(event.target) event.target.value = '';
      }
  };

  const handleFilterChange = useCallback((newFilters: Partial<TransactionFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);
  
  const handleResetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const handleMonthlyCellClick = useCallback((monthYear: string | null, transactionType: 'debit' | 'credit' | null, category: string) => {
    setFilters({
      ...initialFilters,
      monthYear: monthYear,
      type: transactionType || 'all',
      category: category === 'All' ? '' : category,
    });
    // Scroll to the transaction list for better UX
    document.getElementById('transaction-list')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      const matchGlobal = filters.globalSearch
        ? Object.values(t).some(val => String(val).toLowerCase().includes(filters.globalSearch.toLowerCase()))
        : true;

      const matchDate = filters.date ? t.date.includes(filters.date) : true;
      const matchDescription = filters.description ? t.description.toLowerCase().includes(filters.description.toLowerCase()) : true;
      const matchCategory = filters.category ? t.category.toLowerCase().includes(filters.category.toLowerCase()) : true;
      
      const matchAmount = filters.amount ? String(Math.abs(t.amount)).includes(filters.amount) : true;
      
      const matchType = filters.type === 'all' || t.type === filters.type;
      
      const matchMonthYear = filters.monthYear
        ? t.date.startsWith(filters.monthYear)
        : true;
        
      return matchGlobal && matchDate && matchDescription && matchCategory && matchAmount && matchType && matchMonthYear;
    });
  }, [allTransactions, filters]);


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-3xl font-bold text-light-text dark:text-dark-text">Financial Overview</h2>
        <div className="flex items-center">
            <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".xls,.xlsx"
            />
            <button
                onClick={handleUploadClick}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
                <Upload className="h-5 w-5" />
                {isUploading ? 'Processing...' : 'Upload XLS File'}
            </button>
        </div>
      </div>

      <Summary summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CategoryChart transactions={allTransactions} />
        <TrendsChart transactions={allTransactions} />
      </div>
      
      <MonthlySummaryTable transactions={allTransactions} onCellClick={handleMonthlyCellClick} />

      <div id="transaction-list">
        <TransactionList 
          transactions={filteredTransactions} 
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          onEdit={onEditTransaction}
          onDelete={onDeleteTransaction}
        />
      </div>
    </div>
  );
};

export default Dashboard;