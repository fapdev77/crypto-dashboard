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
import { BybitRestAdapter } from '../services/adapters/bybit/RestAdapter';
import { BybitHistoryAdapter } from '../services/adapters/bybit/HistoryAdapter';
import { OkxHistoryAdapter } from '../services/adapters/okx/HistoryAdapter';
import { BitgetHistoryAdapter } from '../services/adapters/bitget/HistoryAdapter';

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

  const socketsRef = useRef<Record<string, WebSocket | null>>({});
  const intervalsRef = useRef<Record<string, NodeJS.Timeout | null>>({});
  const reconnectTimers = useRef<Record<string, NodeJS.Timeout | null>>({});
  const retryCounters = useRef<Record<string, number>>({});

  useEffect(() => {
    if (useMockData) {
      Object.keys(socketsRef.current).forEach(id => disconnect(id));
      keys.forEach(k => useDashboardStore.getState().clearConnectionData(k.id));
      
      const currentState = useDashboardStore.getState();
      mockAccountsData.forEach((acc: any) => {
        const { connectionId } = acc;
        const accountBalances = mockBalancesData.filter((b: any) => b.connectionId === connectionId);
        currentState.updateBalances(connectionId, accountBalances as any);
        const accountPositions = mockPositionsData.filter((p: any) => p.connectionId === connectionId);
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

  const syncBybitRestData = async (config: ApiCredentials) => {
    const { id, exchange, apiKey, apiSecret } = config;
    try {
      // console.log(`[REST-${id}] Buscando dados para Bybit via REST...`);
      const [walletData, positionsData] = await Promise.all([
        BybitRestAdapter.fetchWallet(apiKey, apiSecret),
        BybitRestAdapter.fetchPositions(apiKey, apiSecret)
      ]);
      
      const currentState = useDashboardStore.getState();

      if (walletData) {
        const balances = BybitRestAdapter.parseBalances(walletData, id, exchange, config.label);
        if (balances.length > 0) currentState.updateBalances(id, balances);
      }

      if (positionsData) {
        const positions = BybitRestAdapter.parsePositions(positionsData, id, config.label);
        if (positions.length > 0) currentState.updatePositions(id, positions);
      }
    } catch (err) {
      console.error(`[REST-${id}] Bybit REST fetch falhou:`, err);
    }
  };

  const startBybitPolling = (config: ApiCredentials) => {
    const { id } = config;
    const poll = async () => {
      if (intervalsRef.current[id + '-poll'] === null) return; // Prevent execution if disconnected
      
      const currentConfig = useApiKeysStore.getState().keys.find((k) => k.id === id);
      if (!currentConfig || !currentConfig.isActive || socketsRef.current[id]?.readyState !== WebSocket.OPEN) {
        return;
      }

      await syncBybitRestData(config);

      const intervalMs = useSettingsStore.getState().bybitPollingInterval * 1000;
      if (intervalsRef.current[id + '-poll'] !== null) {
        intervalsRef.current[id + '-poll'] = setTimeout(poll, intervalMs);
      }
    };

    // First cycle
    const intervalMs = useSettingsStore.getState().bybitPollingInterval * 1000;
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

    if (exchange === 'bybit') {
      (async () => {
        try {
          console.log(`[REST-${id}] Buscando dados iniciais para Bybit via REST e iniciando Short-Polling...`);
          await BybitHistoryAdapter.syncBybitTime();
          await syncBybitRestData(config);
          console.log(`[REST-${id}] Dados iniciais carregados para Bybit.`);
          startBybitPolling(config);
        } catch (error: any) {
          console.error(`[REST-${id}] Erro ao buscar dados iniciais para Bybit:`, error);
          setConnectionError(id, `REST Error: ${error.message}`);
          toast.error(`Bybit Initial Sync Failed: ${error.message}`, { id: `rest-err-${id}` });
        }
      })();
    }

    ws.onopen = async () => {
      console.log(`[WS-${id}] Conexão física estabelecida com sucesso.`);
      setConnectionStatus(id, 'connected', null);
      setConnectionError(id, null);
      retryCounters.current[id] = 0; // Reset retry count on successful open
      startPing(config, ws);

      try {
        let authPayload;
        if (exchange === 'okx') {
          authPayload = await OkxHistoryAdapter.getWsAuth(apiKey, apiSecret, passphrase || '');
        } else if (exchange === 'bitget') {
          authPayload = await BitgetHistoryAdapter.getWsAuth(apiKey, apiSecret, passphrase || '');
        } else if (exchange === 'bybit') {
          authPayload = await BybitHistoryAdapter.getWsAuth(apiKey, apiSecret);
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
      if (typeof msg === 'string' && msg === 'pong') {
        console.log(`[WS-${id}] Recebido: pong`);
        return;
      }
      
      try {
        const data = JSON.parse(msg.toString());
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
      const currentConfig = useApiKeysStore.getState().keys.find((k) => k.id === id);
      if (currentConfig && currentConfig.isActive) {
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
            { instType: 'USDT-FUTURES', channel: 'positions', instId: 'default' },
            { instType: 'COIN-FUTURES', channel: 'positions', instId: 'default' }
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
