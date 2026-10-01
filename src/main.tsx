import React from 'react';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { getBasename } from './app/sections';
import { initMonitoring, reportError } from './utils/monitoring.ts';
import { registerSW } from 'virtual:pwa-register';

// Phase 5: offline app shell (auto-updating service worker).
registerSW({ immediate: true });

initMonitoring();

// Last-resort reporting for errors outside React (Sentry when configured,
// console.error otherwise — see monitoring.ts).
window.addEventListener('error', (event) => {
  reportError(event.error ?? event.message, { source: 'window.onerror' });
});
window.addEventListener('unhandledrejection', (event) => {
  reportError(event.reason, { source: 'unhandledrejection' });
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 min
      refetchOnWindowFocus: false,
    }
  }
});

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={getBasename() || undefined}>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);