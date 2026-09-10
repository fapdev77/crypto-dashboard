import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fetch from "node-fetch"; // natively available globally in Node 18+ but let's use standard global fetch
import { ServerLogger } from './src/utils/serverLogger';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

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

      try {
        const urlObj = new URL(targetUrl);
        if (!allowedDomains.includes(urlObj.hostname)) {
          ServerLogger.error('Proxy', `SSRF-Block — unauthorized domain: ${urlObj.hostname}`);
          return res.status(403).json({ error: "Forbidden: Domain not in proxy allowlist" });
        }
      } catch (err) {
        return res.status(400).json({ error: "Invalid targetUrl format" });
      }

      ServerLogger.info('Proxy', `${method} ${targetUrl}`);

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
        ServerLogger.warn('Proxy', `Failed to parse JSON response. Status: ${response.status}`, targetUrl);
        responseData = responseText;
      }

      ServerLogger.info('Proxy', `Response status: ${response.status}`, targetUrl);

      res.status(response.status).json(responseData);

    } catch (error: any) {
      ServerLogger.error('Proxy', 'Proxy error:', error);
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
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('sw.js') || filePath.endsWith('registerSW.js') || filePath.endsWith('manifest.webmanifest') || filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    }));
    app.get("*", (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    ServerLogger.info('Server', `Running on http://localhost:${PORT}`);
  });
}

startServer();
