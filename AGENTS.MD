# 🏛 Project Constitution & Architecture Guidelines (AGENTS.md)

## 1. Core Principles
- **Intentionality First**: Code is a derivative of specifications. Always check `@specs/` before implementing [3, 4].
- **Single Responsibility (SRP)**: Each module and function must do exactly one thing [5, 6].
- **Clean Over Clever**: Favor readable, linear code with "Return Early" patterns over complex nesting [6, 7].

## 2. Directory Structure & Modularization (✅ FASE 1: CONCLUÍDA)
To prevent "Context Rot" and "Utils Bloat", follow this strict partitioning [1, 8]:

- `src/services/adapters/`: **Normalization Layer**. Adaptadores consolidados em um único arquivo por exchange (ex: `BybitAdapter.ts`) que convertem payloads brutos para interfaces unificadas do sistema (ex: `UnifiedPosition`, `UnifiedHistoryPosition`, `BalanceItem`). [Completamente Implementado via Strategy/Adapters para REST e WS na Fase 3].
- `src/utils/`: Only pure, stateless functions.
    - `math-crypto.ts`: Calculations for PnL, ROE, and margin using `Big.js` ou funções puras padronizadas [Turno 21].
    - `formatters.ts`: Visual formatting for currencies (USD/BRL) and crypto precision, isolando toda lógica de UX numérica da UI [9].
- `src/hooks/`: React-specific shared logic (ex: `useMultiExchangeWS`, `usePositionHistory`). UI não deve implementar `fetch` ou lógicas de WebSocket nativas [Turno 14].

## 3. Coding Standards for AI
- **No Giant Utils**: Files must not exceed 300 lines. If it grows, split it into sub-modules [8, 10].
- **Naming**: Avoid noise words like `data` or `info`. Use names that reflect business intent (ex: `calculateLiquidationPrice` instead of `getLiq`) [9, 11].
- **Error Handling**: Use explicit exceptions and types. Validate inputs early in the function [12, 13].

## 4. Normalization Layer Contract (✅ FASE 1: CONCLUÍDA)
All exchange-specific data must pass through an adapter (`src/services/adapters/`) before reaching the UI components. No raw API responses allowed in React components. UI Components expect strict interfaces like `UnifiedPosition` or `BalanceItem` [14].

> **Exceção (Tech Debt Permitido):** O componente `ApiTester` atua estritamente como ferramenta interna (Dev Tools) para testes de conectividade e validação bruta. Embora utilize os adapters consolidados para autenticação (ex: `BybitAdapter.getWsAuth`), ele intencionalmente consome e renderiza os payloads JSON brutos diretamente na tela, isentando-o temporariamente do escopo da camada de normalização de UI.

## 5. Resiliência, Desempenho e Armazenamento Local (✅ FASE 2: CONCLUÍDA)
Para gerenciar o alto fluxo de dados do WebSocket de Trading, aderimos aos seguintes mandamentos de estabilidade:
- **State Offloading (Zustand Otimizado)**: Evitamos renders em cascata não assinando toda a global store de uma vez em componentes React pesados; isolamento de sub-stores e `selectors`. Componentes reagem ativamente apenas a deltas restritos.
- **Circuit Breakers & Network Healing**: Qualquer serviço com polling ou streams (WS) possui políticas automáticas de Retry. Disconnects do WSS rodam exponential backoffs e gerenciam timeouts locais com "Liveness Probes" (Ping/Pong).
- **Graceful UI Fallbacks**: Se APIs V5 de REST ou WS rate-limitarem ou tomarem timeout (Cors/WAF em proxy), a interface permanece íntegra renderizando *Stale Data* mas emitindo status visual (Disconnected/Reconnecting) e Toasts textuais para os usuários.
- **Indexação Local (IndexedDB)**: Implementação fundamental concluída via `idb`. Operações analíticas custosas (PnL History, Win Rates e Seasonality) agora desfrutam de Cache Local persistente para sanar requisições sucessivas longas para *Position History APIs*, agilizando carregamentos pesados (com opção nativa de cache bypass em `Settings`).

## 6. Fase 3 (Consolidação Multi-Exchange e Precisão) - (✅ CONCLUÍDA)
A arquitetura atingiu maturidade através das seguintes implementações:
- **Adapters Consolidados**: Estruturas legadas separadas por endpoint (ex: `adapters/bybit/RestAdapter.ts`) foram consolidadas em adaptadores únicos coesos (ex: `BybitAdapter.ts`) que contêm REST bootloading, fetch de histórico, fetch de bills e parse de websockets em tempo real, limitados a 400 linhas.
- **REST Bootloader Aggregator**: O `ExchangeAggregator` agora orquestra a inicialização paralela REST para *todas* as exchanges (mitigando ausência de snapshots de saldo em exchanges puramente baseadas em delta WSS).
- **Regras Rígidas de Formatação (SDD)**: Imposição sistêmica de formatação nativa na UI com 2 casas decimais para Stablecoins/Fiats e 8 casas decimais para Crypto Assets (`src/utils/formatters.ts`), garantido via Unit Tests rigorosos (`Vitest`).
