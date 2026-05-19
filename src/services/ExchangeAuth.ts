export interface SignatureHeaders {
  [key: string]: string;
}

export class ExchangeAuth {
  // Helper assíncrono usando Web Crypto API
  private static async hmacSha256(prehash: string, secret: string, format: 'hex' | 'base64'): Promise<string> {
    const encoder = new TextEncoder();
    const key = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await window.crypto.subtle.sign('HMAC', key, encoder.encode(prehash));
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    
    if (format === 'hex') {
      return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      return btoa(String.fromCharCode(...signatureArray));
    }
  }

  // ==========================================
  // REST API Headers
  // ==========================================

  static async getOkxHeaders(
    apiKey: string,
    apiSecret: string,
    passphrase: string,
    method: string,
    requestPath: string,
    body: string = ''
  ): Promise<SignatureHeaders> {
    const timestamp = new Date().toISOString();
    const prehash = timestamp + method.toUpperCase() + requestPath + body;
    const signature = await this.hmacSha256(prehash, apiSecret, 'base64');

    return {
      'OK-ACCESS-KEY': apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': passphrase,
    };
  }

  static async getBitgetHeaders(
    apiKey: string,
    apiSecret: string,
    passphrase: string,
    method: string,
    requestPath: string,
    body: string = ''
  ): Promise<SignatureHeaders> {
    const timestamp = Date.now().toString();
    const prehash = timestamp + method.toUpperCase() + requestPath + body;
    const signature = await this.hmacSha256(prehash, apiSecret, 'base64');

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

  static async getBybitHeaders(
    apiKey: string,
    apiSecret: string,
    bodyOrQuery: string = '' // For GET, this is the query string. For POST, JSON string.
  ): Promise<SignatureHeaders> {
    const timestamp = (Date.now() + this.bybitTimeOffset).toString();
    // Mitigação de Replay Attack: reduzido para 5000ms
    const recvWindow = '5000';
    const prehash = timestamp + apiKey + recvWindow + bodyOrQuery;
    const signature = await this.hmacSha256(prehash, apiSecret, 'hex');

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

  static async getOkxWsAuth(apiKey: string, apiSecret: string, passphrase: string) {
    const timestamp = (Date.now() / 1000).toString(); // OKX accepts epoch in seconds
    const prehash = timestamp + 'GET' + '/users/self/verify';
    const signature = await this.hmacSha256(prehash, apiSecret, 'base64');

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

  static async getBitgetWsAuth(apiKey: string, apiSecret: string, passphrase: string) {
    const timestamp = Date.now().toString(); // Bitget uses milliseconds
    const prehash = timestamp + 'GET' + '/user/verify';
    const signature = await this.hmacSha256(prehash, apiSecret, 'base64');

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

  static async getBybitWsAuth(apiKey: string, apiSecret: string) {
    const expires = Date.now() + this.bybitTimeOffset + 10000; // Auth key is valid for 10s for WS
    const prehash = 'GET/realtime' + expires;
    const signature = await this.hmacSha256(prehash, apiSecret, 'hex');

    return {
      op: 'auth',
      args: [apiKey, expires, signature]
    };
  }
}
