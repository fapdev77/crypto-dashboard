# Deep Dive Arquitetural — Estado Atual do Projeto

## 1. Visão Geral

O **Crypto Portfolio Manager** é uma SPA React/TypeScript que consolida em tempo real saldos, posições e histórico de três exchanges de criptomoedas (**Bybit**, **OKX**, **Bitget**) sob uma interface unificada. Opera sob princípio **Zero-Trust**: nenhuma chave de API trafega por servidores terceiros.

---

## 2. Arquitetura de Runtime (2-Tier Local)

```mermaid
graph LR
  subgraph Browser["Tier 1: Browser SPA"]
    UI["React 19 + Zustand"]
    WC["Web Crypto API<br/>(HMAC-SHA256)"]
    IDB["IndexedDB<br/>(Cache Local)"]
    WSN["WebSocket Nativo<br/>(OKX, Bybit)"]
  end

  subgraph Proxy["Tier 2: Node/Express Proxy"]
    REST["/api/proxy<br/>(CORS Bypass)"]
    WSP["/ws-proxy/bitget<br/>(WS Proxy)"]
  end

  subgraph Exchanges["Exchanges"]
    BYBIT["Bybit V5"]
    OKX["OKX V5"]
    BITGET["Bitget V2"]
  end

  UI --> WC
  UI --> IDB
  UI -->|Direct WS| WSN
  WSN -->|wss://| OKX
  WSN -->|wss://| BYBIT
  UI -->|hybridFetch| REST
  UI -->|ws via proxy| WSP
  REST -->|HTTP Forward| BYBIT
  REST -->|HTTP Forward| OKX
  REST -->|HTTP Forward| BITGET
  WSP -->|wss://| BITGET
```

| Camada | Responsabilidade |
|--------|-----------------|
| **Browser (Tier 1)** | UI, WebSocket direto (OKX/Bybit), criptografia (`window.crypto.subtle`), estado (Zustand), cache (IndexedDB). Chaves API vivem exclusivamente em `localStorage`. |
| **Express Proxy (Tier 2)** | Bypass CORS para REST APIs. Proxy WebSocket exclusivo para Bitget. **Totalmente agnóstico** a secrets — recebe headers pré-assinados e repassa. Possui allowlist de domínios (`api.bybit.com`, `api.bitget.com`, `www.okx.com`, `api.okx.com`). |

---

## 3. Stack Tecnológica

| Domínio | Tecnologia |
|---------|------------|
| Frontend | React 19, TypeScript, Vite 6.2, Tailwind CSS v4 |
| Estado | Zustand 5 (3 micro-stores: `apiKeysStore`, `dashboardStore`, `settingsStore`) |
| Criptografia | Web Crypto API nativa (`hmacSha256` em [cryptoLib.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/utils/cryptoLib.ts)) |
| Gráficos | Recharts 3.8 |
| Exportação | jsPDF + jspdf-autotable (PDF), xlsx (Excel), CSV nativo |
| Cache | `idb` 8.0 (IndexedDB wrapper) |
| Proxy | Express 4 + `http-proxy-middleware` |
| Math | `big.js` 7.0, `date-fns` 4.1 |
| Testes | Vitest 4.1 |

---

## 4. Tipos Unificados (Contratos da Camada de Normalização)

Definidos em [types.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/types.ts):

| Interface | Finalidade |
|-----------|-----------|
| `UnifiedPosition` | Posição aberta em tempo real (18 campos: size, entryPrice, markPrice, unrealizedPnl, leverage, liquidationPrice, roe, tp, sl, etc.) |
| `UnifiedHistoryPosition` | Posição encerrada do histórico (realizedPnl, closeTime, entryPrice, closePrice, fundingFee, tradingFee) |
| `UnifiedOrder` | Ordens em aberto e históricas unificadas (side, price, qty, filledQty, status, average price, fees, trigger price) |
| `UnifiedBillRecord` | Depósito/Saque (type: deposit/withdrawal/funding/fee/transfer/other, amount, ccy, timestamp) |
| `SymbolPnLRecord` | Agregação PnL por símbolo com `Big.js` (totalPnL, longPnL, shortPnL) |

---

## 5. Adapter Layer (Strategy Pattern)

Todos os adapters implementam [IExchangeAdapter](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/services/adapters/IExchangeAdapter.ts) com dois contratos:
- `fetchAndNormalize(key, start?, end?)` → `UnifiedHistoryPosition[]`
- `fetchBills?(key, start?, end?)` → `UnifiedBillRecord[]`

