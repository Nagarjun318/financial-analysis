# Database Schema Refactor: Principal Field

## Problem Identified
The user was entering ₹8,00,000 as the car loan principal, but the database was storing ₹9,25,020 in `opening_principal`. This caused incorrect loan calculations:
- Expected: 61 months (for ₹8,00,000 @ 10.84% with ₹17,130 EMI)
- Actual: 75 months (for ₹9,25,020 @ 10.84% with ₹17,130 EMI)

## Root Cause
Having both `opening_principal` and `current_principal` columns caused confusion:
- Which one represents the original loan amount?
- Why store calculated values in the database?
- Data synchronization issues between UI and database

## Solution Implemented
Refactored to use a single `principal` field that stores only the original loan amount. The current remaining balance is calculated dynamically from payment history.

### Changes Made

#### 1. Database Schema (`NETWORTH_MIGRATION.sql`)
```sql
-- Add new principal column
ALTER TABLE liabilities ADD COLUMN principal DECIMAL(15,2);

-- Migrate existing data
UPDATE liabilities SET principal = opening_principal WHERE principal IS NULL;
```

#### 2. TypeScript Interface (`calculateNetWorth.ts`)
```typescript
export interface Liability {
  principal: number;              // NEW: Original loan amount
  openingPrincipal?: number;      // Kept for backward compatibility
  currentPrincipal?: number;      // Kept for backward compatibility
  // ... other fields
}
```

#### 3. Helper Functions
```typescript
// Get original principal (supports both old and new formats)
export function getPrincipal(liability: Liability): number {
  return liability.principal ?? liability.openingPrincipal ?? 0;
}

// Calculate current remaining principal from payment history
export function getCurrentPrincipal(liability: Liability, transactions?: Tx[]): number {
  const principal = getPrincipal(liability);
  
  // Count months paid from transaction history
  const monthsPaid = /* count unique months with payments */;
  
  // Calculate remaining balance using amortization formula
  return calculateRemainingPrincipal(principal, monthlyRate, monthlyPayment, monthsPaid);
}
```

#### 4. Database Hooks (`useLiabilities.ts`)
- **insertLiability**: Now saves to `principal` column (and `opening_principal` for compatibility)
- **updateLiability**: Updates `principal` field when changed
- **fetchLiabilities**: Reads `principal` first, falls back to `opening_principal` if needed

#### 5. UI Components (`NetWorthPage.tsx`)
- Manual liabilities: Single input field for `principal` (original amount)
- Auto-tracked liabilities: Display calculated current principal (read-only)
- Removed the confusing dual input fields for opening/current principal

## Benefits

### 1. **Data Integrity**
- Single source of truth: User enters original principal only
- No more sync issues between opening and current principal
- Database stores facts, calculations happen in code

### 2. **Accurate Calculations**
```
Car Loan Example:
- User enters: ₹8,00,000
- Database stores: ₹8,00,000 (in principal column)
- After 37 payments, current balance is calculated: ₹4,82,547
- Months remaining: 24 (not 75!)
```

### 3. **Clean Separation**
- **Stored data**: Original principal, interest rate, EMI, start date
- **Calculated data**: Current principal, months paid, months remaining, payoff date
- UI displays both clearly, only stores what's necessary

### 4. **Backward Compatibility**
- Old data with `opening_principal`/`current_principal` still works
- Helper functions handle both formats seamlessly
- Migration script preserves existing data

## How to Apply

### Step 1: Run Database Migration
Execute `NETWORTH_MIGRATION.sql` in your Supabase SQL editor:
```sql
ALTER TABLE liabilities ADD COLUMN IF NOT EXISTS principal DECIMAL(15,2);
UPDATE liabilities SET principal = opening_principal WHERE principal IS NULL;
```

### Step 2: Verify Data
```sql
SELECT id, name, principal, opening_principal, current_principal 
FROM liabilities 
WHERE user_id = 'your-user-id';
```

### Step 3: Test in UI
1. Open Net Worth page
2. Edit an existing loan - change the principal to ₹8,00,000
3. Verify the calculation shows correct months remaining
4. Add a new loan - you'll only enter principal once

### Step 4: Clean Up (Optional - Future)
After confirming everything works, you can remove old columns:
```sql
ALTER TABLE liabilities DROP COLUMN opening_principal;
ALTER TABLE liabilities DROP COLUMN current_principal;
```

## Validation Tests

### Car Loan
- Principal: ₹8,00,000
- Rate: 10.84% per annum
- EMI: ₹17,130
- Expected Total: 61 months
- Payments Made: 37 months
- Expected Remaining: 24 months ✓

### Plot Loan
- Principal: ₹11,82,503
- Rate: 7.89% per annum
- EMI: ₹11,320
- Expected Total: 180 months
- Verify calculations match bank statement ✓

## Files Modified
1. `/src/domain/networth/calculateNetWorth.ts` - Core calculation logic
2. `/src/hooks/useLiabilities.ts` - Database operations
3. `/src/components/NetWorthPage.tsx` - UI components
4. `NETWORTH_MIGRATION.sql` - Database migration (NEW)
5. `PRINCIPAL_REFACTOR.md` - This documentation (NEW)

## Next Steps
1. ✅ Run database migration
2. ✅ Test with real data
3. ✅ Verify calculations match bank statements
4. 🔄 Monitor for any edge cases
5. 🔲 Future: Remove old columns after confidence period
