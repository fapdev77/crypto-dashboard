import { useLogStore, LogLevel } from '../store/logStore';
import { useApiKeysStore } from '../store/apiKeysStore';

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

export function initializeLogger() {
  if ((window as any).__loggerInitialized) return;
  (window as any).__loggerInitialized = true;

  const processLog = (type: 'log' | 'warn' | 'error', args: any[]) => {
    try {
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try { return JSON.stringify(arg); } catch (e) { return String(arg); }
        }
        return String(arg);
      }).join(' ');

      // Domain prefixes of interest
      const domainPrefixes = [
        '[WS-', '[REST-', '[Time-Sync]', '[HistoryCache]', 
        '[ExchangeAggregator]', '[BillsHistoryService]', '[PositionHistoryService]'
      ];
      
      const hasPrefix = domainPrefixes.some(prefix => message.includes(prefix));
      if (!hasPrefix && type !== 'error') {
        return; // Filter out noise, keeping global errors just in case, but let's filter them unless they match domain or we want to capture everything? 
        // Requirements say: "Apenas logs contendo os prefixos da nossa aplicação devem ser gravados". So let's stick to it.
      }
      if (!hasPrefix) return;

      let source = 'SYSTEM';
      
      // Match UUIDs inside WS or REST tags
      const idMatch = message.match(/\[(WS|REST)-([a-f0-9\-]+)\]/i);
      if (idMatch && idMatch[2]) {
        const id = idMatch[2];
        const keys = useApiKeysStore.getState().keys;
        const key = keys.find(k => k.id === id);
        if (key) {
          const exchangeName = key.exchange.charAt(0).toUpperCase() + key.exchange.slice(1);
          source = `${key.label} (${exchangeName})`;
        } else if (message.includes('mocked-data')) {
           source = 'Mocked Data';
        } else {
           source = id.substring(0, 8); // Fallback
        }
      } else {
        const matchSys = message.match(/\[(.*?)\]/);
        if (matchSys && matchSys[1]) {
          source = matchSys[1];
        }
      }

      let level: LogLevel = 'INFO';
      
      if (type === 'error' || message.includes('[Error]')) {
        level = 'ERROR';
      } else if (type === 'warn') {
        level = 'WARN';
      } else if (message.includes('Ping enviado') || message.includes('Recebido: pong') || message.includes('[Keep-Alive]')) {
        level = 'DATA';
      } else if (source === 'Time-Sync' || source === 'HistoryCache' || source === 'ExchangeAggregator') {
        level = 'SYSTEM';
      }

      useLogStore.getState().addLog(level, source, message);
    } catch (e) {
      // Safe fallback, don't break console
    }
  };

  console.log = function (...args: any[]) {
    originalConsole.log.apply(console, args);
    processLog('log', args);
  };

  console.warn = function (...args: any[]) {
    originalConsole.warn.apply(console, args);
    processLog('warn', args);
  };

  console.error = function (...args: any[]) {
    originalConsole.error.apply(console, args);
    processLog('error', args);
  };
}
