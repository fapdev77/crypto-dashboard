import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useApiKeysStore, Exchange, ApiCredentials } from '../store/apiKeysStore';
import { OkxAdapter } from '../services/adapters/OkxAdapter';
import { BitgetAdapter } from '../services/adapters/BitgetAdapter';
import { BybitAdapter } from '../services/adapters/BybitAdapter';
import { getBybitBaseUrl } from '../utils/bybitEndpoints';
import { proxyFetch } from '../utils/proxyFetch';
import { LogManager } from '../services/LogManager';
import { Send, Wifi, WifiOff, Terminal, ListCollapse } from 'lucide-react';

/* 
 * [TODO: TECHNICAL DEBT - PERMITTED EXCEPTION]
 * This component intentionally violates the Normalization Layer rule (consuming raw API responses directly in the UI).
 * It is marked as an official exception for DevTools diagnostic purposes.
 * In a future audit, this logic should be abstracted into an isolated DiagnosticService to keep the React tree pure.
 */

export function ApiTester() {
  const { t } = useTranslation();
  const { keys } = useApiKeysStore();
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [mode, setMode] = useState<'REST' | 'WS'>('REST');

  // REST State
  const [restPath, setRestPath] = useState('');
  const [restResponse, setRestResponse] = useState('');

  // WS State
  const [wsConnected, setWsConnected] = useState(false);
  const [wsPayload, setWsPayload] = useState('');
  const [wsOutput, setWsOutput] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const wsOutputEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (keys.length > 0 && !selectedKeyId) {
      setSelectedKeyId(keys[0].id);
    }
  }, [keys, selectedKeyId]);

  useEffect(() => {
    if (wsOutputEndRef.current) {
      wsOutputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [wsOutput]);

  const activeKey = keys.find(k => k.id === selectedKeyId);

  const getWsUrl = (exchange: Exchange) => {
    if (exchange === 'bitget') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws-proxy/bitget/v2/ws/public`;
    } else if (exchange === 'okx') {
      return 'wss://ws.okx.com:8443/ws/v5/public';
    } else if (exchange === 'bybit') {
      return 'wss://stream.bybit.com/v5/public/linear';
    }
    return '';
  };

  const getRestBaseUrl = (key: ApiCredentials) => {
    if (key.exchange === 'bitget') return 'https://api.bitget.com';
    if (key.exchange === 'okx') return 'https://www.okx.com';
    if (key.exchange === 'bybit') return getBybitBaseUrl(key.environment, key.bybitRegion);
    return '';
  };

  const handleRestSubmit = async () => {
    if (!activeKey || !restPath) return;

    setRestResponse(t('common.loading', 'Loading...'));
    try {
      const baseUrl = getRestBaseUrl(activeKey);
      const targetUrl = `${baseUrl}${restPath.startsWith('/') ? '' : '/'}${restPath}`;

      let headers: Record<string, string> = {};

      if (activeKey.exchange === 'okx') {
        headers = await OkxAdapter.getHeaders(activeKey.apiKey, activeKey.apiSecret, activeKey.passphrase || '', 'GET', restPath);
      } else if (activeKey.exchange === 'bitget') {
        headers = await BitgetAdapter.getHeaders(activeKey.apiKey, activeKey.apiSecret, activeKey.passphrase || '', 'GET', restPath);
      } else if (activeKey.exchange === 'bybit') {
        const queryStr = restPath.includes('?') ? restPath.split('?')[1] : '';
        headers = await BybitAdapter.getHeaders(activeKey, queryStr) as Record<string, string>;
      }

      const proxyResponse = await proxyFetch({ targetUrl, method: 'GET', headers });
      setRestResponse(JSON.stringify(proxyResponse, null, 2));
    } catch (err: any) {
      LogManager.error('ApiTester', `REST request failed: ${restPath}`, err);
      setRestResponse(`${t('common.error', 'Error')}:\n${err.message || String(err)}`);
    }
  };

  const logWs = (msg: string) => {
    setWsOutput(prev => [...prev, `${new Date().toISOString().split('T')[1].split('Z')[0]} - ${msg}`]);
  };

  const handleWsConnect = () => {
    if (!activeKey) return;
    if (wsRef.current) {
      wsRef.current.close();
    }
    setWsOutput([]);

    const wsUrl = getWsUrl(activeKey.exchange);
    logWs(t('apiTester.wsConnecting', 'Connecting to {{url}}...', { url: wsUrl }));

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = async () => {
      setWsConnected(true);
      logWs(t('apiTester.wsConnectedLog', 'Connected.'));

      try {
        const exchangeCredentials: any = null;
        if (exchangeCredentials) {
          logWs(t('apiTester.wsSendingAuth', 'Sending authentication payload...'));
          ws.send(JSON.stringify(exchangeCredentials));
        } else {
          LogManager.info('ApiTester', `WS connected for ${activeKey?.exchange} (${activeKey?.id}) — public channels only`);
          logWs(t('apiTester.wsPublicOnlyLog', 'WS connected (Public channels only). Submit a subscribe payload to test.'));
        }
      } catch (err: any) {
        LogManager.warn('ApiTester', `WS auth error for ${activeKey?.exchange}:`, err);
        logWs(t('apiTester.wsAuthError', 'Auth Error: {{error}}', { error: err.message }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        logWs(`${t('apiTester.wsRecv', 'RECV')}: ${JSON.stringify(parsed, null, 2)}`);
      } catch {
        logWs(`${t('apiTester.wsRecvRaw', 'RECV (raw)')}: ${event.data}`);
      }
    };

    ws.onerror = () => {
      LogManager.error('ApiTester', `WS connection error for ${activeKey?.exchange} (${activeKey?.id})`);
      logWs(t('apiTester.wsErrorOccurred', 'WS Error occurred'));
    };

    ws.onclose = () => {
      setWsConnected(false);
      logWs(t('apiTester.wsClosed', 'Connection closed.'));
      wsRef.current = null;
    };
  };

  const handleWsDisconnect = () => {
    if (wsRef.current) {
      LogManager.info('ApiTester', `WS disconnected for ${activeKey?.exchange} (${activeKey?.id})`);
      logWs(t('apiTester.wsDisconnecting', 'Disconnecting...'));
      wsRef.current.close();
    }
  };

  const handleWsSend = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      logWs(t('apiTester.wsCannotSend', 'Cannot send: Not connected.'));
      return;
    }
    if (!wsPayload) return;

    logWs(`${t('apiTester.wsSendPrefix', 'SEND')}: ${wsPayload}`);
    wsRef.current.send(wsPayload);
  };

  return (
    <div className="flex flex-col h-full gap-6 max-w-6xl mx-auto w-full">
      <div className="bg-surface border border-line p-6 rounded-xl shrink-0">
        <h3 className="text-lg font-medium text-fg mb-4">{t('apiTester.connectionSettings', 'Connection Settings')}</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-fg-muted mb-1">{t('apiTester.account', 'Account')}</label>
            <select
              value={selectedKeyId}
              onChange={(e) => setSelectedKeyId(e.target.value)}
              className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-fg focus:outline-none focus:border-accent"
            >
              {keys.length === 0 && <option value="" disabled>{t('apiTester.noApiKeys', 'No API Keys found')}</option>}
              {keys.map((apiKey) => (
                <option key={apiKey.id} value={apiKey.id}>
                  {apiKey.label} ({apiKey.exchange})
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-1/3">
            <label className="block text-sm font-medium text-fg-muted mb-1">{t('apiTester.protocol', 'Protocol')}</label>
            <div className="flex bg-canvas rounded-lg p-1 border border-line">
              <button
                type="button"
                className={`flex-1 py-1 text-sm font-medium rounded-md transition-colors ${mode === 'REST' ? 'bg-accent text-white' : 'text-fg-muted hover:text-fg'}`}
                onClick={() => setMode('REST')}
              >
                REST
              </button>
              <button
                type="button"
                className={`flex-1 py-1 text-sm font-medium rounded-md transition-colors ${mode === 'WS' ? 'bg-accent text-white' : 'text-fg-muted hover:text-fg'}`}
                onClick={() => setMode('WS')}
              >
                WebSocket
              </button>
            </div>
          </div>
        </div>
      </div>

      {mode === 'REST' && (
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          <div className="bg-surface border border-line p-6 rounded-xl flex flex-col gap-4">
            <div className="flex gap-2">
              <div className="bg-canvas border border-line rounded-lg px-3 py-2 text-fg font-mono flex items-center shrink-0">
                GET
              </div>
              <input
                type="text"
                placeholder="/api/v5/account/positions?instType=SWAP"
                value={restPath}
                onChange={(e) => setRestPath(e.target.value)}
                className="flex-1 bg-canvas border border-line rounded-lg px-4 py-2 text-fg font-mono text-sm focus:outline-none focus:border-accent"
              />
              <button
                onClick={handleRestSubmit}
                disabled={!activeKey || !restPath}
                className="bg-accent hover:bg-accent/90 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-4 h-4" /> {t('apiTester.send', 'Send')}
              </button>
            </div>
          </div>

          <div className="flex-1 bg-canvas border border-line rounded-xl flex flex-col overflow-hidden min-h-0 relative group">
            <div className="bg-surface border-b border-line px-4 py-2 flex items-center justify-between shrink-0">
              <span className="text-sm font-medium text-fg-muted flex items-center gap-2">
                <ListCollapse className="w-4 h-4" /> {t('apiTester.response', 'Response')}
              </span>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-success">
              {restResponse || t('apiTester.noResponse', 'No response yet.')}
            </pre>
          </div>
        </div>
      )}

      {mode === 'WS' && (
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          <div className="bg-surface border border-line p-6 rounded-xl flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-success shadow-sm' : 'bg-danger shadow-sm'}`} />
                <span className="text-fg font-medium">
                  {wsConnected ? t('common.connected', 'Connected') : t('common.disconnected', 'Disconnected')}
                </span>
              </div>
              <div className="flex gap-2">
                {!wsConnected ? (
                  <button
                    onClick={handleWsConnect}
                    disabled={!activeKey}
                    className="bg-success/20 text-success hover:bg-success/30 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Wifi className="w-4 h-4" /> {t('apiTester.connect', 'Connect')}
                  </button>
                ) : (
                  <button
                    onClick={handleWsDisconnect}
                    className="bg-danger/20 text-danger hover:bg-danger/30 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <WifiOff className="w-4 h-4" /> {t('apiTester.disconnect', 'Disconnect')}
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-muted mb-1">{t('apiTester.messagePayload', 'Message Payload')}</label>
              <div className="flex gap-2">
                <textarea
                  value={wsPayload}
                  onChange={(e) => setWsPayload(e.target.value)}
                  className="flex-1 h-24 bg-canvas border border-line rounded-lg p-3 text-fg font-mono text-sm focus:outline-none focus:border-accent resize-none"
                  placeholder={
                    !activeKey ? t('apiTester.selectKeyPlaceholder', 'Select an API Key...') :
                    activeKey.exchange === 'okx' ? '{"op": "subscribe", "args": [{"channel": "tickers", "instId": "BTC-USDT"}]}' :
                    activeKey.exchange === 'bybit' ? '{"op": "subscribe", "args": ["tickers.BTCUSDT"]}' :
                    '{"op": "subscribe", "args": [{"instType": "USDT-FUTURES", "channel": "ticker", "instId": "BTCUSDT"}]}'
                  }
                />
                <button
                  onClick={handleWsSend}
                  disabled={!wsConnected || !wsPayload}
                  className="bg-elevated hover:bg-elevated-hover text-fg border border-line px-4 rounded-lg font-medium transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed w-24 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="text-xs">{t('apiTester.send', 'Send')}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-canvas border border-line rounded-xl flex flex-col overflow-hidden min-h-0 relative">
            <div className="bg-surface border-b border-line px-4 py-2 flex items-center justify-between shrink-0">
              <span className="text-sm font-medium text-fg-muted flex items-center gap-2">
                <Terminal className="w-4 h-4" /> {t('apiTester.terminalOutput', 'Terminal Output')}
              </span>
              <button
                onClick={() => setWsOutput([])}
                className="text-xs text-fg-muted hover:text-fg transition-colors"
              >
                {t('common.clear', 'Clear')}
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 text-xs font-mono text-fg/90 space-y-1">
              {wsOutput.length === 0 && <div className="text-fg-muted/50">{t('apiTester.noMessages', 'No messages yet.')}</div>}
              {wsOutput.map((msg, i) => (
                <div key={i} className="whitespace-pre-wrap break-all border-b border-line/50 pb-1">
                  {msg}
                </div>
              ))}
              <div ref={wsOutputEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

