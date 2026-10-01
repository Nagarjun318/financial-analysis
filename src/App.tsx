import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { client as supabase, isNeonConfigured as isSupabaseConfigured } from './services/neonClient';
import SetupInstructions from './components/SetupInstructions.tsx';
import type { NeonSession as Session } from './services/neonClient';
import Sidebar from './components/Sidebar.tsx';
import OnboardingGuide, { isOnboardingDismissed } from './components/OnboardingGuide.tsx';
import CommandPalette from './components/CommandPalette.tsx';
import {
  HomePage,
  AboutPage,
  ServicesPage,
  Dashboard,
  InvestmentPage,
  GroceriesPage,
  NetWorthPage,
  GoalsPage,
  AnalyticsPage,
  sectionFromPath,
  pathForSection,
  SectionId,
} from './app/sections';
import Auth from './components/Auth';
import StagingModal from './components/StagingModal';
import EditTransactionModal from './components/EditTransactionModal';
import { Transaction, AnalysisResult } from './types';
import { processXlsData, analyzeTransactions } from './utils';
import { useTransactions } from './hooks/useTransactions.ts';
import { makeTransactionKey, filterDuplicateStaged } from './domain/transactions/dedupe.ts';
import WeatherBackground from './components/WeatherBackground.tsx';
import ToastHost from './components/ToastHost.tsx';
import { Skeleton } from './components/ui';
import { showToast } from './utils/toast';
import { getWeatherData } from './services/weatherService';

const emptyAnalysisResult: AnalysisResult = {
  summary: { totalIncome: 0, totalExpenses: 0, netSavings: 0 },
  transactions: [],
};