### Adapters por Exchange

| Exchange | Adapters | Observações |
|----------|----------|-------------|
| **Bybit** | [HistoryAdapter](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/services/adapters/bybit/HistoryAdapter.ts) (229 LOC), [RestAdapter](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/services/adapters/bybit/RestAdapter.ts) (118 LOC), [WsAdapter](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/services/adapters/bybit/WsAdapter.ts) (78 LOC) | Time-sync dedicado (`syncBybitTime`). Categorias: linear + inverse. |
| **OKX** | [HistoryAdapter](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/services/adapters/okx/HistoryAdapter.ts) (188 LOC), [WsAdapter](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/services/adapters/okx/WsAdapter.ts) (63 LOC) | Inst types: SWAP, FUTURES, MARGIN. WS direto do browser. |
| **Bitget** | [HistoryAdapter](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/services/adapters/bitget/HistoryAdapter.ts) (197 LOC), [WsAdapter](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/services/adapters/bitget/WsAdapter.ts) (103 LOC) | Product types: USDT-FUTURES, COIN-FUTURES, USDC-FUTURES. WS via proxy (Bitget bloqueia browser WS direto). |

Cada `HistoryAdapter` também expõe métodos estáticos `getHeaders()` e `getWsAuth()` para auth de REST e WebSocket. Cada `WsAdapter` parseia streams delta e injeta diretamente no `dashboardStore` via `getState()`.

---

## 6. Orquestradores (Factory Services)

| Serviço | Arquivo | Papel |
|---------|---------|-------|
| **PositionHistoryService** | [PositionHistoryService.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/services/positions/PositionHistoryService.ts) | Factory → Adapter. Dois modos: `fetchExchangeHistory` (direto) e `fetchWithCache` (incremental com IndexedDB). |
| **BillsHistoryService** | [BillsHistoryService.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/services/bills/BillsHistoryService.ts) | Factory → Adapter. Modo direto (sem cache IndexedDB por enquanto). |

---

## 7. Camada de Persistência Local (IndexedDB)

[historyCache.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/services/historyCache.ts) — DB `crypto-dashboard-cache` com 2 object stores:

| Store | Key | Índices | Uso |
|-------|-----|---------|-----|
| `positionHistory` | `id` (UnifiedHistoryPosition.id) | `by-connectionId`, `by-closeTime` | Cache incremental de trades encerrados |
| `orderCacheMeta` e afins | `connectionId` | — | Rastreia `lastFetchTimestamp` para fetches incrementais de ordens fechadas |

**Fluxo Incremental (SWR - Stale-While-Revalidate)**:
1. React Hook (`usePositionHistory`, `useOrderReports`) carrega os dados estáticos do cache via SWR e renderiza a tela instantaneamente.
2. Hook dispara fetch em background para as exchanges a partir do `lastFetchTimestamp`.
3. Novos deltas recebidos atualizam o banco IndexedDB e disparam re-render automático para a UI.

---

## 8. Hooks React (Camada de Integração)

| Hook | Arquivo | Responsabilidade |
|------|---------|-----------------|
| `useMultiExchangeWS` | [useMultiExchangeWS.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/hooks/useMultiExchangeWS.ts) (349 LOC) | Gerencia ciclo de vida completo dos WebSockets. Exponential backoff (cap 60s). Ping/Pong a cada 20s. Short-Polling REST universal (todas exchanges) configurável. Mock data injection. |
| `usePositionHistory` | [usePositionHistory.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/hooks/usePositionHistory.ts) | Padrão SWR. Carrega rápido via IndexedDB, faz fetch incremental com `PositionHistoryService` em background. Filtra por período in-memory. |
| `useOrderReports` | [useOrderReports.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/hooks/useOrderReports.ts) | Padrão SWR para ordens fechadas. Filtros combinados e sincronia assíncrona. |
| `useBillsHistory` | [useBillsHistory.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/hooks/useBillsHistory.ts) | Orquestra `BillsHistoryService.fetchBills()` em paralelo. Live + Mock mode (Sem cache IndexedDB, consulta viva). |
| `useHistoryCachePolling` | [useHistoryCachePolling.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/hooks/useHistoryCachePolling.ts) | Background polling configurável (default 15 min) para manter cache IndexedDB atualizado. |
| `usePnLBySymbol` | [usePnLBySymbol.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/hooks/usePnLBySymbol.ts) | Agregação PnL por símbolo usando `Big.js`. |

