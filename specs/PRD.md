# Crypto Portfolio Manager — Product Requirements Document (PRD)

> **Status:** Revisado — consolidado a partir do `README.md`, `specs/ARCHITECTURE.md`, `specs/EVOLUTION_TASKS.md` e `specs/unified-interfaces.md`
> **Versão:** 1.0
> **Produto:** Crypto Portfolio Manager (CPM) — Multi-Exchange Dashboard

---

## 1. Resumo Executivo

O **Crypto Portfolio Manager** resolve o problema de fragmentação de informações no trading de criptomoedas. Ele consolida, em tempo real, saldos de carteiras, histórico financeiro, ordens e posições de derivativos de **três exchanges** (Bitget, Bybit e OKX) sob uma interface de "painel único de vidro" (Single Pane of Glass).

O produto entrega velocidade analítica e uma postura de segurança **Zero-Trust**: as chaves de API do usuário **nunca** são armazenadas em servidores de terceiros, operando estritamente de forma local no navegador (`localStorage`), com toda a criptografia e assinatura HMAC-SHA256 executada na ponta do cliente via Web Crypto API.

## 2. Problema

Traders de criptomoedas que operam em múltiplas corretoras enfrentam:

1. **Fragmentação de dados:** saldos, posições e histórico dispersos em dashboards isolados de cada corretora (Bitget, Bybit, OKX).
2. **Impossibilidade de consolidação:** sem uma visão unificada de patrimônio, exposição e PnL em tempo real.
3. **Falta de auditoria contábil:** histórico de taxas, funding e PnL realizado espalhado em formatos proprietários de cada API.
4. **Risco de segurança:** armazenar chaves de API em servidores de terceiros expõe o usuário a vazamentos e uso indevido.

## 3. Objetivos do Produto

| Objetivo | Descrição |
|----------|-----------|
| **Consolidação em tempo real** | Unificar saldos, posições, ordens e histórico de Bitget, Bybit e OKX em uma única interface (REST Polling near real-time). |
| **Zero-Trust Security** | Manter todas as credenciais localmente no navegador; o backend atua apenas como proxy "burro" (sem conhecer segredos). |
| **Velocidade analítica** | Histórico com latência zero via cache local IndexedDB (padrão SWR — Stale-While-Revalidate). |
| **Auditoria contábil pessoal** | Extração rigorosa de taxas (Trading Fees), PnL Realizado e Funding Fees baseada em fluxo de caixa (cashflow). |
| **Escalabilidade de integração** | Adição de novas corretoras via camada de adaptadores (Strategy Pattern) sem impactar a UI. |

## 4. Público-Alvo e Personas

- **Trader individual (crypto):** opera contratos perpétuos e inversos em múltiplas exchanges e precisa de visão consolidada de patrimônio, exposição e PnL.
- **Operador de capital (hedger):** utiliza posições inversas (Coin-M) para proteção de capital e acompanha o indicador de Hedge.
- **Usuário que audita resultados:** precisa de relatórios contábeis (taxas, funding, PnL por símbolo) e exportação para PDF/Excel/CSV.
- **Desenvolvedor/testador:** usa o Modo Simulação (Mock Data) para testar a UI sem chaves reais.

## 5. Escopo

### 5.1. Suportado (In Scope)

- **Exchanges:** Bitget (API V2), Bybit (API V5 Unified Trading Account) e OKX (API V5).
- **Contas:** Spot, Futuros lineares (USDT-M/USDC-M) e Contratos Inversos (Coin-M).
- **OKX Dual-Wallet:** conta unificada de trading + conta de funding, com tags visuais `UNIFIED` e `FUNDING`.
- **Dados consolidados:** saldos, posições abertas, histórico de posições fechadas, ordens abertas/históricas, bills (depósitos/saques), funding rates e transaction log da Bybit.

### 5.2. Não Suportado (Out of Scope)

- Execução/ordens de trading dentro do produto (apenas leitura).
- Streaming WebSocket para dados sensíveis no dashboard principal (REST Polling apenas; WebSocket isolado no API Tester diagnóstico).
- Suporte a instrumentos spot/options no Funding Dashboard (apenas perpetual swaps USDT-M + COIN-M).
- OKX deep sync além de ~3 meses de histórico via API (limitação da própria OKX).
- Suporte a exchanges além de Bitget, Bybit e OKX.

## 6. Regras de Negócio

### 6.1. Segurança (Zero-Trust)

