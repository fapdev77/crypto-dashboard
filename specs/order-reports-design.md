# Order Reports (MVP) - Design Document

## 1. Architectural Overview

The Order Reports feature will exist as a distinct widget/view within the `MvpTestsDashboard` component, maintaining the single-page application nature but leveraging dynamic rendering based on filter states.

### 1.1 Service Layer
- **`IExchangeAdapter` updates:** Need to ensure/add `getOpenOrders(params)` and `getHistoryOrders(params)` methods.
- **`OrderReportAggregator.ts` (New):** A service mimicking `ExchangeAggregator` or adding specific order-fetching methods inside `ExchangeAggregator.ts`.
  - Responsible for delegating to specific exchange adapters.
  - Normalizes the returned raw data to `UnifiedOrder`.

### 1.2 Hooks Layer
- **`useOrderReports.ts`:**
  - Manages fetch state (loading, error, data).
  - Listens to global connections.
  - Implements the polling or manual refresh trigger.
  - Accepts filtering parameters to avoid over-fetching.

### 1.3 State Management (Local vs Global)
Given filters are specific to this view, the filter state will be kept local to the `OrderReports` component or within a lightweight context if needed, avoiding polluting the global Zustand store unnecessarily.

## 2. Component Tree

```
src/components/analytics/OrderReports/
│
├── OrderReportsDashboard.tsx    # Main container
│
├── OrderFilters.tsx             # Dropdowns (Exchange, Symbol, Type, Time)
│
├── OrdersTable/
│   ├── OrdersTable.tsx          # Responsive table container
│   ├── OrdersTableHeader.tsx    # Table headers
│   ├── OrderRow.tsx             # Individual row with summary
│   └── OrderRowExpanded.tsx     # The expanded details (Fees, IDs, Trigger info)
│
└── OrderStatsStrip.tsx          # Optional: Quick metrics (Total pending, Executed in period)
```

## 3. Filtering Strategy

- **Backend Filtering vs. Frontend Filtering:**
  - **Time Periods, Exchange:** Must be passed to the API to reduce payload size.
  - **Account/Wallet:** Passed to the API as parameters.
  - **Symbol, Order Type:** Best passed to API for history (due to volume). For open orders, might be filtered client-side if the payload is small, but API filtering is preferred.

## 4. Visual Design Rules
- Minimalist Dark/Light theme respecting Tailwind configuration.
- **Colors:**
  - Buy/Long: Subtle Green (`text-green-500` / `text-green-400`).
  - Sell/Short: Subtle Red (`text-red-500` / `text-red-400`).
- **Typography:** Inter for standard text, JetBrains Mono for transaction IDs, symbol pairs, and numeric values (prices/quantities).
- **Tooltips:** Use `<AppTooltip />` for any abbreviated statuses or complex values (e.g. `Reduce-only: Yes`).

---

## 5. Final Implementation Details

The Order Reports feature was successfully implemented following the Solid Principles (specifically SRP and Strategy Pattern):

### 5.1 Caching and Sync Engine (`OrderHistoryService`)
- **Dedicated Orchestration Layer:** The `OrderHistoryService` was established inside `src/services/orders/OrderHistoryService.ts`. It mimics the pattern of `PositionHistoryService` by managing the integration between the exchange adapters and the IndexedDB (`crypto-dashboard-cache`) database.
- **Background Keep-Warm Polling:** This service is integrated into the universal `useHistoryCachePolling` hook. Every polling cycle (default: 15 minutes) updates both the historical positions and the historical/closed orders in the background, keeping the cache warm across active connections.
- **SWR (Stale-While-Revalidate) in UI:** The `useOrderReports` hook implements SWR by loading cached orders immediately from IndexedDB for instantaneous UI rendering, then initiating a silent, non-blocking background fetch using `OrderHistoryService` to pull any missing/incremental records and update the UI seamlessly.

### 5.2 Resolution of recently Closed/Canceled Orders Gap
To guarantee that a recently closed or canceled order (which is instantly removed from the open orders stream) is captured immediately in the historical order report, several technical enhancements were implemented:
1. **At Least 14-Day Lookback Window:** During incremental updates, the `OrderHistoryService` calculates a query start time looking back at least 14 days prior to the last fetched timestamp (up to a 90-day absolute limit). This safety lookback window covers any open orders that were created recently and closed/canceled in the period between fetches.
2. **Double-Endpoint Fetching for OKX (V5):**
   - OKX segregates order history into `/api/v5/trade/orders-history` (last 7 days of recently filled/canceled/active orders) and `/api/v5/trade/orders-history-archive` (older historical orders up to 90 days).
   - The `OkxAdapter` was updated to perform parallel fetches to both endpoints during historical order retrieval. The results are merged and de-duplicated by their unique exchange order ID (`ordId`) on the client side. This ensures recently canceled or filled orders within the 7-day threshold are immediately captured and cached, eliminating any delay or sync gaps!
3. **Bypassing Cache Cooldown on Manual Sync:**
   - When the user clicks the "Force Sync" or "Sync Now" button via the `StatusAndSyncBadge` component, the system sets the global `lastSyncTime` state to `0`.
   - This signals a complete cache-bypass to all active hooks (`usePnLBySymbol`, `usePositionHistory`, `useOrderReports`). Instead of relying on the cooldown logic, they immediately execute direct REST queries to pull fresh histories from all exchange endpoints and rewrite the local IndexedDB states, guaranteeing instant updates.

