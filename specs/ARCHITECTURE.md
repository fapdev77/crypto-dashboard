# Technical Specifications & Architecture Design

## 1. Purpose (O Porquê)
O **Crypto Portfolio Manager** soluciona o problema de fragmentação de informações no trading de criptomoedas. Ele consolida, em tempo real, saldos de carteiras, histórico financeiro e posições de derivativos de três exchanges isoladas (Bitget, Bybit, OKX) sob uma interface de "painel único de vidro" (Single Pane of Glass). O objetivo central é fornecer velocidade analítica e uma postura de segurança *Zero-Trust*, garantindo que as chaves de API do usuário nunca sejam armazenadas em servidores terceiros, operando estritamente localmente no navegador.

## 2. System Architecture (Hybrid-Proxy Client)
This project implements a unique Hybrid-Proxy Client Architecture (2-Tier Local) to resolve browser limitation contexts (CORS) while enforcing strict Zero-Trust Data security.

- **Tier 1: Client-Side (React/Vite)** 
  - **Responsibility:** Handles the UI, REST Polling synchronization, State handling (Zustand), and all Cryptography (`window.crypto.subtle`). API keys reside solely here in `localStorage`.
  - **Data Flow:** Maintains direct REST Polling connections to Bitget, OKX, and Bybit. Uses the local Proxy to bypass Origin limitations for CORS-restricted REST calls. Isolates WebSocket feeds exclusively inside the API Tester tool for connection diagnostics.
  - **UI Patterns:** Utilizes an advanced Responsive Masonry chunking algorithm (`flex`/`columns` hybrids) for optimized component rendering to ensure dynamic collapsible UI modules don't displace vertically adjacent objects. Sidebar utilizes collapsible real-time logic.

- **Tier 2: Backend "Dumb" Proxy (Node.js/Express)** 
  - **Responsibility:** Serves exclusively to bypass CORS blocking for inevitable REST API calls (like fetching current balances/positions, 24h history, or bootstrapping).
  - **Security:** Crucially, it remains entirely unaware of sensitive API Secrets. It merely receives pre-signed headers and mirror requests to the target exchanges without tampering.

## 3. Tech Stack & Dependency Risk Graph
A stack atual repousa sobre fundações modernas, possuindo os seguintes pontos e mitigações:
- **Precision Math:** Big.js library para cálculos financeiros de alta precisão no módulo de funding rates (substituiu aritmética nativa com floats).
- **Testing:** Vitest com cobertura v8 provider. Módulo de funding rates possui >140 testes unitários (fundingStore: 58, FundingService: 32, settingsStore: 12, stores existentes: 38).


- **Core Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React (Icons).
  - *Risk:* Tailwind v4 is in early adoption. Some external component libraries might lack full compatibility, requiring native UI solutions.
- **State Management:** Zustand 5.0 (Micro-store architecture).
  - *Risk:* Over-frequent REST Polling cycles could cause unnecessary re-renders. Mitigated by memoization and SWR cache-comparison checks in the polling hooks.
- **Security & Cryptography Engine:** Web Crypto API (`window.crypto.subtle`).
  - *Risk (Mitigated):* Replaced bloated third-party crypto libraries to ensure native cryptographic performance for HMAC-SHA256 and Base64 signatures.
- **Networking:** Native `fetch` API (`hybridFetch`), Express Proxy (`http-proxy-middleware`), and isolated WebSockets (for API Tester connection diagnostics).

## 4. Normalization Layer (Unified Interfaces vs Real Implementation)

O projeto adota o **Padrão Adapter** com subagregadores na camada `src/services/adapters/`. Esta camada é a barreira técnica que protege o restante do aplicativo da extrema heterogeneidade das APIs das corretoras, assegurando conformidade estrita com o princípio SRP (Single Responsibility Principle) e o padrão Strategy.

