import React from 'react';
import { AnalysisResult, Transaction } from '../types.ts';
import { VirtualizedTransactionList } from './VirtualizedTransactionList.tsx';
import Summary from './Summary.tsx';
import ForecastSummary from './ForecastSummary.tsx';
import CategoryChart from './CategoryChart.tsx';
import TransactionList from './TransactionList.tsx';
import MonthlySummaryTable from './MonthlySummaryTable.tsx';
import TrendsChart from './TrendsChart.tsx';
import { Upload } from 'lucide-react';

interface DashboardProps {
  analysisResult: AnalysisResult;
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: number) => Promise<void>;
  userId: string; // current authenticated user id for budgets
}

export interface TransactionFilters {
  globalSearch: string;
  date: string;
  description: string;
  category: string;
  amount: string;
  type: 'debit' | 'credit' | 'all';
  monthYear: string | null; // YYYY-MM
  year: string | null; // YYYY (from monthly summary filter)
}

const initialFilters: TransactionFilters = {
  globalSearch: '',
  date: '',
  description: '',
  category: '',
  amount: '',
  type: 'all',
  monthYear: null,
  year: null,
};

const Dashboard: React.FC<DashboardProps> = ({ 
  analysisResult, 
  onFileUpload, 
  isUploading,
  onEditTransaction,
  onDeleteTransaction,
  userId,
}) => {
  const { summary, transactions: allTransactions, forecast, anomalies } = analysisResult;
  const [filters, setFilters] = React.useState(initialFilters);
  const fileInputRef = React.useRef(null);

  const handleUploadClick = () => {
    (fileInputRef.current as HTMLInputElement | null)?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          onFileUpload(file);
          // Reset file input to allow re-uploading the same file
          if(event.target) event.target.value = '';
      }
  };

  const handleFilterChange = React.useCallback((newFilters: Partial<TransactionFilters>) => {
    setFilters((prev: TransactionFilters) => ({ ...prev, ...newFilters }));
  }, []);
  
  const handleResetFilters = React.useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const handleMonthlyCellClick = React.useCallback((monthYear: string | null, transactionType: 'debit' | 'credit' | null, category: string) => {
    setFilters({
      ...initialFilters,
      monthYear,
      year: monthYear ? monthYear.substring(0,4) : null,
      type: transactionType || 'all',
      category: category === 'All' ? '' : category,
    });
    document.getElementById('transaction-list')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSummaryFiltersChange = React.useCallback(({ year, category }: { year: string; category: string }) => {
    setFilters((prev: TransactionFilters) => ({
      ...prev,
      year: year === 'All' ? null : year,
      category: category === 'All' ? '' : category,
      // Reset month-year when changing high-level year/category to avoid stale narrow filter
      monthYear: null,
    }));
  }, []);

  // Derived filtered dataset used by charts and transaction list.
  const chartFilteredTransactions = React.useMemo(() => {
    return allTransactions.filter(t => {
      const matchYear = filters.year ? t.date.startsWith(filters.year) : true;
      const matchMonthYear = filters.monthYear ? t.date.startsWith(filters.monthYear) : true;
      const matchCategory = filters.category ? t.category.toLowerCase().includes(filters.category.toLowerCase()) : true;
      return matchYear && matchMonthYear && matchCategory;
    });
  }, [allTransactions, filters.year, filters.monthYear, filters.category]);

  const filteredTransactions = React.useMemo(() => {
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
        id="file-upload"
        name="file-upload"
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
  <ForecastSummary forecast={forecast} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CategoryChart transactions={chartFilteredTransactions} />
        <TrendsChart transactions={chartFilteredTransactions} />
      </div>
      
  <MonthlySummaryTable userId={userId} transactions={allTransactions} onCellClick={handleMonthlyCellClick} onFiltersChange={handleSummaryFiltersChange} />

      <div id="transaction-list" className="mt-4">
        {filteredTransactions.length > 800 ? (
          <div className="space-y-3">
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Showing virtualized list for performance (total {filteredTransactions.length}).</p>
            <VirtualizedTransactionList
              transactions={filteredTransactions}
              onEdit={onEditTransaction}
              onDelete={onDeleteTransaction}
              height={640}
              rowHeight={50}
            />
          </div>
        ) : (
          <TransactionList 
            transactions={filteredTransactions} 
            filters={filters}
            anomalies={anomalies}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            onEdit={onEditTransaction}
            onDelete={onDeleteTransaction}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;