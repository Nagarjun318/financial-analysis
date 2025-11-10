import React from 'react';

export const SetupInstructions: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-light-bg dark:bg-dark-bg">
      <div className="max-w-xl w-full space-y-4 bg-light-card dark:bg-dark-card p-8 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold text-brand-primary">Project Setup Required</h1>
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Supabase credentials are missing. Create a <code>.env.local</code> file in the project root with the following variables (no quotes):
        </p>
        <pre className="text-xs bg-black/5 dark:bg-white/10 p-3 rounded-md overflow-x-auto"><code>VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
</code></pre>
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          After adding them, restart the dev server (<code>npm run dev</code>). You can obtain these values from your Supabase project dashboard under Project Settings &gt; API.
        </p>
        <a
          href="https://supabase.com/docs/guides/getting-started/quickstarts"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-medium text-brand-primary hover:underline"
        >
          Supabase Quickstart Guide
        </a>
      </div>
    </div>
  );
};

export default SetupInstructions;