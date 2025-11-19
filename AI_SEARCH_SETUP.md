# AI-Powered Natural Language Search Setup

## Overview
The Finance page now includes an AI-powered natural language search feature that lets you search your transactions using plain English queries instead of complex filters.

## Features
- **Natural Language Queries**: Ask questions in plain English like "show me all shopping expenses over ₹5000 last month"
- **Smart Filtering**: AI understands intent and applies multiple filters (amount, date, category, keywords, type)
- **Complete Database Access**: Searches across all your transaction data
- **Powered by Google Gemini AI**: Uses Gemini Pro model for query understanding

## Setup Instructions

### 1. Get a Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Add API Key to Environment
Create or update `.env.local` (or your `.env` file) in the project root:

```bash
VITE_GEMINI_API_KEY=your_api_key_here
```

**Important**: 
- The variable **must** be prefixed with `VITE_` (Vite requirement for client-side access)
- The file must be named exactly `.env.local` or `.env`
- Add `.env.local` to your `.gitignore` to keep your API key secure
- Never commit API keys to version control

### 3. Restart Development Server
After adding the API key, restart your dev server:

```bash
npm run dev
```

## Usage Examples

### Sample Queries

**Amount filters**:
- "show shopping over 5000"
- "expenses less than 1000"

**Date ranges**:
- "groceries in October"
- "transactions last month"

**Categories**:
- "all food expenses"
- "shopping and entertainment"

**Keywords**:
- "UPI transactions"
- "Amazon purchases"

**Type filters**:
- "salary income"
- "credit card payments"

**Combined**:
- "shopping expenses over 5000 in October"

**Visualizations** (NEW!):
- "generate a chart for my top 10 expenses in 2025"
- "show pie chart of expenses by category"
- "graph my monthly spending"
- "bar chart of food expenses this year"

### How It Works
1. You type a natural language query in the search box
2. Gemini AI analyzes your query and extracts:
   - Amount ranges (min/max)
   - Date ranges (start/end dates)
   - Categories to include
   - Keywords to search in descriptions
   - Transaction type (debit/credit)
3. The AI returns filter criteria as JSON
4. Your transactions are filtered based on these criteria
5. Results appear in the transaction list below

### Tips for Best Results
- Be specific about amounts, dates, and categories
- Use terms from your actual categories (Shopping, Groceries, etc.)
- Combine multiple criteria for precise results
- Use relative dates like "last month" or "this year"

## Technical Details

### Files Modified
- `src/services/geminiService.ts` - Added `searchTransactionsWithAI()` function
- `src/components/NaturalLanguageSearch.tsx` - New search UI component
- `src/components/Dashboard.tsx` - Integrated search into Finance page

### API Usage
- Model: `gemini-pro`
- Endpoint: Google Generative AI REST API
- Temperature: 0.1 (low for consistent, factual responses)
- Max tokens: 2048

### Security Notes
- API key is stored locally in `.env.local`
- Key is never exposed in client-side code
- All API calls go through Vite's import.meta.env
- Vite automatically handles environment variable security

## Troubleshooting

### "GEMINI_API_KEY not set" Error
- Ensure `.env.local` exists in project root
- Verify the file contains `GEMINI_API_KEY=your_key`
- Restart the dev server after adding the key

### "No response from Gemini API" Error
- Check your API key is valid
- Verify you have quota remaining in Google AI Studio
- Check your internet connection

### Search Returns No Results
- Try rephrasing your query
- Check if the categories/dates exist in your data
- Use broader search terms
- Verify transactions exist that match your criteria

## Cost & Limits
- Gemini API has a free tier with generous limits
- Typical search uses ~200-500 tokens
- Monitor usage in Google AI Studio
- Consider rate limiting for production use

## Future Enhancements
- Voice search integration
- Search history and suggestions
- Saved common queries
- Multi-language support
- Advanced analytics queries
- Export search results