### 4.1. Design de Adapters e Interfaces (`IExchangeAdapter`)
Todas as exchanges implementam a interface rígida `IExchangeAdapter` (localizada em `src/services/adapters/IExchangeAdapter.ts`), a qual dita as assinaturas obrigatórias para recuperação de dados unificados:
*   `fetchAndNormalize(key, start, end)`: Recuperação paginada e normalizada de históricos de posições fechadas (`UnifiedHistoryPosition[]`).
*   `fetchBills(key, start, end)`: Fluxo de transações de caixa (depósitos, saques, taxas) normalizado para `UnifiedBillRecord[]`.
*   `getOpenOrders(key)` e `getHistoryOrders(key, start, end)`: Varredura de ordens ativas e executadas/canceladas para `UnifiedOrder[]`.
*   `fetchInstrumentMetadata(symbol)`: Classificação pública de categoria de ativo (`UnifiedAssetCategory`).

Cada adaptador concreto encapsula internamente a montagem de cabeçalhos criptográficos e assinaturas HMAC-SHA256 específicas de cada exchange, eliminando redundâncias e removendo os antigos acoplamentos "God Object" (`RestClient` e `ExchangeAuth`).

### 4.2. Classe Abstrata Base (`BaseExchangeAdapter`)
Para mitigar falhas de assinatura HMAC decorrentes de desvios no relógio local do usuário (Clock Skew), todas as implementações concretas herdam de `BaseExchangeAdapter` (em `src/services/adapters/BaseExchangeAdapter.ts`).
*   **Time Synchronization Engine:** Realiza chamadas periódicas e otimizadas (throttling de 5 minutos) para os endpoints públicos de relógio das corretoras (`/api/v5/public/time` na OKX, `/v5/market/time` na Bybit, etc.).
*   **Offset Calculation:** Calcula o diferencial (`timeOffset = serverTime - localTime`) e armazena estaticamente na classe. Ao assinar requisições REST ou WebSocket, os adaptadores usam `Date.now() + this.timeOffset` garantindo tolerância sub-segundo à rejeição de requisições por timestamp expirado (e.g., Bybit `recvWindow` < 5000ms).

### 4.3. Estruturas Concretas de Adapters
1.  **BybitAdapter (`BybitAdapter.ts`):** 
    *   Trabalha com a API Bybit V5 (Unified Trading Account).
    *   Funde transações lineares (USDT/USDC) e inversas (settled em moedas).
    *   Implementa o *Short-Polling de MarkPrice* de forma coordenada (no `useMultiExchangeWS`), superando a restrição da Bybit de não enviar push de MarkPrice/UPL ativo em conexões websockets privadas padrão.
2.  **OkxAdapter (`OkxAdapter.ts`):**
    *   Consome a API OKX V5.
    *   Funde dados históricos de posições e ordens (regular de 7 dias e arquivos históricos de 90 dias) simultaneamente, removendo duplicatas de IDs e tratando paginações baseadas em cursors temporais (`uTime` descendente via cursor `after`).
    *   Distingue contas cross e isolated convertendo parâmetros como `imr` (Cross Margin) e `margin` (Isolated Margin) de forma coesa.
3.  **BitgetAdapter (`BitgetAdapter.ts`):**
    *   Utiliza a API Bitget V2.
    *   Mapeia o histórico de posições fechadas de forma resiliente usando propriedades alternativas como `openAvgPrice || openPriceAvg` para evitar campos vazios ou zerados que comprometiam o cálculo de ROI.
    *   Normaliza ordens ativas e fechadas de forma direta em moedas, sem multiplicadores de contrato, calculando estimativas precisas de USD (Notional Value) a partir do `quoteVolume` ou `qty * price`.

### 4.4. Camada de Unificadores (`src/utils/`)
Para unificar a aritmética complexa de derivativos lineares e inversos e metadados visuais, a aplicação dispõe de utilitários isolados:
*   **`unifiers.ts`**: Resolve extrações de `baseCoin` e `quoteCoin` a partir de tickers proprietários de cada corretora (ex: limpa sufixos de swap, margem ou contratos). Mapeia direções (`buy`, `sell`, `long`, `short`, `net`) e modos de margem (`cross`, `isolated`).
*   **`inverseUtils.ts` (`getOpenPositionSizeAndValue` & `getHistoryPositionSizeAndValue`)**: Resolve o maior desafio analítico do sistema: o comportamento oposto de dimensionamento matemático em contratos inversos (Coin-Margined) vs lineares (USDT/USDC-Margined).
    *   *Bybit Inversa:* O campo `size` representa o montante em USD, e o tamanho em cripto (base size) é calculado dividindo `cumEntryValue` por `entryPrice`.
    *   *Bybit Linear:* O campo `size` representa a quantidade em cripto diretamente, e o valor em USD é derivado de `cumEntryValue`.
    *   *Bitget Inversa:* Multiplica as quantidades brutas de contratos pela constante de valor contratual (`getBitgetInverseContractVal`) para se obter o tamanho real na moeda básica.
