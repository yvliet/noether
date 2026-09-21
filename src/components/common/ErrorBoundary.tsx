import React, { Component, ErrorInfo, ReactNode } from 'react';
import { platform } from '@/lib/platform/platformAdapter';
import { Alert02Icon } from '@/components/common/Icons';

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
    console.error('[Noether Error Boundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full bg-[var(--noether-bg-tab-active,var(--noether-bg-main))] flex flex-col items-center justify-center text-center p-8 select-none gap-2.5">
          <Alert02Icon size={36} className="text-[#666] opacity-40 mb-1" />
          <span className="text-[13px] text-[#888] font-normal">Something went wrong</span>
          <p className="text-xs text-[#666] max-w-md leading-relaxed">
            {this.state.error?.message || 'An unexpected error occurred in this view.'}
          </p>
          {this.state.error?.stack && (
            <pre className="bg-[#141414] p-3 rounded text-[11px] font-mono text-[#777] overflow-auto max-h-40 max-w-lg w-full my-2 border border-[#2a2a2a] text-left select-text">
              {this.state.error.stack}
            </pre>
          )}
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="noether-btn text-xs"
            >
              Reload Application
            </button>
            <button
              type="button"
              onClick={() => platform.close()}
              className="noether-btn text-xs text-[#888] hover:text-[#bbb]"
            >
              Close Window
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
