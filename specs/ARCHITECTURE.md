# Technical Specifications & Architecture Design

> **Document Version:** 2.16.0  
> **Status:** Production-Ready & Verified  
> **Test Coverage:** 65 test files, 660 passing tests (Vitest v8)

---

## 1. Purpose (O Porquê)
O **Crypto Portfolio Manager (CPM)** soluciona o problema de fragmentação de informações no trading e gestão de carteiras de criptomoedas. Ele consolida, em tempo real, saldos de carteiras, histórico contábil de transações, métricas de hedge delta-neutral, taxas de financiamento (funding rates) e posições de derivativos de três exchanges isoladas (**Bitget**, **Bybit**, **OKX**) sob uma interface de "painel único de vidro" (Single Pane of Glass).

O objetivo central é fornecer velocidade analítica extrema, inteligência quantitativa (incluindo o assistente e auditor **PIKA**) e uma postura de segurança **Zero-Trust**: as credenciais de API do usuário nunca são armazenadas em servidores terceiros, operando estritamente de forma local no navegador.

---

## 2. System Architecture (Hybrid-Proxy Client)
O CPM adota uma arquitetura em duas camadas (2-Tier Local Hybrid-Proxy) projetada para superar as restrições de CORS impostas pelos navegadores sem comprometer o isolamento de segredos:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Tier 1: Client-Side (React 19 / Vite)                │
│                                                                        │
│  [UI Components & Views] ◄──► [Zustand 5 Micro-Stores]                 │
│             │                           │                              │
│             ├─► [Web Crypto API] ───────┼─► (Local Key Encryption)     │
│             │   (PBKDF2 + AES-GCM)      │                              │
│             ├─► [IndexedDB SWR Cache] ──┴─► (14 Object Stores)         │
│             │   (crypto-dashboard-cache)                               │
│             ├─► [PIKA AI Subsystem] ────► (Ollama / Gemini / 9 Tools)  │
│             │                                                          │
│             └─► [BaseExchangeAdapter] (Client-side HMAC-SHA256 Sign)   │
│                       │                                                │
│                       ▼ (Pre-signed Headers + Body)                    │
└───────────────────────┼────────────────────────────────────────────────┘
                        │ hybridFetch (Client direct or /api/proxy)
                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Tier 2: Backend "Dumb" Relay (Express / Serverless)       │
│                                                                        │
│   Node.js / Express Proxy (`server.ts` & Vercel `/api/proxy.ts`)       │
│   • SSRF Protection: Rigorous Domain Allowlist Validation              │
│   • Zero-Knowledge: Forwards pre-signed headers without tampering      │
│   • Zero-Storage: Never persists secrets, logs, or payload bodies      │
└───────────────────────┼────────────────────────────────────────────────┘
                        │
                        ▼ (Official REST Endpoints)
             ┌──────────┴──────────┐
             ▼                     ▼
     [Bybit V5 UTA]         [OKX V5 API]
     [api.bybit.com]        [api.okx.com]
     [bybit.nl / etc]              ▼
                            [Bitget V2 API]
                            [api.bitget.com]