*   **`instrumentTypeMapper.ts`**: Mapeia categorias obscuras das exchanges para o Enum forte `UnifiedInstrumentType` (SPOT, PERP, INVERSE, FUTURES, OPTION).

### 4.5. Detalhamento de Interfaces Unificadas

Para garantir total previsibilidade de tipos em tempo de compilação sem abdicar da rastreabilidade dos dados originais enviados pelas corretoras, as interfaces do CPM possuem a seguinte estrutura rigorosamente tipada (definida em `src/types.ts` e `src/types/raw.ts`):

- **`UnifiedBalance` (Saldos e Ativos):**
  - **Função:** Captura as fatias patrimoniais, saldos livres e congelados por ativo.
  - **Atributos Principais:** `id`, `connectionId`, `exchange`, `label`, `ccy`, `amount`, `usdValue`, `totalEquity`, `walletBalance`, `availableMargin`, `unrealizedPnl`.
  - **Tipo de Dados Brutos (`raw`):** Tipado estritamente como `RawBalanceItem`.
  - **Peculiaridade OKX:** Como a OKX possui contas isoladas de negociação (Unified Account) e financiamento (Funding Account), o `OkxAdapter` executa duas requisições paralelas: `/api/v5/account/balance` e `/api/v5/asset/balances`. Os saldos de Funding são valorizados com base no preço de mercado extraído das posições ativas ou fallbacks de moedas pareadas, somados ao patrimônio total e marcados na UI sob a tag visual `FUNDING`, enquanto os saldos de negociação recebem a tag `UNIFIED`.

- **`UnifiedPosition` (Posições Ativas de Futuros):**
  - **Função:** Representa posições direcionais em aberto, margens, preços de marcação e PnL flutuante.
  - **Atributos Principais:** `id`, `symbol`, `baseCoin`, `quoteCoin`, `side` (`long | short | net`), `size`, `notionalUsd`, `entryPrice`, `markPrice`, `unrealizedPnl`, `realizedPnl`, `leverage`, `marginMode`, `margin`, `liquidationPrice`, `roe`.
  - **Tipo de Dados Brutos (`raw`):** Tipado estritamente como `RawPositionData`.

- **`UnifiedHistoryPosition` (Histórico de Posições Fechadas):**
  - **Função:** Fornece o livro contábil definitivo de posições encerradas, com taxas e funding acumulados para cálculos de PnL por símbolo.
  - **Atributos Principais:** `id`, `symbol`, `baseCoin`, `quoteCoin`, `side`, `realizedPnl`, `closedPnl`, `closeUpdateTime`, `createdTime`, `entryPrice`, `closePrice`, `size`, `fundingFee`, `tradingFee`, `leverage`, `notionalUsd`, `roi`.
  - **Tipo de Dados Brutos (`raw`):** Tipado estritamente como `RawHistoryPositionData`.

- **`UnifiedOrder` (Histórico de Ordens e Ordens Abertas):**
  - **Função:** Normaliza ordens limit, market, trigger-orders, tp/sl ativas e executadas.
  - **Atributos Principais:** `id`, `exchangeOrderId`, `connectionId`, `symbol`, `category`, `side`, `type`, `status`, `price`, `avgPrice`, `qty`, `filledQty`, `value`, `triggerPrice`, `createdTime`, `updatedTime`.
  - **Tipo de Dados Brutos (`raw`):** Tipado estritamente como `RawOrderData`.

## 5. Data Flow and Synchronization

O Crypto Portfolio Manager opera uma via de sincronização otimizada projetada para garantir performance fluida com baixo overhead de rede e sem atingir rate-limits agressivos (HTTP 429).

