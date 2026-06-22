import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeLogger } from './services/logger';

initializeLogger();

// Dica Bônus para Tratamento de Erros (Chunk Errors)
window.addEventListener('error', (e) => {
  const msg = e.message || '';
  if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('chunk')) {
    window.location.reload();
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
