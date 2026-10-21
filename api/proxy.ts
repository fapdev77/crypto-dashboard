import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ServerLogger } from '../src/utils/serverLogger';
import { validateSafeUpstreamUrl } from '../src/utils/ssrfValidator';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar headers CORS seguros para Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { targetUrl, method, headers, body } = req.body;

    if (!targetUrl || !method) {
      return res.status(400).json({ error: "Missing targetUrl or method" });
    }

    // SSRF prevention: Domain validation (Allowlist)
    const allowedDomains = [
      'api.bybit.com',
      'api.bytick.com',
      'api-testnet.bybit.com',
      'api.bybit.nl',
      'api.bybit.tr',
      'api.bybit.kz',
      'api.bybitgeorgia.ge',
      'api.bybit.ae',
      'api.bybit.eu',
      'api.bybit.id',
      'api.manepa.jp',
      'api-testnet.manepa.jp',
      'api.spark-fintech.com',
      'api-testnet.spark-fintech.com',
      'api.bitget.com',
      'www.okx.com',
      'api.okx.com',
      'aws.okx.com',
      'api.alternative.me',
    ];

    const validation = validateSafeUpstreamUrl(targetUrl, {
      allowedProtocols: ['https:'],
      allowedDomains,
    });

    if (!validation.isValid) {
      ServerLogger.error('Vercel-Proxy', `SSRF-Block: rejected upstream '${targetUrl}' - ${validation.reason}`);
      return res.status(403).json({ error: `Forbidden: ${validation.reason}` });
    }

    ServerLogger.info('Vercel-Proxy', `${method} ${targetUrl}`);

    // Remove headers que causam problemas (como block de WAF das exchanges)
    const cleanHeaders: Record<string, string> = { ...headers } || {};
    delete cleanHeaders.host;
    delete cleanHeaders.origin;
    delete cleanHeaders.referer;

    const timeoutSignal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
      ? AbortSignal.timeout(20000)
      : undefined;

    const fetchOptions: RequestInit = {
      method,
      headers: cleanHeaders,
      signal: timeoutSignal,
    };

    if (method !== "GET" && method !== "HEAD" && body) {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    // Use o fetch global nativo (disponível no Node.js 18+ que a Vercel usa)
    const response = await fetch(targetUrl, fetchOptions);
    
    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      ServerLogger.warn('Vercel-Proxy', `Failed to parse JSON response. Status: ${response.status}`, targetUrl);
      responseData = responseText;
    }

    ServerLogger.info('Vercel-Proxy', `Response status: ${response.status}`, targetUrl);

    res.status(response.status).json(responseData);

  } catch (error: any) {
    ServerLogger.error('Vercel-Proxy', 'Proxy error:', error);
    const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('aborted');
    const statusCode = isTimeout ? 504 : 500;
    res.status(statusCode).json({
      error: isTimeout
        ? 'Gateway Timeout: upstream exchange did not respond within 20s'
        : (error.message || "Internal Server Error")
    });
  }
}