### 5.1. Engine de Sincronização e Cache SWR (Stale-While-Revalidate)

```
[UI Components] 
       │
       ├─► (Immediate Load) ──► [IndexedDB History Cache] (crypto-dashboard-cache)
       │                              ▲
       └─► (Trigger Polling) ──┐      │ (Save/Merge Deltas)
                               ▼      │
                      [ExchangeAggregator]
                               │
                       (CORS proxyFetch)
                               │
                               ▼
                    [Exchanges API REST]
```

Para contornar as severas restrições de chamadas consecutivas impostas por Bybit, OKX e Bitget, o sistema implementa um ecossistema de caching híbrido:
1.  **Carregamento Imediato via IndexedDB:** No momento de montagem de telas como Analytics e Relatórios de Histórico, os Hooks principais (`usePositionHistory`, `useOrderReports`) lêem instantaneamente o dataset persistido localmente no IndexedDB (`crypto-dashboard-cache`). O usuário visualiza gráficos e tabelas com latência zero.
2.  **Sincronização em Segundo Plano (Background Delta Fetching):** Silenciosamente, o hook dispara chamadas REST incrementais. Ele recupera apenas os registros mais recentes (deltas) criados após o último timestamp cacheado. Esses deltas são mesclados diretamente na base local e a UI re-renderiza fluidamente.
3.  **Coordenação Global de Sincronização (`lastSyncTime`):** A fim de evitar disparos redundantes de requisições concorrentes, o estado global de sincronização é coordenado no `useSettingsStore` via `lastSyncTime`. Se o usuário alternar entre as abas de Histórico de Ordens, Histórico de Posições Fechadas e PnL por Símbolo, o sistema verifica se uma sincronização recente já ocorreu globalmente. Em caso positivo, o fetch externo é travado e o cache local é reaproveitado na totalidade.
4.  **Simulation Mode (Mock Data) Guards:** Quando o modo de simulação está ativo, botões de sincronização manual são visualmente desativados no header com alertas claros, prevenindo requisições acidentais a chaves reais e garantindo integridade visual constante das simulações.

### 5.2. WebSockets (Isolated Diagnostic API Tester)
1. WebSocket technology is completely isolated from the main dashboard views and runs strictly within the **API Tester** screen to verify API keys connectivity, latency, and real-time streaming health.
2. Browser opens WebSockets for diagnostic validation:
   - `wss://ws.okx.com:8443/ws/v5/private`
   - `wss://ws.bitget.com/v2/ws/private`
   - `wss://stream.bybit.com/v5/private`
3. `src/services/adapters/BybitAdapter.ts`, `OkxAdapter.ts`, and `BitgetAdapter.ts` provide static helper routines to sign authorization payloads.
4. During testing, the WebSocket establishes connection, logs handshakes directly to the local connection log database, and safely tears down on screen exit to prevent memory leaks and redundant threads.

### 5.3. REST API (Initial Snapshots & Historical Logs & caching)
1. Fetching historical data requires specific `GET` requests via the Orchestrator/Factory services (`PositionHistoryService` and `BillsHistoryService`).
2. The orchestrator delegates the request to the specific `IExchangeAdapter` (e.g. `BybitAdapter`, `OkxAdapter`).
3. The adapter generates signatures and HTTP headers for the specific Timestamp + Endpoint path.
4. The adapter sends requests to the local backend proxy at `/api/proxy` via `hybridFetch`.
5. Express Proxy forwards to the authentic endpoint (`api.bitget.com`, `api.bybit.com`, etc.) and streams the data back.
6. The adapter parses and normalizes the Raw API response into the unified format (`UnifiedHistoryPosition`, `UnifiedBillRecord`).
7. **Local Caching & SWR (Stale-While-Revalidate):** To bypass aggressive exchange rate limits and decouple UI analytics delays from network latency, historical operations query a robust **IndexedDB Database** (`crypto-dashboard-cache`).
   - Hooks like `usePositionHistory` and `useOrderReports` implement a strict **SWR (Stale-While-Revalidate)** pattern: they immediately load and render stale cached data from IndexedDB (Step 1), then trigger a background incremental fetch to exchanges (Step 2) that seamlessly pulls delta records, updates the cache, and re-renders the UI with the freshest data.
   - A periodic background synchronization task (`useHistoryCachePolling`) continuously keeps the cache warm based on user-defined intervals.
   - *Note:* `useBillsHistory` handles highly mutable deposit/withdrawal/transfer logs and thus bypasses IndexedDB, fetching directly from the Live APIs to ensure transactional accuracy.

