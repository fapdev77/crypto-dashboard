import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LogManager } from './services/LogManager';

// Chunk error reload & global error logging
window.addEventListener('error', (e) => {
  const msg = e.message || '';
  if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('chunk')) {
    window.location.reload();
    return;
  }
  LogManager.error('GlobalWindowError', msg, {
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
