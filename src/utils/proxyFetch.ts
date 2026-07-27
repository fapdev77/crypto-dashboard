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
 * The proxy server on AI Studio / Cloud Run is typically in the US-East region.
 * Bybit actively blocks requests from US IPs (Geo-Block HTTP 403).
 * This helper attempts a 'direct fetch' from the user's own browser (usually outside the US, and Bybit allows CORS for GET v5).
 * If it fails (e.g., network error / strict CORS in another environment), it falls back to the conventional cloud proxyFetch.
 * DO NOT REMOVE: Without this fallback, Bybit dashboard rendering will fail on US-hosted environments.
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
    LogManager.warn('HybridFetch', `Direct fetch failed, falling back to proxy...`, targetUrl);
  }
  
  // Proxy Fallback
  return await proxyFetch({ targetUrl, method, headers });
};