1. **Credenciais locais:** chaves de API (`apiKey`, `apiSecret`, `passphrase`, `label`, `isActive`) persistidas exclusivamente no `localStorage` do navegador, com criptografia opcional.
2. **Proxy inerte:** o backend (Node/Express + Serverless Vercel `/api/proxy`) recebe apenas URLs e headers **já assinados** pelo cliente, repassando sem adulterar assinaturas nem registrar logs sensíveis.
3. **Assinatura nativa:** HMAC-SHA256 e payloads (ISO Timestamp OKX, Nano Time Bitget, Hex Signatures Bybit) gerados com `window.crypto.subtle`.
4. **Allowlist anti-SSRF:** o proxy valida domínios oficiais das três exchanges (mitigação de SSRF/DoS).
5. **Time-Sync Engine:** cada adaptador sincroniza o relógio com o servidor da exchange (offset calculado, throttling de 5 min) para evitar rejeições por timestamp expirado (`recvWindow` < 5000ms na Bybit).
6. **Privacidade:** o Privacy Mode mascara todos os valores monetários com um clique (`$••••`), persistindo a preferência.

### 6.2. Consolidação e Normalização

1. **Camada de adaptadores:** toda resposta bruta das exchanges passa por adaptadores (`BybitAdapter`, `OkxAdapter`, `BitgetAdapter`) que implementam a interface `IExchangeAdapter` e normalizam para interfaces unificadas (`UnifiedBalance`, `UnifiedPosition`, `UnifiedHistoryPosition`, `UnifiedOrder`, `UnifiedBillRecord`).
2. **Tipagem estrita:** respostas brutas tipadas em `src/types/raw.ts` — proibido `any`/`Record<string, unknown>` no campo `raw` de dados sensíveis.
3. **Contratos inversos vs lineares:** o sistema distingue pares Fiat/Stablecoin (BTCUSDT) de Contratos Inversos Puros (BTCUSD), aplicando conversões centralizadas em `src/utils/inverseUtils.ts`:
   - **Bybit Inversa:** `size` = montante em USD; tamanho em cripto = `cumEntryValue`; notional USD = `size`.
   - **Bybit Linear:** `size` = quantidade em cripto; notional USD = `cumEntryValue`.
   - **Bitget Inversa:** tamanho = quantidade bruta de contratos × valor contratual (`getBitgetInverseContractVal`).
   - **OKX:** tamanho escalado pelo multiplicador de contrato (`ctVal`).
4. **Mapeamento de ordens da Bitget:** quantidade retornada na unidade da moeda (sem multiplicador); valor USD = `quoteVolume` ou `qty × price`.
5. **Classificador de ativos:** `AssetClassifierAggregator` classifica ativos como `CRYPTO` ou `STOCK` usando listagens das APIs das exchanges, com hierarquia de cache em 4 níveis (em-memória → IndexedDB → API ao vivo → fallback).
6. **Cálculos com precisão:** todos os cálculos financeiros críticos usam **Big.js** (sem floats nativos).

### 6.3. Sincronização e Cache (Histórico)

1. **SWR (Stale-While-Revalidate):** hooks de histórico (`usePositionHistory`, `useOrderReports`) carregam instantaneamente o cache do IndexedDB e, em segundo plano, fazem fetch incremental de deltas.
2. **Coordenação global de sync (`lastSyncTime`):** se uma aba de histórico sincronizou recentemente, as demais abas (Orders History, Positions History, Trade History, PnL by Symbol) reaproveitam o cache sem disparar requisições redundantes.
3. **Background Polling:** intervalos configuráveis (5–60 min) mantêm o cache quente.
4. **Controles manuais:** Settings permitem purgar o cache (Clear Local Cache) e re-sincronizar (Force Sync), com feedback via Toast UI.
5. **Bills (depósitos/saques):** altamente mutáveis → ignoram o IndexedDB e são buscados direto nas APIs para garantir precisão transacional.

### 6.4. Módulos de Transações / Transaction Logs (Auditoria Contábil)

1. **Bybit Transactions:**
   - **Deep Sync Progressivo:** na inicialização, `useBybitTransactionSync` faz backfill do `/v5/account/transaction-log` em chunks de 7 dias (categorias linear, inverse e spot), com checkpoints no IndexedDB.
   - **Sync Incremental:** após o deep sync, busca apenas registros com `transactionTime > latestTransactionTime + 1`.
   - **PnL Realizado:** calculado pelo fluxo de caixa — `change = cashFlow + funding − fee` — excluindo transfers dos totais de cash flow.
   - **Cache:** stores `bybit-transaction-log` (indexada por connectionId, transactionTime, symbol, type, currency, category) e `bybit-transaction-meta`.

2. **Bitget Transactions:**
   - **Deep Sync Progressivo:** `useBitgetTransactionSync` suporta contas Classic (`/mix/account/bill`, `/spot/account/bills`) e UTA (`/user/bills-record`), com paginação temporal e por cursors `lastEndId`.
   - **Sync Incremental:** busca incremental após o maior timestamp cacheado.
   - **Métricas:** Cash Flow, Fees, Net Change, PnL por símbolo e histórico com agrupamento de Stablecoins vs Moedas Nativas.
   - **Cache:** stores `bitget-transaction-log` e `bitget-transaction-meta`.

