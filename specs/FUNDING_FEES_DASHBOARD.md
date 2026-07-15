# Funding Fees Dashboard — Design Specification (v2.0)

> **Status:** Final — reflects current implementation as of 2026-07-15
> **Author:** AI Development Session

---

## 1. Overview

A comprehensive Funding Fees Dashboard that consolidates real-time and historical funding rate data from **Bybit**, **Bitget**, and **OKX** perpetual swaps (USDT-M + COIN-M/Inverse). Built on top of the existing React 19 + Zustand + IndexedDB architecture.

### 1.1 Goals

- Provide a unified view of funding rates across 3 exchanges
- Cache historical funding data locally (IndexedDB) to minimize API calls
- Deliver real-time "next funding" updates via configurable REST polling
- Enable multi-period analysis (next, last, today, current month, last month, 3M, 6M, 1Y)
- **Incremental fetch:** once full cache depth is reached (~400 days), only fetch new records (1-2 pages) every 8h+
- Tooltips explaining rate direction (who pays whom), period definitions, and data limitations

### 1.2 Non-Goals

- Order execution or trading based on funding rates
- Real-time WebSocket streaming (REST polling only)
- Support for spot or options instruments
- Support for additional exchanges beyond Bybit, Bitget, OKX
- OKX deep sync via CSV download (not implemented — OKX limited to ~3 months of history via its API)

---

## 2. Architecture

```
                    ┌────────────────────────────────┐
                    │  App.tsx / useFundingSync hook  │
                    │  → fetchCurrentRates()          │
                    │  → syncHistoricalRates()        │
                    └──────────┬─────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   fundingStore.ts      FundingService.ts     historyCache.ts
   (Zustand state)      (API fetches)          (IndexedDB)
   - currentRates        - fetchCurrentRates   - fundingFees store
   - isSyncing           - fetchFundingHistory  - fundingMeta store
   - syncProgress         - Bybit               - save/get/getAll
   - favorites (persist)   - Bitget              - updateFundingMeta
   - lastHistoryFetch      - OKX
          │
          ▼
   useFundingData.ts
   (aggregation hook)
   - reads IndexedDB
   - groups by exchange-symbol
   - computes period sums
   - returns FundingFeeAggregated[]
          │
          ▼
   FundingDashboard.tsx
   (UI — table with accordion)
   - uses usePagination (25 coins/page)
   - RateTooltip + FundingRateFlash
   - FilterBar + favorites
```

---

## 3. Data Types (implemented in `src/types.ts`)

### 3.1 UnifiedFundingFee

The fundamental record for a single funding settlement event, stored in IndexedDB:

```typescript
export interface UnifiedFundingFee {
  id: string;                 // `${exchange}-${symbol}-${timestamp}`
  exchange: ExchangeName;     // 'bybit' | 'bitget' | 'okx'
  symbol: string;
  instrumentType: 'USDT-M' | 'COIN-M';
  timestamp: number;          // ms — the settlement time
  fundingRate: number;        // e.g. 0.0001 (decimal, not %)
  realizedRate?: number;      // OKX-specific: actual rate after cap/clamp
}
```

### 3.2 FundingFeeAggregated

The computed per-exchange-symbol aggregation row displayed in the UI:

```typescript
export interface FundingFeeAggregated {
  exchange: ExchangeName;
  symbol: string;
  instrumentType: 'USDT-M' | 'COIN-M';
  currentPrice?: number;
  nextFundingRate?: number;
  nextFundingTime?: number;
  lastFundingRate?: number;
  todaySum: number;
  currentMonthSum: number;
  lastMonthSum: number;
  last3MonthsSum: number;
  last6MonthsSum: number;
  yearSum: number;
}
```

### 3.3 CurrentFundingRate

Live funding rate snapshot fetched each polling cycle (defined in `FundingService.ts`):

```typescript
export interface CurrentFundingRate {
  exchange: ExchangeName;
  symbol: string;
  instrumentType: 'USDT-M' | 'COIN-M';
  fundingRate: number;
  nextFundingTime: number;    // ms timestamp
}
```

### 3.4 Period Definitions

