# 🏛 Project Constitution & Architecture Guidelines (AGENTS.md)

## 1. Core Principles
- **Intentionality First**: Code is a derivative of specifications. Always check `@specs/` before implementing [3, 4].
- **Single Responsibility (SRP)**: Each module and function must do exactly one thing [5, 6].
- **Clean Over Clever**: Favor readable, linear code with "Return Early" patterns over complex nesting [6, 7].

## 2. Directory Structure & Modularization (✅ FASE 1: CONCLUÍDA)
To prevent "Context Rot" and "Utils Bloat", follow this strict partitioning [1, 8]:

- `src/services/adapters/`: **Normalization Layer**. Adaptadores específicos para cada exchange que convertem payloads brutos (Bybit V5, OKX V5, Bitget V2) para interfaces unificadas do sistema (ex: `UnifiedPosition`, `UnifiedHistoryPosition`, `BalanceItem`). [Turno 21 - Completamente Implementado via Strategy/Adapters para REST e WS].
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

## 5. Resiliência e Desempenho (🚧 FASE 2: PLANEJADA)
Para gerenciar o alto fluxo de dados do WebSocket de Trading, aderimos aos seguintes mandamentos de estabilidade:
- **State Offloading (Zustand Otimizado)**: Evitar renders em cascata não assinando toda a global store de uma vez em componentes React pesados; isolamento de sub-stores e `selectors`. Componentes devem reagir a deltas restritos.
- **Circuit Breakers & Network Healing**: Qualquer serviço com polling ou streams (WS) deve possuir políticas automáticas de Retry. Disconnects do WSS devem rodar exponential backoffs e gerenciar localmente timeouts com "Liveness Probes" (Ping/Pong).
- **Graceful UI Fallbacks**: Se APIs V5 de REST ou WS rate-limitarem ou tomarem timeout (Cors/WAF em proxy), a interface deve permanecer íntegra renderizando *Stale Data* mas emitindo status visual (Disconnected/Reconnecting) para os usuários.

