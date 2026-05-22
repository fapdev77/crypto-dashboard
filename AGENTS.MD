# 🏛 Project Constitution & Architecture Guidelines (AGENTS.md)

## 1. Core Principles
- **Intentionality First**: Code is a derivative of specifications. Always check `@specs/` before implementing [3, 4].
- **Single Responsibility (SRP)**: Each module and function must do exactly one thing [5, 6].
- **Clean Over Clever**: Favor readable, linear code with "Return Early" patterns over complex nesting [6, 7].

## 2. Directory Structure & Modularization
To prevent "Context Rot" and "Utils Bloat", follow this strict partitioning [1, 8]:

- `src/services/adapters/`: **Normalization Layer**. Adaptadores específicos para cada exchange que convertem payloads brutos (Bybit V5, OKX V5, Bitget V2) para interfaces unificadas do sistema (ex: `UnifiedPosition`) [180, Turno 21].
- `src/utils/`: Only pure, stateless functions.
    - `math-crypto.ts`: Calculations for PnL, ROE, and margin using `Big.js` [Turno 21].
    - `formatters.ts`: Visual formatting for currencies (USD/BRL) and crypto precision [9].
- `src/hooks/`: React-specific shared logic (ex: `useExchangeAuth`, `usePortfolioSync`) [Turno 14].

## 3. Coding Standards for AI
- **No Giant Utils**: Files must not exceed 300 lines. If it grows, split it into sub-modules [8, 10].
- **Naming**: Avoid noise words like `data` or `info`. Use names that reflect business intent (ex: `calculateLiquidationPrice` instead of `getLiq`) [9, 11].
- **Error Handling**: Use explicit exceptions and types. Validate inputs early in the function [12, 13].

## 4. Normalization Layer Contract
All exchange-specific data must pass through an adapter before reaching the UI components. No raw API responses allowed in React components [14].