| Period | Definition | Calculation | Excludes Current Month? |
|--------|-----------|-------------|------------------------|
| Next | Next scheduled settlement | Direct from current-rates API value | N/A |
| Last | Most recent completed settlement | First (newest) record from IndexedDB history | N/A |
| Today | 00:00 UTC today to now | Sum of fundings since day UTC start | N/A |
| Current Month | 1st of month to now | Sum of fundings since month start | N/A |
| Last Month | Previous complete calendar month | Sum of fundings (full month) | ✅ Yes |
| Last 3 Months | Previous 3 complete calendar months | Sum of fundings | ✅ Yes |
| Last 6 Months | Previous 6 complete calendar months | Sum of fundings | ✅ Yes |
| 1 Year | Previous 12 complete calendar months | Sum of fundings | ✅ Yes |

> **Important:** Multi-month aggregations (Last Month, 3M, 6M, 1Y) explicitly **exclude** the current month. The cut is anchored to the last complete calendar month. For example, if today is July 15 2026:
> - Last 3 Months = April 1 → June 30 (not March 15 → July 15)
> - Last 6 Months = January 1 → June 30
> - 1 Year = July 1 2025 → June 30 2026

### 3.5 OKX Limitation for 6M/1Y Averages

The average row at the coin level **excludes OKX** from the 6-month and 1-year columns because OKX's API has a hard limit of ~3 months of historical data. Including OKX would produce systematically lower averages that understate the true market rate. OKX values are still shown in individual rows.

---

## 4. Cache Strategy (IndexedDB via `historyCache.ts`)

### 4.1 Object Stores

| Store Name | Key | Indexes | Description |
|-----------|-----|---------|-------------|
| `fundingFees` | `id` (exchange-symbol-timestamp) | `by-exchange`, `by-symbol`, `by-fundingTime` | Individual funding rate records |
| `fundingMeta` | `id` (exchange-symbol) | `by-exchange` | Coverage metadata per symbol |

### 4.2 Metadata Schema (`FundingMeta`)

```typescript
interface FundingMeta {
  id: string;                 // "exchange-symbol"
  exchange: ExchangeName;
  symbol: string;
  oldestTimestamp: number;    // oldest record stored
  latestTimestamp: number;    // most recent record stored
  recordCount: number;
  updatedAt: number;
}
```

### 4.3 Sync Lifecycle — ProcessSymbol Decision Tree

The core logic lives in `processSymbol()` in `useFundingSync.ts`. For each symbol, it evaluates 6 scenarios:

```
                         ┌──────────┐
                         │ getMeta  │
                         └────┬─────┘
                              │
                   ┌──────────┴──────────┐
                   │     meta exists?    │
                   └──────────┬──────────┘
                         NÃO  │  SIM
                         ┌────┘
                         │
               ┌─────────┴─────────────────┐
               │ doFullFetch(rate)          │
               │  - no existing bounds      │
               │  - Bybit: 10 pages (400d)  │
               │  - Bitget: 15 pages (500d) │
               └────────────────────────────┘
                         
                    SIM ──┘
                    │
          ┌─────────┴──────────┐
          │  exchange = okx?   │
          └──────────┬─────────┘
                SIM  │  NÃO
                ┌────┘
                │
          ┌─────┴──────────────────────┐
          │  Fresh? (latest < 8h)      │
          │  → SKIP                    │
          │  Stale?                    │
          │  → doFullFetch(rate,       │
          │      oldest, latest)       │
          │    (Math.min/max preserves  │
          │     existing cache depth)  │
          └────────────────────────────┘

                NÃO ──┘
                │
          ┌─────┴───────────────────────────┐
          │  Fresh (latest < 8h)?            │
          │  + Deep (span >= 400d)?          │
          │  → SKIP ✅                        │
          └─────┬───────────────────────────┘
          ┌─────┴───────────────────────────┐
          │  Stale + Deep?                   │
          │  → doIncrementalFetch()          │
          │    (fetch 1-2 pages since        │
          │     latestTimestamp)             │
          └─────┬───────────────────────────┘
          ┌─────┴───────────────────────────┐
          │  Stale + Not Deep Enough?        │
          │  → doFullFetch(rate,             │
          │      oldest, latest)             │
          │    (extend depth)                │
          └──────────────────────────────────┘
```

### 4.4 Incremental Fetch (Bybit/Bitget only)

Once a symbol has accumulated ~400 days of cached data:

1. `fetchFundingHistory(sinceTimestamp=meta.latestTimestamp)`
2. Bybit: passes BOTH `startTime=sinceTimestamp` and `endTime=now` (avoids the "only startTime" API error)
3. Bitget: fetches 2 pages (200 records), filters by `timestamp > sinceTimestamp`
4. New records are saved to IndexedDB via `saveFundingFeesCache`
5. `meta.latestTimestamp` is updated to `newRecords[0].timestamp`

