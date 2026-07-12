import { LogManager } from '../services/LogManager';

export interface ProxyRequest {
  targetUrl: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
}

export const proxyFetch = async (req: ProxyRequest) => {
  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (!response.ok) {
    if (isJson) {
      const data = await response.json();
      // If it's a proxy validation error (from our own proxy logic)
      if (data && data.error && Object.keys(data).length === 1) {
        throw new Error(`Proxy Error: ${response.status} - ${data.error}`);
      }
      // Exchange API valid JSON response (business logic error like 400 margin disabled)
      return data;
    }
    throw new Error(`Proxy Error: ${response.status} ${response.statusText}`);
  }

  return isJson ? response.json() : response.text();
};

/**
 * Hybrid Fetch Workaround:
 * O servidor proxy no AI Studio / Cloud Run normalmente está em região US-East.
 * A Bybit bloqueia ativamente requisições para seus endpoints originadas de IP dos EUA (Geo-Block HTTP 403).
 * Este helper tenta realizar um 'direct fetch' via navegador do próprio usuário (que normalmente estará fora dos EUA e Bybit permite CORS para GET v5)
 * Se falhar (ex: erro de rede/CORS estrito em outro ambiente), recorre ao proxyFetch convencional na nuvem.
 * NÃO REMOVA: Sem este fallback, a renderização da Bybit no dashboard falhará em ambientes hospedados em solo americano.
 */
export const hybridFetch = async (targetUrl: string, method: string, headers: Record<string, string>) => {
  try {
    // Browser-Direct Attempt (escapes WAF/GeoBlock Bybit on US Cloud Run instances)
    const res = await fetch(targetUrl, { method, headers });
    const contentType = res.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (res.ok) {
      return isJson ? await res.json() : await res.text();
    }
    
    // If it's a valid JSON response from the exchange (e.g. 400 Bad Request) and not a GeoBlock (403), return it
    if (res.status !== 403 && res.status !== 418 && isJson) {
      return await res.json();
    }
  } catch (err) {
    LogManager.warn('HybridFetch', `Fetch direto falhou, acionando Proxy...`, targetUrl);
  }
  
  // Proxy Fallback
  return await proxyFetch({ targetUrl, method, headers });
};
