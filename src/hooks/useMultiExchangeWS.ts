import { useEffect, useRef } from 'react';
import { Exchange, useApiKeysStore, ApiCredentials } from '../store/apiKeysStore';
import { useDashboardStore, BalanceItem, PositionItem } from '../store/dashboardStore';
import { ExchangeAuth } from '../services/ExchangeAuth';
import { RestClient } from '../services/RestClient';

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
  const setConnectionError = useDashboardStore((state) => state.setConnectionError);
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
    }, 20000); // 20 seconds
  };

  const connect = (config: ApiCredentials) => {
    const { id, exchange, apiKey, apiSecret, passphrase } = config;

    setConnectionStatus(id, 'connecting', null);
    setConnectionError(id, null);
    const wsUrl = exchange === 'bitget' ? getBitgetUrl() : WS_URLS[exchange];
    console.log(`[WS-${id}] Iniciando conexão para: ${wsUrl}`);
    
    // Some connections fail due to browser CORS/Origin policies. 
    // We try to connect directly first. Timeouts/errors will be caught here.
    const ws = new WebSocket(wsUrl);
    socketsRef.current[id] = ws;

    if (exchange === 'bybit') {
      (async () => {
        try {
          console.log(`[REST-${id}] Buscando dados iniciais para Bybit via REST...`);
          const [walletData, positionsData] = await Promise.all([
            RestClient.getWalletBybit(apiKey, apiSecret),
            RestClient.getPositionsBybit(apiKey, apiSecret)
          ]);
          
          if (walletData && walletData.coin) {
            const balances: BalanceItem[] = [];
            walletData.coin.forEach((item: any) => {
              const accountType = walletData.accountType || 'UNIFIED';
              balances.push({
                id: `${id}-${accountType}-${item.coin}`,
                connectionId: id,
                exchange,
                label: `${config.label} (${accountType})`,
                ccy: item.coin,
                amount: parseFloat(item.walletBalance || item.equity),
                usdValue: parseFloat(item.usdValue)
              });
            });
            if (balances.length > 0) {
              updateBalances(id, balances);
            }
          }

          if (positionsData && Array.isArray(positionsData)) {
            const positions: PositionItem[] = [];
            positionsData.forEach((pos: any) => {
              positions.push({
                id: `${id}-${pos.symbol}-${pos.positionIdx || 0}`,
                connectionId: id,
                exchange,
                label: config.label,
                symbol: pos.symbol,
                side: pos.side ? pos.side.toLowerCase() : 'net', // Bybit uses empty string for no side sometimes
                size: parseFloat(pos.size || '0'),
                entryPrice: parseFloat(pos.avgPrice || pos.entryPrice || '0'),
                markPrice: parseFloat(pos.markPrice || '0'),
                unrealizedPnl: parseFloat(pos.unrealisedPnl || '0'),
                leverage: parseFloat(pos.leverage || '0')
              });
            });
            if (positions.length > 0) {
              updatePositions(id, positions);
            }
          }
          console.log(`[REST-${id}] Dados iniciais carregados para Bybit.`);
        } catch (error: any) {
          console.error(`[REST-${id}] Erro ao buscar dados iniciais para Bybit:`, error);
          setConnectionError(id, `REST Error: ${error.message}`);
        }
      })();
    }

    ws.onopen = () => {
      console.log(`[WS-${id}] Conexão física estabelecida com sucesso.`);
      setConnectionStatus(id, 'connected', null);
      setConnectionError(id, null);
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
        if (config.exchange === 'bybit') {
           console.log(`[WS-${id}][DEBUG] Mensagem Bybit recebida:`, data);
        }
        
        handleSubscriptionAndAuth(config, ws, data);
        parseDataStream(config, data);
      } catch (err) {
        console.error(`[WS-${id}] Erro ao realizar o parse da mensagem:`, err);
      }
    };

    ws.onerror = (error) => {
      console.error(`[WS-${id}] EVENTO DE ERRO. Se "isTrusted: true" sem detalhes, possivelmente o navegador bloqueou a conexão (ex: CORS/Origin rejection, WAF, ou problema de rede).`);
      console.error(`[WS-${id}] Detalhes do erro:`, error);
      setConnectionStatus(id, 'error', 'WebSocket Connection Error');
      setConnectionError(id, 'WebSocket Connection Error');
    };

    ws.onclose = (event) => {
      console.log(`[WS-${id}] Conexão encerrada. Code: ${event.code}, Reason: ${event.reason || "Sem razão especificada"}`);
      const currentConfig = useApiKeysStore.getState().keys.find((k) => k.id === id);
      if (currentConfig && currentConfig.isActive) {
        setConnectionStatus(id, 'error', event.reason || 'Closed');
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
        setConnectionError(id, `Bitget WS Error (${data.code}): ${data.msg}`);
      }
    }

    if (exchange === 'okx') {
      if (data.event === 'login' && data.code === '0') {
        console.log(`[WS-${id}][Auth] OKX login realizado com sucesso!`);
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
      }
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
        setConnectionError(id, `Bybit Auth Error: ${data.ret_msg}`);
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
        const balances: Partial<BalanceItem>[] = data.data[0].details.map((item: any) => {
          const bal: Partial<BalanceItem> = {
            id: `${cid}-${item.ccy}`,
            connectionId: cid,
            exchange,
            label,
            ccy: item.ccy,
          };
          if (item.eq !== undefined) bal.amount = parseFloat(item.eq);
          if (item.eqUsd !== undefined) bal.usdValue = parseFloat(item.eqUsd);
          return bal;
        });
        useDashboardStore.getState().updateBalancesDelta(cid, balances);
      }
      if (data.arg.channel === 'positions') {
        const positions: Partial<PositionItem>[] = data.data.map((pos: any) => {
          const update: Partial<PositionItem> = {
            id: `${cid}-${pos.posId}`,
            connectionId: cid,
            exchange,
            label,
          };
          if (pos.instId !== undefined) update.symbol = pos.instId;
          if (pos.posSide !== undefined) update.side = pos.posSide as any;
          if (pos.pos !== undefined) update.size = parseFloat(pos.pos);
          if (pos.avgPx !== undefined) update.entryPrice = parseFloat(pos.avgPx);
          if (pos.markPx !== undefined) update.markPrice = parseFloat(pos.markPx);
          if (pos.upl !== undefined) update.unrealizedPnl = parseFloat(pos.upl);
          if (pos.lever !== undefined) update.leverage = parseFloat(pos.lever);
          return update;
        });
        useDashboardStore.getState().updatePositionsDelta(cid, positions);
      }
    }

    if (exchange === 'bybit' && data.topic) {
      if (data.topic === 'wallet') {
        const balances: Partial<BalanceItem>[] = [];
        data.data.forEach((acc: any) => {
          if (acc.coin && Array.isArray(acc.coin)) {
            acc.coin.forEach((item: any) => {
              const bal: Partial<BalanceItem> = {
                id: `${cid}-${acc.accountType || 'UNIFIED'}-${item.coin}`,
                connectionId: cid,
                exchange,
                label: `${label} (${acc.accountType || 'UNIFIED'})`,
                ccy: item.coin,
              };
              
              if (item.equity !== undefined) bal.amount = parseFloat(item.equity);
              else if (item.walletBalance !== undefined) bal.amount = parseFloat(item.walletBalance);
              
              if (item.usdValue !== undefined && item.usdValue !== "") bal.usdValue = parseFloat(item.usdValue);
              else if (bal.amount !== undefined) bal.usdValue = bal.amount;

              balances.push(bal);
            });
          }
        });
        if (balances.length > 0) {
          useDashboardStore.getState().updateBalancesDelta(cid, balances);
        }
      }
      if (data.topic === 'position') {
        const positions: Partial<PositionItem>[] = [];
        data.data.forEach((pos: any) => {
          const update: Partial<PositionItem> = {
            id: `${cid}-${pos.symbol}-${pos.positionIdx || 0}`,
            connectionId: cid,
            exchange,
            label,
          };
          
          if (pos.symbol !== undefined) update.symbol = pos.symbol;
          if (pos.side !== undefined && pos.side !== '') update.side = pos.side.toLowerCase() as any;
          if (pos.size !== undefined) update.size = parseFloat(pos.size);
          if (pos.entryPrice !== undefined && pos.entryPrice !== "") update.entryPrice = parseFloat(pos.entryPrice);
          else if (pos.avgPrice !== undefined && pos.avgPrice !== "") update.entryPrice = parseFloat(pos.avgPrice);
          if (pos.markPrice !== undefined && pos.markPrice !== "") update.markPrice = parseFloat(pos.markPrice);
          if (pos.unrealisedPnl !== undefined && pos.unrealisedPnl !== "") update.unrealizedPnl = parseFloat(pos.unrealisedPnl);
          if (pos.leverage !== undefined && pos.leverage !== "") update.leverage = parseFloat(pos.leverage);

          positions.push(update);
        });
        if (positions.length > 0) {
          useDashboardStore.getState().updatePositionsDelta(cid, positions);
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
        const positions: Partial<PositionItem>[] = [];
        data.data.forEach((pos: any) => {
          const update: Partial<PositionItem> = {
            id: `${cid}-${pos.posId || pos.instId}`,
            connectionId: cid,
            exchange,
            label,
          };
          
          if (pos.instId !== undefined) update.symbol = pos.instId;
          if (pos.holdSide !== undefined) update.side = pos.holdSide.toLowerCase() as any;
          else if (pos.posSide !== undefined) update.side = pos.posSide.toLowerCase() as any;
          
          if (pos.total !== undefined) update.size = parseFloat(pos.total);
          else if (pos.pos !== undefined) update.size = parseFloat(pos.pos);

          if (pos.openPriceAvg !== undefined) update.entryPrice = parseFloat(pos.openPriceAvg);
          else if (pos.avgPx !== undefined) update.entryPrice = parseFloat(pos.avgPx);

          if (pos.markPrice !== undefined) update.markPrice = parseFloat(pos.markPrice);
          else if (pos.markPx !== undefined) update.markPrice = parseFloat(pos.markPx);

          if (pos.unrealizedPL !== undefined) update.unrealizedPnl = parseFloat(pos.unrealizedPL);
          else if (pos.upl !== undefined) update.unrealizedPnl = parseFloat(pos.upl);

          if (pos.leverage !== undefined) update.leverage = parseFloat(pos.leverage);
          else if (pos.lever !== undefined) update.leverage = parseFloat(pos.lever);

          positions.push(update);
        });
        if (positions.length > 0) {
          useDashboardStore.getState().updatePositionsDelta(cid, positions);
        }
      }
    }
  };
}