**This reduces each periodic sync from ~10 minutes to ~15 seconds.**

### 4.5 Lock Mechanism

| Guard | Type | Prevents |
|-------|------|----------|
| `syncInProgressRef` | `useRef(false)` | Duplicate sync runs |
| `fetchingRef` | `useRef(false)` | Duplicate current-rates fetches |
| `lastHistoryFetch` (ref + store) | timestamp | Re-triggering before configured interval elapses |

The UI state `isSyncing` is set to `true` during sync and auto-clears after a 3-second debounce.

---

## 5. API Endpoints

### 5.1 Bybit (Public — No Auth)

| Purpose | Endpoint | Params | Notes |
|---------|----------|--------|-------|
| Current rates | `GET /v5/market/tickers` | `category=linear` or `category=inverse` | Returns all symbols |
| Historical | `GET /v5/market/funding/history` | `category`, `symbol`, `startTime?`, `endTime`, `limit=200` | **Reverse pagination:** use `endTime` = oldest record's timestamp. Passing only `startTime` returns an error. |

**Fetch strategy:**
- Full (no `sinceTimestamp`): 10 pages × 200 records ≈ ~400 days
- Incremental: passes both `startTime` (sinceTimestamp) and `endTime` (now) — API returns records within that range
- Stop condition: oldest record's timestamp ≤ boundary (400 days ago or sinceTimestamp)

### 5.2 Bitget (Public — No Auth)

| Purpose | Endpoint | Params | Notes |
|---------|----------|--------|-------|
| Current rates | `GET /api/v2/mix/market/current-fund-rate` | `productType=USDT-FUTURES` / `COIN-FUTURES`, `symbol` (opt) | Batch fetch by product type |
| Historical | `GET /api/v2/mix/market/history-fund-rate` | `symbol`, `productType`, `pageSize=100`, `pageNo` | Page-based pagination |

**Fetch strategy:**
- Full: 15 pages in batches of 5 (parallel), stop at ~400 days depth
- Incremental: 2 pages in parallel, filter by `timestamp > sinceTimestamp`

### 5.3 OKX (Public — No Auth)

| Purpose | Endpoint | Params | Notes |
|---------|----------|--------|-------|
| Current rates | `GET /api/v5/public/funding-rate` | `instId` (e.g. `BTC-USD-SWAP`) | One per symbol |
| Historical | `GET /api/v5/public/funding-rate-history` | `instId`, `after`, `before`, `limit=100` | **Hard 3-month API limit**. 5 pages × 100 records. |

> **All requests route through `/api/proxy`** for CORS bypass. OKX is **never** fetched incrementally — it's always a full 5-page fetch when stale, because its API limit prevents accumulating meaningful depth beyond 3 months.

---

## 6. Polling & Sync Configuration

| Setting | Store field | Default | Range |
|---------|-----------|---------|-------|
| Current rates polling | `fundingPollingInterval` | 5 minutes | 1–60 minutes |
| History sync interval | `fundingHistoryInterval` | 4 hours | 1–24 hours |
| Concurrent batch size | `BATCH_SIZE = 20` | 20 symbols | Hardcoded |
| Batch delay | `BATCH_DELAY_MS = 300` | 300ms | Hardcoded |

### What happens each cycle:

1. **Poll timer fires** → `fetchCurrentRates()` → fetches all 3 exchanges in series, saves to store
2. **History timer check** → `syncHistoricalRates()` checks if `now - lastHistoryFetch ≥ fundingHistoryInterval`
3. **If yes:** iterates all known symbols in batches of 20, calling `processSymbol()` per symbol
4. **Each `processSymbol`** decides: full fetch, incremental fetch, or skip (based on the 6-scenario decision tree)
5. **Progress** reported via: `setSyncStatus(isSyncing, progress%, "message")`

---

## 7. UI Components

### 7.1 Component Tree

```
FundingDashboard
├── Header (title + StatusAndSyncBadge)
├── FilterBar
│   ├── Favorites toggle button
│   ├── Search input
│   ├── Exchange filter (All / bybit / bitget / okx)
│   └── Instrument filter (All / USDT-M / COIN-M)
├── [Loading state: spinner + message]
└── FundingTable (per instrument type)
    ├── Top Pagination (25 coins/page)
    ├── Table
    │   ├── Group header row (coin level)
    │   │   ├── Favorite star toggle
    │   │   ├── CoinIcon + coin name + "Avg" badge
    │   │   ├── Next funding (RateTooltip + FundingRateFlash)
    │   │   ├── Last funding (RateTooltip)
    │   │   ├── Today / Current Month / Last Month / 3M / 6M / 1Y (RateTooltip)
    │   │   └── **OKX excluded from avg 6M/1Y**
    │   └── Detail row (per exchange per coin, expandable)
    │       ├── ExchangeIcon + exchange name + symbol
    │       ├── Next funding (RateTooltip + FundingRateFlash + clock + local time)
    │       └── All period columns with RateTooltip
    ├── Bottom Pagination
    └── Footer note (historical columns + OKX limitation warning)
```

