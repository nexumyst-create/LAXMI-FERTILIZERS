import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let parsedError: string = this.state.errorMessage;
      try {
        const obj = JSON.parse(this.state.errorMessage);
        if (obj?.error) {
          parsedError = `${obj.error} (${obj.operationType || 'operation'} on ${obj.path || 'database'})`;
        }
      } catch {
        // plain string error
      }

      return (
        <div className="min-h-screen bg-[#F3F8F1] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-xl border border-neutral-200 p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="font-display text-xl font-bold text-[#252525] mb-2">
              500 — Something Went Wrong
            </h1>
            <p className="text-sm text-neutral-600 mb-6 break-words">{parsedError}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#176B3A] text-white text-sm font-semibold hover:bg-[#12552e] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
