import React, { useState, useEffect, useRef } from 'react';
import { useApiKeysStore, Exchange } from '../store/apiKeysStore';
import { OkxAdapter } from '../services/adapters/OkxAdapter';
import { BitgetAdapter } from '../services/adapters/BitgetAdapter';
import { BybitAdapter } from '../services/adapters/BybitAdapter';
import { proxyFetch } from '../utils/proxyFetch';
import { Send, Play, Square, Wifi, WifiOff, Terminal, ListCollapse } from 'lucide-react';

/* 
 * [TODO: TECHNICAL DEBT - PERMITTED EXCEPTION]
 * This component intentionally violates the Normalization Layer rule (consuming raw API responses directly in the UI).
 * It is marked as an official exception for DevTools diagnostic purposes.
 * In a future audit, this logic should be abstracted into an isolated DiagnosticService to keep the React tree pure.
 */

export function ApiTester() {
  const { keys } = useApiKeysStore();
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [mode, setMode] = useState<'REST' | 'WS'>('REST');

  // REST State
  const [restMethod, setRestMethod] = useState<'GET' | 'POST'>('GET');
  const [restPath, setRestPath] = useState('');
  const [restBody, setRestBody] = useState('');
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
      return `${protocol}//${window.location.host}/ws-proxy/bitget/v2/ws/private`;
    } else if (exchange === 'okx') {
      return 'wss://ws.okx.com:8443/ws/v5/private';
    } else if (exchange === 'bybit') {
      return 'wss://stream.bybit.com/v5/private';
    }
    return '';
  };

  const getRestBaseUrl = (exchange: Exchange) => {
    if (exchange === 'bitget') return 'https://api.bitget.com';
    if (exchange === 'okx') return 'https://www.okx.com';
    if (exchange === 'bybit') return 'https://api.bybit.com';
    return '';
  }

  const handleRestSubmit = async () => {
    if (!activeKey || !restPath) return;
    
    setRestResponse('Loading...');
    try {
      const baseUrl = getRestBaseUrl(activeKey.exchange);
      const targetUrl = `${baseUrl}${restPath.startsWith('/') ? '' : '/'}${restPath}`;
      
      let headers: Record<string, string> = {};
      
      if (activeKey.exchange === 'okx') {
         headers = await OkxAdapter.getHeaders(activeKey.apiKey, activeKey.apiSecret, activeKey.passphrase || '', restMethod, restPath, restMethod === 'POST' ? restBody : undefined);
      } else if (activeKey.exchange === 'bitget') {
         headers = await BitgetAdapter.getHeaders(activeKey.apiKey, activeKey.apiSecret, activeKey.passphrase || '', restMethod, restPath, restMethod === 'POST' ? restBody : undefined);
      } else if (activeKey.exchange === 'bybit') {
         // Bybit auth usually takes the payload string or query string.
         // If GET, query is everything after `?`.
         const queryStr = restPath.includes('?') ? restPath.split('?')[1] : '';
         const authPayload = restMethod === 'POST' ? restBody : queryStr;
         headers = await BybitAdapter.getHeaders(activeKey.apiKey, activeKey.apiSecret, authPayload) as Record<string, string>;
      }
      
      const payloadObj = restMethod === 'POST' && restBody ? JSON.parse(restBody) : undefined;
      const proxyResponse = await proxyFetch({ targetUrl, method: restMethod, headers, body: payloadObj });
      setRestResponse(JSON.stringify(proxyResponse, null, 2));
    } catch (err: any) {
      setRestResponse(`Error:\n${err.message || String(err)}`);
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
    logWs(`Connecting to ${wsUrl}...`);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = async () => {
      setWsConnected(true);
      logWs('Connected.');
      
      // Attempt login
      try {
        let exchangeCredentials: any = null;
        // WsAuth is now handled directly inside the core WebSockets engine or removed.
        // If ApiTester needs auth, it should hit a proxy or implement header generation here.
        
        if (exchangeCredentials) {
          logWs('Sending authentication payload...');
          ws.send(JSON.stringify(exchangeCredentials));
        } else {
           logWs('No WS auth payload generated via frontend. Public WS connected.');
        }
      } catch (err: any) {
         logWs(`Auth Error: ${err.message}`);
      }
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        logWs(`RECV: ${JSON.stringify(parsed, null, 2)}`);
      } catch (e) {
        logWs(`RECV (raw): ${event.data}`);
      }
    };

    ws.onerror = (error) => {
      logWs(`WS Error occurred`);
    };

    ws.onclose = () => {
      setWsConnected(false);
      logWs('Connection closed.');
      wsRef.current = null;
    };
  };

  const handleWsDisconnect = () => {
    if (wsRef.current) {
      logWs('Disconnecting...');
      wsRef.current.close();
    }
  };

  const handleWsSend = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      logWs('Cannot send: Not connected.');
      return;
    }
    if (!wsPayload) return;
    
    logWs(`SEND: ${wsPayload}`);
    wsRef.current.send(wsPayload);
  };

  return (
    <div className="flex flex-col h-full gap-6 max-w-6xl mx-auto w-full">
      <div className="bg-[#151619] border border-[#2a2b30] p-6 rounded-xl shrink-0">
        <h3 className="text-lg font-medium text-white mb-4">Connection Settings</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#8E9299] mb-1">Account</label>
            <select
              value={selectedKeyId}
              onChange={(e) => setSelectedKeyId(e.target.value)}
              className="w-full bg-[#0b0c10] border border-[#2a2b30] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#2F6BFF]"
            >
              {keys.length === 0 && <option value="" disabled>No API Keys found</option>}
              {keys.map((apiKey) => (
                <option key={apiKey.id} value={apiKey.id}>
                  {apiKey.label} ({apiKey.exchange})
                </option>
              ))}
            </select>
          </div>
          <div className="w-1/3">
            <label className="block text-sm font-medium text-[#8E9299] mb-1">Protocol</label>
            <div className="flex bg-[#0b0c10] rounded-lg p-1 border border-[#2a2b30]">
              <button
                type="button"
                className={`flex-1 py-1 text-sm font-medium rounded-md transition-colors ${mode === 'REST' ? 'bg-[#2F6BFF] text-white' : 'text-[#8E9299] hover:text-white'}`}
                onClick={() => setMode('REST')}
              >
                REST
              </button>
              <button
                type="button"
                className={`flex-1 py-1 text-sm font-medium rounded-md transition-colors ${mode === 'WS' ? 'bg-[#2F6BFF] text-white' : 'text-[#8E9299] hover:text-white'}`}
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
          <div className="bg-[#151619] border border-[#2a2b30] p-6 rounded-xl flex flex-col gap-4">
             <div className="flex gap-2">
               <select
                  value={restMethod}
                  onChange={(e) => setRestMethod(e.target.value as any)}
                  className="bg-[#0b0c10] border border-[#2a2b30] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#2F6BFF] w-24 shrink-0"
               >
                 <option value="GET">GET</option>
                 <option value="POST">POST</option>
               </select>
               <input
                  type="text"
                  placeholder="/api/v5/account/positions?instType=SWAP"
                  value={restPath}
                  onChange={(e) => setRestPath(e.target.value)}
                  className="flex-1 bg-[#0b0c10] border border-[#2a2b30] rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#2F6BFF]"
               />
               <button
                  onClick={handleRestSubmit}
                  disabled={!activeKey || !restPath}
                  className="bg-[#2F6BFF] hover:bg-[#2F6BFF]/90 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
               >
                 <Send className="w-4 h-4" /> Send
               </button>
             </div>
             {restMethod === 'POST' && (
               <div>
                  <label className="block text-sm font-medium text-[#8E9299] mb-1">Body (JSON)</label>
                  <textarea
                    value={restBody}
                    onChange={(e) => setRestBody(e.target.value)}
                    className="w-full h-32 bg-[#0b0c10] border border-[#2a2b30] rounded-lg p-3 text-white font-mono text-sm focus:outline-none focus:border-[#2F6BFF] resize-none"
                    placeholder='{"key": "value"}'
                  />
               </div>
             )}
          </div>
          
          <div className="flex-1 bg-[#0b0c10] border border-[#2a2b30] rounded-xl flex flex-col overflow-hidden min-h-0 relative group">
             <div className="bg-[#151619] border-b border-[#2a2b30] px-4 py-2 flex items-center justify-between shrink-0">
                <span className="text-sm font-medium text-[#8E9299] flex items-center gap-2">
                  <ListCollapse className="w-4 h-4" /> Response
                </span>
             </div>
             <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-green-400">
               {restResponse || 'No response yet.'}
             </pre>
          </div>
        </div>
      )}

      {mode === 'WS' && (
         <div className="flex-1 flex flex-col gap-4 min-h-0">
           <div className="bg-[#151619] border border-[#2a2b30] p-6 rounded-xl flex flex-col gap-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />
                  <span className="text-white font-medium">{wsConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
                <div className="flex gap-2">
                  {!wsConnected ? (
                    <button
                      onClick={handleWsConnect}
                      disabled={!activeKey}
                      className="bg-green-500/20 text-green-500 hover:bg-green-500/30 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <Wifi className="w-4 h-4" /> Connect
                    </button>
                  ) : (
                    <button
                      onClick={handleWsDisconnect}
                      className="bg-red-500/20 text-red-500 hover:bg-red-500/30 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <WifiOff className="w-4 h-4" /> Disconnect
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8E9299] mb-1">Message Payload</label>
                <div className="flex gap-2">
                  <textarea
                    value={wsPayload}
                    onChange={(e) => setWsPayload(e.target.value)}
                    className="flex-1 h-24 bg-[#0b0c10] border border-[#2a2b30] rounded-lg p-3 text-white font-mono text-sm focus:outline-none focus:border-[#2F6BFF] resize-none"
                    placeholder='{"op": "subscribe", "args": [{"channel": "positions", "instType": "SWAP"}]}'
                  />
                  <button
                    onClick={handleWsSend}
                    disabled={!wsConnected || !wsPayload}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-lg font-medium transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed w-24 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span className="text-xs">Send</span>
                  </button>
                </div>
              </div>
           </div>

           <div className="flex-1 bg-[#0b0c10] border border-[#2a2b30] rounded-xl flex flex-col overflow-hidden min-h-0 relative">
              <div className="bg-[#151619] border-b border-[#2a2b30] px-4 py-2 flex items-center justify-between shrink-0">
                 <span className="text-sm font-medium text-[#8E9299] flex items-center gap-2">
                   <Terminal className="w-4 h-4" /> Terminal Output
                 </span>
                 <button 
                  onClick={() => setWsOutput([])}
                  className="text-xs text-[#8E9299] hover:text-white transition-colors"
                 >
                   Clear
                 </button>
              </div>
              <div className="flex-1 overflow-auto p-4 text-xs font-mono text-[#a9b1d6] space-y-1">
                {wsOutput.length === 0 && <div className="text-[#8E9299]/50">No messages yet.</div>}
                {wsOutput.map((msg, i) => (
                  <div key={i} className="whitespace-pre-wrap break-all border-b border-white/5 pb-1">
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
