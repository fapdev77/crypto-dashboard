import { useEffect, useRef } from 'react';
import { Exchange, useApiKeysStore } from '../store/apiKeysStore';
import { useDashboardStore, BalanceItem, PositionItem } from '../store/dashboardStore';
import { ExchangeAuth } from '../services/ExchangeAuth';

const WS_URLS = {
  bitget: 'wss://ws.bitget.com/v2/ws/private',
  okx: 'wss://ws.okx.com:8443/ws/v5/private',
  bybit: 'wss://stream.bybit.com/v5/private',
};

export function useMultiExchangeWS() {
  const keys = useApiKeysStore((state) => state.keys);
  const setConnectionStatus = useDashboardStore((state) => state.setConnectionStatus);
  const updateBalances = useDashboardStore((state) => state.updateBalances);
  const updatePositions = useDashboardStore((state) => state.updatePositions);

  const socketsRef = useRef<Record<Exchange, WebSocket | null>>({
    bitget: null,
    okx: null,
    bybit: null,
  });

  const intervalsRef = useRef<Record<Exchange, NodeJS.Timeout | null>>({
    bitget: null,
    okx: null,
    bybit: null,
  });

  // Reconnection timers
  const reconnectTimers = useRef<Record<Exchange, NodeJS.Timeout | null>>({
    bitget: null,
    okx: null,
    bybit: null,
  });

  useEffect(() => {
    Object.keys(WS_URLS).forEach((ex) => {
      const exchange = ex as Exchange;
      const config = keys[exchange];

      // If missing config or not active, disconnect!
      if (!config || !config.isActive) {
        disconnect(exchange);
        return;
      }

      // If active config exists but no socket, connect!
      if (!socketsRef.current[exchange]) {
        connect(exchange);
      }
    });

    // Cleanup all sockets on total unmount
    return () => {
      Object.keys(WS_URLS).forEach((ex) => {
        disconnect(ex as Exchange);
      });
    };
  }, [keys]);

  const disconnect = (exchange: Exchange) => {
    const ws = socketsRef.current[exchange];
    if (ws) {
      ws.close();
      socketsRef.current[exchange] = null;
    }
    
    // Clear ping
    const pingTimer = intervalsRef.current[exchange];
    if (pingTimer) clearInterval(pingTimer);
    
    // Clear reconnect timer
    const rTimer = reconnectTimers.current[exchange];
    if (rTimer) clearTimeout(rTimer);

    setConnectionStatus(exchange, 'disconnected');
    // NOTE: We could also clear the positions/balances for that exchange here, but preserving them as offline state is often desired.
  };

  const startPing = (exchange: Exchange, ws: WebSocket) => {
    // Usually 20s to 30s for ping/pong
    intervalsRef.current[exchange] = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        if (exchange === 'bybit') {
          ws.send(JSON.stringify({ op: 'ping' }));
        } else if (exchange === 'okx') {
          ws.send('ping');
        } else if (exchange === 'bitget') {
          ws.send('ping');
        }
      }
    }, 20000); // 20 seconds
  };

  const connect = (exchange: Exchange) => {
    const config = useApiKeysStore.getState().keys[exchange];
    if (!config || !config.isActive) return;

    setConnectionStatus(exchange, 'connecting');
    const ws = new WebSocket(WS_URLS[exchange]);
    socketsRef.current[exchange] = ws;

    ws.onopen = () => {
      setConnectionStatus(exchange, 'connected');
      startPing(exchange, ws);

      // Authenticate
      const { apiKey, apiSecret, passphrase } = config;
      let authPayload;
      
      try {
        if (exchange === 'okx') {
          authPayload = ExchangeAuth.getOkxWsAuth(apiKey, apiSecret, passphrase || '');
        } else if (exchange === 'bitget') {
          authPayload = ExchangeAuth.getBitgetWsAuth(apiKey, apiSecret, passphrase || '');
        } else if (exchange === 'bybit') {
          authPayload = ExchangeAuth.getBybitWsAuth(apiKey, apiSecret);
        }

        if (authPayload) {
          ws.send(JSON.stringify(authPayload));
        }
      } catch (err) {
        console.error('Failed to craft authentication payload', err);
        ws.close();
      }
    };

    ws.onmessage = (event) => {
      const msg = event.data;
      if (typeof msg === 'string') {
        if (msg === 'pong') return; // plain text pong
      }
      
      try {
        const data = JSON.parse(msg.toString());
        
        // Logins & Subscription acknowledgements
        handleSubscriptionAndAuth(exchange, ws, data);
        
        // Parse actual stream data (Account/Wallet/Positions)
        parseDataStream(exchange, data);

      } catch (err) {
        // Ignored
      }
    };

    ws.onerror = (error) => {
      console.error(`WS Error ${exchange}:`, error);
      setConnectionStatus(exchange, 'error');
    };

    ws.onclose = () => {
      // Avoid firing reconnect if we explicitly disconnected
      const currentConfig = useApiKeysStore.getState().keys[exchange];
      if (currentConfig && currentConfig.isActive) {
        setConnectionStatus(exchange, 'error'); // or 'connecting'
        // Try to reconnect in 5 seconds
        reconnectTimers.current[exchange] = setTimeout(() => {
          connect(exchange);
        }, 5000);
      }
    };
  };

  const handleSubscriptionAndAuth = (exchange: Exchange, ws: WebSocket, data: any) => {
    // OKX Auth Success
    if (exchange === 'okx' && data.event === 'login' && data.code === '0') {
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [
          { channel: 'account' },
          { channel: 'positions', instType: 'SWAP' },
          { channel: 'positions', instType: 'MARGIN' }
        ]
      }));
    }
    // Bitget Auth Success
    if (exchange === 'bitget' && data.event === 'login' && data.code === 0) {
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [
          { instType: 'USDT-FUTURES', channel: 'account', instId: 'default' },
          { instType: 'USDT-FUTURES', channel: 'positions', instId: 'default' }
        ]
      }));
    }
    // Bybit Auth Success
    if (exchange === 'bybit' && data.op === 'auth' && data.success === true) {
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: ['wallet', 'position']
      }));
    }
  };

  const parseDataStream = (exchange: Exchange, data: any) => {
    // Simplified parsing routing based on exchange specific schemas
    // NOTE: Implementing exact parsing for OKX, Bitget and Bybit structure
    // This provides a foundation that can be expanded with real API data mapped to our interfaces.
    
    // Example: OKX Parsing
    if (exchange === 'okx' && data.arg && data.data) {
      if (data.arg.channel === 'account') {
        const balances: BalanceItem[] = data.data[0].details.map((item: any) => ({
          id: `okx-${item.ccy}`,
          exchange: 'okx',
          ccy: item.ccy,
          amount: parseFloat(item.eq),
          usdValue: parseFloat(item.eqUsd)
        }));
        updateBalances('okx', balances);
      }
      if (data.arg.channel === 'positions') {
        const positions: PositionItem[] = data.data.map((pos: any) => ({
          id: `okx-${pos.posId}`,
          exchange: 'okx',
          symbol: pos.instId,
          side: pos.posSide, // 'long', 'short', 'net'
          size: parseFloat(pos.pos),
          entryPrice: parseFloat(pos.avgPx),
          markPrice: parseFloat(pos.markPx),
          unrealizedPnl: parseFloat(pos.upl),
          leverage: parseFloat(pos.lever)
        }));
        updatePositions('okx', positions);
      }
    }

    // Example Bybit Parsing
    if (exchange === 'bybit' && data.topic) {
      if (data.topic === 'wallet') {
        const balances: BalanceItem[] = data.data[0].coin.map((item: any) => ({
          id: `bybit-${item.coin}`,
          exchange: 'bybit',
          ccy: item.coin,
          amount: parseFloat(item.equity),
          usdValue: parseFloat(item.usdValue)
        }));
        updateBalances('bybit', balances);
      }
      if (data.topic === 'position') {
        const positions: PositionItem[] = data.data.map((pos: any) => ({
          id: `bybit-${pos.symbol}-${pos.side}`,
          exchange: 'bybit',
          symbol: pos.symbol,
          side: pos.side.toLowerCase(), // 'Buy' -> 'buy' -> mapped later
          size: parseFloat(pos.size),
          entryPrice: parseFloat(pos.entryPrice),
          markPrice: parseFloat(pos.markPrice),
          unrealizedPnl: parseFloat(pos.unrealisedPnl),
          leverage: parseFloat(pos.leverage)
        }));
        updatePositions('bybit', positions);
      }
    }

    // Example Bitget Parsing
    if (exchange === 'bitget' && data.action === 'snapshot') {
      if (data.arg.channel === 'account') {
        const balances: BalanceItem[] = data.data.map((item: any) => ({
          id: `bitget-${item.marginCoin}`,
          exchange: 'bitget',
          ccy: item.marginCoin,
          amount: parseFloat(item.equity),
          usdValue: parseFloat(item.equity) // Simplified for USDT tracking
        }));
        updateBalances('bitget', balances);
      }
      if (data.arg.channel === 'positions') {
        const positions: PositionItem[] = data.data.map((pos: any) => ({
          id: `bitget-${pos.posId}`,
          exchange: 'bitget',
          symbol: pos.instId,
          side: pos.holdSide.toLowerCase(), 
          size: parseFloat(pos.total),
          entryPrice: parseFloat(pos.openPriceAvg),
          markPrice: parseFloat(pos.markPrice),
          unrealizedPnl: parseFloat(pos.unrealizedPL),
          leverage: parseFloat(pos.leverage)
        }));
        updatePositions('bitget', positions);
      }
    }
  };
}
