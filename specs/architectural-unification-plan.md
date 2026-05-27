# Architectural Unification Plan

This document outlines the tasks and execution plan to unify data properties across the application, reducing ad-hoc string parsing and hacky fallback logic in the UI layer. By extracting responsibilities to the adapter and introducing typed unifiers, we ensure the UI focuses strictly on presentation.

## Target Unifications

- **Position Side (`side`)**: Standardize 'long', 'short', 'net' translation.
- **Margin Mode (`marginMode`)**: Standardize 'cross', 'isolated' translation across all brokers.
- **Asset Identification (`baseCoin` & `quoteCoin`)**: Pre-parse these on the adapter side so the UI doesn't need to split strings like `symbol.split('-')[0]`.
- **Margin/Settle Currency (`ccy`)**: Standardize fallback logic to always ensure a valid currency is populated.

## Task Checklist

- [x] **Task 1: Unification Utility Functions**
  - Create `/src/utils/unifiers.ts` containing standard mapping logic (`mapPositionSide`, `mapMarginMode`, `extractBaseCoin`, `extractQuoteCoin`, `extractCcy`).
- [x] **Task 2: Interface Update**
  - Update `UnifiedPosition`, `UnifiedHistoryPosition`, `UnifiedBalance` in `/src/types.ts` to include `baseCoin`, `quoteCoin`, and strong `marginMode` types.
- [x] **Task 3: Refactor Adapters**
  - Update `OkxAdapter.ts` to use unifiers.
  - Update `BybitAdapter.ts` to use unifiers.
  - Update `BitgetAdapter.ts` to use unifiers.
- [x] **Task 4: Mock Data Updates**
  - Update `/src/mock/generateMocks.js` to populate `baseCoin` and `quoteCoin` correctly for all positions and histories. Run the generation script.
- [x] **Task 5: UI Layer Cleanup**
  - Sweep `HedgeProDashboard.tsx`, `ClosedPositions.tsx`, `OpenPositions.tsx`, `PnLBySymbol.tsx`, `CrossExchangeAssetsChart.tsx` to utilize `baseCoin` and `quoteCoin` instead of string splits.
- [x] **Task 6: Documentation**
  - Update `/specs/unified-interfaces.md` with the new fields and mapping tables.
