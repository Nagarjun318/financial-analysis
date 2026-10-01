# Investment Portfolio - Database Setup Guide

## Overview
The Investment Portfolio feature is backed by the Neon Postgres `investments`
table (see `NEON_SCHEMA.sql`) for data persistence, scalability, and
multi-device sync.

## Database Setup Instructions

The schema is applied automatically from `NEON_SCHEMA.sql`. To verify:

1. Check the `investments` table exists with `neon data-api get` + schema refresh
2. Or query directly over `DATABASE_URL_UNPOOLED`

This will create:
- `investments` table with proper columns
- Indexes for optimized queries
- Row Level Security (RLS) policies
- Auto-update triggers for timestamps

### Step 2: Verify Table Creation
1. Check the `investments` table in Neon (SQL Editor or `DATABASE_URL_UNPOOLED`)
2. You should see a table called `investments`
3. Check that it has the following columns:
   - `id` (UUID, Primary Key)
   - `name` (TEXT)
   - `type` (TEXT with CHECK constraint)
   - `invested_amount` (DECIMAL)
   - `current_value` (DECIMAL)
   - `date` (DATE)
   - `notes` (TEXT, nullable)
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

### Step 3: Test the Application
1. Navigate to the Investment page in your app
2. Try adding a new investment
3. Verify it persists after reload
4. Test editing and deleting investments

## Features

### ✅ What's New
- **Database Persistence**: All investments are stored in Neon Postgres
- **Loading States**: Beautiful loading spinner while fetching data
- **Error Handling**: Graceful error messages with retry functionality
- **Real-time Sync**: Changes are immediately reflected in the database
- **Data Validation**: Server-side validation through database constraints

### 🔄 Migration from localStorage
If you had investments stored in localStorage, they will no longer appear automatically. You'll need to:
1. Export your old data (if needed)
2. Manually re-add investments through the UI
3. Or write a migration script to bulk import

## Database Schema

```sql
CREATE TABLE investments (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('Stock', 'Mutual Fund', 'Crypto', 'Gold', 'Real Estate', 'Bond', 'ETF', 'Other')),
    invested_amount DECIMAL(15, 2) NOT NULL,
    current_value DECIMAL(15, 2) NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Operations

### Load Investments
```typescript
const { data, error } = await supabase
  .from('investments')
  .select('*')
  .order('date', { ascending: false });
```

### Add Investment
```typescript
const { error } = await supabase
  .from('investments')
  .insert([{
    name, type, invested_amount, current_value, date, notes
  }]);
```

### Update Investment
```typescript
const { error } = await supabase
  .from('investments')
  .update({ name, type, invested_amount, current_value, date, notes })
  .eq('id', investmentId);
```

### Delete Investment
```typescript
const { error } = await supabase
  .from('investments')
  .delete()
  .eq('id', investmentId);
```

## Security

### Row Level Security (RLS)
The `investments` table enforces per-user access through Neon Auth:

```sql
CREATE POLICY manage_own_rows ON investments FOR ALL TO authenticated
  USING (auth.user_id() = user_id) WITH CHECK (auth.user_id() = user_id);
```

## Troubleshooting

### Error: "Failed to load investments"
- Check your Neon configuration (`neon status`, `VITE_NEON_*` env vars)
- Verify the `investments` table exists
- Check browser console for detailed error messages

### Error: "Failed to save investment"
- Ensure all required fields are filled
- Check that the `type` value is one of the allowed types
- Verify RLS policies allow the operation

### Data Not Showing
- Query the `investments` table directly to see if data exists
- Clear browser cache and reload
- Check network tab for API errors

## Future Enhancements

Potential improvements:
- [ ] Multi-user support with authentication
- [ ] Real-time subscriptions for live updates
- [ ] Bulk import/export functionality
- [ ] Investment history tracking
- [ ] Performance analytics over time
- [ ] Automated portfolio rebalancing suggestions

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify Neon env vars and `neon data-api get` status
3. Ensure `NEON_SCHEMA.sql` was applied and the Data API schema cache refreshed
4. Check Neon branch logs (`neon logs query`)
