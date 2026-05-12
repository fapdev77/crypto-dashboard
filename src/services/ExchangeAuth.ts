import CryptoJS from 'crypto-js';

export interface SignatureHeaders {
  [key: string]: string;
}

export class ExchangeAuth {
  // ==========================================
  // REST API Headers
  // ==========================================

  static getOkxHeaders(
    apiKey: string,
    apiSecret: string,
    passphrase: string,
    method: string,
    requestPath: string,
    body: string = ''
  ): SignatureHeaders {
    const timestamp = new Date().toISOString();
    const prehash = timestamp + method.toUpperCase() + requestPath + body;
    const signature = CryptoJS.HmacSHA256(prehash, apiSecret).toString(CryptoJS.enc.Base64);

    return {
      'OK-ACCESS-KEY': apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': passphrase,
    };
  }

  static getBitgetHeaders(
    apiKey: string,
    apiSecret: string,
    passphrase: string,
    method: string,
    requestPath: string,
    body: string = ''
  ): SignatureHeaders {
    const timestamp = Date.now().toString();
    const prehash = timestamp + method.toUpperCase() + requestPath + body;
    const signature = CryptoJS.HmacSHA256(prehash, apiSecret).toString(CryptoJS.enc.Base64);

    return {
      'ACCESS-KEY': apiKey,
      'ACCESS-SIGN': signature,
      'ACCESS-TIMESTAMP': timestamp,
      'ACCESS-PASSPHRASE': passphrase,
    };
  }

  static bybitTimeOffset = 0;

  static async syncBybitTime() {
    try {
      const targetUrl = 'https://api.bybit.com/v5/market/time';
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl,
          method: 'GET',
          headers: {}
        }),
      });
      const data = await response.json();
      if (data && data.time) {
        const serverTime = parseInt(data.time, 10);
        this.bybitTimeOffset = serverTime - Date.now();
        console.log(`[Time-Sync] Bybit sincronizada. Offset: ${this.bybitTimeOffset}ms`);
      }
    } catch (e) {
      console.error("[Time-Sync] Erro ao sincronizar com Bybit, usando offset 0.");
    }
  }

  static getBybitHeaders(
    apiKey: string,
    apiSecret: string,
    bodyOrQuery: string = '' // For GET, this is the query string (e.g., 'category=linear&symbol=BTCUSDT'). For POST, JSON string.
  ): SignatureHeaders {
    const timestamp = (Date.now() + this.bybitTimeOffset).toString();
    const recvWindow = '10000';
    const prehash = timestamp + apiKey + recvWindow + bodyOrQuery;
    const signature = CryptoJS.HmacSHA256(prehash, apiSecret).toString(CryptoJS.enc.Hex);

    return {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
    };
  }


  // ==========================================
  // WebSocket Authentication Payloads
  // ==========================================

  static getOkxWsAuth(apiKey: string, apiSecret: string, passphrase: string) {
    const timestamp = (Date.now() / 1000).toString(); // OKX accepts epoch in seconds
    const prehash = timestamp + 'GET' + '/users/self/verify';
    const signature = CryptoJS.HmacSHA256(prehash, apiSecret).toString(CryptoJS.enc.Base64);

    return {
      op: 'login',
      args: [{
        apiKey,
        passphrase,
        timestamp,
        sign: signature
      }]
    };
  }

  static getBitgetWsAuth(apiKey: string, apiSecret: string, passphrase: string) {
    const timestamp = Date.now().toString(); // Bitget uses milliseconds
    const prehash = timestamp + 'GET' + '/user/verify';
    const signature = CryptoJS.HmacSHA256(prehash, apiSecret).toString(CryptoJS.enc.Base64);

    return {
      op: 'login',
      args: [{
        apiKey,
        passphrase,
        timestamp,
        sign: signature
      }]
    };
  }

  static getBybitWsAuth(apiKey: string, apiSecret: string) {
    const expires = Date.now() + 10000;
    const prehash = 'GET/realtime' + expires;
    const signature = CryptoJS.HmacSHA256(prehash, apiSecret).toString(CryptoJS.enc.Hex);

    return {
      op: 'auth',
      args: [apiKey, expires, signature]
    };
  }
}
