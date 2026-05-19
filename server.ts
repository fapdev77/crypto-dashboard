import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fetch from "node-fetch"; // natively available globally in Node 18+ but let's use standard global fetch
import { createProxyMiddleware } from 'http-proxy-middleware';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Local Proxy para WebSockets da Bitget e outras exchanges que possam bloquear navegadores
  // Como navegadores não podem alterar o Origin header de um WebSocket, usamos esse proxy intermediário.
  app.use('/ws-proxy/bitget', createProxyMiddleware({ 
    target: 'wss://ws.bitget.com', 
    changeOrigin: true, 
    ws: true,
    pathRewrite: {
      '^/ws-proxy/bitget': '', // remove o path de entrada
    },
    on: {
      proxyReqWs: (proxyReq, req, socket, options, head) => {
        // Remove a origem do navegador para simular uma conexão server-to-server
        proxyReq.removeHeader('origin');
      }
    }
  }) as any);

  // We need express.text or raw to parse arbitrary body formats, but json is also good
  // ONLY for non-websocket proxy routes
  app.use(express.json({ limit: '1mb' }));
  app.use(express.text({ limit: '1mb' })); // Just in case it's stringified

  // Simple Dumb Proxy to bypass CORS
  app.post("/api/proxy", async (req, res) => {
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

      console.log(`[Proxy] ${method} ${targetUrl}`);

      // We omit host/origin headers to avoid 403s from strict exchange proxies
      const cleanHeaders = { ...headers };
      delete cleanHeaders.host;
      delete cleanHeaders.origin;
      delete cleanHeaders.referer;

      const fetchOptions: any = {
        method,
        headers: cleanHeaders,
      };

      if (method !== "GET" && method !== "HEAD" && body) {
        fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      }

      const response = await fetch(targetUrl, fetchOptions);
      
      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.warn(`[Proxy] Warning: Failed to parse JSON from ${targetUrl}. Status: ${response.status}`);
        responseData = responseText;
      }

      console.log(`[Proxy] Response status from ${targetUrl}: ${response.status}`);

      res.status(response.status).json(responseData);

    } catch (error: any) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
