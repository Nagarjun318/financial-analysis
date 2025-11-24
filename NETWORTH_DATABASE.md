# Net Worth Database Schema

## Tables Created

### `assets` Table
Stores user assets (investments, property, cash, etc.)

```sql
Column            | Type           | Description
-----------------|----------------|------------------------------------------
id               | UUID           | Primary key (auto-generated)
user_id          | UUID           | Foreign key to auth.users
name             | TEXT           | Asset name (e.g., "Mutual Funds")
type             | TEXT           | 'cash', 'investment', 'property', 'other'
current_value    | DECIMAL(15,2)  | Current asset value
last_updated     | DATE           | Last update date
created_at       | TIMESTAMPTZ    | Record creation timestamp
updated_at       | TIMESTAMPTZ    | Last modification timestamp
```

**Constraints:**
- `type` must be one of: 'cash', 'investment', 'property', 'other'
- Row Level Security (RLS) enabled - users can only access their own assets

### `liabilities` Table
Stores user liabilities (loans, credit cards, etc.)

```sql
Column                  | Type           | Description
-----------------------|----------------|------------------------------------------
id                     | UUID           | Primary key (auto-generated)
user_id                | UUID           | Foreign key to auth.users
name                   | TEXT           | Liability name (e.g., "Car Loan")
type                   | TEXT           | 'loan', 'credit', 'other'
opening_principal      | DECIMAL(15,2)  | Original loan amount
current_principal      | DECIMAL(15,2)  | Current outstanding balance
interest_rate_annual   | DECIMAL(5,2)   | Annual interest rate (%)
monthly_emi            | DECIMAL(15,2)  | Monthly EMI payment
extra_payment_monthly  | DECIMAL(15,2)  | Extra monthly payment (optional)
start_date             | DATE           | Loan start date
created_at             | TIMESTAMPTZ    | Record creation timestamp
updated_at             | TIMESTAMPTZ    | Last modification timestamp
```

**Constraints:**
- `type` must be one of: 'loan', 'credit', 'other'
- Row Level Security (RLS) enabled - users can only access their own liabilities

## Indexes

```sql
CREATE INDEX idx_assets_user_id ON assets(user_id);
CREATE INDEX idx_liabilities_user_id ON liabilities(user_id);
```

These indexes improve query performance when filtering by user_id.

## Row Level Security (RLS) Policies

Both tables have RLS enabled with policies that ensure:

1. **SELECT**: Users can only view their own records
2. **INSERT**: Users can only insert records with their own user_id
3. **UPDATE**: Users can only update their own records
4. **DELETE**: Users can only delete their own records

## API Integration

### Hooks Created

**`useAssets(userId)`**
- `assets`: Array of user's assets
- `isLoading`: Loading state
- `error`: Error message if any
- `insertAsset(asset)`: Add new asset
- `updateAsset(id, updates)`: Update existing asset
- `deleteAsset(id)`: Delete asset
- `refetch()`: Manually refresh data

**`useLiabilities(userId)`**
- `liabilities`: Array of user's liabilities
- `isLoading`: Loading state
- `error`: Error message if any
- `insertLiability(liability)`: Add new liability
- `updateLiability(id, updates)`: Update existing liability
- `deleteLiability(id)`: Delete liability
- `refetch()`: Manually refresh data

## Usage Example

```typescript
// In NetWorthPage component
const { assets, insertAsset, updateAsset, deleteAsset } = useAssets(userId);
const { liabilities, insertLiability, updateLiability, deleteLiability } = useLiabilities(userId);

// Add new asset
await insertAsset({
  name: 'Mutual Funds',
  type: 'investment',
  currentValue: 350000,
  lastUpdated: '2025-11-21'
});

// Update asset value
await updateAsset(assetId, { currentValue: 375000 });

// Delete asset
await deleteAsset(assetId);
```

## Data Flow

1. **Component Mount**: Hooks automatically fetch data from Supabase
2. **Auto-tracking from Transactions**: 
   - **Investments**: Automatically tracks investment purchases (Mutual Fund, SIP, NPS, PPF, etc.)
   - **Loans**: Detects EMI patterns and creates auto-tracked liabilities
   - **Cash**: Net of all credits minus debits
3. **User Edits**: All changes trigger async database operations
4. **Auto Refresh**: After insert/update/delete, data is automatically refetched
5. **Real-time**: Changes sync across devices (Supabase handles this)

## Auto-Tracking Features

### Investment Tracking
The system automatically creates asset entries based on transaction categories:
- **Investment categories detected**: Investment, Mutual Fund, Stocks, SIP, NPS, PPF, FD, Bonds
- **Debit transactions**: Counted as investment purchases (money going out)
- **Credit transactions**: Counted as redemptions (money coming back)
- **Auto-created assets**: Named with "(Auto)" suffix and highlighted in green

### Loan/EMI Tracking
The system detects recurring loan payments:
- **Loan categories detected**: Loan, EMI, Mortgage, Credit Card
- **Pattern detection**: Requires at least 2 payments to identify as EMI
- **Auto-estimated values**: 
  - Average EMI calculated from payment history
  - Principal estimated based on typical loan duration
  - Default interest rate of 10%
- **Auto-created liabilities**: Named with "(Auto)" suffix and highlighted in purple

### Cash Balance
- Automatically calculated as: Total Credits - Total Debits
- Always shown as "Cash Balance (Auto-calculated)"
- Cannot be edited manually
- Updates in real-time with new transactions

## Benefits

✅ **Persistent Data**: No more data loss on page refresh  
✅ **Multi-device Sync**: Access your net worth from any device  
✅ **Auto-tracking**: Investments and loans automatically tracked from transactions  
✅ **Smart Detection**: Recognizes investment and EMI patterns  
✅ **Secure**: RLS ensures users can only access their own data  
✅ **Backup**: Data stored safely in Supabase cloud  
✅ **Scalable**: Can add more features like historical snapshots  
✅ **Real-time Cash**: Cash balance updates automatically with transactions  

## Future Enhancements

- **Net Worth History Table**: Track net worth over time for trend analysis
- **Budget Goals Table**: Set and track financial goals
- **Automated Snapshots**: Monthly net worth snapshots for historical charts
- **Asset Categories**: More granular asset classification
- **Liability Amortization**: Track principal reduction over time
