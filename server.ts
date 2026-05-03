import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fetch from "node-fetch"; // natively available globally in Node 18+ but let's use standard global fetch

async function startServer() {
  const app = express();
  const PORT = 3000;

  // We need express.text or raw to parse arbitrary body formats, but json is also good
  app.use(express.json());
  app.use(express.text()); // Just in case it's stringified

  // Simple Dumb Proxy to bypass CORS
  app.post("/api/proxy", async (req, res) => {
    try {
      const { targetUrl, method, headers, body } = req.body;

      if (!targetUrl || !method) {
        return res.status(400).json({ error: "Missing targetUrl or method" });
      }

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
        responseData = responseText;
      }

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
