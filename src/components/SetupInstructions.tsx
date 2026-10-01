import React from 'react';

export const SetupInstructions: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-light-bg dark:bg-dark-bg">
      <div className="max-w-xl w-full space-y-4 bg-light-card dark:bg-dark-card p-8 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold text-brand-primary">Project Setup Required</h1>
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Neon credentials are missing. Add the following variables to your <code>.env</code> file (no quotes). They are pulled automatically by <code>neon deploy</code>:
        </p>
        <pre className="text-xs bg-black/5 dark:bg-white/10 p-3 rounded-md overflow-x-auto"><code>VITE_NEON_AUTH_URL=https://ep-xxx.neonauth.&lt;region&gt;.aws.neon.tech/neondb/auth
VITE_NEON_DATA_API_URL=https://ep-xxx.apirest.&lt;region&gt;.aws.neon.tech/neondb/rest/v1
</code></pre>
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          After adding them, restart the dev server (<code>npm run dev</code>). Find the values via <code>neon data-api get</code> and <code>neon neon-auth status</code>, or run <code>neon deploy</code> to pull them.
        </p>
        <a
          href="https://neon.com/docs/auth/migrate/from-supabase"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-medium text-brand-primary hover:underline"
        >
          Supabase → Neon migration guide
        </a>
      </div>
    </div>
  );
};

export default SetupInstructions;
