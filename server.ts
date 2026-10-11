import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fetch from "node-fetch"; // natively available globally in Node 18+ but let's use standard global fetch
import { ServerLogger } from './src/utils/serverLogger';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: Date.now() });
  });
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: Date.now() });
  });

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

      const timeoutSignal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
        ? AbortSignal.timeout(20000)
        : undefined;

      const fetchOptions: any = {
        method,
        headers: cleanHeaders,
        signal: timeoutSignal,
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
      const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('aborted');
      const statusCode = isTimeout ? 504 : 500;
      res.status(statusCode).json({
        error: isTimeout
          ? 'Gateway Timeout: upstream exchange did not respond within 20s'
          : (error.message || 'Internal Server Error')
      });
    }
  });

  // AI Assistant Endpoints (PIKA)
  app.post("/api/ai/ping", async (req, res) => {
    try {
      const { modelId = "gemini-2.5-flash", apiKey: clientApiKey, provider = "gemini" } = req.body || {};
      const key = clientApiKey || process.env.GEMINI_API_KEY;

      if (provider === "gemini") {
        if (!key) {
          return res.status(503).json({
            error: "GEMINI_API_KEY is not configured on the server, and no private API key was provided.",
            status: "unreachable",
          });
        }
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: key });

        try {
          const response = await ai.models.generateContent({
            model: modelId,
            contents: "ping",
          });
          return res.json({
            success: true,
            status: "healthy",
            modelId,
            text: response.text || "OK",
          });
        } catch (genErr: any) {
          const errMsg = genErr.message || "";
          ServerLogger.warn('AI', `Ping error for model ${modelId}:`, errMsg);

          // Detect deprecated or non-existent model
          const isNotFoundOrDeprecated =
            errMsg.includes("NOT_FOUND") ||
            errMsg.includes("404") ||
            errMsg.includes("not found") ||
            errMsg.includes("is not supported") ||
            errMsg.includes("deprecated");

          if (isNotFoundOrDeprecated) {
            return res.status(404).json({
              error: `Model '${modelId}' is not found or has been deprecated by Google.`,
              status: "deprecated",
              rawError: errMsg,
            });
          }

          // Detect quota or tier limits
          const isQuota =
            errMsg.includes("RESOURCE_EXHAUSTED") ||
            errMsg.includes("429") ||
            errMsg.includes("quota");

          if (isQuota) {
            return res.status(429).json({
              error: `Quota exceeded or model requires a paid tier for '${modelId}'.`,
              status: "quota_exceeded",
              rawError: errMsg,
            });
          }

          return res.status(500).json({
            error: errMsg || "Failed to communicate with model.",
            status: "unreachable",
            rawError: errMsg,
          });
        }
      }

      // Fallback for generic provider ping
      return res.json({ success: true, status: "healthy", modelId });
    } catch (err: any) {
      ServerLogger.error('AI', 'Ping failed:', err);
      return res.status(500).json({
        error: err.message || "Failed to test connection.",
        status: "unreachable",
      });
    }
  });

  // Dynamic Models Listing
  app.post("/api/ai/fetch-models", async (req, res) => {
    try {
      const isChatbotEnabled = process.env.AI_CHAT_BOT_ENABLED !== 'false' && process.env.VITE_AI_CHAT_BOT_ENABLED !== 'false';
      if (!isChatbotEnabled) {
        return res.status(403).json({ error: "The AI Assistant feature is disabled in server environment settings." });
      }
      const { provider = 'gemini', apiKey: clientApiKey, baseUrl } = req.body || {};

      if (provider === 'gemini') {
        const key = clientApiKey || process.env.GEMINI_API_KEY;
        if (!key) {
          return res.status(400).json({
            error: "No Gemini API key provided, and GEMINI_API_KEY is not configured on the server."
          });
        }

        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: key });
        const listResponse = await ai.models.list();

        const models: Array<{ id: string; name: string; displayName: string; description?: string; isRecommended?: boolean }> = [];
        for await (const m of listResponse) {
          const methods = (m as any).supportedActions || (m as any).supportedGenerationMethods || [];
          const supportsGenerate = Array.isArray(methods) && methods.some((method: string) =>
            typeof method === 'string' && method.toLowerCase().includes('generatecontent')
          );

          if (!supportsGenerate) continue;

          const rawId = (m.name || '').replace(/^models\//, '');
          if (!rawId) continue;

          // Filter out models that are unsuitable for chat/reasoning
          const lower = rawId.toLowerCase();
          if (
            lower.includes('tts') ||
            lower.includes('embedding') ||
            lower.includes('aqa') ||
            lower.includes('imagen') ||
            lower.includes('robotics')
          ) {
            continue;
          }

          const isRecommended = rawId === 'gemini-2.5-flash' || rawId === 'gemini-2.5-pro' || rawId === 'gemini-1.5-flash';

          models.push({
            id: rawId,
            name: m.displayName ? `${m.displayName} (${rawId})` : rawId,
            displayName: m.displayName || rawId,
            description: m.description,
            isRecommended,
          });
        }

        // Sort: Recommended first, then 2.5 flash, then 2.5 pro, then latest, then alphabetical
        models.sort((a, b) => {
          if (a.isRecommended && !b.isRecommended) return -1;
          if (!a.isRecommended && b.isRecommended) return 1;
          if (a.id.includes('2.5-flash') && !b.id.includes('2.5-flash')) return -1;
          if (!a.id.includes('2.5-flash') && b.id.includes('2.5-flash')) return 1;
          return a.id.localeCompare(b.id);
        });

        return res.json({
          success: true,
          provider: 'gemini',
          count: models.length,
          models,
        });
      }

      if (provider === 'ollama') {
        const url = (baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        try {
          const resp = await fetch(`${url}/api/tags`, { signal: controller.signal });
          clearTimeout(timeout);
          if (!resp.ok) {
            return res.status(resp.status).json({ error: `Ollama returned HTTP ${resp.status}` });
          }
          const data = await resp.json();
          const models = (data.models || []).map((m: any) => ({
            id: m.name,
            name: m.name,
            displayName: m.name,
            description: `Size: ${Math.round((m.size || 0) / (1024 * 1024 * 1024) * 10) / 10} GB`,
          }));
          return res.json({ success: true, provider: 'ollama', count: models.length, models });
        } catch (fetchErr: any) {
          clearTimeout(timeout);
          return res.status(503).json({
            error: `Could not reach Ollama at ${url}. Ensure Ollama is running ('ollama serve').`
          });
        }
      }

      if (provider === 'openai' || provider === 'openrouter') {
        const defaultBase = provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1';
        const url = (baseUrl || defaultBase).replace(/\/+$/, '');
        const headers: Record<string, string> = {};
        if (clientApiKey) headers['Authorization'] = `Bearer ${clientApiKey}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        try {
          const resp = await fetch(`${url}/models`, { headers, signal: controller.signal });
          clearTimeout(timeout);
          if (!resp.ok) {
            return res.status(resp.status).json({ error: `Provider returned HTTP ${resp.status}` });
          }
          const data = await resp.json();
          const models = (data.data || [])
            .filter((m: any) => {
              const id = (m.id || '').toLowerCase();
              return id.includes('gpt') || id.includes('claude') || id.includes('llama') || id.includes('gemini') || id.includes('deepseek');
            })
            .map((m: any) => ({
              id: m.id,
              name: m.id,
              displayName: m.id,
            }));
          return res.json({ success: true, provider, count: models.length, models });
        } catch (fetchErr: any) {
          clearTimeout(timeout);
          return res.status(503).json({ error: `Failed to fetch models from ${url}: ${fetchErr.message}` });
        }
      }

      return res.status(400).json({ error: `Provider '${provider}' does not support remote model catalog listing.` });
    } catch (err: any) {
      ServerLogger.error('AI', 'Fetch models error:', err);
      return res.status(500).json({ error: err.message || "Failed to fetch models." });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const isChatbotEnabled = process.env.AI_CHAT_BOT_ENABLED !== 'false' && process.env.VITE_AI_CHAT_BOT_ENABLED !== 'false';
      if (!isChatbotEnabled) {
        return res.status(403).json({ error: "The AI Assistant feature is disabled in server environment settings." });
      }
      const {
        modelId: rawModelId = "gemini-3.8-flash",
        apiKey: clientApiKey,
        messages,
        systemInstruction,
        tools,
        temperature,
        maxTokens,
      } = req.body || {};

      const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: "No API Key configured and GEMINI_API_KEY missing on server." });
      }

      let modelId = typeof rawModelId === 'string' ? rawModelId.trim().replace(/^models\//, '') : 'gemini-3.8-flash';
      if (modelId === 'gemini-3.7') modelId = 'gemini-3.7-flash';
      if (modelId === 'gemini-3.8') modelId = 'gemini-3.8-flash';
      if (modelId === 'gemini-2.5' || modelId === 'gemini-2.5-flash') modelId = 'gemini-3.8-flash';

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Transform messages into GenAI contents format while strictly preserving parts & thought signatures
      const contents = (messages || []).map((msg: any) => {
        if (msg.parts && Array.isArray(msg.parts)) {
          return {
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts: msg.parts,
          };
        }
        return {
          role: msg.role === 'assistant' ? 'model' : msg.role,
          parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content || '') }],
        };
      });

      // Prepare function declarations if tools provided
      const functionDeclarations = (tools || []).map((t: any) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      }));

      const config: any = {
        systemInstruction,
        temperature: temperature ?? 0.1,
        maxOutputTokens: maxTokens ?? 2048,
      };

      if (functionDeclarations.length > 0) {
        config.tools = [{ functionDeclarations }];
      }

      const result = await ai.models.generateContent({
        model: modelId,
        contents,
        config,
      });

      const candidate = result.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const functionCalls: any[] = [];
      let textContent = "";

      for (const part of parts) {
        if (part.functionCall) {
          functionCalls.push(part.functionCall);
        }
        if (part.text) {
          textContent += part.text;
        }
      }

      return res.json({
        text: textContent || result.text || "",
        rawContent: candidate?.content || null,
        toolCalls: functionCalls.length > 0 ? functionCalls : undefined,
        usage: {
          promptTokens: result.usageMetadata?.promptTokenCount || 0,
          completionTokens: result.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: result.usageMetadata?.totalTokenCount || 0,
        },
        rawResponse: {
          candidates: result.candidates,
          usageMetadata: result.usageMetadata,
          modelVersion: (result as any).modelVersion,
          responseId: (result as any).responseId,
        },
        sentConfig: {
          model: modelId,
          systemInstruction,
          temperature: config.temperature,
          maxOutputTokens: config.maxOutputTokens,
          toolsCount: functionDeclarations.length,
          messagesCount: contents.length,
        },
      });
    } catch (err: any) {
      ServerLogger.error('AI', 'Chat error:', err);

      let rawMessage = err?.message || "Error processing AI request.";
      let parsedMessage = rawMessage;
      let statusCode = 500;
      let errorCode: string | number = 500;

      // Extract details if err.message contains serialized JSON (Google GenAI error format)
      try {
        const jsonMatch = rawMessage.match(/\{[\s\S]*"error"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.error) {
            parsedMessage = parsed.error.message || parsedMessage;
            errorCode = parsed.error.code || parsed.error.status || errorCode;
            if (typeof parsed.error.code === 'number' && parsed.error.code >= 400 && parsed.error.code < 600) {
              statusCode = parsed.error.code;
            }
          }
        }
      } catch {
        // use rawMessage
      }

      return res.status(statusCode).json({
        error: parsedMessage,
        rawError: rawMessage,
        code: errorCode,
        stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
      });
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

startServer().catch((err) => {
  ServerLogger.error('Server', 'Fatal error during server startup:', err);
  process.exit(1);
});
