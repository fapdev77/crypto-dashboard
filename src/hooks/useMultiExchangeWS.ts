import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Exchange, useApiKeysStore, ApiCredentials } from '../store/apiKeysStore';
import { useDashboardStore, BalanceItem } from '../store/dashboardStore';
import { useSettingsStore } from '../store/settingsStore';
import { UnifiedPosition } from '../types';
import mockAccountsData from '../mock/accounts.json';
import mockBalancesData from '../mock/balances.json';
import mockPositionsData from '../mock/positions.json';
import { WsParsers } from '../services/ws/WsParsers';
import { BybitAdapter } from '../services/adapters/BybitAdapter';
import { BitgetAdapter } from '../services/adapters/BitgetAdapter';
import { OkxAdapter } from '../services/adapters/OkxAdapter';
import { ExchangeAggregator } from '../services/adapters/ExchangeAggregator';

const getBitgetUrl = () => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws-proxy/bitget/v2/ws/private`;
  }
  return 'wss://ws.bitget.com/v2/ws/private';
}

const WS_URLS = {
  bitget: getBitgetUrl(), 
  okx: 'wss://ws.okx.com:8443/ws/v5/private',
  bybit: 'wss://stream.bybit.com/v5/private',
};

export function useMultiExchangeWS() {
  const keys = useApiKeysStore((state) => state.keys);
  const useMockData = useSettingsStore((state) => state.useMockData);
  const setConnectionStatus = useDashboardStore((state) => state.setConnectionStatus);
  const setConnectionError = useDashboardStore((state) => state.setConnectionError);
  const updateBalances = useDashboardStore((state) => state.updateBalances);
  const updatePositions = useDashboardStore((state) => state.updatePositions);
  const updateLatency = useDashboardStore((state) => state.updateLatency);
  const addBytesReceived = useDashboardStore((state) => state.addBytesReceived);
  const tickThroughput = useDashboardStore((state) => state.tickThroughput);

  const socketsRef = useRef<Record<string, WebSocket | null>>({});
  const intervalsRef = useRef<Record<string, NodeJS.Timeout | null>>({});
  const reconnectTimers = useRef<Record<string, NodeJS.Timeout | null>>({});
  const retryCounters = useRef<Record<string, number>>({});
  const lastPingRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const throughputInterval = setInterval(tickThroughput, 1000);
    return () => clearInterval(throughputInterval);
  }, [tickThroughput]);

  useEffect(() => {
    if (useMockData) {
      Object.keys(socketsRef.current).forEach(id => disconnect(id));
      keys.forEach(k => useDashboardStore.getState().clearConnectionData(k.id));
      
      const currentState = useDashboardStore.getState();
      mockAccountsData.forEach((acc: any) => {
        const { connectionId } = acc;
        const accountBalances = mockBalancesData.filter((b: any) => b.connectionId === connectionId);
        currentState.updateBalances(connectionId, accountBalances as any);
        const accountPositions = mockPositionsData.filter((pos: any) => pos.connectionId === connectionId);
        currentState.updatePositions(connectionId, accountPositions as any);
      });
      return;
    }

    const activeIds = new Set<string>();
    const currentState = useDashboardStore.getState();
    mockAccountsData.forEach((acc: any) => {
      currentState.clearConnectionData(acc.connectionId);
    });

    keys.forEach((config) => {
      if (config.isActive) {
        activeIds.add(config.id);
        if (!socketsRef.current[config.id]) {
          retryCounters.current[config.id] = 0; // reset on fresh connect
          connect(config);
        }
      }
    });

    Object.keys(socketsRef.current).forEach((id) => {
      if (!activeIds.has(id)) {
        disconnect(id);
      }
    });

    const existingConnectionIds = new Set([
      ...Object.values(currentState.balances).map(b => b.connectionId),
      ...Object.values(currentState.positions).map(p => p.connectionId)
    ]);
    
    existingConnectionIds.forEach(id => {
      if (!id.startsWith('mocked-data') && !activeIds.has(id)) {
        currentState.clearConnectionData(id);
      }
    });
  }, [keys, useMockData]);

  useEffect(() => {
    return () => {
      Object.keys(socketsRef.current).forEach((id) => disconnect(id));
    };
  }, []);

  const disconnect = (id: string) => {
    const ws = socketsRef.current[id];
    if (ws) {
      ws.close();
      delete socketsRef.current[id];
    }
    
    const pingTimer = intervalsRef.current[id];
    if (pingTimer) {
      clearInterval(pingTimer);
      delete intervalsRef.current[id];
    }
    
    const pollTimer = intervalsRef.current[id + '-poll'];
    if (pollTimer) {
      clearTimeout(pollTimer);
      delete intervalsRef.current[id + '-poll'];
    }
    
    const rTimer = reconnectTimers.current[id];
    if (rTimer) {
      clearTimeout(rTimer);
      delete reconnectTimers.current[id];
    }

    setConnectionStatus(id, 'disconnected', null);
    setConnectionError(id, null);
  };

  const startPing = (config: ApiCredentials, ws: WebSocket) => {
    intervalsRef.current[config.id] = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        lastPingRef.current[config.id] = Date.now();
        if (config.exchange === 'bybit') {
          ws.send(JSON.stringify({ op: 'ping' }));
          console.log(`[WS-${config.id}][Keep-Alive] Ping enviado (Bybit).`);
        } else if (config.exchange === 'okx' || config.exchange === 'bitget') {
          ws.send('ping');
          console.log(`[WS-${config.id}][Keep-Alive] Ping enviado (${config.exchange}).`);
        }
      }
    }, 20000); 
  };

  const syncRestData = async (config: ApiCredentials) => {
    try {
      const adapter = ExchangeAggregator.getAdapter(config.exchange);
      const [balances, positions] = await Promise.all([
        adapter.getBalance(config),
        adapter.getOpenPositions(config)
      ]);
      const currentState = useDashboardStore.getState();
      currentState.updateBalances(config.id, balances as any);
      currentState.updatePositions(config.id, positions);
    } catch (err) {
      console.error(`[REST-${config.id}] ${config.exchange} REST polling failed:`, err);
    }
  };

  const startRestPolling = (config: ApiCredentials) => {
    const { id } = config;
    const poll = async () => {
      if (intervalsRef.current[id + '-poll'] === null) return; // Prevent execution if disconnected
      
      const isMockEnabled = useSettingsStore.getState().useMockData;
      const currentConfig = useApiKeysStore.getState().keys.find((k) => k.id === id);
      
      if (isMockEnabled || !currentConfig || !currentConfig.isActive || socketsRef.current[id]?.readyState !== WebSocket.OPEN) {
        return;
      }

      await syncRestData(config);

      const intervalMs = useSettingsStore.getState().pollingInterval * 1000;
      if (intervalsRef.current[id + '-poll'] !== null) {
        intervalsRef.current[id + '-poll'] = setTimeout(poll, intervalMs);
      }
    };

    // First cycle
    const intervalMs = useSettingsStore.getState().pollingInterval * 1000;
    intervalsRef.current[id + '-poll'] = setTimeout(poll, intervalMs);
  };

  const connect = (config: ApiCredentials) => {
    const { id, exchange, apiKey, apiSecret, passphrase } = config;

    setConnectionStatus(id, 'connecting', null);
    setConnectionError(id, null);
    const wsUrl = exchange === 'bitget' ? getBitgetUrl() : (WS_URLS as any)[exchange];
    console.log(`[WS-${id}] Iniciando conexão para: ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    socketsRef.current[id] = ws;

    // REST Bootloader for all exchanges
    (async () => {
      try {
        console.log(`[REST-${id}] Bootloading initial balances and positions...`);
        await ExchangeAggregator.bootloadConnection(config);
        console.log(`[REST-${id}] REST Bootload completed.`);
        
        // Start generic REST fallback polling for all exchanges to ensure Mark Price/Unrealized PnL is kept fresh
        if (intervalsRef.current[id + '-poll']) {
          clearTimeout(intervalsRef.current[id + '-poll'] as NodeJS.Timeout);
        }
        startRestPolling(config);
      } catch (error: any) {
        console.error(`[REST-${id}] REST Bootload failed:`, error);
        setConnectionError(id, `REST Bootload Error: ${error.message}`);
        toast.error(`${exchange.toUpperCase()} initial sync failed: ${error.message}`, { id: `rest-err-${id}` });
      }
    })();

    ws.onopen = async () => {
      console.log(`[WS-${id}] Conexão física estabelecida com sucesso.`);
      retryCounters.current[id] = 0; // Reset retry count on successful open
      startPing(config, ws);

      try {
        let authPayload;
        if (exchange === 'okx') {
          authPayload = await OkxAdapter.getWsAuth(apiKey, apiSecret, passphrase || '');
        } else if (exchange === 'bitget') {
          authPayload = await BitgetAdapter.getWsAuth(apiKey, apiSecret, passphrase || '');
        } else if (exchange === 'bybit') {
          authPayload = await BybitAdapter.getWsAuth(apiKey, apiSecret);
        }

        if (authPayload) {
          console.log(`[WS-${id}] Enviando credenciais de login...`);
          ws.send(JSON.stringify(authPayload));
        }
      } catch (err: any) {
        console.error(`[WS-${id}] Falha ao montar o payload de autenticação:`, err);
        toast.error(`Failed to auth ${exchange}: ${err.message}`, { id: `auth-err-${id}` });
        ws.close();
      }
    };

    ws.onmessage = (event) => {
      const msg = event.data;
      
      const byteSize = typeof msg === 'string' 
        ? new Blob([msg]).size 
        : (msg instanceof Blob 
            ? msg.size 
            : (msg instanceof ArrayBuffer 
                ? msg.byteLength 
                : 0));
      addBytesReceived(id, byteSize);
      
      if (typeof msg === 'string' && msg === 'pong') {
        console.log(`[WS-${id}] Recebido: pong`);
        const sentTime = lastPingRef.current[id];
        if (sentTime) {
          updateLatency(id, Date.now() - sentTime);
        }
        return;
      }
      
      try {
        const data = JSON.parse(msg.toString());
        
        // Handle Bybit pong ({"success":true,"ret_msg":"pong","conn_id":"...","req_id":"","op":"ping"})
        if (exchange === 'bybit' && data.op === 'ping' && data.ret_msg === 'pong') {
          console.log(`[WS-${id}] Recebido: pong`);
          const sentTime = lastPingRef.current[id];
          if (sentTime) {
            updateLatency(id, Date.now() - sentTime);
          }
          return;
        }

        handleSubscriptionAndAuth(config, ws, data);
        WsParsers.parseStream(config, data);
      } catch (err) {
        console.error(`[WS-${id}] Erro ao realizar o parse da mensagem:`, err);
      }
    };

    ws.onerror = (error) => {
      console.error(`[WS-${id}] EVENTO DE ERRO. Se "isTrusted: true" sem detalhes, possivelmente o navegador bloqueou a conexão.`);
      console.error(`[WS-${id}] Detalhes do erro:`, error);
      setConnectionStatus(id, 'error', 'WebSocket Connection Error');
      setConnectionError(id, 'WebSocket Connection Error');
      toast.error(`${exchange.toUpperCase()} WebSocket Error. Check your connection or API keys.`, { id: `ws-err-${id}` });
    };

    ws.onclose = (event) => {
      console.log(`[WS-${id}] Conexão encerrada. Code: ${event.code}, Reason: ${event.reason || "Sem razão especificada"}`);
      const currentConfig = useApiKeysStore.getState().keys.find((apiKey) => apiKey.id === id);
      const isMockEnabled = useSettingsStore.getState().useMockData;
      
      if (currentConfig && currentConfig.isActive && !isMockEnabled) {
        setConnectionStatus(id, 'error', event.reason || 'Closed');
        
        // Exponential Backoff
        const retryCount = retryCounters.current[id] || 0;
        const delay = Math.min(5000 * Math.pow(2, retryCount), 60000); // Max 60s
        retryCounters.current[id] = retryCount + 1;
        
        console.log(`[WS-${id}] Tentando reconectar em ${delay/1000} segundos... (Tentativa ${retryCount + 1})`);
        
        reconnectTimers.current[id] = setTimeout(() => {
          connect(currentConfig);
        }, delay);
      }
    };
  };

  const handleSubscriptionAndAuth = (config: ApiCredentials, ws: WebSocket, data: any) => {
    const { id, exchange } = config;
    
    if (exchange === 'bitget') {
      if (data.event === 'login' && data.code === 0) {
        console.log(`[WS-${id}][Auth] Bitget login realizado com sucesso!`);
        toast.success(`Bitget connected successfully!`, { id: `success-${id}` });
        ws.send(JSON.stringify({
          op: 'subscribe',
          args: [
            { instType: 'SPOT', channel: 'account', coin: 'default' },
            { instType: 'USDT-FUTURES', channel: 'account', coin: 'default' },
            { instType: 'COIN-FUTURES', channel: 'account', coin: 'default' },
            { instType: 'USDC-FUTURES', channel: 'account', coin: 'default' },
            { instType: 'MARGIN', channel: 'account-crossed', coin: 'default' },
            { instType: 'MARGIN', channel: 'account-isolated', coin: 'default' },
            { instType: 'USDT-FUTURES', channel: 'positions', instId: 'default' },
            { instType: 'COIN-FUTURES', channel: 'positions', instId: 'default' },
            { instType: 'USDC-FUTURES', channel: 'positions', instId: 'default' }
          ]
        }));
      } else if (data.event === 'error') {
        console.error(`[WS-${id}][Error] Bitget erro:`, data.code, data.msg);
        setConnectionError(id, `Bitget WS Error (${data.code}): ${data.msg}`);
        toast.error(`Bitget Auth Error: ${data.msg}`, { id: `auth-err-${id}` });
      }
    }

    if (exchange === 'okx') {
      if (data.event === 'login' && data.code === '0') {
        console.log(`[WS-${id}][Auth] OKX login realizado com sucesso!`);
        toast.success(`OKX connected successfully!`, { id: `success-${id}` });
        ws.send(JSON.stringify({
          op: 'subscribe',
          args: [
            { channel: 'account' },
            { channel: 'positions', instType: 'SWAP' },
            { channel: 'positions', instType: 'MARGIN' }
          ]
        }));
      } else if (data.event === 'error') {
        console.error(`[WS-${id}][Error] OKX erro:`, data.code, data.msg);
        setConnectionError(id, `OKX WS Error (${data.code}): ${data.msg}`);
        toast.error(`OKX Auth Error: ${data.msg}`, { id: `auth-err-${id}` });
      }
    }

    if (exchange === 'bybit' && data.op === 'auth') {
      if (data.success === true) {
        console.log(`[WS-${id}][Auth] Bybit login realizado com sucesso!`);
        toast.success(`Bybit connected successfully!`, { id: `success-${id}` });
        ws.send(JSON.stringify({
          op: 'subscribe',
          args: ['wallet', 'position']
        }));
      } else {
        console.error(`[WS-${id}][Error] Bybit erro de login:`, data);
        setConnectionError(id, `Bybit Auth Error: ${data.ret_msg}`);
        toast.error(`Bybit Auth Error: ${data.ret_msg}`, { id: `auth-err-${id}` });
      }
    }
  };
}
