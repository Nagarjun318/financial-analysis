import React, { useState } from 'react';
import { client as supabase } from '../services/neonClient';
import { X, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui';

interface AuthProps {
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: (session: { user: { id: string; email?: string | null }; access_token?: string } | null) => void;
}

const Auth: React.FC<AuthProps> = ({ isModal = false, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    if (!supabase) {
      setError('Auth not configured. Add Neon Auth env vars to your .env file.');
      setLoading(false);
      return;
    }
    const { data, error } = await (supabase as any).auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      // signIn may return the session directly, or only persist it
      // (adapter-dependent) — fall back to an explicit getSession so the
      // app updates immediately instead of waiting for a refresh.
      let session = data?.session ?? null;
      if (!session) {
        try {
          const { data: sessionData } = await (supabase as any).auth.getSession();
          session = sessionData?.session ?? null;
        } catch {
          // ignore — handled below
        }
      }
      if (!session) {
        setError('Login failed. Please try again.');
      } else {
        onSuccess?.(session);
        // Successfully logged in
        if (isModal && onClose) {
          onClose();
        }
      }
    }
    setLoading(false);
  };
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    // Neon Auth (Better Auth) requires a display name; derive one from email.
    const displayName = email.split('@')[0] || 'User';
    const { data, error } = await (supabase as any).auth.signUp({
      email,
      password,
      options: { data: { displayName, name: displayName } },
    });
    if (error) {
      setError(error.message);
    } else if ((data as any)?.session) {
      // Auto-signed in (no email confirmation required) — update app now.
      onSuccess?.((data as any).session);
      if (isModal && onClose) {
        onClose();
      }
    } else {
      // Email confirmation may be required based on project settings.
      setMessage('Account created. Check your email for a confirmation link if required.');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    if (!supabase) {
      setError('Auth not configured. Add Neon Auth env vars to your .env file.');
      setLoading(false);
      return;
    }
    const { error } = await (supabase as any).auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password'
    });
    if (error) {
      setError(error.message);
    } else {
      setMessage('Password reset email sent (if account exists).');
    }
    setLoading(false);
  };

  const content = (
    <div className="w-full max-w-md p-8 space-y-6 bg-light-card dark:bg-dark-card rounded-xl shadow-lg relative">
      {isModal && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
      )}
      <div>
        <h1 className="text-3xl font-bold text-center text-brand-primary">Finance Dashboard</h1>
        <p className="mt-2 text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Sign in to your account or create a new one
        </p>
      </div>
  <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-light-text dark:text-dark-text">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password"className="text-sm font-medium text-light-text dark:text-dark-text">
              Password (must be at least 6 characters)
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2 pr-10 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          {message && <p className="text-sm text-green-500 text-center">{message}</p>}

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading || !email || !password}
              className="w-full"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <Button
              onClick={handleSignUp}
              type="button"
              variant="secondary"
              loading={loading}
              disabled={loading || !email || !password}
              className="w-full"
            >
              {loading ? 'Please wait...' : 'Create Account'}
            </Button>
            <Button
              onClick={handleResetPassword}
              type="button"
              variant="ghost"
              disabled={loading || !email}
              size="sm"
              className="self-center"
            >
              Forgot password?
            </Button>
          </div>
        </form>
      <div className="text-center text-xs text-light-text-secondary dark:text-dark-text-secondary">
        <p>Accounts are stored in Neon Auth. Passwords from Supabase cannot transfer — please create a new account.</p>
        <p className="mt-2">Make sure the <code>transactions</code> table exists in your Neon database (see NEON_SCHEMA.sql).</p>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop with blur */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        {/* Modal content */}
        <div className="relative z-10">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg p-4">
      {content}
    </div>
  );
};

export default Auth;