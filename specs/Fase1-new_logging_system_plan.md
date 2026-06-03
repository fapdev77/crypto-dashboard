# Spec de Implementação Técnica — Fase 1: Robust Logging System

Este documento serve como o plano detalhado e prompt de orientação para a implementação da **Fase 1: Infraestrutura de Logs**, definindo a store, o serviço de interceptação e a integração.

---

## 1. Objetivos da Fase 1
- **Armazenamento Centralizado**: Criar uma Store Zustand (`logStore.ts`) robusta com limite de tamanho para guardar o histórico de logs em memória.
- **Interceptação Transparente**: Desenvolver o parser e interceptador (`logger.ts`) que mapeia chamadas de `console.log/warn/error` da aplicação.
- **Resolução de Identidade**: Converter UUIDs de conexões brutos em labels amigáveis (ex: `Bybit - Conta Principal`) consultando dinamicamente o `useApiKeysStore`.
- **Filtro de Ruídos**: Filtrar logs desinteressantes vindos de dependências externas (como Vite ou React HMR) e manter apenas os logs de interesse do domínio da aplicação.

---

## 2. Estrutura de Arquivos a Criar e Modificar

### [NEW] `src/store/logStore.ts`
Implementar a store Zustand que gerencia as entradas de log em memória.

#### Requisitos Técnicos:
1. **Tipagem Estrita**:
   ```typescript
   export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DATA' | 'SYSTEM';

   export interface LogEntry {
     id: string;        // crypto.randomUUID()
     timestamp: number; // Date.now()
     level: LogLevel;
     source: string;    // Label amigável da conexão ou identificador do sistema (ex: 'SYSTEM', 'CACHE')
     message: string;   // Mensagem formatada
   }
   ```
2. **Configuração da Store**:
   - **Buffer Limit**: Limite padrão de 1000 logs (`maxEntries`). Ao atingir o limite, remover as entradas mais antigas (FIFO).
   - **Ações**:
     - `addLog(level: LogLevel, source: string, message: string)`: Insere um novo log e garante o limite máximo.
     - `clearLogs()`: Limpa todo o histórico de logs.

---

### [NEW] `src/services/logger.ts`
Responsável pela inicialização da interceptação e conversão de strings de logs brutas.

#### Requisitos Técnicos:
1. **Interceptação (Monkey-Patching)**:
   - Salvar referências originais de `console.log`, `console.warn` e `console.error`.
   - Substituir globalmente no objeto `window.console` para capturar os argumentos enviados.
   - **Garantia**: Sempre chamar as funções originais do console com `Function.prototype.apply` para que a depuração via DevTools continue funcionando sem alterações.

2. **Parser e Mapeamento de Padrões**:
   - Capturar logs originados das conexões websocket e REST.
   - Padrões comuns:
     - `[WS-${id}]` ou `[WS-${id}][Auth]`
     - `[REST-${id}]`
     - `[Time-Sync]`
     - `[HistoryCache]`
     - `[ExchangeAggregator]`
   - Para qualquer identificador `${id}` encontrado nos logs de `WS-` ou `REST-`, realizar a busca do `label` correspondente em `useApiKeysStore.getState().keys`.
     - Se encontrado: mapear para o formato `[Exchange - Label]` (ex: `Bybit - Main`).
     - Se não encontrado (ou se for mock data): usar um nome de fallback condizente.
   - Classificação de Níveis (`LogLevel`):
     - Logs interceptados por `console.error` ou contendo `[Error]` → `ERROR`
     - Logs interceptados por `console.warn` → `WARN`
     - Logs contendo `Ping enviado`, `Recebido: pong` ou `[Keep-Alive]` → `DATA`
     - Logs de sincronização de cache, tempo ou bootload → `SYSTEM`
     - Logs informativos gerais → `INFO`

3. **Filtro de Logs**:
   - Apenas logs contendo os prefixos da nossa aplicação (ex: `[WS-`, `[REST-`, `[Time-Sync]`, `[HistoryCache]`, `[ExchangeAggregator]`, `[BillsHistoryService]`, `[PositionHistoryService]`) devem ser gravados no `logStore`.
   - Isso evita o vazamento de memória e poluição com logs do bundler (Vite) ou de extensões do navegador.

---

### [MODIFY] `src/main.tsx`
Modificar o ponto de entrada da aplicação para inicializar o logger antes de renderizar o React.

#### Requisitos Técnicos:
- Importar `initializeLogger` do `src/services/logger.ts` e executá-lo imediatamente no início do arquivo.

---

## 3. Plano de Validação e Testes

### Teste Unitário (`tests/logger.test.ts`)
Criar testes para garantir:
1. O funcionamento do limite de buffer na store (remover itens antigos ao passar de 1000).
2. O parser de string mapeando corretamente `[WS-uuid]` para o label amigável correspondente se a chave existir na store de API keys.
3. Classificação correta dos níveis (`DATA`, `INFO`, `ERROR`, `WARN`, `SYSTEM`).

### Verificação Manual
1. Abrir a aplicação e verificar se a depuração do console nativo do navegador continua a funcionar.
2. Inspecionar o estado do `logStore` e confirmar se os logs de keep-alive (pings/pongs) estão sendo categorizados como `DATA` e contêm a origem mapeada de forma amigável.
