import { Transaction, AnalysisResult } from './types.ts';
import { categorizationMap } from './categorizationMap.ts';

/**
 * Parses a date from various formats into a valid Date object using UTC.
 * @param dateInput The date input to parse.
 * @returns A Date object, or null if parsing fails.
 */
export const parseDate = (dateInput: string | number | Date): Date | null => {
    if (dateInput instanceof Date) {
        if (!isNaN(dateInput.getTime())) {
            // Ensure it's a UTC date to avoid timezone shifts
            return new Date(Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate()));
        }
    }
    
    if (typeof dateInput !== 'string' && typeof dateInput !== 'number') return null;
    const dateStr = String(dateInput).trim();
    if (!dateStr) return null;

    // Pattern 1: YYYY-MM-DD (our internal format)
    let parts = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (parts) {
        const year = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10) - 1;
        const day = parseInt(parts[3], 10);
        const date = new Date(Date.UTC(year, month, day));
        if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
            return date;
        }
    }

    // Pattern 2: dd/mm/yy or dd/mm/yyyy (from bank statement)
    parts = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (parts) {
      const day = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10) - 1;
      let year = parseInt(parts[3], 10);
      if (year < 100) year += 2000;
      const date = new Date(Date.UTC(year, month, day));
      if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
        return date;
      }
    }
    
    // Pattern 3: dd-Mon-yy or dd-Mon-yyyy (e.g., 01-Mar-2025)
    const monthMap: { [key: string]: number } = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    parts = dateStr.match(/^(\d{1,2})-([a-zA-Z]{3})-(\d{2,4})$/);
    if (parts) {
        const day = parseInt(parts[1], 10);
        const monthStr = parts[2].toLowerCase();
        const month = monthMap[monthStr];
        let year = parseInt(parts[3], 10);
        if (year < 100) year += 2000;

        if (month !== undefined) {
            const date = new Date(Date.UTC(year, month, day));
            if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
                return date;
            }
        }
    }


    // Fallback for standard JS parsing (handles MM/DD/YYYY from initial TSV)
    const standardDate = new Date(dateStr);
    if (!isNaN(standardDate.getTime())) {
        // Re-create as UTC date to strip timezone
        return new Date(Date.UTC(standardDate.getFullYear(), standardDate.getMonth(), standardDate.getDate()));
    }

    return null;
}

/**
 * Formats a Date object into a consistent YYYY-MM-DD string for internal use.
 * @param date The Date object to format.
 * @returns The formatted date string.
 */
export const formatDate = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}


/**
 * Formats a YYYY-MM-DD string into MM/DD/YYYY for display purposes.
 * @param dateStr The date string to format.
 * @returns The formatted date string for display.
 */
export const formatDisplayDate = (dateStr: string): string => {
    // SAFER: Avoid `new Date()` constructor with strings to prevent timezone bugs.
    // Directly parse the "YYYY-MM-DD" string.
    const parts = dateStr.split('-');
    if (parts.length !== 3) {
      return dateStr; // Return original if format is wrong
    }
    const [year, month, day] = parts;
    if (year.length !== 4 || month.length !== 2 || day.length !== 2) {
      return dateStr;
    }
    return `${month}/${day}/${year}`;
};


/**
 * Formats a number as Indian Rupees (INR).
 * @param amount The number to format.
 * @returns The formatted currency string.
 */
export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
};


/**
 * Determines the category of a transaction based on its description.
 * @param description The transaction description.
 * @returns The determined category string.
 */
export const getCategory = (description: string): string => {
  const desc = (description || '').toUpperCase();
  const foundCategories = new Set<string>();

  for (const [key, value] of categorizationMap.entries()) {
    if (desc.includes(key.toUpperCase())) {
      foundCategories.add(value);
    }
  }
  
  if (foundCategories.size > 0) {
    return Array.from(foundCategories).sort().join('-');
  }

  return 'Other';
};

