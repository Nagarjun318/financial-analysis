import React from 'react';
import { Upload, Sparkles, BarChart3, X } from 'lucide-react';
import { Button } from './ui';

interface OnboardingGuideProps {
  userId: string;
  onUpload: () => void;
}

/**
 * First-run guide for new signups (Phase 6): statement upload → first
 * insights in 3 steps. Dismissal persists per user; the parent decides when
 * a user counts as "new" (signed in, transactions loaded, none yet).
 */
export function onboardingKey(userId: string): string {
  return `onboarding-dismissed:${userId}`;
}

export function isOnboardingDismissed(userId: string): boolean {
  try {
    return localStorage.getItem(onboardingKey(userId)) === '1';
  } catch {
    return false;
  }
}

const STEPS = [
  {
    icon: Upload,
    title: 'Upload a statement',
    description: 'Drop your bank XLS file — parsing and dedupe are automatic.',
  },
  {
    icon: Sparkles,
    title: 'Review AI categories',
    description: 'One click predicts categories for every transaction.',
  },
  {
    icon: BarChart3,
    title: 'Explore insights',
    description: 'Monthly summaries, trends, forecasts, and AI advice.',
  },
];

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ userId, onUpload }) => {
  const [dismissed, setDismissed] = React.useState(() => isOnboardingDismissed(userId));

  const dismiss = React.useCallback(() => {
    try {
      localStorage.setItem(onboardingKey(userId), '1');
    } catch {
      // ignore persistence failures
    }
    setDismissed(true);
  }, [userId]);

  if (dismissed) return null;

  return (
    <section
      aria-label="Getting started"
      className="glass-panel rounded-2xl p-6 sm:p-8 mb-6 border border-indigo-200 dark:border-indigo-900/50 relative"
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss getting started guide"
        className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
      <h2 className="text-2xl font-bold mb-1">
        <span className="bg-gradient-to-r from-brand-primary to-purple-600 bg-clip-text text-transparent">
          Get your first insights in 3 steps
        </span>
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Your account is ready — add data to unlock the dashboard, forecasts, and AI advice.
      </p>
      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white/50 dark:bg-gray-900/40"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary font-bold text-sm">
                  {index + 1}
                </span>
                <Icon className="h-5 w-5 text-brand-primary" aria-hidden />
              </div>
              <p className="font-semibold text-sm mb-1">{step.title}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{step.description}</p>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="primary" onClick={onUpload}>
          <Upload className="h-4 w-4 mr-2" aria-hidden />
          Upload statement
        </Button>
        <Button variant="ghost" onClick={dismiss}>
          Explore on my own
        </Button>
      </div>
    </section>
  );
};

export default OnboardingGuide;
