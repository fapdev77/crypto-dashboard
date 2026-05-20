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