```

- **Tier 1: Client-Side (React 19 / Vite / TypeScript):**
  - Gerencia toda a UI, renderizações reativas, micro-stores (Zustand 5.0), polling REST, e criptografia nativa no navegador (`window.crypto.subtle`).
  - Credenciais de API residem exclusivamente em `localStorage`, protegidas por senha mestra com PBKDF2 (100.000 iterações) e AES-GCM 256-bit.
  - Conexões WebSockets de dados sensíveis são excluídas do painel operacional, operando apenas de forma pontual e isolada na ferramenta de diagnóstico **API Tester**.
- **Tier 2: Backend "Dumb" Relay (`server.ts` & Vercel Serverless `/api/proxy.ts`):**
  - Servidor mínimo e estático em Node.js/Express cuja única função é atuar como relé para contornar o bloqueio de CORS dos navegadores.
  - Não armazena nem processa segredos: recebe cabeçalhos criptográficos já montados e assinados na ponta do cliente, repassando-os de forma transparente para os endpoints oficiais das corretoras.
  - Valida rigorosamente os domínios de destino contra uma allowlist estrita para prevenir vulnerabilidades de SSRF.

---

## 3. Tech Stack & Dependency Risk Graph

- **Core Framework & Runtime:** React 19, TypeScript ~5.8, Vite 6, Node.js LTS (engines `>=24`).
- **Styling & UI Engine:** Tailwind CSS v4, Lucide React (ícones), Radix UI (Tooltips acessíveis).
- **State Management:** Zustand 5.0 (arquitetura desacoplada de micro-stores com persistência local).
- **Data Caching & Persistence:** IndexedDB nativo via biblioteca `idb` 8.0, com SWR (Stale-While-Revalidate) e versionamento de banco (`DB_VERSION 12`).
- **Precision Math:** Big.js para cálculos financeiros de alta sensibilidade (evita perdas de precisão por ponto flutuante em taxas de funding e ratios de hedge).
- **AI Subsystem:** `@google/genai` (v1.29.0) para integração direta com Gemini Cloud, client REST nativo para Ollama local (`localhost:11434`), `react-markdown` e `remark-gfm` para formatação rica de respostas.
- **Reporting & Charts:** Recharts 3.8 (gráficos interativos de Open Interest, CVD, Hedge Pro e Telemetria de IA), jsPDF + jsPDF-AutoTable (exportação visual de PDFs), SheetJS `xlsx` (exportação de planilhas).
- **Test Automation:** Vitest 4.1 com jsdom e `@testing-library/react`. Cobertura contínua com **56 arquivos de teste e 604 testes unitários automatizados**.

---

## 4. Normalization Layer & Exchange Adapters

O CPM adota o **Padrão Adapter** associado a um orquestrador centralizador (`ExchangeAggregator.ts`). Essa camada isola a heterogeneidade das APIs das corretoras e garante a aderência estrita aos princípios SOLID (especialmente SRP e Open/Closed Principle).

### 4.1. Interface Unificada (`IExchangeAdapter`)
Localizada em `src/services/adapters/IExchangeAdapter.ts`, dita o contrato formal exigido para cada corretora integrada:
- `fetchAndNormalize(key, start, end)`: Recuperação e normalização de posições fechadas (`UnifiedHistoryPosition[]`).
- `fetchBills(key, start, end)`: Recuperação do fluxo de caixa e depósitos/saques (`UnifiedBillRecord[]`).
- `getOpenOrders(key)` & `getHistoryOrders(key, start, end)`: Normalização de ordens ativas e executadas (`UnifiedOrder[]`).
- `fetchInstrumentMetadata(symbol)`: Classificação de tipo de instrumento e base/quote.

### 4.2. Base Abstrata e Tolerância a Clock Skew (`BaseExchangeAdapter`)
Todas as implementações concretas herdam de `BaseExchangeAdapter` (`src/services/adapters/BaseExchangeAdapter.ts`):
- **Time Synchronization Engine:** Dispara chamadas de sincronização com throttling de 5 minutos aos endpoints públicos das corretoras (`/api/v5/public/time` na OKX, `/v5/market/time` na Bybit, `/api/v2/public/time` na Bitget).
- **Offset Calibration:** Calcula `timeOffset = serverTime - localTime`. Ao assinar payloads HMAC-SHA256, utiliza `Date.now() + this.timeOffset`, prevenindo rejeições por timestamp expirado (e.g. Bybit `recvWindow` < 5000ms).

### 4.3. Implementações Concretas de Adaptadores
1. **BybitAdapter (`BybitAdapter.ts`):**
   - Consome a API Bybit V5 Unified Trading Account (UTA).
   - Unifica posições lineares (USDT/USDC) e inversas (settled na moeda base).
   - Suporte a múltiplos ambientes (Mainnet e Testnet) e domínios regionais dedicados (`bybitEndpoints.ts`): Holanda (`api.bybit.nl`), Turquia (`api.bybit-tr.com`), Hong Kong (`api.bybit.com.hk`), Cazaquistão, Geórgia e injeção automática de cabeçalhos de conformidade para contas internacionais do Brasil (`x-site-id: 10001`) e Argentina (`x-site-id: 10002`).
   - Short-Polling coordenado de MarkPrice e PnL não realizado no `useMultiExchangeWS`.
2. **BitgetClassicAdapter & BitgetUTAAdapter (`BitgetClassicAdapter.ts`, `BitgetUTAAdapter.ts`, `BitgetAdapter.ts`):**
   - **BitgetClassicAdapter:** Opera no ecossistema clássico de carteiras segregadas da Bitget (Mix/Futures via `/api/v2/mix/account/bill` e Spot via `/api/v2/spot/account/assets`).
   - **BitgetUTAAdapter:** Opera no novo modelo de conta unificada de trading da Bitget (`/api/v2/user/bills-record`).
   - **Precificação Dinâmica de Tokens:** Consulta em tempo real `/api/v2/spot/market/tickers` com cache de 60 segundos e fallback via proxy (`fetchTokenUsdPrice`), evitando avaliações incorretas de moedas mantidas na carteira de financiamento.
   - Suporte a seleção de subcontas (`isSubAccount`) e controle de inclusão da carteira de funding (`includeFunding`).
3. **OkxAdapter (`OkxAdapter.ts`):**
   - Consome a API OKX V5 com autenticação por chave, secret e passphrase.
   - **Dual-Wallet Engine:** Consulta simultânea da conta de trading (`/api/v5/account/balance`) e da carteira de funding (`/api/v5/asset/balances`), com avaliação patrimonial consolidada e tags visuais `UNIFIED` e `FUNDING`.
   - Paginação baseada em cursors temporais descendentes (`after` / `billId`).

### 4.4. Camada de Unificadores Matemáticos (`src/utils/`)
- `inverseUtils.ts`: Resolve a assimetria matemática de dimensionamento entre derivativos lineares e inversos:
  - *Bybit Inversa:* O campo `size` representa o montante em USD; o base size em cripto é derivado de `cumEntryValue / entryPrice`.
  - *Bybit Linear:* O campo `size` representa o montante em cripto; o notional em USD é `cumEntryValue`.
  - *Bitget Inversa:* Multiplica o número bruto de contratos pelo valor contratual (`getBitgetInverseContractVal`) para se obter a quantidade real na moeda base.
  - *OKX:* Escalonamento pelo multiplicador do contrato (`ctVal`).
- `instrumentTypeMapper.ts`: Converte categorias heterogêneas para o enum canônico `UnifiedInstrumentType` (`SPOT`, `PERP`, `INVERSE`, `FUTURES`, `OPTION`).
- `transactionTypeMapper.ts`: Classifica as transações brutas de Bybit, Bitget e OKX no padrão universal de 10 categorias (`UniversalTxType`).

---

## 5. Data Flow and Synchronization Engines

O CPM opera múltiplos mecanismos especializados de sincronização em segundo plano para garantir frescor de dados sem sobrecarregar as APIs das corretoras:

```
[UI Components]
       │
       ├─► (Instant Render via IndexedDB) ──► [crypto-dashboard-cache]
       │                                              ▲
       └─► (Incremental Delta Trigger) ────┐          │ (Merge & Save)
                                           ▼          │
                                   [UnifiedSyncManager]
                                           │
                                   [ExchangeAdapters]
                                           │
                                   (CORS proxyFetch)
                                           ▼
                                 [Official REST APIs]
