<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1eDyY73c_ZDTHanJiDs6unRH4cmy3zEZg

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create a `.env.local` file in the project root and set the following variables:

   ```bash
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

3. Start the development server:
   `npm run dev`

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project REST URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public client key (do not commit secrets) |
| `GEMINI_API_KEY` | Used for AI insight generation (planned features) |

### Recent Improvements (Quick Wins)
The following foundational improvements were added:
- Supabase credentials now loaded from env vars via `import.meta.env`.
- Introduced an analytics module (`src/domain/analytics/summarize.ts`) consolidating summary, monthly, and category aggregation.
- Added client-side duplicate detection before inserting staged transactions (`src/domain/transactions/dedupe.ts`).
- Enabled strict TypeScript mode for better type safety.

### Next Suggested Steps
- Add tests for analytics & dedupe utilities.
- Introduce budgeting, forecasting, and AI insights modules.
- Add linting (ESLint) and formatting (Prettier) configuration.
 - Add Vitest + Testing Library for unit/integration tests (already partially configured).

### Testing & Linting

Run lint:
`npm run lint`

Run unit tests (Vitest):
`npm run test`

Format code (Prettier):
`npm run format`

