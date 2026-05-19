# Quality Audit & Code Smells (QUALITY_AUDIT)

## 1. Omissões de Caminho Feliz (Happy Path Bias)

O código frequentemente assume que a infraestrutura de rede, o proxy local e as APIs de terceiros responderão com sucesso em cenários ideais. Identificamos as seguintes rupturas deste padrão:

### A. Ausência de Exponential Backoff no WebSocket
No arquivo `src/hooks/useMultiExchangeWS.ts` (Linha ~285):
```typescript
ws.onclose = (event) => {
  // ...
  reconnectTimers.current[id] = setTimeout(() => {
    connect(currentConfig);
  }, 5000);
};
```
**Problema:** Em caso de queda de rede ou rate-limiting severo da exchange, o cliente continuará enviando tentativas de reconexão a cada exatos 5 segundos em um loop infinito. Isso não obedece as diretrizes de rate-limit documentadas pelas exchanges (ex: OKX impõe 3 reqs/segundo para conexões e bane IPs agressivos).
**Solução:** Implementar um mecanismo de *Exponential Backoff* (tentativas em 5s, 10s, 30s, 1min).

### B. Mascaramento Silencioso de Erros (Swallowing Errors)
No `src/services/RestClient.ts` (Múltiplas funções):
```typescript
try {
  // ... proxyFetch
} catch (error) {
  console.error(`[REST-Okx-History] fetch error:`, error);
  return []; // <---
}
```
**Problema:** Retornar um array vazio `[]` em caso de falha de rede mascara o erro. A interface (UI) interpretará como "O usuário não tem posições abertas/histórico", em vez de apresentar um *Error State* ou *Retry Button*. Isso viola o princípio do *Fail-Fast*.

## 2. Violações de Responsabilidade Única (SRP) e Complexidade

### A. O "God Hook" de WebSockets (`useMultiExchangeWS.ts`)
O arquivo atual é massivo (+580 linhas) e atua como um "God Object", quebrando o Princípio da Responsabilidade Única (SRP). Ele realiza simultaneamente:
1. Gerenciamento do Ciclo de Vida React e Referências (`useRef`, `useEffect`).
2. Protocolos HTTP REST para Bybit (Fetching inicial de saldos na montagem).
3. Construção de Payloads criptográficos de autenticação.
4. Parsing gigantesco de payloads heterogêneos na função `parseDataStream` (+200 linhas).

**Context Collapse:** Misturar a renderização React com a lógica de mapeamento de JSON puro (DTO -> Entity) gera uma manutenção extremamente complexa.
**Solução Recomendada:** Extrair o `parseDataStream` para um padrão *Strategy* ou adaptadores isolados (ex: `BybitWsAdapter.ts`, `BitgetWsAdapter.ts`).

### B. Gargalo de Performance (Sequential Await)
No `src/services/positions/PositionHistoryService.ts` (Linha 17 e 43):
```typescript
for (const type of instTypes) {
   const raw = await RestClient.getHistoryOkx(type, ...);
   allRaw = [...allRaw, ...raw];
}
```
**Problema:** O código utiliza iteração de loop com `await` bloqueante para buscar dados de múltiplos tipos de contrato (SWAP, FUTURES, MARGIN). Cada chamada de rede trava a próxima.
**Solução:** Paralelizar usando `Promise.all()`, reduzindo o tempo total de carregamento para o tempo da request mais lenta, ao invés da soma de todas.

## 3. Aderência às Documentações Oficiais (API Specs)

Durante a auditoria e cruzamento com os arquivos da pasta `specs/` (Bitget Classic, Bybit v5, OKX v5):

*   **Pings WebSockets (Correto):** O código respeita exatamente a diferença entre `ping` em string pura (OKX/Bitget) e `{"op": "ping"}` (Bybit). O intervalo de 20s está perfeitamente seguro frente à janela limite de 30s da OKX.
*   **Parâmetro de Tempo de Vida do Request (Bybit `recv_window`):** As documentações recomendam passar `recv_window` para mitigar ataques de *replay*. O código das chaves (`ExchangeAuth.ts`) precisará ser verificado para garantir que este parâmetro está incluído e configurado abaixo de 5000ms.
*   **Limites de Paginação (Bitget):** O script `Bitget-History` não consome o parâmetro iterativo recomendado na doc oficial (`idLessThan`), limitando o retorno a apenas os primeiros 100 registros históricos independentemente do período. O ideal é refatorar para um loop iterativo usando `idLessThan`.