```

### 5.1. Sincronização de Histórico (SWR & Coordenação Global)
- **SWR (Stale-While-Revalidate):** Na montagem das abas de histórico, os hooks (`usePositionHistory`, `useOrderReports`) leem instantaneamente o cache local do IndexedDB e iniciam requisições em segundo plano para capturar novos deltas.
- **Global Sync Coordination (`lastSyncTime`):** A navegação entre abas de histórico consulta o timestamp global de sincronização. Se uma sincronização foi concluída recentemente, fetches externos concorrentes são bloqueados.
- **Scroll Position Reset (`useLayoutEffect`):** Ao alternar de aba, o sistema reseta imediatamente a rolagem para o topo do documento, garantindo visualização ergonômica sem saltos visuais.

### 5.2. Transaction Log Sync Engines (Bybit, Bitget, OKX)
- **Progressive Deep Sync:** Cada exchange possui uma engine dedicada (`useBybitTransactionSync`, `useBitgetTransactionSync`, `useOkxTransactionSync`) que realiza o backfill estruturado do histórico em blocos de 7 dias, salvando checkpoints de progresso (`meta-stores`).
- **Sync Incremental:** Concluído o deep sync, requisições de baixa frequência buscam apenas eventos ocorridos após o último timestamp cacheado.
- **Sumário Executivo nos Modais (Total Stats Summary):** Modais de detalhes calculam em tempo real totais agregados de volume, taxas pagas e variação patrimonial do lote transacional.

### 5.3. Consolidated Net Change Aggregation Pipeline
- **Orquestração Cross-Exchange:** O hook `useConsolidatedTransactions` consome logs normalizados de Bybit, Bitget e OKX através da interface unificada.
- **Agregação Hierárquica:** O pipeline agrupa dados primariamente por Corretora (`exchange`) e secundariamente por Ativo (`currency`), computando somatórios de volume de trades, depósitos, saques, taxas e funding com precisão decimal via `Big.js`.
- **4 Macro KPI Cards:** Calcula os indicadores consolidados no topo do painel (*Total Transactions*, *Total Funding PnL*, *Total Transaction Fees*, *Consolidated Net Change*).
- **Exportação Multiformato:** Emissão de relatórios em CSV, Excel (.xlsx) e PDF diagramado com jsPDF-AutoTable.

### 5.4. Portfolio Performance Engine (`usePortfolioPerformance.ts`)
- **Pipeline Analítico Integrado:** Transforma os extratos contínuos de transações e saldos em um conjunto completo de métricas executivas de desempenho e risco:
  - *Balance Evolution & Cash Flow:* Curva dual de evolução patrimonial e variação líquida acumulada.
  - *Temporal Breakdown:* Decomposição de resultados por mês e por dia da semana (segunda a domingo).
  - *Price Milestone Analysis:* Amostragem de PnL por faixas/degraus de preço do ativo selecionado.
  - *Primary Results:* Capital Investido, Saldo Final, Resultado Bruto, Resultado Líquido, ROI Líquido %, Retorno Acumulado e Taxa Anualizada.
  - *Operations & Fees:* Contagem de transações, segregação de taxas (Trading vs Funding vs Transfers) e cálculo da Razão de Arrasto de Taxas (**Fee Drag Ratio**).
  - *Advanced Risk Metrics:* Profit Factor com classificação qualitativa, Win Rate diário e Índice de Consistência (desvio padronizado dos retornos diários).
- **Arquitetura de Alta Eficiência e Responsividade:**
  - Janela temporal padrão inicial de **7 dias** para cálculo instantâneo.
  - Downsampling inteligente limitando séries temporais a um máximo de **80 pontos**.
  - Animações SVG Recharts desativadas (`isAnimationActive={false}`) para renderização sem atraso.
  - Subscrições atômicas e granulares no Zustand para eliminar re-renderizações durante sincronizações de fundo.
  - Componentes memoizados (`React.memo`) em todas as 6 seções analíticas.

### 5.5. Funding Sync Engine (Aggregation-First)
- **Pré-Agregação no Serviço:** `FundingService.fetchAndAggregateSummary()` realiza o fetch completo das APIs de taxas de financiamento e pré-calcula os somatórios mensais e acumulados usando Big.js, persistindo apenas registros condensados (`FundingRateSummary`) na store `funding-summaries`.
- **Auto-Sync Inteligente:** O timer de atualização é automaticamente calculado para disparar em `nearestFutureFundingTime + 60s`, atualizando o painel imediatamente após o fechamento da janela de funding.
- **Singleton Locks:** Flags em memória (`syncInProgressRef`, `fetchingRef`, `restartRequestedRef`) previnem disparos concorrentes entre múltiplos componentes.

### 5.6. IndexedDB Schema Overview (DB_VERSION 12)
A base local IndexedDB (`crypto-dashboard-cache`) consolida 14 object stores:

| Store Name | Key Path | Índices | Finalidade |
|---|---|---|---|
| `positionHistory` | `id` | `by-connectionId`, `by-closeUpdateTime` | Histórico de posições fechadas normalizado |
| `cacheMeta` | `connectionId` | — | Metadados de checkpoint do histórico de posições |
| `assetMetadata` | `id` (`exchange_symbol`) | — | Metadados e categorização de instrumentos |
| `orderHistory` | `id` | `by-connectionId`, `by-createdTime` | Histórico de ordens executadas e canceladas |
| `orderCacheMeta` | `connectionId` | — | Metadados de checkpoint do histórico de ordens |
| `bybitRealPnL` | `id` (`connectionId-period`) | — | PnL realizado consolidado por período da Bybit |
| `bybit-transaction-log` | `id` | `by-connectionId`, `by-transactionTime`, `by-symbol`, `by-type`, `by-currency`, `by-category` | Extrato contábil bruto normalizado da Bybit |
| `bybit-transaction-meta` | `connectionId` | — | Checkpoint de sincronização Bybit |
| `bitget-transaction-log` | `id` | `by-connectionId`, `by-transactionTime`, `by-symbol`, `by-type`, `by-currency`, `by-category` | Extrato contábil bruto normalizado da Bitget |
| `bitget-transaction-meta` | `connectionId` | — | Checkpoint de sincronização Bitget |
| `okx-transaction-log` | `id` | `by-connectionId`, `by-transactionTime`, `by-symbol`, `by-type`, `by-currency`, `by-category` | Extrato contábil bruto normalizado da OKX |
| `okx-transaction-meta` | `connectionId` | — | Checkpoint de sincronização OKX |
| `funding-summaries` | `id` (`exchange-symbol`) | `by-exchange`, `by-symbol` | Agregações e somatórios pré-calculados de funding |
| `funding-meta` | `id` (`exchange-symbol`) | `by-exchange` | Metadados de cobertura e frescor de funding |

### 5.5. Armazenamento, Quota e Pruning Histórico (`storageQuota.ts`)
- **Monitoramento em Tempo Real:** Coleta periódica de ocupação via `navigator.storage.estimate()` exibindo espaço consumido e limite do navegador no card `IndexedDBCacheCard.tsx`.
- **Expurgo Seletivo sob Demanda (`pruneHistoryOlderThan`):** Janelas de retenção de 30d, 60d, 90d, 180d, 365d (padrão) e 730d. Remove transações e ordens antigas sem afetar o histórico recente ou os metadados das conexões.

### 5.6. Resiliência de Conexão e Fail-Fast Auth
- **Fail-Fast Incondicional:** Detecção estrita de falhas de credenciais (`isAuthError` analisando HTTP 401/403 e códigos proprietários das corretoras). Ao detectar erro de chave/secret/passphrase/IP, o sistema aborta imediatamente novas tentativas automáticas, protegendo o IP do usuário contra penalidades Cloudflare/Akamai.
- **Backoff Exponencial com Jitter:** Para quedas transitórias de rede ou erros 5xx, o escalonamento aplica intervalos de 5s $\to$ 10s $\to$ 20s $\to$ 40s $\to$ 60s com variação aleatória de jitter, limitado a 5 tentativas antes de acionar o circuit breaker.
- **Global Error Boundary:** Componente raiz que captura exceções não tratadas de renderização no React, oferecendo diagnóstico com stack trace e ações de recuperação rápida ("Reload Dashboard" e "Clear Cache & Reload").

---

## 6. PIKA AI Subsystem Architecture (v2.0+)

O **PIKA (Portfolio Information & Knowledge Assistant)** é um subsistema completo de inteligência analítica quantitativa integrado ao CPM:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PIKA AI Subsystem Architecture                  │
│                                                                        │
│   [UI: AiChatDrawer / AiPikaChatButton] ◄───► [useAiChatStore]         │
│                     │                                                  │
│                     ▼                                                  │
│             [aiAdapter.ts]                                             │
│                     │                                                  │
│         ┌───────────┴───────────┐                                      │
│         ▼                       ▼                                      │
│  [OllamaProvider]       [GeminiProvider]                               │
│  (Local REST 11434)     (@google/genai SDK)                            │
│         │                       │                                      │
│         └───────────┬───────────┘                                      │
│                     ▼                                                  │
│          [aiToolRegistry.ts]                                           │
│                     │ (Dispatches tool calls)                          │
│                     ▼                                                  │
│          [aiToolExecutors.ts] ──► Reads from Zustand Stores & IndexedDB │
│                     │                                                  │
│                     ├─► Privacy Mode Masking Applied                   │
│                     ├─► [aiAuditLogger.ts] ──► Records telemetry       │
│                     └─► Formatted Data Return to Model                 │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.1. Componentes Centrais
- **`aiAdapter.ts`:** Orquestrador desacoplado de provedores que abstrai a comunicação com LLMs, executando a lógica de failover e fallback de modelos.
- **`aiToolRegistry.ts` & `aiToolExecutors.ts`:** Registro centralizado de ferramentas em conformidade com o padrão JSON Schema de Function Calling. O executor acessa diretamente as micro-stores Zustand e os caches locais do IndexedDB para responder às consultas do modelo em tempo real.
- **`aiAuditLogger.ts`:** Registra cada interação (prompt, ferramentas disparadas, tempo de resposta, latência e payloads completos), permitindo auditoria detalhada e exportação em JSON ou CSV.
- **`aiRateLimiter.ts` & `aiErrorFormatter.ts`:** Controlam a frequência de chamadas e normalizam mensagens de erro das APIs de IA para formatos legíveis pelo usuário.
- **Mascaramento Automático no Modo Privacidade:** Se o usuário ativar o Modo Privacidade, o `aiToolExecutors.ts` transforma valores financeiros nominais em percentuais ou máscaras, garantindo que nenhum saldo absoluto seja vazado para prompts de IA.

---

## 7. State Management & Micro-Stores Architecture

O CPM implementa uma malha de micro-stores especializadas com Zustand 5.0:

1. **`useApiKeysStore`:** Armazena credenciais (`id`, `exchange`, `apiKey`, `apiSecret`, `passphrase`, `accountType`, `environment`, `bybitRegion`, `includeFunding`, `isSubAccount`, `isActive`). Gerencia o desbloqueio global e criptografia PBKDF2/AES-GCM.
2. **`useConnectionStore`:** Monitora o status das conexões em tempo real (`'connecting' | 'connected' | 'disconnected' | 'error'`).
3. **`useBalancesStore`:** Mantém os saldos normalizados (`UnifiedBalance[]`) com suporte a tags `UNIFIED` e `FUNDING`.
4. **`usePositionsStore`:** Mantém as posições ativas de futuros (`UnifiedPosition[]`).
5. **`useOrdersStore`:** Mantém ordens ativas e em aberto (`UnifiedOrder[]`).
6. **`useSyncCoordinatorStore`:** Coordenador em memória de timestamps e snapshots compartilhados de sincronização.
7. **`useFundingStore`:** Gerencia taxas ao vivo, somatórios agregados, favoritos, histórico e agendamento de auto-sync.
8. **`useMarketAnalyticsStore`:** Gerencia o estado de análise quantitativa cross-exchange (Open Interest, CVD, Arbitragem de Funding, Sentimento e Inverse Coin-M Dashboard).
9. **`useLogStore`:** Gerencia o terminal de logs com retenção em memória de até 10.000 entradas.
10. **`useAiSettingsStore`:** Configurações de provedores de IA (Ollama, Gemini, custom), modelos ativos e de fallback, e instruções de sistema.
11. **`useAiTelemetryStore`:** Telemetria de requisições de IA, contagem diária de tokens, latências e taxas de sucesso.
12. **`useAiChatStore`:** Histórico de conversas com o PIKA, sessões, drawer e status de execução de ferramentas.
13. **`useSettingsStore`:** Configurações globais do terminal (Modo Simulação, intervalos de polling, retenção de cache).
14. **`usePwaUpdateStore`:** Ciclo de vida do Service Worker do PWA e notificações de nova versão.

---

## 8. Application Views & Navigation Modules

- **Dashboard Principal (`Dashboard.tsx`):** Visão executiva de patrimônio, alocação e tabela hierárquica de carteiras.
- **Positions Ticker (`PositionsTicker.tsx`):** Marquee superior contínuo com cotações e PnL flutuante das posições abertas.
- **Hedge Pro (`HedgeProDashboard.tsx`):** Localizado no nível raiz da sidebar, monitora proteção e exposição Delta-Neutral em contratos inversos (COIN-M).
- **Positions (`OpenPositions.tsx` & `ClosedPositions.tsx`):** Posições abertas (Detailed & Lite) e histórico contábil de posições fechadas com estatísticas completas e exportações.
- **Orders (`OpenOrders.tsx` & `OrderHistory.tsx`):** Ordens abertas com visualização de gatilhos e histórico de ordens com regex.
- **Transactions History:**
  - **Consolidated Net Change (`ConsolidatedNetChangeReport.tsx`):** Painel executivo consolidado com 4 macro KPI cards, agrupamento hierárquico por Corretora e Moeda, e exportação multiformato.
  - **Corretoras Específicas (`BybitTransactions.tsx`, `BitgetTransactions.tsx`, `OkxTransactions.tsx`):** Extratos contábeis normalizados em 10 categorias universais e modais com Total Stats Summary.
- **Analytics:**
  - **Portfolio Performance (`PortfolioPerformanceDashboard.tsx`):** Painel no topo do submenu Analytics com evolução de balanço/resultado, análise temporal mensal e dia-a-dia, marcos de preço, resultados primários, análise de taxas e métricas de risco (Profit Factor, Win Rate, Consistency Index).
  - **Market Analytics (`MarketAnalyticsDashboard.tsx`):** Terminal quantitativo cross-exchange com regimes de mercado, arbitragem de funding, CVD e Inverse Coin-M Dashboard.
  - **PnL by Symbol (`PnLBySymbol.tsx`):** Distribuição de lucros e prejuízos por ativo com segregação Long vs Short.
  - **Funding Fees (`FundingDashboard.tsx`):** Monitoramento e comparação de taxas de financiamento multi-período.
- **Reports (`ReportsDashboard.tsx`):** Central de exportação de relatórios em PDF, Excel e CSV.
- **System Tools & Security (`ApiKeys.tsx`, `MandatoryVaultMigrationScreen.tsx`, `ConnectionLogTerminal.tsx`, `Settings.tsx`, `ApiTester.tsx`, `AiSettings.tsx`):** Gerenciamento seguro de credenciais, fluxo obrigatório de migração de vault, logs em tempo real, diagnósticos e parâmetros de IA.

---

## 9. Mocks, Types & Schema Consistency Protocol

Qualquer alteração em interfaces unificadas (`src/types.ts`) ou schemas de banco de dados deve obedecer ao protocolo rigoroso de sincronização:
1. **Mock Generators:** Atualizar `src/mock/generateMocks.js` e regenerar os arquivos mock em `src/mock/`.
2. **IndexedDB Versioning:** Incrementar `DB_VERSION` em `historyCache.ts` e registrar funções de migração para novos índices.
3. **TypeScript & Testes:** Executar `npm run lint` (`tsc --noEmit`) e `npm test` para assegurar que toda a suíte de testes unitários e de integração permaneça 100% verde.
4. **Validação em Modo Simulação:** Ativar temporariamente `useMockData = true` para verificar visualmente todos os painéis e gráficos antes do deploy.

---

*Crypto Portfolio Manager — Institutional Multi-Exchange Architecture & Zero-Trust Engineering (v2.16.0).*