const App: React.FC = () => {
  const [session, setSession] = React.useState(null as Session | null);
  const location = useLocation();
  const navigate = useNavigate();
  // URL is the source of truth for the active view (deep-linkable, back-button works).
  const currentSection = sectionFromPath(location.pathname);
  const setCurrentSection = React.useCallback(
    (section: SectionId | 'auth') => {
      if (section === 'auth') return;
      navigate(pathForSection(section));
    },
    [navigate]
  );
  const [loading, setLoading] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState(null as string | null);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  // Phase 6: command palette (Cmd/Ctrl+K).
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const [weatherCondition, setWeatherCondition] = React.useState<string>();
  const [weatherTemperature, setWeatherTemperature] = React.useState<number>();

  // Fetch weather on initial load
  // Weather is loaded on demand via the sidebar refresh button only —
  // never auto-requested on mount (browsers may block it and the
  // permission prompt is hostile as a first impression).

  // Weather refresh handler
  const handleWeatherRefresh = async () => {
    try {
      if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser', 'error');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const location = `${latitude},${longitude}`;
          const weather = await getWeatherData(location);

          if (weather && weather.temperature !== undefined) {
            setWeatherCondition(weather.condition);
            setWeatherTemperature(weather.temperature);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          showToast('Could not get your location. Please enable location services.', 'error');
        }
      );
    } catch (error) {
      console.error('Error refreshing weather:', error);
      showToast('Failed to refresh weather data', 'error');
    }
  };

  // Debug weather state changes
  React.useEffect(() => {
  }, [weatherCondition, weatherTemperature]);

  // Staging transactions from file upload
  const [stagedTransactions, setStagedTransactions] = React.useState([] as Transaction[]);
  const [isStagingModalOpen, setIsStagingModalOpen] = React.useState(false);
  const [stagedFileName, setStagedFileName] = React.useState(null as string | null);
  const [isConfirming, setIsConfirming] = React.useState(false);

  // Editing transaction
  const [editingTransaction, setEditingTransaction] = React.useState(null as Transaction | null);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);

  // Neon auth logic (Supabase-compatible shapes via SupabaseAuthAdapter).
  // Defensive: never let a session-listener shape mismatch crash the app.
  React.useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (supabase as any).auth.getSession().then(({ data }: any) => {
      if (!cancelled) setSession(data?.session ?? null);
    }).catch((e: any) => console.warn('[auth] getSession failed', e));

    let unsubscribe: (() => void) | undefined;
    try {
      const result = (supabase as any).auth.onAuthStateChange((_event: string, session: Session | null) => {
        setSession(session);
      });
      const sub = result?.data?.subscription ?? result?.subscription;
      if (sub && typeof sub.unsubscribe === 'function') {
        unsubscribe = () => {
          try { sub.unsubscribe(); } catch { /* ignore */ }
        };
      } else {
        console.warn('[auth] onAuthStateChange returned unexpected shape', result);
      }
    } catch (e) {
      console.warn('[auth] onAuthStateChange not available', e);
    }

    return () => {
      cancelled = true;
      try { unsubscribe?.(); } catch { /* ignore */ }
    };
  }, []);


  const { transactions, isLoading, insert, update, remove, refetch } = useTransactions(session?.user?.id);

  // Phase 3: memoize the expensive derived analysis (summary + forecast +
  // anomalies over up to ~6.6k rows) so it recomputes only when the
  // transaction array identity actually changes — not on every unrelated
  // render (sidebar toggle, weather, modal state, …).
  const analysisResult = React.useMemo(
    () => (session && !isLoading ? analyzeTransactions(transactions) : emptyAnalysisResult),
    [session, isLoading, transactions]
  );

  React.useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(isLoading);
  }, [session, isLoading]);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const transactions = await processXlsData(file);
      setStagedTransactions(transactions);
      setStagedFileName(file.name);
      setIsStagingModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to process file.');
      console.error('File processing error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmStagedTransactions = async () => {
    if (!session?.user || stagedTransactions.length === 0) return;
    setIsConfirming(true);
    setError(null);
    try {
      // Build existing key set for dedupe (client-side only)
      const existingKeySet = new Set<string>(analysisResult.transactions.map((t: Transaction) => makeTransactionKey({
        date: t.date,
        description: t.description,
        amount: t.amount,
        category: t.category,
        type: t.type,
      })));

      const { newOnes, duplicateCount } = filterDuplicateStaged(stagedTransactions, existingKeySet);
      if (newOnes.length === 0) {
        setError(`All ${stagedTransactions.length} staged transactions are duplicates of existing records. Nothing inserted.`);
        setIsConfirming(false);
        return;
      }

      type TransactionInsertRow = {
        date: string;
        Description: string;
        Amount: number;
        Category: string;
        AI_Category?: string | null;
        user_id: string;
      };

      const transactionsToInsert: TransactionInsertRow[] = newOnes.map(t => ({
        date: t.date,
        Description: t.description,
        Amount: t.amount,
        Category: t.category,
        AI_Category: t.ai_category || null,
        user_id: session.user.id,
      }));

      await insert(transactionsToInsert.map(r => ({
        user_id: r.user_id,
        date: r.date,
        description: r.Description,
        amount: r.Amount,
        category: r.Category,
        ai_category: r.AI_Category,
      })) as any);

      setIsStagingModalOpen(false);
      setStagedTransactions([]);
      setStagedFileName(null);
      await refetch();

      if (duplicateCount > 0) {
        setError(`Inserted ${transactionsToInsert.length} new transactions. Skipped ${duplicateCount} duplicates.`);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An unknown database error occurred. Please check the console.';
      setError(`Failed to save transactions. Reason: ${errorMessage}`);
      console.error('Error saving transactions:', err);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleConfirmEdit = async (updatedTransaction: Transaction) => {
    if (!updatedTransaction.id) return;
    setError(null);
    try {
      // Recalculate category in case description changed
      const transactionToUpdate = {
        date: updatedTransaction.date,
        description: updatedTransaction.description,
        amount: updatedTransaction.amount,
        category: updatedTransaction.category,
        ai_category: updatedTransaction.ai_category,
      };

      await update({ id: updatedTransaction.id, values: transactionToUpdate } as any);
      setIsEditModalOpen(false);
      setEditingTransaction(null);
      await refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to update transaction.');
      console.error('Error updating transaction:', err);
    }
  };


  const handleDeleteTransaction = async (transactionId: number) => {
    setError(null);
    try {
      await remove(transactionId as any);
      await refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to delete transaction.');
      console.error('Error deleting transaction:', err);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      // Try provider sign-out first (Neon Auth), then clear local state.
      try {
        await (supabase as any)?.auth?.signOut?.();
      } catch {
        // ignore - fall through to manual cleanup
      }
      // Clear auth session from all storage locations manually
      if (typeof window !== 'undefined') {
        // Clear from localStorage
        Object.keys(localStorage)
          .filter(k => {
            const l = k.toLowerCase();
            return l.includes('supabase') || l.includes('neon') || l.includes('better-auth') || k.includes('sb-');
          })
          .forEach(k => localStorage.removeItem(k));

        // Clear from sessionStorage
        Object.keys(sessionStorage)
          .filter(k => {
            const l = k.toLowerCase();
            return l.includes('supabase') || l.includes('neon') || l.includes('better-auth') || k.includes('sb-');
          })
          .forEach(k => sessionStorage.removeItem(k));

        // Clear auth cookies
        document.cookie.split(';').forEach(cookie => {
          const cookieName = cookie.split('=')[0].trim();
          const l = cookieName.toLowerCase();
          if (l.includes('supabase') || l.includes('neon') || l.includes('better-auth') || cookieName.includes('sb-')) {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
          }
        });
      }

      // Clear application state (analysis derives from session, so it empties itself)
      setSession(null);
      navigate(pathForSection('home'));
    } catch (e: any) {
      console.warn('[signout]', e);
      // Ensure session is cleared even if there's an error
      setSession(null);
      navigate(pathForSection('home'));
    }
  };

  // Per-route document title (cheap SEO/UX win; full meta/OG is Phase 6).
  // Must sit before the early return below (rules-of-hooks).
  React.useEffect(() => {
    const titles: Record<SectionId, string> = {
      home: 'Home',
      about: 'About',
      services: 'Services',
      finance: 'Finance',
      investment: 'Investments',
      groceries: 'Groceries',
      networth: 'Net Worth',
      goals: 'Goals',
      analytics: 'Analytics',
    };
    document.title = `${titles[currentSection] ?? 'Home'} · FinanceHub`;
  }, [currentSection]);

  if (!isSupabaseConfigured) {
    return <SetupInstructions />;
  }

  const loadingLabels: Record<string, string> = {
    finance: 'Loading transactions...',
    home: 'Loading your dashboard...',
    about: 'Loading about page...',
    services: 'Loading services...',
    investment: 'Loading investment data...',
    groceries: 'Loading groceries...',
    networth: 'Loading net worth overview...',
    goals: 'Loading goals...',
    analytics: 'Loading analytics...',
  };
  const loadingLabel = loadingLabels[currentSection] ?? 'Loading...';

  const routeFallback = (
    <div className="mx-auto max-w-3xl space-y-4 py-10" role="status" aria-label={loadingLabel}>
      <p className="text-center text-lg font-medium text-gray-600 dark:text-gray-300">
        {loadingLabel}
      </p>
      <Skeleton variant="card" />
      <Skeleton variant="text" lines={4} />
    </div>
  );

  return (
    <div className="min-h-screen text-light-text dark:text-dark-text font-sans relative">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:bg-brand-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-md"
      >
        Skip to content
      </a>
      {/* Weather Background */}
      <WeatherBackground 
        condition={weatherCondition} 
        temperature={weatherTemperature}
      />
      
      <Sidebar
        currentSection={currentSection}
        onSectionChange={(section: string) => {
          if (section === 'auth' && !session) {
            setShowAuthModal(true);
          } else {
            setCurrentSection(section as SectionId | 'auth');
          }
        }}
        userEmail={session?.user?.email ?? undefined}
        onSignOut={session ? handleSignOut : undefined}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenPalette={() => setPaletteOpen(true)}
        weatherCondition={weatherCondition}
        weatherTemperature={weatherTemperature}
        onWeatherRefresh={handleWeatherRefresh}
      />

      <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        <main id="main-content" className="container mx-auto p-4 sm:p-6 lg:p-8">
          {loading ? (
            routeFallback
          ) : (
            <>
              {/* Phase 6: first-run guide for new signups with no data yet. */}
              {session &&
                transactions.length === 0 &&
                currentSection === 'home' &&
                !isOnboardingDismissed(session.user.id) && (
                  <div className="container mx-auto px-4 pt-8">
                    <OnboardingGuide
                      userId={session.user.id}
                      onUpload={() => navigate(pathForSection('finance'))}
                    />
                  </div>
                )}
              <div className="container mx-auto px-4 py-8">
                <Suspense fallback={routeFallback}>
                  <Routes>
                    <Route index element={<HomePage />} />
                    <Route path="home" element={<Navigate to="/" replace />} />
                    <Route path="about" element={<AboutPage />} />
                    <Route path="services" element={<ServicesPage userId={session?.user?.id} />} />
                    <Route
                      path="finance"
                      element={
                        <Dashboard
                          analysisResult={analysisResult}
                          onFileUpload={handleFileUpload}
                          isUploading={isUploading}
                          onEditTransaction={handleEditTransaction}
                          onDeleteTransaction={handleDeleteTransaction}
                          onRefreshData={refetch}
                          userId={session?.user?.id || ''}
                          isLoggedIn={!!session}
                        />
                      }
                    />
                    <Route path="investment" element={<InvestmentPage userId={session?.user?.id} />} />
                    <Route
                      path="groceries"
                      element={
                        <GroceriesPage
                          userId={session?.user?.id}
                          onWeatherUpdate={(condition, temp) => {
                            setWeatherCondition(condition);
                            setWeatherTemperature(temp);
                          }}
                        />
                      }
                    />
                    <Route
                      path="networth"
                      element={
                        <NetWorthPage
                          transactions={analysisResult.transactions}
                          userId={session?.user?.id}
                        />
                      }
                    />
                    <Route
                      path="goals"
                      element={
                        <GoalsPage
                          userId={session?.user?.id}
                          transactions={analysisResult.transactions}
                        />
                      }
                    />
                    <Route
                      path="analytics"
                      element={
                        <AnalyticsPage
                          transactions={analysisResult.transactions}
                          userId={session?.user?.id}
                        />
                      }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </div>
            </>
          )}
          {error &&
            <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50">
              <div className="flex items-center justify-between">
                <p className="font-semibold pr-4">{error}</p>
                <button onClick={() => setError(null)} className="text-xl font-bold leading-none">&times;</button>
              </div>
            </div>
          }
          <ToastHost />
        </main>

        <StagingModal
          isOpen={isStagingModalOpen}
          onClose={() => setIsStagingModalOpen(false)}
          transactions={stagedTransactions}
          onConfirm={handleConfirmStagedTransactions}
          onTransactionsUpdate={setStagedTransactions}
          fileName={stagedFileName}
          isConfirming={isConfirming}
        />

        {editingTransaction && (
          <EditTransactionModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            transaction={editingTransaction}
            onConfirm={handleConfirmEdit}
          />
        )}

        {/* Auth Modal */}
        {showAuthModal && !session && (
          <Auth
            isModal={true}
            onClose={() => setShowAuthModal(false)}
            onSuccess={(s) => {
              setSession(s);
              setShowAuthModal(false);
            }}
          />
        )}

        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onSignOut={session ? handleSignOut : undefined}
          isLoggedIn={!!session}
        />
      </div>
    </div>
  );
};

export default App;