3. **OKX Transactions:**
   - **Deep Sync Progressivo:** `useOkxTransactionSync` varre endpoints `/api/v5/account/bills` (recente) e `/api/v5/account/bills-archive` (histórico até 3 meses) em janelas de 7 dias com cursors `after` (`billId`).
   - **Sync Incremental:** atualizações frequentes via `/bills` recente.
   - **Métricas:** Normalização dos dezenas de tipos/subtipos operacionais da OKX, balanço patrimonial após transação (`bal`) e variação de saldo (`balChg`).
   - **Cache:** stores `okx-transaction-log` e `okx-transaction-meta`.

4. **UI SWR Comum:** Todas as 3 abas de transações carregam dados instantaneamente do IndexedDB, executam filtros em memória sem latência de rede, mostram badges de progresso de sync, relatórios de Net Change / ROI e suporte a exportação em CSV, Excel e PDF.

### 6.5. Funding Fees Dashboard

1. **Aggregation-first:** somatórios por período pré-calculados no serviço (`FundingService.fetchAndAggregateSummary`) e persistidos como `FundingRateSummary` (uma linha por exchange-symbol) — nunca registros brutos.
2. **Períodos:** Next, Last, Today, Mês Atual, Mês Anterior, 3M, 6M, 1Y.
   - **Regra crítica:** agregações multi-mês (Mês Anterior, 3M, 6M, 1Y) **excluem o mês corrente**; o corte é ancorado no dia 1º do mês corrente.
   - **OKX:** 6M e 1Y ficam `undefined` (limite de ~3 meses da API) e são excluídos das médias de nível de moeda.
   - **Bybit:** sempre popula todos os campos (cobertura 400+ dias).
3. **Full recalculation:** cada sync refaz o fetch completo das APIs e re-agrega (não há fetch incremental).
4. **Auto-sync inteligente:** timer agendado para `próximo funding time + 60s`; sync manual via "Run Sync Now" ou "Clear Cache + Sync".
5. **Locks singleton (module-level):** `syncInProgressRef`, `fetchingRef`, `restartRequestedRef` previnem execução concorrente; ForceSync durante sync ativo termina o atual e reinicia.
6. **Freshness guard:** símbolos com metadata < 8h desde o último update são pulados (reduz cada ciclo a 10–30% dos símbolos).
7. **Concorrência por exchange:** `asyncPool` com 6 (Bybit/Bitget) e 4 (OKX); retry com backoff exponencial (1s, 2s, 4s).

### 6.6. Analytics e Relatórios

1. **Métricas:** Win Rate, Profit Factor, taxas brutas e líquidas pagas, sazonalidade por dia da semana e janela operacional de 4h.
2. **External Flow:** leitura de Bills (depósitos/saques) para isolar o crescimento patrimonial puramente operacional.
3. **Milestone Matrix:** flutuação patrimonial em relação aos brackets de preços do Bitcoin.
4. **PnL by Symbol:** tabela e gráfico com distribuição de PnL fechado por ativo, respeitando particularidades de alavancagem por corretora (USDT-M, USDC-M, Coin-M Bitget; Inverse/Linear Bybit; SWAP OKX) e filtro por tipo de instrumento.
5. **Exports:** PDF (jspdf + jspdf-autotable), Excel (xlsx) e CSV puro.

### 6.7. Modo Simulação (Mock Data)

1. Ativar em Settings injeta dados fictícios (saldos, posições, PnL, bills, históricos) na UI e **encerra programaticamente qualquer streaming real**.
2. Quando ativo: badge pulsante "Simulation Mode" no StatusBar e botão "Sync Now" desabilitado com tooltip explicativo.
3. Desativar restaura o Real-Time instantaneamente.

## 7. Requisitos Funcionais (Resumo)

