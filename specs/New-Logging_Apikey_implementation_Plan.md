# Spec de Implementação Final: Sistema de Logs & Upgrade de Tela API Key

Este spec consolida os planos da **Fase 1 (Robust Logging System)** e da **Fase 2 (API Key View Upgrade)** em uma única trilha de desenvolvimento estruturada. Ele deve ser utilizado como o prompt e especificação técnica final para guiar a implementação ponta a ponta.

---

## 1. Visão Geral e Arquitetura

O objetivo é substituir a tela antiga de gerenciamento de chaves de API por um painel de alta densidade agrupado por Exchange (acordeão), incluindo métricas reais de performance (latência e throughput) e um Terminal de Logs em tempo real na parte inferior, alimentado por um serviço de telemetria e interceptor de console centralizado.

### Estrutura de Arquivos

| Arquivo | Estado | Descrição |
|---|---|---|
| `src/store/logStore.ts` | **[NEW]** | Store Zustand para o buffer de logs em memória |
| `src/services/logger.ts` | **[NEW]** | Interceptador e parser do console global |
| `src/components/ConnectionLogTerminal.tsx` | **[NEW]** | UI do Terminal Docked com drag-resize |
| `src/components/ApiKeyModal.tsx` | **[NEW]** | Modal unificado de criação/edição/remoção |
| `src/components/ApiKeys.tsx` | **[REWRITE]** | Tabela acordeão principal + integração com terminal |
| `src/main.tsx` | **[MODIFY]** | Inicialização precoce do interceptador de logs |
| `src/hooks/useMultiExchangeWS.ts` | **[MODIFY]** | Instrumentação de Latency e Throughput |
| `src/store/dashboardStore.ts` | **[MODIFY]** | Integração com o histórico de telemetria |

---

## 2. FASE 1: INFRAESTRUTURA DE LOGS

### 2.1. Zustand Store (`src/store/logStore.ts`)
Gerencia o buffer de logs e expõe as ações de controle.
- **Tipagem**:
  ```typescript
  export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DATA' | 'SYSTEM';

  export interface LogEntry {
    id: string;        // crypto.randomUUID()
    timestamp: number; // Date.now()
    level: LogLevel;
    source: string;    // Ex: 'SYSTEM', 'CACHE', ou o Label amigável da conexão
    message: string;   // Mensagem processada e livre de segredos brutos
  }
  ```
- **Capacidade**: Limite padrão de 1000 logs em memória (FIFO).
- **Ações**: `addLog(level, source, message)` e `clearLogs()`.

### 2.2. Interceptador de Console (`src/services/logger.ts`)
Injeta a lógica no objeto global `window.console`.
- **Preservação**: Redirecionar os argumentos capturados para a execução original do console para não quebrar o DevTools do navegador.
- **Resolução de UUIDs**: Extrair `${id}` das tags como `[WS-${id}]` ou `[REST-${id}]` e consultar dinamicamente a store `useApiKeysStore.getState().keys`. Se encontrada, substituir pela string `[Exchange - Label]` (ex: `Bybit - Main`).
- **Classificação**: Mapear eventos e níveis de console (`error` → `ERROR`, `warn` → `WARN`, pings/pongs/`[Keep-Alive]` → `DATA`, sincronizações → `SYSTEM`, mensagens informativas → `INFO`).
- **Filtro de Ruído**: Somente reter no store logs que contenham prefixos conhecidos do app (`[WS-`, `[REST-`, `[Time-Sync]`, etc.), descartando ruídos do Vite, React HMR e extensões.

### 2.3. Inicialização (`src/main.tsx`)
Importar e invocar `initializeLogger()` logo no topo do ponto de entrada do bundle.

---

## 3. FASE 2: TELEMETRIA EM TEMPO REAL

### 3.1. Coleta e Store de Telemetria (`src/store/dashboardStore.ts`)
Adicionar ou expandir o suporte à telemetria real dos WebSockets.
- **Estrutura**:
  ```typescript
  export interface ConnectionTelemetry {
    latencyHistory: number[];    // últimos 20 pings (ms)
    throughputHistory: number[]; // últimas 20 amostras de tráfego (bytes/s)
    lastPingMs: number;
    bytesPerSecond: number;
  }
  ```
- **Ações**: `updateLatency(connectionId, ms)` e `updateThroughput(connectionId, bytes)`.

