# Technical Specifications & Architecture Design

## 1. Purpose (O Porquê)
O **Crypto Portfolio Manager** soluciona o problema de fragmentação de informações no trading de criptomoedas. Ele consolida, em tempo real, saldos de carteiras, histórico financeiro e posições de derivativos de três exchanges isoladas (Bitget, Bybit, OKX) sob uma interface de "painel único de vidro" (Single Pane of Glass). O objetivo central é fornecer velocidade analítica e uma postura de segurança *Zero-Trust*, garantindo que as chaves de API do usuário nunca sejam armazenadas em servidores terceiros, operando estritamente localmente no navegador.

## 2. System Architecture (Hybrid-Proxy Client)
This project implements a unique Hybrid-Proxy Client Architecture (2-Tier Local) to resolve browser limitation contexts (CORS) while enforcing strict Zero-Trust Data security.

- **Tier 1: Client-Side (React/Vite)** 
  - **Responsibility:** Handles the UI, continuous WebSocket connections, State handling (Zustand), and all Cryptography (`window.crypto.subtle`). API keys reside solely here in `localStorage`.
  - **Data Flow:** Maintains direct WebSocket connections to OKX and Bybit. Uses the local Proxy to bypass Origin limitations for REST calls and Bitget WS.
  - **UI Patterns:** Utilizes an advanced Responsive Masonry chunking algorithm (`flex`/`columns` hybrids) for optimized component rendering to ensure dynamic collapsible UI modules don't displace vertically adjacent objects. Sidebar utilizes collapsible real-time logic.