### 7.2 FundingTable (Accordion Table)

The main data display — a grouped table with expandable rows per coin.

**Header row** (visible at all times, click to expand):
```
[★] [CoinIcon] BTC [Avg badge]
Next: +0.0100% | Last: +0.0082% | Today: 0.0000% | ... | 1Y: +0.2105%
```

**Detail row** (visible on expand, one per exchange):
```
[ExchangeIcon] bybit  BTCPERP
Next: +0.0100%  🕐 07/15, 01:00 PM
Last: +0.0037% | Today: 0.0000% | ... | 1Y: +0.3121%
```

### 7.3 Pagination

- **25 coins per page** (grouped by base coin)
- Uses the existing `Pagination.tsx` and `usePagination` hook
- Both top and bottom pagination bars
- Dedicated `paginationId` per table instance

### 7.4 RateTooltip

Wraps every funding rate cell with an `AppTooltip` explaining:

```
[label]: 0.0100%

Direction: Longs → Shorts   (or: Shorts → Longs, or: Neutral)
Who Pays: Long positions are paying Short positions
```

Implementation in `FundingDashboard.tsx`:
- Uses `AppTooltip` with `description` + `rows` props
- Detects positive (Longs→Shorts), negative (Shorts→Longs), zero (Neutral)
- Applied to every rate value: next, last, today, monthly, 3M, 6M, 1Y

### 7.5 FundingRateFlash

Applied exclusively to the **Next funding** column (the only dynamically changing value):

```css
/* tailwind classes */
.animate-funding-flash-up {
  animation: fundingFlashUp 0.8s ease-out;
  /* glow green */
}
.animate-funding-flash-down {
  animation: fundingFlashDown 0.8s ease-out;
  /* glow red */
}
```

Triggers on value change: green flash when rate increases, red flash when rate decreases. Fades out over 800ms.

### 7.6 Column Tooltips (ThTooltip)

Each column header has a tooltip explaining what the column represents, using `AppTooltip`. Content defined in `COLUMN_TOOLTIPS` constant.

### 7.7 Local Time Display

Next funding time shown in **user's local timezone** (via `toLocaleString`) with:
- **Clock icon** (lucide-react `Clock` component)
- **Format:** `MM/DD, HH:MM AM/PM`
- **Hover tooltip:** full date with year, month name, hours, minutes, seconds

### 7.8 Color Scheme

| Condition | Color | Applied to |
|-----------|-------|-----------|
| Positive rate | `text-green-400` | Next, Last, all sums |
| Negative rate | `text-red-400` | Next, Last, all sums |
| Zero / undefined | `text-white` / `text-[#8E9299]` | Next, Last |
| Subtitle / disabled | `text-[#8E9299]` | --- placeholder |

Header tooltip columns with historical data (Last Month, 3M, 6M, 1Y) are styled with `text-yellow-500/80` to indicate they exclude the current month.

### 7.9 Exchange Badge Colors

| Exchange | Border/Text Color |
|----------|------------------|
| Bitget | `#03aac7` (cyan) |
| Bybit | `#ff9c2e` (orange) |
| OKX | `#ffffff` (white) |

---

## 8. Aggregation Logic (`useFundingData.ts`)

### 8.1 Data Flow

1. `getAllFundingFees()` reads all records from IndexedDB `fundingFees` store
2. Records are sorted descending by timestamp
3. Current rates from `fundingStore.currentRates` are merged with history
4. For each exchange-symbol pair, period sums are computed

### 8.2 Period Cut Timestamps

```typescript
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
const lastMonthEnd = currentMonthStart - 1;  // end of previous month
const threeMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime();
const sixMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 6, 1).getTime();
const oneYearAgoStart = new Date(now.getFullYear() - 1, now.getMonth() - 1, 1).getTime();
```

### 8.3 Critical Rules

