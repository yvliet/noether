import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Flint Error Boundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full bg-[#181818] text-[#dcddde] flex flex-col items-center justify-center p-8 select-text">
          <div className="max-w-lg bg-[#222] border border-rose-500/40 rounded-xl p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-rose-400 mb-2">Something went wrong</h2>
            <p className="text-xs text-[#8b8e95] mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            {this.state.error?.stack && (
              <pre className="bg-[#141414] p-3 rounded text-[11px] font-mono text-[#9ca3af] overflow-auto max-h-48 mb-4 border border-[#333]">
                {this.state.error.stack}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="flint-btn"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
