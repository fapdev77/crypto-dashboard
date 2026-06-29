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

**5. IndexedDB History Caching e Background Polling** [✓]
*   **Ação Aplicada:** Criação do banco in-memory (`crypto-dashboard-cache`) baseada na biblioteca interativa `idb` que reestrutura radicalmente o fetch pesado de Histórico de Posições fechadas. Uma Engine de Background Polling com intervalos customizáveis no Menu Settings mantém deltas rodando transparentemente em modo inerte visando zerar o Request Latency Time durante Analytics pesados, burlando com maestria Rate Limits de API por fetch contínuo das 3 Exchanges. Incluído também gerencial de Cache Manual para purgar ou re-sincronizar ativamente bases, com UI informando progressos em *Toasts*.

**6. PnL By Symbol Report com Dynamic Intensity Bars e Margin Mapping** [✓]
*   **Ação Aplicada:** Adicionada métrica *PnL by Symbol* sob o menu Analytics contendo um mapeamento cross-change impecável de Margin Types: `USDT-M/USDC-M/Coin-M` de Bitget e correlatos de Bybit/OKX (Linear, Inverse). Essa estrutura renderiza tabelas enriquecidas com Dynamic Intensity Progress Bars indicando a agressividade da posição perante as maiores posições (High Watermarks), incluindo um robusto filtro multi-corretora e tipo de derivativo transacionado interagindo ativamente com a Store nativa.

---

## Sprint Recente: Refinamento de UI/UX e Inteligência Visual [CONCLUÍDO]

**1. Classificador Dinâmico de Ativos e Identidade Visual (Logo.dev)** [✓]
*   **Ação Aplicada:** Implementação do `AssetClassifierAggregator` e do componente universal `<CoinIcon />`. O sistema agora classifica automaticamente ativos (CRYPTO vs STOCK) e consome a API da Logo.dev e OKX CDN com fallbacks inteligentes (`/crypto`, `/ticker`, `/name`) para exibir ícones de moedas e marcas de forma consistente.

**2. Modo de Privacidade Global (Privacy Mode)** [✓]
*   **Ação Aplicada:** Criação do `PrivacyContext` e botão global no cabeçalho (Toggle). Oculte valores monetários absolutos (saldos, PnL) em toda a interface com um clique (exibindo `$••••` ou `••••%`), protegendo a exibição do dashboard em ambientes públicos.

**3. Hedge Mode e Indicador de Proteção de Capital** [✓]
*   **Ação Aplicada:** Cálculo automático da exposição do patrimônio vs proteção alocada em contratos Inversos (Coin-M). O painel central (Dashboard) agora exibe a porcentagem do capital total protegido por posições "Short" inversas frente ao capital livre ("Exposed"), apresentando barras de progresso visuais.

**4. Paletas e Theming por Corretora** [✓]
*   **Ação Aplicada:** Definição de cores de identidade de marca para cada corretora (Bitget `#03aac7`, Bybit `#ff9c2e`, OKX `#fafafa`) sendo injetadas via CSS vars/data-themes nas expansões das subcontas do painel, garantindo reconhecimento instantâneo.

---

## Sprint Recente: Padronização de Contratos Inversos e Correção de Históricos [CONCLUÍDO]

**1. Centralização do Cálculo de Tamanho e Valor de Contratos Inversos** [✓]
*   **Ação Aplicada:** Criação e consolidação das lógicas unificadas de conversão em `src/utils/inverseUtils.ts` por meio dos métodos `getOpenPositionSizeAndValue` e `getHistoryPositionSizeAndValue`. Isso removeu a duplicação de lógicas de conversão e simplificou o suporte a contratos lineares vs inversos em todas as exchanges.

**2. Correção do Histórico da Bybit (Inverse vs Linear)** [✓]
*   **Ação Aplicada:** Ajuste no cálculo das posições de histórico fechadas da Bybit no `getHistoryPositionSizeAndValue`. Para contratos Inversos, o campo `cumEntryValue` representa o valor em moedas (e.g. BTC) e `size` representa o volume em USD. Para contratos Lineares, o comportamento é o inverso, onde `cumEntryValue` representa o valor em USD/USDT e `size` representa a quantidade da moeda.

**3. Resolução de Inconsistências de Preço e Quantidade no Histórico da Bitget** [✓]
*   **Ação Aplicada:** Atualização no mapeamento do `BitgetAdapter.ts` para posições obtidas via `/api/v2/mix/position/history-position`. O adaptador agora mapeia os campos de forma resiliente:
    *   Usa `openAvgPrice || openPriceAvg` para `entryPrice` e `closeAvgPrice || closePriceAvg` para `closePrice` para sanar a inconsistência de preços de entrada e saída zerados (0.00).
    *   Usa `closeTotalPos || openTotalPos` como a quantidade base e aplica a respectiva escala do tamanho do contrato inverso (`getBitgetInverseContractVal`), garantindo que a quantidade em moedas (`size`) de posições inversas da Bitget seja calculada com precisão.

**4. Integridade de Dados no Painel de Visualização e Relatórios de Exportação** [✓]
*   **Ação Aplicada:** Adaptação da tabela de posições fechadas (`ClosedPositions.tsx`), visualizações de relatórios e rotinas de exportação para consumir uniformemente os novos campos de tamanho e valor calculados, garantindo dados íntegros e 100% corretos em CSV, PDF e Excel.

