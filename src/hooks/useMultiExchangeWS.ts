import { useEffect, useRef } from 'react';
import { Exchange, useApiKeysStore, ApiCredentials } from '../store/apiKeysStore';
import { useDashboardStore, BalanceItem, PositionItem } from '../store/dashboardStore';
import { ExchangeAuth } from '../services/ExchangeAuth';

const getBitgetUrl = () => {
  // If we are in the browser, we construct the proxy URL based on the current location.
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws-proxy/bitget/v2/ws/private`;
  }
  return 'wss://ws.bitget.com/v2/ws/private';
}

const WS_URLS = {
  // Utilizamos o proxy local para a Bitget contornar a obrigatoriedade de ausência de Origin (WAF/CORS)
  bitget: getBitgetUrl(), 
  okx: 'wss://ws.okx.com:8443/ws/v5/private',
  bybit: 'wss://stream.bybit.com/v5/private',
};

export function useMultiExchangeWS() {
  const keys = useApiKeysStore((state) => state.keys);
  const setConnectionStatus = useDashboardStore((state) => state.setConnectionStatus);
  const updateBalances = useDashboardStore((state) => state.updateBalances);
  const updatePositions = useDashboardStore((state) => state.updatePositions);

  const socketsRef = useRef<Record<string, WebSocket | null>>({});
  const intervalsRef = useRef<Record<string, NodeJS.Timeout | null>>({});
  const reconnectTimers = useRef<Record<string, NodeJS.Timeout | null>>({});

  useEffect(() => {
    const activeIds = new Set<string>();

    keys.forEach((config) => {
      if (config.isActive) {
        activeIds.add(config.id);
        if (!socketsRef.current[config.id]) {
          connect(config);
        }
      }
    });

    // Disconnect removed or inactive keys
    Object.keys(socketsRef.current).forEach((id) => {
      if (!activeIds.has(id)) {
        disconnect(id);
      }
    });
  }, [keys]);

  useEffect(() => {
    return () => {
      Object.keys(socketsRef.current).forEach((id) => {
        disconnect(id);
      });
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
    
    const rTimer = reconnectTimers.current[id];
    if (rTimer) {
      clearTimeout(rTimer);
      delete reconnectTimers.current[id];
    }

    setConnectionStatus(id, 'disconnected');
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
    }, 20000); // 20 seconds
  };

  const connect = (config: ApiCredentials) => {
    const { id, exchange, apiKey, apiSecret, passphrase } = config;

    setConnectionStatus(id, 'connecting');
    const wsUrl = exchange === 'bitget' ? getBitgetUrl() : WS_URLS[exchange];
    console.log(`[WS-${id}] Iniciando conexão para: ${wsUrl}`);
    
    // Some connections fail due to browser CORS/Origin policies. 
    // We try to connect directly first. Timeouts/errors will be caught here.
    const ws = new WebSocket(wsUrl);
    socketsRef.current[id] = ws;

    ws.onopen = () => {
      console.log(`[WS-${id}] Conexão física estabelecida com sucesso.`);
      setConnectionStatus(id, 'connected');
      startPing(config, ws);

      try {
        let authPayload;
        if (exchange === 'okx') {
          authPayload = ExchangeAuth.getOkxWsAuth(apiKey, apiSecret, passphrase || '');
        } else if (exchange === 'bitget') {
          authPayload = ExchangeAuth.getBitgetWsAuth(apiKey, apiSecret, passphrase || '');
        } else if (exchange === 'bybit') {
          authPayload = ExchangeAuth.getBybitWsAuth(apiKey, apiSecret);
        }

        if (authPayload) {
          console.log(`[WS-${id}] Enviando credenciais de login...`);
          ws.send(JSON.stringify(authPayload));
        }
      } catch (err) {
        console.error(`[WS-${id}] Falha ao montar o payload de autenticação:`, err);
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
        // console.log(`[WS-${id}] Mensagem recebida:`, data); // uncomment for verbose logging
        
        handleSubscriptionAndAuth(config, ws, data);
        parseDataStream(config, data);
      } catch (err) {
        console.error(`[WS-${id}] Erro ao realizar o parse da mensagem:`, err);
      }
    };

    ws.onerror = (error) => {
      console.error(`[WS-${id}] EVENTO DE ERRO. Se "isTrusted: true" sem detalhes, possivelmente o navegador bloqueou a conexão (ex: CORS/Origin rejection, WAF, ou problema de rede).`);
      console.error(`[WS-${id}] Detalhes do erro:`, error);
      setConnectionStatus(id, 'error');
    };

    ws.onclose = (event) => {
      console.log(`[WS-${id}] Conexão encerrada. Code: ${event.code}, Reason: ${event.reason || "Sem razão especificada"}`);
      const currentConfig = useApiKeysStore.getState().keys.find((k) => k.id === id);
      if (currentConfig && currentConfig.isActive) {
        setConnectionStatus(id, 'error');
        console.log(`[WS-${id}] Tentando reconectar em 5 segundos...`);
        reconnectTimers.current[id] = setTimeout(() => {
          connect(currentConfig);
        }, 5000);
      }
    };
  };

  const handleSubscriptionAndAuth = (config: ApiCredentials, ws: WebSocket, data: any) => {
    const { id, exchange } = config;
    
    // Handle Bitget login
    if (exchange === 'bitget') {
      if (data.event === 'login' && data.code === 0) {
        console.log(`[WS-${id}][Auth] Bitget login realizado com sucesso!`);
        console.log(`[WS-${id}][Sub] Inscrevendo nos canais de conta (SPOT, FUTURES) e posições...`);
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
      }
    }

    if (exchange === 'okx' && data.event === 'login' && data.code === '0') {
      console.log(`[WS-${id}][Auth] OKX login realizado com sucesso!`);
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [
          { channel: 'account' },
          { channel: 'positions', instType: 'SWAP' },
          { channel: 'positions', instType: 'MARGIN' }
        ]
      }));
    }

    if (exchange === 'bybit' && data.op === 'auth') {
      if (data.success === true) {
        console.log(`[WS-${id}][Auth] Bybit login realizado com sucesso!`);
        console.log(`[WS-${id}][Sub] Inscrevendo nos canais de bybit...`, ['wallet', 'position']);
        ws.send(JSON.stringify({
          op: 'subscribe',
          args: ['wallet', 'position']
        }));
      } else {
        console.error(`[WS-${id}][Error] Bybit erro de login:`, data);
      }
    }
    
    if (exchange === 'bybit' && data.op === 'subscribe') {
      if (data.success === true) {
        console.log(`[WS-${id}][Sub] Bybit inscricao realizada com sucesso!`, data);
      } else {
        console.error(`[WS-${id}][Error] Bybit erro de inscricao:`, data);
      }
    }
  };

  const parseDataStream = (config: ApiCredentials, data: any) => {
    const { id: cid, exchange, label } = config;
    
    if (data.action === 'snapshot' || data.action === 'update' || data.data) {
      console.log(`[WS-${cid}] Stream Data (${exchange}):`, data.action || data.topic || data.arg?.channel, data);
    }
    
    if (exchange === 'okx' && data.arg && data.data) {
      if (data.arg.channel === 'account') {
        const balances: BalanceItem[] = data.data[0].details.map((item: any) => ({
          id: `${cid}-${item.ccy}`,
          connectionId: cid,
          exchange,
          label,
          ccy: item.ccy,
          amount: parseFloat(item.eq),
          usdValue: parseFloat(item.eqUsd)
        }));
        updateBalances(cid, balances);
      }
      if (data.arg.channel === 'positions') {
        const positions: PositionItem[] = data.data.map((pos: any) => ({
          id: `${cid}-${pos.posId}`,
          connectionId: cid,
          exchange,
          label,
          symbol: pos.instId,
          side: pos.posSide,
          size: parseFloat(pos.pos),
          entryPrice: parseFloat(pos.avgPx),
          markPrice: parseFloat(pos.markPx),
          unrealizedPnl: parseFloat(pos.upl),
          leverage: parseFloat(pos.lever)
        }));
        updatePositions(cid, positions);
      }
    }

    if (exchange === 'bybit' && data.topic) {
      // console.log(`[WS-${cid}][Bybit] Topic:`, data.topic, 'Data:', data.data);
      if (data.topic === 'wallet') {
        const balances: BalanceItem[] = [];
        data.data.forEach((acc: any) => {
          if (acc.coin && Array.isArray(acc.coin)) {
            acc.coin.forEach((item: any) => {
              const amt = parseFloat(item.equity || item.walletBalance || '0');
              balances.push({
                id: `${cid}-${acc.accountType || 'UNIFIED'}-${item.coin}`,
                connectionId: cid,
                exchange,
                label: `${label} (${acc.accountType || 'UNIFIED'})`,
                ccy: item.coin,
                amount: amt,
                usdValue: parseFloat(item.usdValue || amt.toString())
              });
            });
          }
        });
        if (balances.length > 0) {
          updateBalances(cid, balances);
        }
      }
      if (data.topic === 'position') {
        const positions: PositionItem[] = [];
        data.data.forEach((pos: any) => {
          positions.push({
            id: `${cid}-${pos.symbol}-${pos.side || 'net'}-${pos.positionIdx || 0}`,
            connectionId: cid,
            exchange,
            label,
            symbol: pos.symbol,
            side: pos.side ? pos.side.toLowerCase() : 'net', // Bybit uses empty string for no side sometimes
            size: parseFloat(pos.size || '0'),
            entryPrice: parseFloat(pos.entryPrice || '0'),
            markPrice: parseFloat(pos.markPrice || '0'),
            unrealizedPnl: parseFloat(pos.unrealisedPnl || '0'),
            leverage: parseFloat(pos.leverage || '0')
          });
        });
        if (positions.length > 0) {
          updatePositions(cid, positions);
        }
      }
    }

    if (exchange === 'bitget' && (data.action === 'snapshot' || data.action === 'update')) {
      if (data.arg.channel === 'account' || data.arg.channel === 'equity') {
        const balances: BalanceItem[] = [];
        const instType = data.arg.instType;

        if (instType === 'SPOT') {
           data.data.forEach((item: any) => {
             const coin = item.coin || item.marginCoin;
             // Se for SPOT, considera available + frozen
             if (coin && parseFloat(item.available || '0') + parseFloat(item.frozen || '0') > 0) {
               const amt = parseFloat(item.available || '0') + parseFloat(item.frozen || '0');
               balances.push({
                 id: `${cid}-SPOT-${coin}`,
                 connectionId: cid,
                 exchange,
                 label: `${label} (Spot)`,
                 ccy: coin,
                 amount: amt,
                 usdValue: coin === 'USDT' || coin === 'USDC' ? amt : amt // We don't have spot prices here, so we assume USD stablecoins for simplicity or just amt.
               });
             }
           });
        } else {
           // Futures
           data.data.forEach((item: any) => {
              const coin = item.marginCoin || 'USDT';
              const amt = parseFloat(item.usdtEquity || item.equity || '0');
              if (amt > 0 || (data.action === 'snapshot')) {
                // we include it to overwrite previous 0 balances if needed
                 balances.push({
                   id: `${cid}-${instType}-${coin}`,
                   connectionId: cid,
                   exchange,
                   label: `${label} (${instType})`,
                   ccy: coin,
                   amount: amt,
                   usdValue: amt // Assuming usdtEquity gives USD value directly
                 });
              }
           });
        }

        if (balances.length > 0) {
          updateBalances(cid, balances);
        }
      }
      if (data.arg.channel === 'positions') {
        const positions: PositionItem[] = data.data.map((pos: any) => ({
          id: `${cid}-${pos.posId || pos.instId}`,
          connectionId: cid,
          exchange,
          label,
          symbol: pos.instId,
          side: pos.holdSide?.toLowerCase() || 'net', 
          size: parseFloat(pos.total || 0),
          entryPrice: parseFloat(pos.openPriceAvg || 0),
          markPrice: parseFloat(pos.markPrice || 0),
          unrealizedPnl: parseFloat(pos.unrealizedPL || 0),
          leverage: parseFloat(pos.leverage || 0)
        }));
        updatePositions(cid, positions);
      }
    }
  };
}