- **Tier 2: Backend "Dumb" Proxy (Node.js/Express)** 
  - **Responsibility:** Serves exclusively to bypass CORS blocking for inevitable REST API calls (like fetching 24h history or bootstrapping Bybit's initial balances/positions).
  - **Security:** Crucially, it remains entirely unaware of sensitive API Secrets. It merely receives pre-signed headers and mirror requests to the target exchanges without tampering.

## 3. Tech Stack & Dependency Risk Graph
A stack atual repousa sobre fundações modernas, possuindo os seguintes pontos e mitigações:

- **Core Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React (Icons).
  - *Risk:* Tailwind v4 is in early adoption. Some external component libraries might lack full compatibility, requiring native UI solutions.
- **State Management:** Zustand 5.0 (Micro-store architecture).
  - *Risk:* Heavy use of direct state subscriptions in WebSockets hooks (`dashboardStore.getState()`) bypasses React's pure reactive flow. Mitigated by strict separation of concerns in UI components.
- **Security & Cryptography Engine:** Web Crypto API (`window.crypto.subtle`).
  - *Risk (Mitigated):* Replaced bloated third-party crypto libraries to ensure native cryptographic performance for HMAC-SHA256 and Base64 signatures.
- **Networking:** Native `fetch` API (`hybridFetch`), Native WebSockets, Express Proxy (`http-proxy-middleware`).

## 4. Normalization Layer (Unified Interfaces vs Real Implementation)
Conforme discutido no design técnico (SDD Phase 1 & 2), o projeto implementou o **Padrão Adapter** com subagregadores na camada `src/services/adapters/`. Segue o mapeamento exato executado no código em contraste com a documentação original.

### UnifiedBalance (Balanços e Carteiras)
- **Documentação de Design:** Previa extrair `Total Equity`, `Available Margin`, `Unrealized PnL` no payload global de conta.
- **Implementação Real (`BalanceItem`):** Reduzimos a complexidade extraindo diretamente `amount` e `usdValue` por moeda individual (array de coins na corretora), delegando o cálculo do "Total Equity" para o momento de renderização da UI (`Dashboard.tsx`). Isso evita armazenar redundâncias (o total global pode ficar obsoleto em relação aos valores granulares individuais).
- Campos retidos: `id`, `connectionId`, `exchange`, `label`, `ccy`, `amount`, `usdValue`.

### UnifiedPosition (Posições Abertas)
- **Documentação de Design:** Mapear `category`, `productType`, etc.
- **Implementação Real:** Usamos inferências implícitas. Por exemplo, distinguimos Contratos Inversos Puros (Bybit `BTCUSD`) e pares Standard Fiat (Bybit & OKX `BTCUSDT`, `BTCUSDC`, `BTC-USD`) convertendo o Size para a métrica final durante o runtime do WebSocket e adaptadores REST.
- Transformações Críticas (Size/Notional): 
  - Na Bybit Inversa, o "size" enviado pela API na verdade é o "Notional USD", e para achar as moedas reais, divide-se por `entryPrice`.
  - Na OKX, o "size" pode vir como "Contratos", sendo convertido pela relação via API `notionalUsd` ou geometria da posição, unificando para Size sempre representar a quantidade de Cripto Básica (Base Coin Size) ou vice-versa, permitindo formatadores visuais consistentes e assertivos na UI.

### UnifiedPnLRecord (Histórico e Realized PnL)
- **Documentação de Design:** Previsto captar "Closed PnL", "Net Profit", "Fees".
- **Implementação Real (`UnifiedHistoryPosition`):** Concentramos a lógica em exibir o `realizedPnl`. Embora os fees sejam mapeados, eles não foram abstraídos da UI. Nas métricas de ROI e Value, adotou-se o modelo matemático agressivo e fallback:
  - Na Okx (Rest) caso falte os "Sizes" no payload histórico ou o formato retorne Contratos, tentamos isolar o *Volume (Size)* retroagindo `pnl` dividido pela diferença de preços (`abs(closePx - entryPx)`).

### Formatadores Core & Regras Decimais
As regras propostas no SDD (2 casas para Stables, 8 para Assets) foram consolidadas integralmente em `src/utils/formatters.ts`:
- **`formatCrypto`**: Utilizado para *Base Coin Sizes* com até 8 casas adaptativas.
- **`formatPrice`**: Identifica dinamicamente via parâmetro se o par é Fiat/Stable (`true` = 2 a 4 casas dependendo do valor) ou Cripto Baseado (onde o preço precisa ir a 8 dígitos caso se trate de pares micro como SHIBUSDT).
- **`formatValue`**: Resolve totais financeiros (`realizedPnl`, Total Equity, etc) impondo estaticamente 2 a 4 casas de precisão (USD Defaults).

## 5. Data Flow and Synchronization
### WebSockets (Real-Time Streams)
1. Browser opens WebSockets: 
   - `wss://ws.okx.com:8443/ws/v5/private`
   - `wss://ws.bitget.com/v2/ws/private`
   - `wss://stream.bybit.com/v5/private`
2. `src/services/adapters/[exchange]/WsAdapter.ts` and `HistoryAdapter.ts` use Web Crypto APIs/HMAC routines to construct authorization strings in real-time.
3. Once logged in, WS subscribes to `wallet` and `positions` topics.
4. Active heartbeat mechanisms (`setInterval`) ping exchanges to keep-alive.

### REST API (Initial Snapshots & Historical Logs & caching)
1. Fetching historical data requires specific `GET` requests via the Orchestrator/Factory services (`PositionHistoryService` and `BillsHistoryService`).
2. The orchestrator delegates the request to the specific `IExchangeAdapter` (e.g. `BybitHistoryAdapter`, `OkxHistoryAdapter`).
3. The adapter generates signatures and HTTP headers for the specific Timestamp + Endpoint path.
4. The adapter sends requests to the local backend proxy at `/api/proxy` via `hybridFetch`.
5. Express Proxy forwards to the authentic endpoint (`api.bitget.com`, `api.bybit.com`, etc.) and streams the data back.
6. The adapter parses and normalizes the Raw API response into the unified format (`UnifiedHistoryPosition`, `UnifiedBillRecord`).
7. **Local Caching (Position History):** To bypass aggressive exchange rate limits and decouple UI analytics delays from network latency, historical operations query a robust **IndexedDB Database** (`crypto-dashboard-cache`). The caching mechanism includes a periodic background synchronization task (controlled via setting intervals) that seamlessly pulls delta records using exchange cursors, rendering historic views (PnL charts, Analytics) instantaneously from the local store.

## 5. State Management Models
- **`useApiKeysStore`:** 
  - Holds `id`, `exchange`, `apiKey`, `apiSecret`, `passphrase`, `label`, `connected`.
  - Persisted dynamically to browser storage.
- **`useDashboardStore`:** 
  - Subscribes to UI flows. Aggregates positions, balances.
  - Dynamically computes UI values on mapping loops (e.g. Total USD Equity).
- **`useSettingsStore`:** 
  - Manages application-wide config (e.g. `useMockData`, visibility toggles).
  - Handles network heuristics configurations like `bybitPollingInterval` (for static REST calls) and `historyCacheInterval` (for background PnL sync limits).
  - Persisted to local storage for user preferences.
