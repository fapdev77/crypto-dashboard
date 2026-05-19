# Evolution & Refactoring Tasks (EVOLUTION_TASKS)

Este documento consolida as descobertas da Auditoria Técnica (Arquitetura, Qualidade e Segurança) em uma lista de tarefas (Actionable Items) atômicas, priorizadas pelo impacto no sistema e risco de falha.

## Prioridade 1 (Crítico: Risco de Segurança e Estabilidade)

**1.1. Mitigação de SSRF e DoS no Proxy Local (`server.ts`)**
*   **Problema:** Proxy aberto que aceita qualquer URL de destino e corpos de requisição massivos.
*   **Ação:** 
    *   Implementar `express.json({ limit: '1mb' })`.
    *   Criar uma *Allowlist* estrita para validar o domínio na URL (`targetUrl`). O proxy deve bloquear qualquer request que não tenha como alvo as APIs oficias da Bitget, Bybit ou OKX.

**1.2. Implementar Exponential Backoff para WebSocket (`useMultiExchangeWS.ts`)**
*   **Problema:** Se houver queda de internet ou banimento de IP temporário da corretora, o client enviará pings em loop fixo a cada 5 segundos.
*   **Ação:** Criar lógica para que as tentativas de reconexão subam em escala: 5s, 10s, 30s, 1m, 5m.

## Prioridade 2 (Alto: Débitos Técnicos Graves e Gargalos)

**2.1. Refatoração do "God Hook" de WebSockets (`useMultiExchangeWS.ts`)**
*   **Problema:** Uma única classe lida com ciclo de vida, autenticação, gerência do estado e serialização complexa. Fere o Single Responsibility Principle.
*   **Ação:** 
    *   Criar parsers de domínio na pasta `src/services/ws/` (ex: `BitgetWsParser`, `BybitWsParser`).
    *   Extrair o corpo do loop `parseDataStream` para que esses adaptadores recebam a string pura e devolvam uma interface padronizada (`PositionDelta`, `BalanceDelta`).

**2.2. Otimizar Consultas Sequenciais para Promises Concorrentes**
*   **Problema:** `PositionHistoryService.ts` intera sobre tipos de contratos e exchanges em série (N+1 block) em vez de assíncrono.
*   **Ação:** Trocar loops `for...await` por `await Promise.all()` nas chamadas REST de histórico. O tempo total de requisição passará do somatório para o limite da requisição mais lenta.

**2.3. Remover Retorno Vazio em Falha Crítica (`RestClient.ts`)**
*   **Problema:** Exceções do tipo "Fail to Fetch" estão sendo devolvidas como `[]` (arrays vazios).
*   **Ação:** Alterar o catch blocks para propagar a exceção ou retornar uma união discriminada (Discriminated Union) contendo tipo de erro. Atualizar os componentes visuais para exibir "Erro de Conexão".

## Prioridade 3 (Médio: Otimização de Padrões)

**3.1. Readequar a janela de tempo da Bybit (Replay Attack)**
*   **Problema:** `recvWindow` está em 10 segundos, abrindo margem para interceptação. 
*   **Ação:** Em `ExchangeAuth.ts`, reduzir `recvWindow` da Bybit para `5000` (5 segundos) seguindo a documentação v5.

**3.2. Consumir a Paginação Oficial nas Consultas de Histórico**
*   **Problema:** As rotas REST de histórico estão ignorando o cursor `idLessThan` na Bitget e `cursor` na Bybit.
*   **Ação:** Atualizar o `RestClient.ts` para suportar queries iterativas com os cursors devolvidos nos resultados, até exaurir os limites desejados (ex: últimos 30 dias).

**3.3. Transição de `crypto-js` para `window.crypto.subtle`**
*   **Problema:** A lib `crypto-js` adiciona peso ao bundle.
*   **Ação:** Usar a Web Crypto API nativa nos cálculos HmacSHA256 (`ExchangeAuth.ts`), limpando dependências. Isso deixaria o bundle mais enxuto e seguro.
