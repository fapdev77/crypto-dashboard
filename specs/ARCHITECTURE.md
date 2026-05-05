# Technical Specifications & Architecture Design

## 1. System Architecture
This project implements a unique Hybrid-Proxy Client Architecture to resolve browser limitation contexts (CORS) while enforcing strict Zero-Trust Data security.

- **Client-Side (React/Vite):** 
  - Handles the UI, continuous WebSocket connections, State handling (Zustand), and all Cryptography (`crypto-js`). 
  - API keys reside solely here in `localStorage`.
- **Backend "Dumb" Proxy (Node.js/Express):** 
  - Serves exclusively to bypass CORS blocking for inevitable REST API calls (like fetching 24h history or bootstrapping Bybit's initial balances/positions).
  - Crucially, it remains entirely unaware of sensitive API Secrets. It merely receives pre-signed headers and mirror requests to the target exchanges.

## 2. Tech Stack Overview
- **Core Frontend:** React 18/19, TypeScript, Vite.
- **Styling:** Tailwind CSS v4, Lucide React (Icons).
- **Backend (Proxy):** Node.js + Express (run natively via `tsx server.ts`).
- **Cryptography Engine:** `crypto-js` (HMAC-SHA256, Base64).
- **State Controller:** Zustand (Micro-store architecture).

## 3. Data Flow and Synchronization
### WebSockets (Real-Time Streams)
1. Browser opens WebSockets: 
   - `wss://ws.okx.com:8443/ws/v5/private`
   - `wss://ws.bitget.com/v2/ws/private`
   - `wss://stream.bybit.com/v5/private`
2. `ExchangeAuth.ts` uses Web Crypto APIs/HMAC routines to construct authorization strings in real-time.
3. Once logged in, WS subscribes to `wallet` and `positions` topics.
4. Active heartbeat mechanisms (`setInterval`) ping exchanges to keep-alive.

### REST API (Initial Snapshots & Historical Logs)
1. Fetching historical data requires specific `GET` requests.
2. `ExchangeAuth.ts` generates signatures and HTTP headers for the specific Timestamp + Endpoint path.
3. `RestClient.ts` sends requests to local backend proxy at `/api/proxy`.
4. Express Proxy forwards to the authentic endpoint (`api.bitget.com`, `api.bybit.com`, etc.) and streams the data back.

## 4. State Management Models
- **`useApiKeysStore`:** 
  - Holds `id`, `exchange`, `apiKey`, `apiSecret`, `passphrase`, `label`, `connected`.
  - Persisted dynamically to browser storage.
- **`useDashboardStore`:** 
  - Subscribes to UI flows. Aggregates positions, balances.
  - Dynamically computes UI values on mapping loops (e.g. Total USD Equity).
