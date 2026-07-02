# Implementation Tasks: Order Reports (MVP)

## Phase 1: Core Interfaces & Adapters Enrichment
- [x] Task 1.1: Define `UnifiedOrder`, `UnifiedOrderStatus`, and `UnifiedOrderType` interfaces inside `src/types.ts`.
- [x] Task 1.2: Update `IExchangeAdapter.ts` to include `getOpenOrders(params)` and `getHistoryOrders(params)` signatures.
- [x] Task 1.3: Implement `getOpenOrders` and `getHistoryOrders` in `BybitAdapter.ts`, mapping responses to `UnifiedOrder`.
- [x] Task 1.4: Implement `getOpenOrders` and `getHistoryOrders` in `BitgetAdapter.ts`, mapping responses to `UnifiedOrder`.
- [x] Task 1.5: Implement `getOpenOrders` and `getHistoryOrders` in `OkxAdapter.ts`, mapping responses to `UnifiedOrder`.

## Phase 2: Aggregation & Logic Hooks
- [x] Task 2.1: Implement logic in `ExchangeAggregator.ts` (or a dedicated `OrderReportAggregator.ts`) to fetch logically across connected accounts, utilizing `Promise.allSettled`.
- [x] Task 2.2: Create custom hook `useOrderReports.ts` to manage querying, loading, error catching, and caching states for the reports.

## Phase 3: UI Implementation
- [x] Task 3.1: Create UI components in `src/components/analytics/OrderReports/`: `OrderReportsDashboard`, `OrderFilters`, `OrdersTable`.
- [x] Task 3.2: Implement Filter UI with dropdowns using Tailwind.
- [x] Task 3.3: Build the `OrdersTable` layout (Responsive, precise typography `font-mono` for numbers).
- [x] Task 3.4: Implement Expand/Collapse row behavior (`OrderRow` and `OrderRowExpanded`) to show fees and raw IDs.

## Phase 4: Integration
- [x] Task 4.1: Inject `OrderReportsDashboard` into `src/components/MvpTestsDashboard.tsx` or a navigation link to it.
- [x] Task 4.2: Perform manual UI testing, validating edge cases where endpoints return empty lists or API errors.

## Acceptance Criteria
- Exact precision logic using `Big.js` is verified.
- Statuses and Order types map correctly across all 3 exchanges.
- Network requests are isolated (error in Bitget shouldn't crash Bybit load).
- No console error warnings about React Keys or missing dependencies.
- Expand row functions seamlessly without jank.
