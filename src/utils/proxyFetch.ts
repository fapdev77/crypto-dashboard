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
  if (!response.ok) {
    throw new Error(`Proxy Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
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
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`[HybridFetch] Fetch direto falhou, acionando Proxy...`, targetUrl);
  }
  
  // Proxy Fallback
  return await proxyFetch({ targetUrl, method, headers });
};