---

## 9. Zustand Stores (Estado Global)

| Store | Persistência | Campos-chave | Papel |
|-------|-------------|--------------|-------|
| [apiKeysStore](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/store/apiKeysStore.ts) | `localStorage` (`crypto-dashboard-api-keys-v2`) | `keys[]` (id, label, exchange, apiKey, apiSecret, passphrase, isActive) | CRUD de chaves de API locais em formato Zero-Trust. |
| [dashboardStore](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/store/dashboardStore.ts) | **Memória** (volátil) | `statuses{}`, `errors{}`, `balances{}`, `positions{}`, `telemetry{}` | Estado principal do WebSocket real-time, incluindo o histórico de latência e throughput. |
| [settingsStore](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/store/settingsStore.ts) | `localStorage` (`terminal-settings`) | `useMockData`, `pollingInterval` (default 5s), `historyCacheInterval` (default 15min), `lastSyncTime` | Configurações globais e estado unificado de tempo de sincronização para travar timers. |
| [logStore](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/store/logStore.ts) | **Memória** (volátil) | `logs[]` (id, timestamp, level, source, message) | Armazena um buffer de logs (FIFO de 1000 itens) capturados pelo interceptor global de console. |

---

## 10. Componentes React (UI)

### Páginas Principais
| Componente | Rota/Tab | Descrição |
|------------|----------|-----------|
| [Dashboard.tsx](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/components/Dashboard.tsx) (23KB) | `dashboard` | Painel principal estruturado em Masonry: balanços, Donut de alocação de risco por exchange, Treemap de ativos cross-exchange e o painel de **Capital Protection & Hedge**. |
| [Positions.tsx](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/components/Positions.tsx) | `positions` | Abas unificadas de posições em aberto (**Open Positions**) e histórico de trade encerrados (**Positions History**). |
| [OpenPositions.tsx](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/components/OpenPositions.tsx) (21KB) | — | Grid de tempo real em modo Detailed ou Lite. Monitoramento de ROE %, PnL não realizado, Margem, Stop Loss/Take Profit, preço de liquidação e classificação visual do ativo. |
| [ClosedPositions.tsx](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/components/ClosedPositions.tsx) (15KB) | — | Visão histórica com filtros de SWR por IndexedDB, exibindo métricas robustas (Win Rate, Profit Factor, Médias de W/L e maior Trade). |
| [AnalyticsDashboard.tsx](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/components/analytics/AnalyticsDashboard.tsx) (15KB) | `analytics` | Painel avançado contendo Win Rate Geral, Profit Factor real, Sazonalidade (dia e bloco de 4 horas), Capital Flow (depósitos e saques) e Milestone Matrix. |
| [PnLBySymbol.tsx](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/components/analytics/PnLBySymbol.tsx) (14KB) | `analytics-pnl-symbol` | Agrega e distribui lucros e prejuízos por criptoativos, com filtros precisos por categorias de contratos margined (USDT-M, Coin-Margined, USDC-M, Linear/Inverse). |
| [OrderReports](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/components/analytics/OrderReports/) | `orders` | Nova seção de relatórios de ordens (**Open Orders** e **Order History**) dividida por corretora com ordenação, buscas regex locais e linhas expansíveis para expor IDs brutos e taxas operacionais. |
| [ReportsDashboard.tsx](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/components/analytics/ReportsDashboard.tsx) (4.7KB) | `reports` | Geração instantânea e download de relatórios operacionais em PDF (jspdf), Excel (xlsx) e CSV nativo. |
| [ApiKeys.tsx](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/components/ApiKeys.tsx) (16KB) | `api-keys` | Tabela acordeão agrupando conexões ativas por corretora com telemetria visualizada em tempo real (latência sparklines e throughput em KB/s). Integra o `ConnectionLogTerminal`. |
| [Settings.tsx](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/components/Settings.tsx) (10KB) | `settings` | Configurações de intervalos de polling, gerenciamento de limpeza do cache de IndexedDB e o interruptor do **Simulation/Mock Mode**. |
| [ApiTester.tsx](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/components/ApiTester.tsx) (15KB) | `api-tester` | **Dev Tools** — Ferramenta integrada de conectividadeREST e WS bruta. |

