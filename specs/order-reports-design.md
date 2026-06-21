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