### 5.4. Transaction Log Sync Engines (Bybit, Bitget, OKX)

O CPM possui engines dedicadas para auditoria profunda de transações e fluxo de caixa (cash flow / PnL real) para as três principais exchanges integradas:

#### 5.4.1. Bybit Transaction Log Sync Engine
- **Endpoint:** `GET /v5/account/transaction-log` (UTA).
- **Progressive Deep Sync:** `useBybitTransactionSync` realiza backfill progressivo em chunks de 7 dias pelas categorias linear, inverse e spot.
- **Stores IndexedDB:** `bybit-transaction-log` e `bybit-transaction-meta`.
- **Serviço:** `BybitTransactionService` encapsula paginação, rate-limiting, retry e agregação.

#### 5.4.2. Bitget Transaction Log Sync Engine
- **Endpoints:** Suporte híbrido tanto para contas Classic (Mix/Futures `GET /api/v2/mix/account/bill` e Spot/Account `GET /api/v2/spot/account/bills`) quanto para contas UTA (`GET /api/v2/user/bills-record`).
- **Progressive Deep Sync:** `useBitgetTransactionSync` realiza backfill progressivo com paginação baseada em timestamps e ID cursors (`lastEndId`).
- **Stores IndexedDB:** `bitget-transaction-log` (índices: `by-connectionId`, `by-transactionTime`, `by-symbol`, `by-type`, `by-currency`, `by-category`) e `bitget-transaction-meta`.
- **Serviço:** `BitgetTransactionService` encapsula a paginação, filtragem, agrupamento de moedas estáveis vs não estáveis e métricas de ROI e Cash Flow.

#### 5.4.3. OKX Transaction Log Sync Engine
- **Endpoints:** `GET /api/v5/account/bills` (últimos 7 dias) e `GET /api/v5/account/bills-archive` (até 3 meses).
- **Progressive Deep Sync:** `useOkxTransactionSync` varre períodos de 7 dias com paginação via cursors `after` (`billId`), garantindo deduplicação automática no IndexedDB.
- **Stores IndexedDB:** `okx-transaction-log` (índices: `by-connectionId`, `by-transactionTime`, `by-symbol`, `by-type`, `by-currency`, `by-category`) e `okx-transaction-meta`.
- **Serviço:** `OkxTransactionService` normaliza as dezenas de códigos de tipos e subtipos da OKX, calculando variações patrimoniais (`balChg`), PnL e taxas.

```
[ExchangeTransactions.tsx] ← [useExchangeTransactions] ← [ExchangeTransactionService]
       │                                │                                │
       │ (instant load)                 │ (SWR cache)                   ├─ syncAll() [deep sync]
       │ (filters in memo)              │ (stats in memo)               ├─ syncIncremental()
       │ (export / pagination)          │                                ├─ filterEntries()
       │                                │                                └─ computeStats()
       │                          [IndexedDB]                 [ExchangeAdapter.getTransactionLog]
       │                    exchange-transaction-log                     │
       │                    exchange-transaction-meta             [hybridFetch → /api/proxy]
       │                                                             [Exchange REST API]
```

### 5.5. Funding Sync Engine

O módulo de **Funding Rates** possui sua própria engine de sincronização dedicada, operando com uma arquitetura **aggregation-first** que substituiu o antigo pipeline de registros brutos no IndexedDB.

