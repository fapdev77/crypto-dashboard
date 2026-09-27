import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Copy, Check } from 'lucide-react';
import { LogManager } from '../services/LogManager';
import { clearAllCache } from '../services/historyCache';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  isolateScope?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  clearingCache: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
    clearingCache: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    LogManager.error(
      'ErrorBoundary',
      `Unhandled React render error in scope "${this.props.isolateScope || 'Root'}": ${error.message}`,
      {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      }
    );
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleClearCacheAndReload = async () => {
    this.setState({ clearingCache: true });
    try {
      await clearAllCache();
      localStorage.clear();
      window.location.reload();
    } catch (e) {
      LogManager.error('ErrorBoundary', 'Failed to clear cache during recovery:', e);
      window.location.reload();
    }
  };

  private handleCopyDiagnostics = () => {
    const report = [
      `Error: ${this.state.error?.name}: ${this.state.error?.message}`,
      `Scope: ${this.props.isolateScope || 'Root'}`,
      `Time: ${new Date().toISOString()}`,
      `User Agent: ${navigator.userAgent}`,
      `Stack:\n${this.state.error?.stack || 'N/A'}`,
      `Component Stack:\n${this.state.errorInfo?.componentStack || 'N/A'}`,
    ].join('\n\n');

    navigator.clipboard.writeText(report).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    });
  };

  public render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isIsolated = Boolean(this.props.isolateScope);

    return (
      <div
        className={`flex flex-col items-center justify-center p-6 text-white ${
          isIsolated
            ? 'bg-[#181920]/90 border border-red-500/20 rounded-xl my-4 min-h-[220px]'
            : 'min-h-screen bg-[#0e0f14]'
        }`}
      >
        <div className="max-w-xl w-full bg-[#14151c] border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl shrink-0">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {this.props.fallbackTitle || 'Component Render Error'}
              </h2>
              <p className="text-sm text-gray-400">
                {isIsolated
                  ? `An unexpected error occurred inside the "${this.props.isolateScope}" module.`
                  : 'An unhandled render exception occurred. The app encountered an unexpected state.'}
              </p>
            </div>
          </div>

          {this.state.error && (
            <div className="p-3 bg-[#0d0e12] rounded-lg border border-[#232530] text-xs font-mono text-red-300 overflow-x-auto max-h-32">
              <span className="font-semibold text-red-400">{this.state.error.name}: </span>
              {this.state.error.message}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {isIsolated ? (
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-[#2F6BFF] hover:bg-[#2558d4] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Module
              </button>
            ) : (
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-[#2F6BFF] hover:bg-[#2558d4] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Page
              </button>
            )}

            <button
              onClick={this.handleClearCacheAndReload}
              disabled={this.state.clearingCache}
              className="px-4 py-2 bg-[#20222c] hover:bg-red-500/20 hover:text-red-300 border border-[#2e303d] text-gray-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {this.state.clearingCache ? 'Resetting...' : 'Clear Cache & Reload'}
            </button>

            <button
              onClick={this.handleCopyDiagnostics}
              className="px-3 py-2 bg-[#1b1c24] hover:bg-[#252733] border border-[#2a2c38] text-gray-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ml-auto"
              title="Copy error details to clipboard"
            >
              {this.state.copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
