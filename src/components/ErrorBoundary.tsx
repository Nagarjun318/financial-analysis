import React from 'react';

interface ErrorBoundaryState { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 border border-red-300 bg-red-50 rounded-md text-red-800">
          <h2 className="text-lg font-semibold mb-2">Something went wrong.</h2>
          <p className="text-sm mb-4">{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })} className="px-3 py-1.5 rounded bg-red-600 text-white text-sm">Retry render</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;