### Componentes Auxiliares
| Componente | Responsabilidade |
|------------|-----------------|
| [ConnectionLogTerminal.tsx](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/components/ConnectionLogTerminal.tsx) | Terminal docked acoplado nas credenciais com drag-to-resize, busca local, logs mascarados sem secrets, filtros semânticos (INFO, SYSTEM, DATA, WARN, ERROR). |
| [Sidebar.tsx](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/components/Sidebar.tsx) | Navegação colapsável com badge de posições abertas e o botão de **Privacy Mode (Ocultamento Global)**. |
| [StatusBar.tsx](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/components/StatusBar.tsx) | Barra inferior contendo status e monitor de latência consolidada. |
| [PositionsTicker.tsx](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/components/PositionsTicker.tsx) | Marquee ticker em tempo real no topo refletindo variação real-time de preços das posições abertas. |
| [WorkSpace.tsx](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/components/WorkSpace.tsx) | Container wrapper simples. |

---

## 11. Utilitários Puros

| Arquivo | Papel | LOC |
|---------|-------|-----|
| [cryptoLib.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/utils/cryptoLib.ts) | `hmacSha256()` via Web Crypto API (hex/base64) | 23 |
| [math-crypto.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/utils/math-crypto.ts) | `calculateRoe()` | 7 |
| [analyticsMath.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/utils/analyticsMath.ts) | Win Rate, Profit Factor, Funding Efficiency, Daily ROI, Seasonality | 79 |
| [milestoneMath.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/utils/milestoneMath.ts) | Milestone Price Matrix (⚠️ atualmente simulado) | 67 |
| [exportUtils.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/utils/exportUtils.ts) | Exportação PDF/CSV/Excel | 73 |
| [formatters.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/utils/formatters.ts) | Formatação de moedas (USD/BRL) | ~20 |
| [proxyFetch.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/utils/proxyFetch.ts) | `proxyFetch()` + `hybridFetch()` (Direct → Proxy fallback) | 42 |

---

## 12. Mock Data & Testes

### Mocks
Em [src/mock/](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/mock/):
- `accounts.json` (1.2KB) — 3 contas mockadas
- `balances.json` (18KB) — ~50 balances
- `positions.json` (308KB) — ~150 posições
- `history.json` (251KB) — ~500 trades históricos
- `bills.json` (17KB) — ~50 depósitos/saques
- `generateMocks.js` (6KB) — Script gerador

Toggle via `settingsStore.useMockData`. Quando ativado, desconecta WebSockets reais e injeta JSONs estáticos.

### Testes
- [analyticsMath.test.ts](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/src/utils/analyticsMath.test.ts) — Unit tests com Vitest
- Runner: `npm test` → `vitest run`

---

## 13. Fluxo de Dados Completo

```mermaid
sequenceDiagram
    participant User
    participant App as App.tsx
    participant Hook as useMultiExchangeWS
    participant WS as WebSocket
    participant Adapter as WsAdapter
    participant Store as dashboardStore
    participant UI as Dashboard/Positions

    User->>App: Adiciona API Key
    App->>Hook: keys[] changed
    Hook->>WS: new WebSocket(wsUrl)
    Hook->>Adapter: getWsAuth() + getHeaders()
    WS->>Hook: onopen → send auth
    WS->>Hook: onmessage (stream)
    Hook->>Adapter: WsParsers.parseStream()
    Adapter->>Store: updateBalancesDelta / updatePositionsDelta
    Store->>UI: Zustand reactive re-render
```

---

## 14. Documentação Existente

