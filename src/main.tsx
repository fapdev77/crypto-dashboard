import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LogManager } from './services/LogManager';

// Chunk error reload & global error logging
window.addEventListener('error', (e) => {
  // 1. Ignore resource load errors on HTML elements (such as <img> with 404 fallback handling)
  const target = e.target;
  if (target && target !== window && typeof (target as HTMLElement).tagName === 'string') {
    const el = target as HTMLElement;
    const tagName = el.tagName.toLowerCase();
    const sourceUrl = (el as HTMLImageElement | HTMLScriptElement).src || (el as HTMLLinkElement).href || '';

    // Image 404s have native fallback handlers (e.g. CoinIcon) and should not spam GlobalWindowError
    if (tagName === 'img') {
      return;
    }

    LogManager.warn('ResourceLoadError', `Failed to load <${tagName}> resource`, {
      tagName,
      url: sourceUrl,
    });
    return;
  }

  const msg = e.message || '';
  if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('chunk')) {
    window.location.reload();
    return;
  }

  // Avoid logging completely empty messages with no error information
  if (!msg && !e.error && !e.filename) {
    return;
  }

  LogManager.error('GlobalWindowError', msg || 'Unknown script error', {
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno,
    error: e.error,
  });
}, true);

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  LogManager.error('GlobalUnhandledRejection', `Unhandled promise rejection: ${message}`, {
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="Application Crash Recovered">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
