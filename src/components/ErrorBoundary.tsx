import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Copy, Check } from 'lucide-react';
import { LogManager } from '../services/LogManager';
import { clearAllCache } from '../services/historyCache';
import i18n from '../i18n/config';

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
        className={`flex flex-col items-center justify-center p-6 text-fg ${
          isIsolated
            ? 'bg-surface border border-danger/30 rounded-xl my-4 min-h-[220px]'
            : 'min-h-screen bg-canvas'
        }`}
      >
        <div className="max-w-xl w-full bg-surface border border-danger/30 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl shrink-0">
              <AlertTriangle className="w-7 h-7 text-danger" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-fg tracking-tight">
                {this.props.fallbackTitle || i18n.t('errorBoundary.title', 'Component Render Error')}
              </h2>
              <p className="text-sm text-fg-muted">
                {isIsolated
                  ? i18n.t('errorBoundary.descriptionIsolated', 'An unexpected error occurred inside the "{{module}}" module.', { module: this.props.isolateScope })
                  : i18n.t('errorBoundary.descriptionGlobal', 'An unhandled render exception occurred. The app encountered an unexpected state.')}
              </p>
            </div>
          </div>

          {this.state.error && (
            <div className="p-3 bg-canvas rounded-lg border border-line text-xs font-mono text-danger overflow-x-auto max-h-32">
              <span className="font-semibold text-danger">{this.state.error.name}: </span>
              {this.state.error.message}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {isIsolated ? (
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {i18n.t('errorBoundary.retryModule', 'Retry Module')}
              </button>
            ) : (
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {i18n.t('errorBoundary.reloadPage', 'Reload Page')}
              </button>
            )}

            <button
              onClick={this.handleClearCacheAndReload}
              disabled={this.state.clearingCache}
              className="px-4 py-2 bg-elevated hover:bg-danger/20 hover:text-danger border border-line text-fg text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {this.state.clearingCache ? i18n.t('errorBoundary.resetting', 'Resetting...') : i18n.t('errorBoundary.clearCacheReload', 'Clear Cache & Reload')}
            </button>

            <button
              onClick={this.handleCopyDiagnostics}
              className="px-3 py-2 bg-elevated hover:bg-elevated-hover border border-line text-fg text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
              title={i18n.t('errorBoundary.copyDetails', 'Copy error details to clipboard')}
            >
              {this.state.copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-success" />
                  <span className="text-success">{i18n.t('errorBoundary.copied', 'Copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{i18n.t('errorBoundary.copyReport', 'Copy Report')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