| Arquivo | Conteúdo |
|---------|----------|
| [AGENTS.MD](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/AGENTS.MD) | Constituição do projeto (SRP, Normalization Layer, Resiliência). Fases 1-2 ✅ concluídas. |
| [README.md](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/README.md) | Visão geral, setup, features, guia de manutenção. |
| [specs/ARCHITECTURE.md](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/specs/ARCHITECTURE.md) | Specs técnicas consolidadas. |
| [specs/EVOLUTION_TASKS.md](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/specs/EVOLUTION_TASKS.md) | Histórico de refatorações e sprints. |
| [specs/QUALITY_AUDIT.md](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/specs/QUALITY_AUDIT.md) | Auditoria de qualidade anterior. |
| [specs/SECURITY_HARDENING.md](file:///x:/Dev/git/CriptoDashboard/crypto-dashboard/specs/SECURITY_HARDENING.md) | Hardening de segurança. |

---

## 15. Pontos de Atenção Identificados

> [!WARNING]
> ### Débitos Técnicos Ativos
> 1. **`milestoneMath.ts`** — A lógica de Milestone Matrix é **100% simulada** (`Math.random()`). Precisa de integração com K-lines reais de BTC para reconstruir equity histórica.
> 2. **`ApiTester.tsx`** — Exceção oficial (Dev Tools): consome dados brutos das APIs sem passar pela camada de normalização.
> 3. **`BillsHistoryService`** — Não possui cache IndexedDB (diferente do `PositionHistoryService`). Cada consulta de Bills faz fetch direto.

> [!NOTE]
> ### Saúde Arquitetural
> - **56 arquivos TypeScript/TSX** no total em `src/`
> - Nenhum arquivo acima de 350 LOC (compliance com AGENTS.md §3: max 300, com margem tolerável)
> - `Dashboard.tsx` com 23KB é o maior componente — candidato a decomposição futura
> - Todos os adapters seguem o contrato `IExchangeAdapter` (Strategy Pattern ✅)
> - Zero instâncias de raw API access em componentes React (exceto `ApiTester`)

---

## 16. Últimas Implementações e Marcos Tecnológicos de UI/UX

Abaixo, os refinamentos críticos implementados recentemente para elevar o aplicativo ao nível profissional:

### A. Central de Telemetria e Logs Unificados (DX Core)
- **Console Interceptor (`logger.ts`)**: Captura as saídas das APIs de REST e WebSocket, expurgando strings sensíveis (secrets/passphrases). Converte UUIDs internos de chaves em rótulos amigáveis ("Bybit - Main") consultando a store do cliente.
- **Buffer FIFO no Zustand (`logStore.ts`)**: Aloca de forma otimizada até 1000 linhas de logs com paginação em memória local sem prejudicar o render da UI principal.
- **Connection Telemetry**: O hook do WebSocket monitora ativamente as mensagens de Ping/Pong para rastrear o Round-Trip Time (RTT em milissegundos) e calcula dinamicamente a taxa de transferência em KB/s derivando o tamanho das strings recebidas.
- **Docked Logs Terminal (`ConnectionLogTerminal.tsx`)**: Console dark em estilo console retrô no rodapé da página de chaves, redimensionável por drag, com busca e filtros coloridos (INFO, SYSTEM, DATA, WARN, ERROR).

### B. Sistema Global de Privacidade (Privacy Mode)
- **Privacy Mode**: Integrado de forma fluida no sidebar de navegação. Ao ser acionado, mascara instantaneamente todas as quantias patrimoniais, saldos e lucros das tabelas com dots (`••••`) sem desconectar ou interferir nas operações de rede ou computação das lojas do Zustand.

### C. Proteção de Capital & Razão de Hedge (Risk Management)
- **Hedge Indicator**: O dashboard agora calcula a taxa de Hedge dinâmica contra contratos inversos. Fornece uma visualização instantânea de progresso mostrando o quanto da carteira Spot está sendo protegida por contratos curtos (Shorts) e longos (Longs) cruzados com a equidade global, apresentando cálculos com precisão de alta escala por meio da biblioteca `Big.js`.

### D. Identidade Visual Avançada de Tokens (CoinIcon & logo.dev)
- **AssetClassifierAggregator**: Classifica ativos dinamicamente entre ações convencionais e moedas cripto, eliminando a dependência de hardcodes e consultando metadados nativos de exchanges (como OKX SWAP instruments).
- **Roteamento de Fallbacks de Logotipos**: O componente unificado `<CoinIcon />` implementa um roteamento robusto de quatro etapas para recuperar logotipos em SVG/PNG por meio do serviço Logo.dev com fallback nativo para preencher quaisquer gaps visuais ao lidar com milhares de altcoins exóticas.

### E. Coordenação de Sincronia Unificada (Sync Engine)
- **Global Sync Coordination**: Evita estouros de limitação de taxa (Rate-Limits) ao coordenar o tempo de cache das abas históricas do painel analítico (Orders, Trade History, PnL) usando uma propriedade centralizada `lastSyncTime`. Desativa preventivamente botões de recarregamento manual quando o **Simulation Mode (Dados de Mock)** está ativado.

