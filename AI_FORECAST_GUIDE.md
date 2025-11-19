# AI-Powered Forecast Feature

## Overview
The Next Month Forecast has been enhanced with **Gemini AI** to provide intelligent, context-aware predictions with actionable insights.

## Features

### 🧠 AI-Powered Predictions
- Analyzes your complete transaction history
- Considers seasonal patterns and trends
- Identifies spending anomalies and patterns
- Provides confidence scores (0-100%)

### 📊 Smart Insights
The AI forecast includes:
1. **Projected Income/Expense/Savings** - More accurate than traditional moving averages
2. **AI Insights** - 2-3 sentences about your spending patterns
3. **Category Trends** - Shows which categories are increasing/decreasing with percentage changes
4. **Warnings** - Alerts about potential financial concerns
5. **Recommendations** - 3-5 actionable suggestions to improve your finances

### 🔄 Toggle Between Modes
You can switch between:
- **AI Forecast** (default) - Uses Gemini AI for intelligent predictions
- **Traditional Forecast** - Uses 3-month moving average (fallback)

### 🎨 Enhanced UI
- Beautiful gradient design with indigo/purple theme
- Color-coded trends (red for increasing expenses, green for decreasing)
- Confidence badge showing AI prediction accuracy
- Regenerate button to refresh forecast on demand

## How It Works

1. **Data Analysis**: AI analyzes your last 100 transactions and monthly aggregates
2. **Pattern Recognition**: Identifies trends, seasonality, and spending habits
3. **Smart Prediction**: Generates forecast based on historical patterns
4. **Actionable Insights**: Provides specific recommendations and warnings

## Usage

### Viewing AI Forecast
1. Navigate to the **Finance** page
2. AI forecast generates automatically on page load
3. View the enhanced forecast card with:
   - Projected amounts for next month
   - Confidence score
   - AI insights and analysis
   - Category trends
   - Warnings and recommendations

### Switching Modes
Click the toggle button:
- **"AI Forecast"** button (indigo) - Currently using AI
- **"Traditional Forecast"** button (gray) - Currently using moving average

### Regenerating Forecast
1. Click the **"Regenerate"** button (only visible in AI mode)
2. Fresh forecast will be generated using latest data
3. Useful after uploading new transactions

## Example Insights

### AI Insights
> "Your spending has increased by 15% over the last 3 months, primarily in Food & Dining. There's a consistent pattern of higher expenses during weekends. Consider setting daily spending limits."

### Category Trends
- **Food & Dining**: 🔺 +18% (increasing)
- **Transportation**: 🔻 -5% (decreasing)
- **Shopping**: ➖ +2% (stable)

### Recommendations
- "Set a monthly budget of ₹15,000 for Food & Dining to control rising expenses"
- "Your transportation costs are decreasing - great job! Consider maintaining this trend"
- "Weekend spending is 40% higher than weekdays - plan ahead to reduce impulse purchases"

### Warnings
- "Projected expenses exceed income by ₹5,000 - consider reducing discretionary spending"
- "Shopping category shows unusual spike in recent weeks"

## Technical Details

### API Usage
- Uses **Gemini Pro Latest** model by default
- Falls back to **Gemini Flash** on rate limits
- Analyzes up to 100 recent transactions + monthly aggregates
- Provides top 10 expense categories for context

### Confidence Score
Based on:
- Data consistency (more regular patterns = higher confidence)
- Transaction history length (more data = higher confidence)
- Variance in spending (lower variance = higher confidence)
- Seasonality detection (recognized patterns = higher confidence)

### Error Handling
- Shows error message if AI forecast fails
- Automatically falls back to traditional forecast
- Allows manual toggle to traditional mode anytime

## Requirements

- **VITE_GEMINI_API_KEY** must be set in `.env` file
- Internet connection required for AI predictions
- Minimum 10 transactions recommended for accurate forecasts

## Tips for Best Results

1. **Upload Regular Data**: More transactions = better predictions
2. **Categorize Accurately**: Proper categories help AI identify trends
3. **Review Insights**: Act on recommendations to improve finances
4. **Regenerate Periodically**: Refresh forecast after major changes
5. **Monitor Trends**: Track category trends over time

## Troubleshooting

### "AI service temporarily unavailable"
- **What it means**: Gemini API is experiencing high load (503 error)
- **What happens**: System automatically falls back to traditional forecast
- **What to do**: 
  - Wait 2-5 minutes for API load to decrease
  - Click "Regenerate" button to retry
  - Error notification auto-dismisses after 10 seconds
  - Traditional forecast is shown in the meantime

### "Failed to generate AI forecast"
- Check if VITE_GEMINI_API_KEY is set correctly
- Verify internet connection
- Try toggling to Traditional mode temporarily
- Check browser console for detailed error messages

### "Rate limit exceeded"
- AI automatically falls back to Flash model
- Amber alert shows fallback notification
- Wait a few minutes and regenerate
- Consider using Traditional mode if persistent

### Forecast seems inaccurate
- Ensure you have sufficient transaction history (30+ days)
- Check that transactions are properly categorized
- Verify dates are correct in uploaded files

## Future Enhancements

Potential improvements:
- Multi-month forecasts (3, 6, 12 months)
- Budget vs. forecast comparison
- Historical forecast accuracy tracking
- Custom forecast parameters
- Export forecast reports
- Goal-based recommendations

---

**Note**: AI forecasts are predictions based on historical data and may not account for unexpected life events or major financial changes. Use as a guide, not absolute certainty.
