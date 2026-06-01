# Goal

Organizar e expandir significativamente o sistema de Mock Data (Dados Fictícios) do projeto. Removeremos todos os dados fixos (hardcoded) dos componentes e hooks, movendo-os para arquivos JSON estruturados. Adicionalmente, geraremos um volume muito maior de dados de teste: 3 a 5 contas falsas por exchange (Bitget, Bybit, OKX), com 30 a 50 posições abertas e 30 a 50 registros de histórico por conta, cobrindo todos os tipos de instrumentos (Product Types) baseados na documentação das APIs.

## User Review Required

> [!IMPORTANT]
> Atualmente a interface e os hooks utilizam um ID fixo chamado `mock` para simular as coisas. Como vamos ter múltiplas contas falsas (ex: `mocked-data-bitget-1`, `mocked-data-bybit-1`), precisarei alterar a lógica de filtragem nos componentes visuais de `=== 'mock'` para `.startsWith('mocked-data')`. Por favor aprove esse detalhe.

> [!NOTE]
### Plano de Implementação: Unificação do Polling em Background para Bybit, Bitget e OKX

**Objetivo:** Garantir que o Mark Price, PnL Não Realizado e Saldos sejam atualizados fluidamente quando o mercado oscila mas não ocorrem atualizações por transações que emitam disparos transacionais em WebSocket (dependendo do comportamento de cada Exchange privada). O modelo já empregado pela Bybit passará a valer simultaneamente para Bybit, Bitget e OKX.

#### 1. Padronização NAS CONFIGURAÇÕES (Store)
Renomear a variável específica da Bybit para um formato genérico que se aplicará globalmente nas três exchanges configuradas.
*   **[MODIFY] `src/store/settingsStore.ts`**:
    *   Substituir as chaves `bybitPollingInterval` por `pollingInterval`.
    *   Substituir `setBybitPollingInterval` por `setPollingInterval`.

#### 2. Atualização DA UI NAS CONFIGURAÇÕES
A janela de "Settings" mostrará uma interface não isolada a apenas uma Exchange e sim uma configuração em batch para toda a camada em background do sistema de atualizações.
*   **[MODIFY] `src/components/Settings.tsx`**:
    *   Alterar todas as variáveis desestruturadas relativas à bybit para receber `pollingInterval` e `setPollingInterval`.
    *   Substituir "Bybit Refresh Interval" por "Exchanges Background Refresh Interval".
    *   Atualizar o texto ilustrativo do campo, detalhando que o fetch periódico reconsulta dados REST para os 3 serviços.

#### 3. Generalização e Integração do BACKUP POLLING via REST
Tirar a responsabilidade de forçar o adaptador da Bybit no background routine e refatorar a chamada que integra o mecanismo atual de REST ao agregador inteligente de corretoras.
*   **[MODIFY] `src/hooks/useMultiExchangeWS.ts`**:
    *   Refatorar de `syncBybitRestData` para `syncRestData(config)`. Usaremos a fábrica do `ExchangeAggregator.getAdapter(config.exchange)` internamente.
    *   Refatorar de `startBybitPolling` para `startRestPolling`. Ajustá-lo para aplicar o `pollingInterval`.
    *   Remover dependências diretas de `BybitAdapter` neste gancho genérico.
    *   Chamar a execução da engine de repetição `startRestPolling(config)` em `connect(config)` - independente da corretora conectada.

### Como a Engine Vai Funcionar No Fim:
1.  **Eventos Transacionais Rápidos:** Mantêm suporte milimétrico pelo canal da webSocket. Ao preencher, executar uma limit, fechar ou criar a market, o servidor responderá no channel.
2.  **Sincronização em Background Constante (Polling fallback):** Intervalo flexível (e.g. 5 seg) vai buscar no endpoint REST original de saldos e posições (`getBalance` / `getOpenPositions`) das 3 implementações simultaneamente - unificando valores flutuantes pelo Zustand. A reatividade atualiza a tela de todos automaticamente sem cliques do usuário nem depender de order executions.

#### [MODIFY] `src/components/OpenPositions.tsx`
- Atualizar a filtragem de `=== 'mock'` para `.startsWith('mocked-data')`.

#### [MODIFY] `src/components/Dashboard.tsx`
- Atualizar as filtragens de Balances e Positions de `=== 'mock'` para `.startsWith('mocked-data')`.

---

### 2. Geração dos Novos Arquivos JSON de Mock

#### [NEW] `src/mock/generateMocks.js` (Utilitário)
- Script para gerar dinamicamente centenas de posições e registros de histórico falsos com preços, moedas e Product Types plausíveis baseados nas especificações.

#### [NEW] `src/mock/accounts.json`
- Definirá de 3 a 5 contas mockadas para cada exchange (ex: `mocked-data-bybit-1`, `mocked-data-bitget-1`, etc.).

#### [NEW] `src/mock/balances.json`
- Mapeará os saldos em USDT, USDC, BTC, etc., para cada conta.

#### [NEW] `src/mock/positions.json`
- Conterá 30-50 posições abertas por conta mockada.

#### [NEW] `src/mock/history.json`
- Conterá 30-50 registros de posições fechadas por conta mockada.

#### [DELETE] `src/mock/positions.json` (o antigo)
- Será substituído pelo novo arquivo gerado.

---

### 3. Limpeza dos Hooks e Integração dos JSONs

#### [MODIFY] `src/hooks/useMultiExchangeWS.ts`
- Remover os dados brutos mockados de saldo e as iterações do antigo arquivo `positions.json`.
- Importar os novos arquivos `accounts.json`, `balances.json` e `positions.json`.
- Mapear iterativamente essas contas falsas para o Zustand (`useDashboardStore`) assim que o modo Mock for ativado.

#### [MODIFY] `src/hooks/usePositionHistory.ts`
- Remover o array fixo `mockHistory` dentro do hook.
- Importar `history.json`.
- Ao ativar `useMockData`, popular a tabela injetando os registros gerados diretamente no estado de retorno.

## Verification Plan

### Manual Verification
1. Ligar o servidor de desenvolvimento (`npm run dev`).
2. Acessar as Configurações (Settings) e ativar o modo `Use Mock Data`.
3. Validar se dezenas de posições aparecem na tabela principal e na listagem lateral.
4. Validar se o PnL e os tamanhos das contas refletem uma combinação massiva de múltiplos exchanges.
5. Entrar na aba de Histórico e validar se a tabela está populada com muitos registros passados.
6. Desativar o Mock Data e verificar se a interface volta ao estado original em branco (ou com dados reais se houver chaves cadastradas).