```
useFundingSync (singleton — module-level locks)
├── fetchCurrentRates() → 3 exchanges, sequential
│     FundingService.fetchCurrentFundingRates(exchange)
│     ├── Bybit:  /v5/market/tickers
│     ├── Bitget:  /api/v2/mix/market/current-fund-rate
│     └── OKX:     /api/v5/public/funding-rate
│
├── scheduleNextAutoSync() → setTimeout
│     nearestFutureFundingTime + 60s → dispatch 'funding-cache-cleared'
│
└── syncHistoricalRates(rates)
    └── Promise.all [parallel exchanges]
        └── syncExchange(exchange, rates, now)
              ├── getFundingMeta() [freshness guard: 8h]
              └── asyncPool(staleSymbols, CONCURRENCY[xchg])
                    └── FundingService.fetchAndAggregateSummary()
                          ├── fetch raw records (pagination)
                          ├── Big.js bucket accumulation
                          └── return FundingRateSummary
              → Log per-exchange timing report
        → saveFundingSummariesBatch(allSummaries) [IndexedDB]
        → Persist performance data + schedule auto-sync
```

**Características principais:**
- **Agregação no serviço, não na UI:** `FundingService.fetchAndAggregateSummary()` faz fetch paginado das APIs e computa somatórios via Big.js, retornando um `FundingRateSummary` por exchange-symbol
- **Armazenamento compacto:** Apenas somatórios pré-calculados no IndexedDB (`funding-summaries` store), eliminando registros brutos individuais
- **Full recalculation:** Cada sync refaz o fetch completo das APIs e re-agrega (não há incremental fetch)
- **Parallel exchanges:** As 3 exchanges rodam em paralelo via `Promise.all`, cada uma com seu próprio `asyncPool` de concorrência (6/4/6)
- **Auto-sync inteligente:** Timer baseado no próximo funding time + 1 minuto, garantindo sync logo após cada pagamento de funding
- **Singleton locks:** Locks module-level (`syncInProgressRef`, `fetchingRef`, `restartRequestedRef`) previnem execução concorrente entre múltiplas instâncias do hook
- **Performance persistence:** Métricas de tempo por exchange e por ciclo são salvas no fundingStore + localStorage
- **ForceSync com restart:** Se o usuário pede um sync manual enquanto outro está rodando, o sync atual termina e um novo é iniciado automaticamente

**Locks mechanism:**
```typescript
// Module-level (fora do hook) — compartilhado entre todas as instâncias
const syncInProgressRef = { current: false };
const fetchingRef = { current: false };
const restartRequestedRef = { current: false };
```

**IndexedDB Schema Overview (DB_VERSION 12):**

A base local IndexedDB (`crypto-dashboard-cache`) consolida 14 object stores estruturadas:

| Store Name | Key Path | Indexes | Descrição |
|---|---|---|---|
| `positionHistory` | `id` | `by-connectionId`, `by-closeUpdateTime` | Histórico de posições fechadas normalizado (`UnifiedHistoryPosition`) |
| `cacheMeta` | `connectionId` | — | Metadados de sincronização e último timestamp de histórico de posições |
| `assetMetadata` | `id` (`exchange_symbol`) | — | Metadados e categorização pública de ativos (`UnifiedAssetCategory`) |
| `orderHistory` | `id` | `by-connectionId`, `by-createdTime` | Histórico de ordens fechadas/canceladas (`UnifiedOrder`) |
| `orderCacheMeta` | `connectionId` | — | Metadados de sincronização do histórico de ordens |
| `bybitRealPnL` | `id` (`connectionId-period`) | — | PnL realizado consolidado por período da Bybit |
| `bybit-transaction-log` | `id` | `by-connectionId`, `by-transactionTime`, `by-symbol`, `by-type`, `by-currency`, `by-category` | Extrato transacional bruto normalizado da Bybit (`BybitTransactionLogEntry`) |
| `bybit-transaction-meta` | `connectionId` | — | Metadados de sincronização e checkpoint do Transaction Log Bybit |
| `bitget-transaction-log` | `id` | `by-connectionId`, `by-transactionTime`, `by-symbol`, `by-type`, `by-currency`, `by-category` | Extrato transacional bruto normalizado da Bitget (`BitgetTransactionLogEntry`) |
| `bitget-transaction-meta` | `connectionId` | — | Metadados de sincronização e checkpoint do Transaction Log Bitget |
| `okx-transaction-log` | `id` | `by-connectionId`, `by-transactionTime`, `by-symbol`, `by-type`, `by-currency`, `by-category` | Extrato transacional bruto normalizado da OKX (`OkxTransactionLogEntry`) |
| `okx-transaction-meta` | `connectionId` | — | Metadados de sincronização e checkpoint do Transaction Log OKX |
| `funding-summaries` | `id` (`exchange-symbol`) | `by-exchange`, `by-symbol` | Somatórios e agregações pré-calculadas de taxas de financiamento (`FundingRateSummary`) |
| `funding-meta` | `id` (`exchange-symbol`) | `by-exchange` | Metadados de cobertura e guardião de frescor (8h) para funding rates |