### 3.2. Instrumentação (`src/hooks/useMultiExchangeWS.ts`)
1. **Cálculo de Latency**: Registrar o `Date.now()` ao enviar um ping no WebSocket e, no evento `onmessage`, ao identificar a resposta do pong correspondente, calcular o delta de milissegundos e atualizar a telemetria.
2. **Cálculo de Throughput**: No handler `onmessage`, medir a quantidade de bytes recebida (utilizando o comprimento da string ou tamanho do buffer) e acumular o tráfego por segundo para alimentar as amostras de vazão.

---

## 4. FASE 3: INTERFACE DO USUÁRIO (UI/UX)

### 4.1. Tabela de Conexões Acordeão (`src/components/ApiKeys.tsx`)
- **Visual Expandido**: Ocupa a largura total da tela, com as conexões agrupadas por Exchange.
- **Cabeçalho Expansível**: Contém `<ExchangeIcon />`, nome da exchange, badge com contagem de conexões ativas e chevron rotacionando (90° → 0°). Transição animada de abertura.
- **Colunas**:
  - **Label**: Nome personalizado da conexão.
  - **Status**: Badge semântica (Verde = `connected`, Laranja animada = `connecting`, Cinza = `disconnected`, Vermelho = `error`).
  - **Latency**: Exibição do valor em ms + micro-gráfico utilizando o `<Sparkline />` existente abastecido com o histórico da telemetria.
  - **Throughput**: Indicador em barras verticais e valor em KB/s derivado da telemetria.
  - **Actions**: Botões com ícones (Editar, Toggle de status ativado/desativado, Excluir) com efeitos de hover suaves.

### 4.2. Modal Unificado (`src/components/ApiKeyModal.tsx`)
- **Modo Create**: Dropdown com as Exchanges disponíveis, label, API Key, API Secret e Passphrase (condicional por Exchange).
- **Modo Edit**: Permite alterar o label da chave. A API Key é exibida mascarada de forma segura e os campos de segredos não são editáveis.
- **Ações de Remoção**: Botão de exclusão com confirmação de 2 etapas diretamente no modal de edição.

### 4.3. Terminal Acoplado (`src/components/ConnectionLogTerminal.tsx`)
- **Posicionamento**: Fixo no rodapé da view de chaves API (não global).
- **Redimensionamento**: Altura inicial de `240px`, ajustável via drag-handle no topo.
- **Visual DX**: Fundo preto puro (`#000000`), texto em JetBrains Mono (`font-mono`), prompt visual piscante (`> _`).
- **Filtros**:
  - Toggles por nível: INFO (verde), WARN (laranja), ERROR (vermelho), DATA (azul), SYSTEM (cinza).
  - Caixa de busca de texto.
  - Filtro por conexão ativa (dropdown).
- **Auto-scroll**: Rolagem suave automática ao receber novas entradas.

---

## 5. REGRAS DE DESIGN SYSTEM E LIMPEZA DE CÓDIGO
- **Fontes**: Usar JetBrains Mono para todos os números (ms, KB/s), hashes, máscaras de chaves e logs no terminal.
- **Clean Code**: Funções curtas (máximo 40 linhas), uso estrito de inglês nos nomes, padrão "Return Early", sem código morto e sem comentários redundantes gerados por IA.
- **Segurança**: API Secret e Passphrases nunca expostos em texto puro no front-end, nem trafegados via logs.

---

## 6. CRITÉRIOS DE ACEITAÇÃO & TESTES

- [ ] `logStore.ts` gerencia o histórico de forma estrita e segura com limite máximo.
- [ ] O console interceptor captura apenas os logs de interesse do domínio da aplicação.
- [ ] Os IDs e UUIDs em logs do websocket/REST são traduzidos corretamente para os labels correspondentes das chaves cadastradas.
- [ ] A tabela acordeão organiza as conexões por Exchange de forma responsiva.
- [ ] As sparklines de latência e throughput exibem dados reais instrumentados no WebSocket.
- [ ] O terminal de logs possui controles funcionais de busca, filtros de nível, limpeza de buffer e ajuste de altura por drag.
- [ ] Testes automatizados em `tests/logger.test.ts` cobrem o parser e a capacidade da store.
- [ ] A segurança de mascaramento e não-edição dos segredos é rigorosamente respeitada no modal.