| ID | Requisito | Módulo |
|----|-----------|--------|
| FR-1 | Exibir saldos consolidados multi-exchange com tags `UNIFIED`/`FUNDING` e sorting/filtro | Dashboard |
| FR-2 | Exibir posições abertas com PnL não realizado, ROE, margem, preço de liquidação e views Detailed/Lite | Open Positions |
| FR-3 | Exibir histórico de posições fechadas com filtros temporais e exportação | Closed Positions |
| FR-4 | Exibir ordens abertas e histórico de ordens com filtros multicritério | Order Reports |
| FR-5 | Calcular e exibir PnL por símbolo com intensity bars | PnL by Symbol |
| FR-6 | Auditar transaction log da Bybit (até 2 anos) com stats e exportação | Bybit Transactions |
| FR-7 | Dashboard de funding rates multi-período com KPI cards, ranking Top Payers e comparison | Funding Fees |
| FR-8 | Métricas avançadas (Win Rate, Profit Factor, seasonality, external flow) | Reports Dashboard |
| FR-9 | Gerenciar chaves de API com validação em tempo real e criptografia | API Keys |
| FR-10 | Diagnosticar conectividade via API Tester (REST + WebSocket isolado) | API Tester |
| FR-11 | Exibir telemetria e latência das conexões | Connection Logs |
| FR-12 | Ticker de mercado em tempo real (marquee) das posições abertas | Positions Ticker |
| FR-13 | PWA: instalação, cache offline e notificação de atualização | PWA |
| FR-14 | Auditar extrato transacional e bills da Bitget (Classic e UTA) | Bitget Transactions |
| FR-15 | Auditar extrato e bills archive da OKX com reconciliação contábil | OKX Transactions |
| FR-16 | Mapeamento universal de transações (10 categorias universais e badges padronizados) | Universal Tx Mapper |
| FR-17 | Modo Hedge Pro com monitoramento de delta, ratio de hedge e alertas de risco | Hedge Monitoring |

## 8. Requisitos Não-Funcionais

| Categoria | Requisito |
|-----------|-----------|
| **Segurança** | Zero-Trust; chaves apenas no navegador; Web Crypto API; proxy com allowlist; criptografia das chaves com tela de desbloqueio global. |
| **Performance** | Histórico com latência zero (IndexedDB SWR); polling paralelo no boot (`ExchangeAggregator`); memoização para evitar re-renders em cascata. |
| **Confiabilidade** | Exponential backoff para WebSocket (teto 60s); retry com backoff nas APIs; tolerância a clock skew via Time-Sync Engine. |
| **Precisão** | Big.js para todo cálculo financeiro; formatação dinâmica (8 casas para valores pequenos, 2 para $10k+). |
| **Compatibilidade** | 100% Serverless (Vercel); deploy em Node LTS (engines >= 24); PWA Desktop/Mobile. |
| **Testabilidade** | Vitest + jsdom; módulos de funding com 140+ testes unitários (235 testes no total no projeto). |
| **Manutenibilidade** | Micro-stores Zustand (SRP); padrão Adapter/Strategy; tipos unificados estritos; protocolo de consistência Mocks↔IndexedDB↔UI. |

## 9. Arquitetura (Resumo)

Ver `specs/ARCHITECTURE.md` para o diagrama completo. Visão de alto nível:

```
[UI React 19 + Zustand + Tailwind v4]
        │  (assinaturas HMAC geradas no cliente — Web Crypto)
        ▼
[ExchangeAggregator / Hooks]
        │  hybridFetch (client-side primeiro; fallback proxy)
        ▼
[/api/proxy — Express + Vercel Serverless]
        │  (proxy "burro" — allowlist, sem segredos)
        ▼
[Bitget V2 | Bybit V5 | OKX V5]  ──►  [Adapters normalizam → Unified* types]
                                              │
                                     [IndexedDB cache (SWR)]
```

## 10. Métricas de Sucesso

- **Tempo para visão consolidada:** usuário vê patrimônio agregado em < 5s após boot com chaves ativas.
- **Redução de chamadas de API:** cache IndexedDB + coordenação global de sync reduzem requisições redundantes ao alternar abas de histórico.
- **Precisão contábil:** PnL Realizado do Bybit Transactions reconcilia com o fluxo de caixa (`change = cashFlow + funding − fee`).
- **Cobertura de testes:** ≥ 235 testes unitários passando; typecheck (`tsc --noEmit`) sem erros.

## 11. Roadmap / Backlog

Registrado em `specs/EVOLUTION_TASKS.md` (histórico de refatorações e sprints). Sprints concluídos incluem: resolução de débitos críticos (SSRF/DoS, backoff, Web Crypto), arquitetura de adapters (SRP/Strategy), relatórios de performance, funding fees dashboard, auditoria Bybit, classificação de ativos e refinamentos de UI/UX.

## 12. Documentação Relacionada

- [Arquitetura e Fluxo de Dados](./ARCHITECTURE.md)
- [Evolução e Refatorações](./EVOLUTION_TASKS.md)
- [Interfaces Unificadas](./unified-interfaces.md)
- [Funding Fees Dashboard](./FUNDING_FEES_DASHBOARD.md)
- [Transações Bybit](./bybit-transactions-spec.md)
- [KPI Funding Cards](./kpi-funding-cards.md)
- [Referências das APIs](./bybit_v5_api_doc.md), [OKX V5](./okx_v5_api_doc.md), [Bitget Classic](./bitget_classic_api_doc.md)