## 6. State Management & Micro-Stores Architecture

O CPM adota uma arquitetura de micro-stores modularizadas com Zustand 5.0 para garantir isolamento de responsabilidades, alta coesão e evitar renderizações em cascata:

- **`useApiKeysStore` (Zero-Trust Security):** 
  - Mantém e persiste as credenciais de API (`id`, `exchange`, `apiKey`, `apiSecret`, `passphrase`, `label`, `isActive`).
  - Suporta criptografia nativa no navegador via **Web Crypto API (PBKDF2 + AES-GCM 256-bit)** com passphrase master opcional, bloqueando o acesso sem senha e apresentando o `GlobalUnlockScreen`.
  - Persistência automática no `localStorage`.
- **`useConnectionStore`:**
  - Gerencia o status de conectividade em tempo real para cada chave de API (`'connecting' | 'connected' | 'disconnected' | 'error'`) e mensagens de erro de bootload.
- **`useBalancesStore`:**
  - Armazena as fatias de saldo de conta (`UnifiedBalance[]`) segmentadas por ID de conexão.
  - Utilizado pelo `ExchangeHierarchyTable`, `Dashboard` e `HedgeProDashboard` para consolidação patrimonial.
- **`usePositionsStore`:**
  - Gerencia as posições abertas e ativas (`UnifiedPosition[]`) recuperadas das exchanges em ciclos de polling.
- **`useOrdersStore`:**
  - Gerencia as ordens ativas e abertas (`UnifiedOrder[]`) para cada conexão ativa.
- **`useSyncCoordinatorStore`:**
  - Coordenador de sincronização em memória que compartilha snapshots de cache e timestamps de sincronização entre as visões de Histórico de Posições, PnL por Símbolo, Relatórios de Ordens e Bybit Transactions, evitando múltiplos fetches concorrentes durante a navegação entre abas.
- **`useLogStore`:**
  - Terminal de logs do sistema em tempo real com severidades (`INFO`, `WARN`, `ERROR`, `DATA`, `SYSTEM`) e retenção de até 10.000 entradas em memória.
- **`useFundingStore`:**
  - Gerencia o estado do módulo de Funding Rates: `currentRates` (taxas ao vivo), `isSyncing`/`syncProgress`/`syncMessage` (status de sincronização), `favorites` (moedas favoritadas), `lastHistoryFetch` (timestamp do último sync), `lastSyncPerformance` (métricas de performance do último sync), `lastExchangeTimings` (timing por exchange), `nextFundingTime` (próximo pagamento de funding), `nextScheduledSyncTime` (próximo auto-sync agendado).
  - `favorites`, `lastHistoryFetch`, `lastSyncPerformance`, `lastExchangeTimings`, `nextFundingTime`, e `nextScheduledSyncTime` são persistidos no `localStorage` via middleware `persist`.
  - Campos transientes (`currentRates`, `isSyncing`, `syncProgress`, `syncMessage`) NÃO são persistidos.
- **`useSettingsStore`:** 
  - Gerencia configurações globais como `useMockData` (Modo Simulação), `pollingInterval` (intervalo de polling padrão das APIs REST, ex: 5s), `historyCacheInterval` (tempo para expiração do cache IndexedDB), `fundingPollingInterval` (polling de current funding rates), `fundingHistoryInterval` (intervalo mínimo entre syncs históricos de funding, range 4-8h), e `showWelcomeOnStartup`.
  - Persistido no `localStorage` do navegador.
- **`crossStoreCleanup.ts` (`clearConnectionData`):**
  - Utilitário centralizado de limpeza que desliga e limpa simultaneamente os dados de uma conexão específica através das stores de Balanço, Posição, e Conexão, garantindo integridade de dados ao desativar uma chave de API.
