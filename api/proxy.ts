import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar headers CORS para permitir o uso adequado via Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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

    // Prevenção de SSRF: Validar Domínio (Allowlist)
    const allowedDomains = [
      'api.bybit.com',
      'api.bitget.com',
      'www.okx.com',
      'api.okx.com'
    ];

    try {
      const urlObj = new URL(targetUrl);
      if (!allowedDomains.includes(urlObj.hostname)) {
        console.error(`[Proxy-SSRF-Block] Tentativa de acesso bloqueado a domínio não autorizado: ${urlObj.hostname}`);
        return res.status(403).json({ error: "Forbidden: Domain not in proxy allowlist" });
      }
    } catch (err) {
      return res.status(400).json({ error: "Invalid targetUrl format" });
    }

    console.log(`[Vercel-Proxy] ${method} ${targetUrl}`);

    // Remove headers que causam problemas (como block de WAF das exchanges)
    const cleanHeaders: Record<string, string> = { ...headers } || {};
    delete cleanHeaders.host;
    delete cleanHeaders.origin;
    delete cleanHeaders.referer;

    const fetchOptions: RequestInit = {
      method,
      headers: cleanHeaders,
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
      console.warn(`[Vercel-Proxy] Warning: Failed to parse JSON from ${targetUrl}. Status: ${response.status}`);
      responseData = responseText;
    }

    console.log(`[Vercel-Proxy] Response status from ${targetUrl}: ${response.status}`);

    res.status(response.status).json(responseData);

  } catch (error: any) {
    console.error("Vercel Proxy error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