1. **Last Month, 3M, 6M, 1Y** — only records with `timestamp < currentMonthStart` are counted (excludes current month)
2. **Last funding rate** — set from the first (most recent) historical record seen
3. **6M and 1Y averages** — OKX is excluded because its 3-month API limit would produce systematically lower values
4. **Today / Current Month** — include all records from `todayStart` and `currentMonthStart` respectively
5. **Funding rates are summed** (not averaged) — each period total is a simple sum of `fundingRate` values

---

## 9. Error States & Edge Cases

| Case | Handling |
|------|----------|
| No exchanges configured | Empty state with spinner, no data loaded |
| Cache miss (first load) | Full background sync (all 6 scenarios), shows loading skeleton until data arrives |
| API rate limited | Per-exchange per-batch: individual `processSymbol` failures don't block others. Logged but skipped. |
| Network offline | Uses cached IndexedDB data ("stale" badge). Next poll cycle will retry. |
| Symbol delisted | Removed from cache on next sync cycle (current rates won't return it) |
| Empty history for a symbol | Show `---` placeholder for all historical columns |
| No new records in incremental fetch | `doIncrementalFetch` silently returns, meta unchanged (harmless — new records will come next cycle) |
| Clear cache event | `window` event `'funding-cache-cleared'` triggers an immediate `forceSync()` |
| Zero funding rates | Display `---` instead of `0.0000%` for aggregated columns where sum is exactly 0 |

---

## 10. Files

### Created

| Path | Description |
|------|-------------|
| `src/services/funding/FundingService.ts` | API fetch logic for all 3 exchanges + `CurrentFundingRate` interface |
| `src/store/fundingStore.ts` | Zustand state (rates, sync status, favorites, lastHistoryFetch) |
| `src/hooks/useFundingSync.ts` | Sync orchestration: polling, batching, `processSymbol` decision tree |
| `src/hooks/useFundingData.ts` | Aggregation: reads IndexedDB, computes period sums |
| `src/components/analytics/FundingFees/FundingDashboard.tsx` | Full dashboard UI |
| `src/services/__tests__/FundingService.test.ts` | 11 unit tests for fetch logic |
| `src/hooks/__tests__/processSymbol.test.ts` | 13 unit tests for decision tree (all 6 scenarios + errors) |

### Modified

| Path | Change |
|------|--------|
| `src/types.ts` | Added `UnifiedFundingFee`, `FundingFeeAggregated` |
| `src/services/historyCache.ts` | Added `fundingFees` and `fundingMeta` object stores (DB_VERSION 5) + `saveFundingFeesCache`, `getFundingFeesBySymbol`, `getAllFundingFees`, `getFundingMeta`, `updateFundingMeta` |
| `src/store/settingsStore.ts` | Added `fundingPollingInterval`, `fundingHistoryInterval`, `setLastSyncTime` |
| `src/components/Sidebar.tsx` | Added "Funding Fees" link under Analytics |
| `src/App.tsx` | Initializes `useFundingSync` |

---

## 11. Decision Log

| # | Decision | Alternatives | Rationale |
|---|---|---|---|
| D1 | Single `FundingService` class | Separate per-exchange services | Cleaner, follows existing patterns |
| D2 | REST polling for live data | WebSocket | Serverless-compatible, simpler |
| D3 | Configurable polling (1-60 min) | Fixed interval | User flexibility |
| D4 | Cache in IndexedDB (extend historyCache) | Separate DB | Reuse proven pattern + versioned migrations |
| D5 | 20-symbol parallel batches | Sequential, 5-symbol | Balances speed vs rate limits |
| D6 | Incremental fetch after full depth | Always full fetch | ~85% reduction in API calls per sync cycle |
| D7 | OKX: no incremental fetch (3-month API limit) | CSV download, incremental | OKX API doesn't support >3mo. Cache accumulates naturally over time. |
| D8 | Exclude current month from multi-month aggregates | Include current month | Consistent definitions — "last 3 months" means 3 completed months |
| D9 | Exclude OKX from 6M/1Y averages | Include OKX (with note) | Including OKX with partial data would produce misleading averages |
| D10 | Tooltips on every rate cell | Only column headers | Users need to understand what each value means immediately |
| D11 | FundingRateFlash on next funding only | Flash on all columns | Only next funding changes dynamically |
| D12 | Reverse pagination for Bybit (endTime-based) | Standard page-based | Bybit API doesn't support page numbers; only cursor-based reverse pagination |
| D13 | `processSymbol` exported for testing | Inline logic | Enables comprehensive unit testing of the 6-scenario decision tree |