- **`useMockDataInjector`:**
  - Hook isolado e especializado (SRP) encarregado de injetar payloads mockados calibrados (`accounts.json`, `balances.json`, `positions.json`, `history.json`, `orders.json`, `funding.json`, `bybit-transactions.json`, `bills.json`) quando o Modo Simulação estiver ativo.
- **`PrivacyContext`:** 
  - Context API nativo que envelopa a aplicação para controlar a visibilidade (`isPrivateMode`) de valores monetários sensíveis em todas as tabelas e cards, persistindo a escolha no `localStorage`.

## 7. Application Views & Navigation Modules

A aplicação estrutura seus módulos funcionais através da `Sidebar` responsiva:

1. **Dashboard (`Dashboard.tsx`):** Visão executiva consolidada com métricas de patrimônio total (Equity), margens utilizadas, PnL flutuante diário, distribuição por exchange e tabela hierárquica de contas/moedas.
2. **Positions (`OpenPositions.tsx` & `ClosedPositions.tsx`):** Posições em aberto com cálculo de ROE, alavancagem, preço de liquidação, margem e histórico contábil de posições fechadas.
3. **Analytics:**
   - **PnL by Symbol (`PnLBySymbol.tsx`):** Lucro e prejuízo consolidado por ativo negociado (Long vs Short).
   - **Bybit Transactions (`BybitTransactions.tsx`):** Auditoria profunda do transaction log da Bybit com cálculo de PnL real (`cashFlow + funding - fee`).
   - **Bitget Transactions (`BitgetTransactions.tsx`):** Auditoria profunda do extrato transacional da Bitget (Classic e UTA) com categorização, taxas e PnL por símbolo.
   - **OKX Transactions (`OkxTransactions.tsx`):** Auditoria profunda do extrato financeiro da OKX (`bills` e `bills-archive`) com normalização de tipos/subtipos e balanço patrimonial.
   - **Funding Fees (`FundingDashboard.tsx`):** Monitoramento em tempo real e agregação histórica multissímbolo de taxas de financiamento.
   - **Hedge Pro (`HedgeProDashboard.tsx`):** Painel de gestão de risco e monitoramento de exposição protegida, exposta e alavancada para estratégias Delta Neutral em contratos inversos (COIN-M).
4. **Reports & Orders (`ReportsDashboard.tsx`, `OpenOrders.tsx`, `OrderHistory.tsx`, `TradeHistory.tsx`):** Relatórios de execução de ordens ativas, histórico de trades e extratos de fluxo de caixa (depósitos e saques).
5. **System & Diagnostic (`ApiKeys.tsx`, `ConnectionLogTerminal.tsx`, `Settings.tsx`, `ApiTester.tsx`):** Gerenciamento de chaves, auditoria de conexões WebSocket isoladas, configurações de rede/cache e terminal de logs.

## 8. Mocks, Types & Schema Consistency Protocol
It is mandatory to uphold strict synchronization across the entire stack when modifying unified interfaces (e.g., `UnifiedHistoryPosition`, `UnifiedPosition`, `UnifiedBalance`).

If a property name or data type is altered (e.g., changing `closeTime` to `closeUpdateTime`), developers MUST systematically update:
1. **Mock Generators:** Update scripts like `src/mock/generateMocks.js` and regenerated mock files (`src/mock/history.json`) to reflect the new keys. Use `npm run generate-mocks` (or `tsx src/mock/generateMocks.js`) to regenerate the JSON files.
2. **IndexedDB Schemas:** Increment the `DB_VERSION` in caching layers (e.g., `src/services/historyCache.ts`), and update upgrade routines (`db.createIndex`, `transaction.objectStore(...)`) to index the new property names correctly.
3. **Analytics & Hooks:** Check and update any localized sorting/filtering logic within hooks (e.g., `usePositionHistory`, `usePnLBySymbol`) that map over historical data, ensuring they use the newly established property names.
4. **Validation:** Always test the app with `useMockData = true` temporarily, to ensure no blank charts or infinite loops occur due to mismatched properties before deploying.