/**
 * Processes an uploaded Excel file (.xls, .xlsx) into an array of Transaction objects.
 * This function is designed to handle bank statements where transaction data might not start at the first row.
 * @param file The uploaded file.
 * @returns A promise that resolves to an array of parsed Transaction objects.
 */
export const processXlsData = async (file: File): Promise<Transaction[]> => {
    const data = await file.arrayBuffer();
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
        throw new Error("SheetJS library (xlsx.full.min.js) is not loaded.");
    }
    const workbook = XLSX.read(data);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // DEFINITIVE FIX: Use `cellDates: true` to have SheetJS parse Excel dates into JS Date objects.
    // This is far more robust than trying to parse date strings manually with regex.
    const aoa: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false, // Ensures we get formatted strings for non-date values
        cellDates: true, // Key change: Converts date cells to JS Date objects
    });

    if (aoa.length === 0) return [];

    // Find the header row index. A valid header row should contain 'Date' and 'Narration'.
    let headerRowIndex = -1;
    for (let i = 0; i < aoa.length; i++) {
        const row = aoa[i].map(cell => String(cell || '').trim().toLowerCase());
        if (row.includes('date') && row.includes('narration')) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        throw new Error("Could not find transaction headers (e.g., 'Date', 'Narration') in the file. The parser looks for a row containing these keywords to identify where transactions begin.");
    }
    
    const headerRow = aoa[headerRowIndex].map(h => String(h || '').trim().toLowerCase());
    const dataRows = aoa.slice(headerRowIndex + 1);
    
    const findColumnIndex = (name: string): number => headerRow.indexOf(name.toLowerCase());

    const dateIndex = findColumnIndex('date');
    const narrationIndex = findColumnIndex('narration');
    const withdrawalIndex = findColumnIndex('withdrawal amt.');
    const depositIndex = findColumnIndex('deposit amt.');

    // Check if we found all essential columns as specified
    if (dateIndex === -1 || narrationIndex === -1 || withdrawalIndex === -1 || depositIndex === -1) {
        throw new Error("Could not find all required columns: 'Date', 'Narration', 'Withdrawal Amt.', and 'Deposit Amt.' in the header row. Please check the file.");
    }
    
    const transactions: Transaction[] = dataRows.map(row => {
        // Skip empty rows or separator rows
        if (row.length === 0 || String(row[0] || '').trim().startsWith('*')) {
            return null;
        }
        
        const dateInput = row[dateIndex];
        const description = row[narrationIndex];
        const debitStr = row[withdrawalIndex];
        const creditStr = row[depositIndex];

        // A row is invalid if it doesn't have a date or description.
        if (!dateInput || !description || String(description).trim() === '') {
            return null;
        }

        // The dateInput is now a JS Date object thanks to `cellDates: true`
        const parsedDate = parseDate(dateInput);
        if (!parsedDate) return null;

        // If amount value is blank, consider it 0.
        const debit = parseFloat(String(debitStr || '0').replace(/[^0-9.-]/g, '')) || 0;
        const credit = parseFloat(String(creditStr || '0').replace(/[^0-9.-]/g, '')) || 0;

        let amount = 0;
        if (credit > 0) {
            amount = credit;
        } else if (debit > 0) {
            amount = -debit;
        } else {
            // Ignore rows that don't represent a transaction (e.g., have no debit or credit).
            return null;
        }

        const type = amount > 0 ? 'credit' : 'debit';
        const category = getCategory(String(description));

        return { date: formatDate(parsedDate), description: String(description).trim(), amount, type, category };
    }).filter((t): t is Transaction => t !== null);

    return transactions;
};


/**
 * Analyzes an array of transactions to generate a financial summary.
 * @param transactions The array of transactions to analyze.
 * @returns An AnalysisResult object.
 */
export const analyzeTransactions = (transactions: Transaction[]): AnalysisResult => {
  const totalIncome = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = Math.abs(transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0));

  const netSavings = totalIncome - totalExpenses;
  
  const summary = { totalIncome, totalExpenses, netSavings };

  return { summary, transactions };
};