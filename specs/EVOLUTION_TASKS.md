# Evolution & Refactoring Tasks (EVOLUTION_TASKS)

Este documento consolida o histórico de refatorações estruturais, melhorias de qualidade e segurança (Auditoria Técnica) aplicadas ao sistema. Funciona agora como um registro de estabilidade das fundações e backlog futuro.

## Sprint Recente: Resolução de Débitos Críticos [CONCLUÍDO]

**1. Mitigação de SSRF e DoS no Proxy Local** [✓]
*   **Ação Aplicada:** Implementado `express.json({ limit: '1mb' })` e uma rigorosa _Allowlist_ (validando domínios oficiais da Bybit, Bitget e OKX) no `server.ts`.

**2. Implementação de Exponential Backoff para WebSocket** [✓]
*   **Ação Aplicada:** Lógica criada no `useMultiExchangeWS.ts` contendo limites de reconexão exponenciais (com teto máximo de 60s), prevenindo _rate-limiting_ severo e *loops* descontrolados.

**3. Refatoração do "God Hook" de WebSockets (`WsParsers.ts`)** [✓]
*   **Ação Aplicada:** A lógica pesada do `parseDataStream` que feria o SRP foi extraída e isolada no adapter estático `WsParsers.ts`, deixando o _hook_ focado unicamente na orquestração de estado e ciclo de vida do React.

**4. Otimização de Consultas de Histórico e Paginação** [✓]
*   **Ação Aplicada:** Chamadas que atuavam como gargalos no histórico migraram para `Promise.all()` (gerando excelente ganho de performance não-bloqueante). Além disso, lógicas formais de paginação iterativa (`nextId`, `nextCursor`) foram corretamente implementadas nos serviços (`PositionHistoryService.ts`).

**5. Segurança Avançada: Janelas de Tempo e Web Crypto API** [✓]
*   **Ação Aplicada:** Remoção do acoplamento do pacote opaco `crypto-js` a favor da robusta ferramenta nativa `window.crypto.subtle`. Redução do `recvWindow` da Bybit para reforçar proteção contra _Replay Attacks_ (configurado para limites sub-5000).

**6. Motor Expansivo de Dados Fictícios (Mocks)** [✓]
*   **Ação Aplicada:** Geração dinâmica de dataset massivo via ferramenta isolada JSON. Refatoração dos componentes para mapeamento de instâncias via critério `.startsWith('mocked-data')`, entregando um teste de estresse autêntico para a Interface Gráfica.

**7. Arquitetura Híbrida: Mitigation de Geo-Block (Bybit)** [✓]
*   **Ação Aplicada:** O `RestClient.ts` adotou a arquitetura `hybridFetch` para driblar restrições geográficas originárias da hospedagem US-East (AI Studio Cloud), priorizando requisições via navegador do usuário (Client-Side) com _fallback_ ao Proxy (Server-Side) visando alta escalabilidade no ecossistema BYBIT V5.

**8. Real-Time Engine: Correção de PnL Estático Bybit** [✓]
*   **Ação Aplicada:** Diferente das outras exchanges, Bybit não realiza push via Websocket Privado de MarkPrice/PnL (apenas em ações de execuções de ordens). Foi instaurado em `useMultiExchangeWS.ts` um hook silencioso de Short-Polling configurável dinamicamente via `Settings` (1s a 15s) no Client-side, para requisições na REST API e update em micro-chunks no Redux Zustand para a Bybit renderizar sua variação real de mercado. Removidos resquícios da biblioteca obsoleta `crypto-js` também nesta leva, modernizando o stack com WebCrypto.

**9. UI Analytics: Macro Capital & Cross-Exchange Treemap** [✓]
*   **Ação Aplicada:** Instalou-se a biblioteca de gráficos `recharts`. Adicionou-se ao `Dashboard.tsx` dois novos visuais (Ideias #1 e #2 do plano de Evolução Analítica): um Gráfico de Rosca (Donut) demonstrando Risco por Exchange (Distribuição Macro), e um Treemap mapeando visualmente a diversidade total de ativos cruzando as 3 contas simultaneamente. Customização forte com cores da identidade visual do app.

---

## Sprint Atual: Arquitetura Avançada e Inteligência de Relatórios [CONCLUÍDO]

**1. Desacoplamento da Camada de Normalização (SRP & Strategy Pattern)** [✓]
*   **Ação Aplicada:** Extinção radical dos arquivos *God Objects* (`RestClient.ts` e `ExchangeAuth.ts`). Toda a lógica de fetch REST e WSS (autenticação e assinatura de headers) foi modularizada em diretórios isolados (`src/services/adapters/[exchange]`), forçando a injeção em fábricas como `PositionHistoryService`. O sistema atinge compliance total com o item 1 da Constituição (`AGENTS.md`).

**2. Relatórios de Performance (Reports Dashboard)** [✓]
*   **Ação Aplicada:** Implementação de visualizações tabulares ricas de histórico de trades utilizando *Incremental Fetch* (memória cache) e permitindo exportações nativas diretas para PDF (via `jspdf` e `jspdf-autotable`), Excel (`xlsx`) e CSV puro. Funciona nativamente cross-exchange e possui paginação robusta de baixo nível nos *Adapters*.

**3. Dashboard Analítico de Estratégia (Analytics Dashboard)** [✓]
*   **Ação Aplicada:** Lançamento de métricas avançadas matemáticas (`Big.js` nativo na mente) calculando Win Rate, Profit Factor, Extração de PnL Diário e Custos Totais (Trading Fees e Net Funding Fees). A interface dispõe de gráficos da biblioteca `recharts` apresentando *Seasonality* (lucratividade por dia da semana e horários da janela operacional).

**4. External Flow Control e Live Bills API** [✓]
*   **Ação Aplicada:** Implementação do conceito de PnL Operacional Puro. O aplicativo efetua conexões diretas nas APIs da Bybit (`query-record`), OKX (`deposit-history`/`withdrawal-history`) e Bitget (`deposit-records`) através de um robusto orquestrador `BillsHistoryService` acoplado ao hook `useBillsHistory`. O sistema deduz matematicamente as interações do usuário (Depósitos/Saques) da rentabilidade total orgânica. Adicionado suporte dinâmico para *Mock Data* no Switch.
