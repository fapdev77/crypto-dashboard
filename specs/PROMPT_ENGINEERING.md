# AI Generative Prompt Instructions (Prompt Engineering)

This document contains the exact structural context required to recreate, port, or deeply refactor this application utilizing modern AI agents (like Claude 3.5 Sonnet, Anthropic, GPT-4, or Google Gemini/Antigravity) observing Spec-Driven Development (SDD).

Copy the following text between the `---` barriers and paste it directly into an AI system to kickstart generation of the core infrastructure.

---

**PROMPT INSTRUCTIONS START:**

You are an Expert Full-Stack Crypto Systems Engineer focusing heavily on Client-Side Security. Your task is to build a "Multi-Exchange Crypto Dashboard" using React, Vite, TypeScript, Tailwind CSS, and a local Node.js Express proxy.
We must natively support three major exchanges: **OKX**, **Bitget**, and **Bybit**.

### Goal
Construir um gerenciador de portfólio em tempo real que se conecta via WebSocket (primário) e REST (secundário) na OKX, Bitget e Bybit para recuperar saldos de contas e posições abertas simultaneamente.

### Architectural Constraints (Zero-Trust Security Focus)
1. **API Secrets**: Must NEVER be dispatched to a backend or database as plain text constraints. They stay locked in the browser's `localStorage` and are resolved exclusively in memory.
2. **WebSockets First**: The React frontend must connect directly to the Exchange WebSockets. You will construct the login signatures in the browser dynamically using `crypto-js` (HMAC SHA256).
3. **Dumb CORS Proxy**: Because REST APIs heavily block direct browser requests via CORS, you MUST implement a local Express (`server.ts`) proxy. The React app will securely generate the Authorization Headers (timestamp, signatures) on the frontend, and pass them safely to the proxy. The proxy acts as a dumb pipe, simply forwarding the header request to the Exchange.

### Tech Stack Details
- React 19, TypeScript, Vite.
- Tailwind CSS v4 (incorporating Dark mode natively, and `font-mono` exclusively for numeric financial displays).
- Zustand for immutable state management (`apiKeysStore`, `dashboardStore`).
- `crypto-js` native module for HMAC hashing.
- `lucide-react` for semantic icon UI.

### Implementation Specifics
- **Dashboard Store**: Calculate the `Total USD Equity` dynamically across all exchanges combined.
- **WebSocket Specs & Rules**: 
  - Manage auto-reconnection and send required heartbeats (`ping` or `{"op": "ping"}`). 
  - Grasp the different cryptographic payload constraints: OKX uses ISO 8601 formatting and Base64 signatures, Bitget uses Unix Nano Time strings and Base64, Bybit uses Milliseconds Unix Time and Hexadecimals.
- **Data Table Features**: The Balances table must include functional interactive columns to filter (regex localized text search) and directionally sort by asset, name, amount, or USD value.
- **Special Edge Case (Bybit)**: Bybit's WSS mechanism generally only pushes *delta* (changes) updates for Accounts. Therefore, implement a one-off REST fetch on Dashboard Mount (utilizing the CORS proxy) to fetch the initial snapshot for Wallet/Positions, before falling back strictly to WSS streams.

Assume you are working in an environment running Vite with an active setup. Execute the development following strict Clean Code paradigms.

**PROMPT INSTRUCTIONS END.**
---
