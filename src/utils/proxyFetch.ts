import { LogManager } from '../services/LogManager';

export const DEFAULT_FETCH_TIMEOUT_MS = 25000; // 25s client-side timeout

export interface ProxyRequest {
  targetUrl: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export const proxyFetch = async (req: ProxyRequest) => {
  const timeoutMs = req.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const timeoutSignal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
    ? AbortSignal.timeout(timeoutMs)
    : undefined;
  const signal = req.signal ?? timeoutSignal;

  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetUrl: req.targetUrl,
      method: req.method,
      headers: req.headers,
      body: req.body,
    }),
    signal,
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
      if (data && typeof data === 'object') {
        data._httpStatus = response.status;
      }
      // Exchange API valid JSON response (business logic error like 400 margin disabled)
      return data;
    }
    throw new Error(`Proxy Error: ${response.status} ${response.statusText}`);
  }

  const result = isJson ? await response.json() : await response.text();
  if (result && typeof result === 'object') {
    result._httpStatus = response.status;
  }
  return result;
};

/**
 * Hybrid Fetch Workaround:
 * The proxy server on AI Studio / Cloud Run is typically in the US-East region.
 * Bybit actively blocks requests from US IPs (Geo-Block HTTP 403).
 * This helper attempts a 'direct fetch' from the user's own browser (usually outside the US, and Bybit allows CORS for GET v5).
 * If it fails (e.g., network error / strict CORS in another environment), it falls back to the conventional cloud proxyFetch.
 * DO NOT REMOVE: Without this fallback, Bybit dashboard rendering will fail on US-hosted environments.
 */
export const hybridFetch = async (
  targetUrl: string,
  method: string,
  headers: Record<string, string>,
  options?: { timeoutMs?: number; signal?: AbortSignal }
) => {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const timeoutSignal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
    ? AbortSignal.timeout(timeoutMs)
    : undefined;
  const signal = options?.signal ?? timeoutSignal;

  try {
    // Browser-Direct Attempt (escapes WAF/GeoBlock Bybit on US Cloud Run instances)
    const res = await fetch(targetUrl, { method, headers, signal });
    const contentType = res.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (res.ok) {
      const data = isJson ? await res.json() : await res.text();
      if (data && typeof data === 'object') {
        data._httpStatus = res.status;
      }
      return data;
    }
    
    // If it's a valid JSON response from the exchange (e.g. 400 Bad Request) and not a GeoBlock (403), return it
    if (res.status !== 403 && res.status !== 418 && isJson) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        data._httpStatus = res.status;
      }
      return data;
    }
  } catch (err) {
    LogManager.warn('HybridFetch', `Direct fetch failed, falling back to proxy...`, targetUrl);
  }
  
  // Proxy Fallback
  return await proxyFetch({ targetUrl, method, headers, signal, timeoutMs });
};
