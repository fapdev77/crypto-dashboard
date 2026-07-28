# Funding Fees Dashboard — Design Specification (v3.0)

> **Status:** Final — reflects current implementation as of 2026-07-15
> **Author:** AI Development Session

---

## 1. Overview

A comprehensive Funding Fees Dashboard that consolidates real-time and historical funding rate data from **Bybit**, **Bitget**, and **OKX** perpetual swaps (USDT-M + COIN-M/Inverse). Built on top of the existing React 19 + Zustand + IndexedDB architecture.

### 1.1 Goals

- Provide a unified view of funding rates across 3 exchanges
- Cache aggregated funding data locally (IndexedDB) to minimize API calls
- Deliver real-time "next funding" updates via configurable REST polling
- Enable multi-period analysis (next, last, today, current month, last month, 3M, 6M, 1Y)
- **Aggregation-first:** Pre-compute all period sums in `FundingService` before persistence; no in-memory recomputation
- **Full recalculation on every sync:** No incremental fetch — always re-fetch from APIs and re-aggregate
- **Auto-sync scheduling:** Automatically sync 1 minute after the next funding payment time
- Performance monitoring: track timing per exchange and per sync cycle with persistence across sessions

### 1.2 Non-Goals

- Order execution or trading based on funding rates
- Real-time WebSocket streaming (REST polling only)
- Support for spot or options instruments
- Support for additional exchanges beyond Bybit, Bitget, OKX
- OKX deep sync via CSV download (not implemented — OKX limited to ~3 months of history via its API)

---

## 2. Architecture

```
                    ┌──────────────────────────────────────┐
                    │  App.tsx / useFundingSync hook        │
                    │  → fetchCurrentRates()                │
                    │    (all 3 exchanges, sequential)      │
                    │  → scheduleNextAutoSync()             │
                    │    (nearest fundingTime + 1min)       │
                    │  → syncHistoricalRates(rates)         │
                    │    (per-exchange parallel)            │
                    └──────────┬───────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   fundingStore.ts      FundingService.ts     historyCache.ts
   (Zustand state)      (API fetches + agg)    (IndexedDB)
   - currentRates        - fetchCurrentRates   - funding-summaries
   - isSyncing           - fetchAndAggregate    - funding-meta
   - syncProgress          Summary()            - saveFundingSummaries
   - favorites (persist)  - Bybit/OKX/Bitget      Batch()
   - lastHistoryFetch       pagination           - getAllFunding
   - lastSyncPerformance  - aggregateData()        Summaries()
   - lastExchangeTimings  - buildAggregation    - clearFunding
   - nextFundingTime        Boundaries()          SummariesCache()
   - nextScheduledSyncTime - zeroSummary()
          │
          ▼
   useFundingData.ts
   (lightweight read path)
   - reads IndexedDB (getAllFundingSummaries)
   - merges with fundingStore.currentRates
   - simple parseFloat() mapping — no computation
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

### 3.1 FundingRateSummary (Primary Storage Interface)

The **only** funding data persisted in IndexedDB. A single row per exchange-symbol stores all pre-computed period sums:

```typescript
export interface FundingRateSummary {
  id: string;                      // `${exchange}-${symbol}`
  exchange: ExchangeName;
  symbol: string;
  instrumentType: 'USDT-M' | 'COIN-M';
  last12MonthsFundingRate?: string; // Big.js toFixed(8) — optional (Bybit only)
  last6MonthsFundingRate?: string;  // Big.js toFixed(8) — optional (Bybit only)
  last3MonthsFundingRate: string;   // Big.js toFixed(8)
  lastMonthFundingRate: string;     // Big.js toFixed(8)
  currentMonthFundingRate: string;  // Big.js toFixed(8)
  todayFundingRate: string;         // Big.js toFixed(8)
  lastFundingRate: string;          // Rate of most recent settlement
  lastFundingTime: string;          // ms timestamp as string
  updatedAt: number;                // ms timestamp
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
  last6MonthsSum?: number;    // undefined for OKX/Bitget (~3mo limit)
  yearSum?: number;           // undefined for OKX/Bitget (~3mo limit)
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
| Last | Most recent completed settlement | `summaries[0].lastFundingRate` (from `FundingRateSummary`) | N/A |
| Today | 00:00 UTC today to now | Sum of fundings since day UTC start | N/A |
| Current Month | 1st of month to now | Sum of fundings since month start | N/A |
| Last Month | Previous complete calendar month | Sum of fundings (full month) | ✅ Yes |
| Last 3 Months | Previous 3 complete calendar months | Sum of fundings | ✅ Yes |
| Last 6 Months | Previous 6 complete calendar months | Sum of fundings | ✅ Yes (Bybit only) |
| 1 Year | Previous 12 complete calendar months | Sum of fundings | ✅ Yes (Bybit only) |

> **Important:** Multi-month aggregations (Last Month, 3M, 6M, 1Y) explicitly **exclude** the current month. The cut is anchored to the 1st of the current month.

> **OKX restriction:** 6M and 1Y columns show `---` (undefined) for OKX due to its hard ~3-month API limit.
> **Bitget:** Depth varies per symbol funding frequency. With up to 15 pages × 100 records, some symbols may reach 6M/12M depth; in practice, `last6MonthsFundingRate`/`last12MonthsFundingRate` may be `undefined` if insufficient records exist.

### 3.5 OKX Limitation for 6M/1Y Averages

The average row at the coin level **excludes OKX** from the 6-month and 1-year columns because OKX's API has a hard limit of ~3 months of historical data. Including OKX would produce systematically lower averages that understate the true market rate. OKX values are still shown in individual rows.

---

## 4. Cache Strategy (IndexedDB via `historyCache.ts`)

### 4.1 Object Stores (DB_VERSION 10)

| Store Name | Key | Indexes | Description |
|-----------|-----|---------|-------------|
| `funding-summaries` | `id` (exchange-symbol) | `by-exchange`, `by-symbol` | Pre-computed period sums (removed old `funding-fees` store) |
| `funding-meta` | `id` (exchange-symbol) | `by-exchange` | Coverage metadata for freshness guard |

### 4.2 Metadata Schema (`FundingMeta`)

```typescript
interface FundingMeta {
  id: string;                 // "exchange-symbol"
  exchange: ExchangeName;
  symbol: string;
  oldestTimestamp: number;    // oldest record stored
  latestTimestamp: number;    // most recent record stored (used for freshness guard)
  recordCount: number;
  updatedAt: number;
}
```

### 4.3 Sync Lifecycle — Aggregation-First Approach

The old pipeline (store raw records → recompute in-memory via `useMemo`) has been replaced with an **aggregation-first** approach:

```
useFundingSync.syncHistoricalRates()
  → Group currentRates by exchange
  → Promise.all([exchange1, exchange2, exchange3]) [parallel exchanges]
    → syncExchange(exchange, rates, now)
      → Check freshness via getFundingMeta (8h stale guard)
      → asyncPool(staleRates, CONCURRENCY[exchange])
        → processSummaryForSymbol(rate)
          1. FundingService.fetchAndAggregateSummary(exchange, symbol, type)
             → Exchange-specific pagination (fetch raw records)
             → Big.js bucket accumulation (aggregateData)
             → Return FundingRateSummary
          2. (non-zero summary) → save to batch array
      → Log per-exchange timing report
  → saveFundingSummariesBatch(allSummaries) [single IndexedDB transaction]
  → Persist performance data to fundingStore (lastSyncPerformance, lastExchangeTimings)
  → Update lastHistoryFetch, setNextFundingTime, scheduleNextAutoSync
```

### 4.4 Freshness Guard

```
For each symbol:
  meta = getFundingMeta(exchange, symbol)
  if meta && (now - meta.latestTimestamp) < FUNDING_CYCLE_MS (8h) → SKIP
```

Only symbols whose metadata indicates staleness (≥8h since last update) are re-fetched. This typically reduces each sync cycle to 10-30% of total symbols.

### 4.5 Concurrency Control

| Guard | Level | Implementation |
|-------|-------|---------------|
| Historical sync | Module (all instances) | `syncInProgressRef = { current: false }` — shared across all mounted hooks |
| Current rates fetch | Module (all instances) | `fetchingRef = { current: false }` — prevents concurrent fetches |
| Rate-limit interval | Per-symbol | `getFundingMeta` freshness check (8h) |
| Batch concurrency | Per-exchange | `asyncPool(items, CONCURRENCY[exchange])` — 6 for Bybit/Bitget, 4 for OKX |
| Restart queuing | Module (all instances) | `restartRequestedRef = { current: false }` — queues forceSync if already running |

---

## 5. API Endpoints

### 5.1 Bybit (Public — No Auth)

| Purpose | Endpoint | Params | Notes |
|---------|----------|--------|-------|
| Current rates | `GET /v5/market/tickers` | `category=linear` or `category=inverse` | Returns all symbols |
| Historical | `GET /v5/market/funding/history` | `category`, `symbol`, `endTime`, `limit=200` | **Reverse pagination:** `endTime = oldest.fundingRateTimestamp - 1` |

**Fetch strategy (aggregation path):**
- 10 pages × 200 records, 65ms delay between pages
- Stop conditions: oldest record ≤ last12MStart, or partial page (< 200)
- Field mapping: `fundingRateTimestamp → fundingTime`, `fundingRate → fundingRate`

### 5.2 Bitget (Public — No Auth)

| Purpose | Endpoint | Params | Notes |
|---------|----------|--------|-------|
| Current rates | `GET /api/v2/mix/market/current-fund-rate` | `productType=USDT-FUTURES` / `COIN-FUTURES` | Batch fetch by product type |
| Historical | `GET /api/v2/mix/market/history-fund-rate` | `symbol`, `productType`, `pageSize=100`, `pageNo` | Page-based pagination |

**Fetch strategy (aggregation path):**
- 15 pages × 100 records, 65ms delay between pages
- Stop conditions: oldest record ≤ last3MStart, or partial page (< 100)
- Field mapping: `fundingTime || settleTime → fundingTime`, `fundingRate → fundingRate`

### 5.3 OKX (Public — No Auth)

| Purpose | Endpoint | Params | Notes |
|---------|----------|--------|-------|
| Current rates | `GET /api/v5/public/funding-rate` | `instId=ANY` | Returns all instruments |
| Historical | `GET /api/v5/public/funding-rate-history` | `instId`, `after`, `limit=400` | **Hard 3-month API limit** |

**Fetch strategy (aggregation path):**
- 5 pages × 400 records, 250ms delay between pages
- Stop conditions: oldest record ≤ last3MStart, or partial page (< 400)
- Field mapping: `realizedRate ?? fundingRate → fundingRate`, `fundingTime → fundingTime`

> **All requests route through `/api/proxy`** for CORS bypass.

### 5.4 Retry Logic

```typescript
private static async fetchWithRetry(url: string): Promise<any> {
  // 3 retries with exponential backoff (1s, 2s, 4s)
  // Retries on: null response, Bybit rate-limit code (10006)
  // Returns null if all retries exhausted
}
```

---

## 6. Polling & Sync Configuration

| Setting | Store field | Default | Range |
|---------|-----------|---------|-------|
| Current rates polling | `fundingPollingInterval` (settingsStore) | 5 minutes | 1–60 minutes |
| History sync interval | `fundingHistoryInterval` (settingsStore) | 4 hours | 4–8 hours |
| Concurrent per-exchange | `CONCURRENCY` | 6/4/6 (Bybit/OKX/Bitget) | Hardcoded |

### What happens each cycle:

1. **Poll timer fires** (~5 min) → `fetchCurrentRates()` → sequential exchange fetch → re-schedule auto-sync
2. **History timer check** → `syncHistoricalRates()` checks if `now - lastHistoryFetch ≥ fundingHistoryInterval`
3. **If yes:** parallel per-exchange sync via `Promise.all` + `asyncPool` per exchange
4. **Each exchange:** queries `getFundingMeta` for all symbols, keeps only stale ones
5. **Each stale symbol:** `fetchAndAggregateSummary()` → raw records + Big.js aggregation
6. **Batch write:** all summaries saved to IndexedDB in a single transaction
7. **Performance data persisted:** timing per exchange + overall sync metrics stored in fundingStore + localStorage
8. **Auto-sync timer scheduled:** `setTimeout` for `nearestFundingTime + 60s`

### Auto-Sync Engine

```
fetchCurrentRates() ──► scheduleNextAutoSync() ──► setTimeout()
  │                                                    │
  │   Finds nearest future nextFundingTime              │
  │   Sets delay = (nearestFundingTime + 60s) - now     │
  │   Persists nextFundingTime + nextScheduledSyncTime  │
  │                                                    │
  ◄──────────────────── Timer fires ────────────────────┘
                        │
                  Logs scheduled vs actual drift
                  Sets lastHistoryFetch = 0
                  Dispatches 'funding-cache-cleared' event
                  → triggers forceSync()
```

Signals are also handled:
- **Manual "Run Sync Now"** → `lastHistoryFetch = 0` → `forceSync()` → fetch rates → sync historical
- **Manual "Clear Cache + Sync"** → `clearFundingSummariesCache()` → `forceSync()`
- **`'funding-cache-cleared'` event** → `window` event listener dispatches `forceSync()`

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

### 7.3 Pricing & Sync Performance Panel

Located in **Settings → Funding Rate**. Shows:

| Metric | Description |
|--------|-------------|
| Last sync time | Human-readable timestamp of last completion |
| Total duration | `fetchSec + writeSec` in seconds |
| Fetch time | Time spent calling exchange APIs |
| Write time | Time spent writing to IndexedDB |
| Symbols synced | Number of non-zero summaries saved |
| Per-exchange breakdown | Table with exchange name, synced/stale count, total time, avg ms/symbol |
| Next funding time | Closest future funding settlement time (local + UTC) |
| Next auto-sync | Scheduled sync time (nearest funding + 1 minute) |
| Run Sync Now | Button to trigger a manual sync |
| Clear Cache + Sync | Button to purge IndexedDB and re-sync |

### 7.4 RateTooltip

Wraps every funding rate cell with an `AppTooltip` explaining:

```
[label]: 0.0100%

Direction: Longs → Shorts   (or: Shorts → Longs, or: Neutral)
Who Pays: Long positions are paying Short positions
```

### 7.5 FundingRateFlash

Applied exclusively to the **Next funding** column (the only dynamically changing value):

```css
.animate-funding-flash-up {
  animation: fundingFlashUp 0.8s ease-out;
}
.animate-funding-flash-down {
  animation: fundingFlashDown 0.8s ease-out;
}
```

Triggers on value change: green flash when rate increases, red flash when rate decreases.

### 7.6 Color Scheme

| Condition | Color | Applied to |
|-----------|-------|-----------|
| Positive rate | `text-green-400` | Next, Last, all sums |
| Negative rate | `text-red-400` | Next, Last, all sums |
| Zero / undefined | `text-[#8E9299]` | --- placeholder |
| Subtitle / historical tooltips | `text-yellow-500/80` | Last Month, 3M, 6M, 1Y headers |

### 7.7 Exchange Badge Colors

| Exchange | Border/Text Color |
|----------|------------------|
| Bitget | `#03aac7` (cyan) |
| Bybit | `#ff9c2e` (orange) |
| OKX | `#ffffff` (white) |

---

## 8. Aggregation Logic (`FundingService.aggregateData`)

### 8.1 Bucket Classification

All accumulation is done with **Big.js** (never native floats):

```typescript
const boundaries = {
  todayStart:        new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(),
  currentMonthStart: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
  lastMonthStart:    new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
  last3MStart:       new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime(),
  last6MStart:       new Date(now.getFullYear(), now.getMonth() - 6, 1).getTime(),
  last12MStart:      new Date(now.getFullYear(), now.getMonth() - 12, 1).getTime(),
};
```

Each record (newest-first) is classified:

| Bucket | Condition |
|--------|-----------|
| `todayFundingRate` | `ts >= todayStart` |
| `currentMonthFundingRate` | `ts >= currentMonthStart` |
| `lastMonthFundingRate` | `ts >= lastMonthStart && ts < currentMonthStart` |
| `last3MonthsFundingRate` | `ts >= last3MStart && ts < currentMonthStart` |
| `last6MonthsFundingRate` | `ts >= last6MStart && ts < currentMonthStart` |
| `last12MonthsFundingRate` | `ts >= last12MStart && ts < currentMonthStart` |

### 8.2 Optional Field Guard

```typescript
const apiIsLimited = exchange === 'okx' || exchange === 'bitget';

// Only populate last6M/last12M if the oldest record reaches that boundary
if (!apiIsLimited || oldestRecordTs <= boundaries.last12MStart) {
  summary.last12MonthsFundingRate = last12MonthsBucket.toFixed(8);
}
if (!apiIsLimited || oldestRecordTs <= boundaries.last6MStart) {
  summary.last6MonthsFundingRate = last6MonthsBucket.toFixed(8);
}
```

### 8.3 Error Contract

`fetchAndAggregateSummary` never throws. On any exception, returns `zeroSummary()`:
```typescript
{
  lastFundingRate: '0.00000000', lastFundingTime: '0',
  todayFundingRate: '0.00000000', currentMonthFundingRate: '0.00000000',
  lastMonthFundingRate: '0.00000000', last3MonthsFundingRate: '0.00000000',
  updatedAt: Date.now(),
}
```

---

## 9. Error States & Edge Cases

| Case | Handling |
|------|----------|
| No exchanges configured | Empty state with spinner, no data loaded |
| Cache miss (first load) | Full background sync (all 6 boundary checks), shows loading skeleton |
| API rate limited | Per-symbol `fetchWithRetry` → 3 retries with backoff. Individual failures don't block others. |
| Network offline | Uses cached IndexedDB data ("stale" badge). Next poll cycle retries. |
| Symbol delisted | Removed from current-rates on next polling cycle → no more summary generated |
| API error for a symbol | `fetchAndAggregateSummary` returns `zeroSummary()` — logged, not stored (filtered by `lastFundingTime !== '0'` guard) |
| Partial data (OKX/Bitget ~3mo) | `last6MonthsFundingRate`/`last12MonthsFundingRate` left `undefined` → UI shows `---` |
| No stale symbols on sync | `syncExchange` returns 0 summaries, no write to IndexedDB |
| Clear cache event | `'funding-cache-cleared'` → dispatches `forceSync()` after clearing |
| Force sync while already syncing | `restartRequestedRef = true` → re-triggers after current sync completes |
| Auto-sync fires when app is idle | Standard sync path; timer aligns to `nextFundingTime + 60s` |
| Next funding time unavailable | Auto-sync not scheduled; next polling cycle re-evaluates |
| IndexedDB read error on app start | `useFundingData` sets `summaries: []` — UI shows only current rates (no historical) |
| Sync takes longer than polling interval | Module-level `syncInProgressRef` prevents overlapping syncs |
| Zero funding rates | `parseFloat('0.00000000')` → `0` — UI displays `---` for aggregated zero columns |

---

## 10. Files

### Created

| Path | Description |
|------|-------------|
| `src/services/funding/FundingService.ts` | API fetch + aggregation logic. `fetchAndAggregateSummary()`, `fetchWithRetry()`, `aggregateData()`, per-exchange pagination, `buildAggregationBoundaries()`, `zeroSummary()` |
| `src/store/fundingStore.ts` | Zustand state: current rates, sync status, favorites, performance metrics (`SyncPerformance`), exchange timings, next funding/sync timestamps |
| `src/hooks/useFundingSync.ts` | Sync orchestration: parallel exchanges, `asyncPool` concurrency, auto-sync scheduling, singleton locks, forceSync with restart logic |
| `src/hooks/useFundingData.ts` | Lightweight read path: `getAllFundingSummaries()` + current rates merge + simple `parseFloat()` mapping |
| `src/components/analytics/FundingFees/FundingDashboard.tsx` | Full dashboard UI (accordion table, pagination, RateTooltip, FundingRateFlash) |
| `src/services/__tests__/FundingService.test.ts` | 32 unit tests: fetchCurrentFundingRates (9), aggregateData (6), helper methods (14), exchange routing (3) |
| `src/store/__tests__/fundingStore.test.ts` | 58 unit tests: favorites, currentRates, sync status, persist integration, shouldSyncHistoricalRates guard, localStorage rehydration |
| `src/store/__tests__/settingsStore.test.ts` | 12 unit tests: fundingHistoryInterval defaults + guard formula + persist |
| `src/hooks/__tests__/processSymbol.test.ts` | 13 unit tests for old decision tree (historical) |

### Modified

| Path | Change |
|------|--------|
| `src/types.ts` | Added `FundingRateSummary`; `FundingFeeAggregated` fields made optional (`last6MonthsSum?`, `yearSum?`) |
| `src/services/historyCache.ts` | DB_VERSION 9→10. Replaced `funding-fees` store with `funding-summaries`. Added `saveFundingSummariesBatch()` for bulk writes. |
| `src/store/settingsStore.ts` | Added `fundingPollingInterval`, `fundingHistoryInterval` (range 4-8h), `setLastSyncTime` |

### Removed

| What | Reason |
|------|--------|
| `UnifiedFundingFee` interface | Replaced by `FundingRateSummary` (aggregation-first) |
| Old `funding-fees` IndexedDB store | All raw individual records deleted on DB migration |
| In-memory period recomputation in `useFundingData` | Now reads pre-computed summaries; pure mapping only |
| `doFullFetch`/`doIncrementalFetch`/`processSymbol` in `useFundingSync` | Replaced by `processSummaryForSymbol` + `aggregateData` |
| `saveFundingFeesCache`/`getFundingFeesBySymbol`/`getAllFundingFees` in `historyCache` | Replaced by summary-based CRUD |

---

## 11. Decision Log

| # | Decision | Alternatives | Rationale |
|---|---|---|---|
| D1 | Single `FundingService` class | Separate per-exchange services | Cleaner, follows existing patterns |
| D2 | REST polling for live data | WebSocket | Serverless-compatible, simpler |
| D3 | Configurable polling (1-60 min) | Fixed interval | User flexibility |
| D4 | Cache in IndexedDB (extend historyCache) | Separate DB | Reuse proven pattern + versioned migrations |
| D5 | **Aggregation-first storage** | Raw records + in-memory recomputation | ~1000× less storage; instant load |
| D6 | **Full recalculation on every sync** | Incremental fetch | Simpler logic; OKX/Bitget can't support incremental reliably |
| D7 | Per-exchange parallel sync (`Promise.all`) | Sequential exchanges | ~3× faster total sync time |
| D8 | `asyncPool` per exchange (6/4/6 concurrency) | Sequential symbols | Balances speed vs rate limits |
| D9 | **Module-level singleton locks** (object refs) | Hook-level refs | Prevents duplicate syncs when hook mounted in multiple places |
| D10 | **Restart-queuing for forceSync** | Silent ignore | Users can trigger new sync even while one is running |
| D11 | **Auto-sync via setTimeout** (fundingTime + 1min) | Fixed-interval polling | Syncs precisely when new data is available |
| D12 | **Persisted performance data** (localStorage) | In-memory only | Survives page reload; users can monitor sync health |
| D13 | `FundingRateSummary` stores optional 6M/1Y | Always populate | OKX/Bitget don't have coverage for those periods |
| D14 | `fetchWithRetry` (3 retries, exponential backoff) | No retry / immediate retry | Resilient to rate-limit spikes |
| D15 | **`fundingHistoryInterval` range 4-8h** | 1-24h | Prevent over-fetching; auto-sync handles precise timing |
| D16 | **`scheduleNextAutoSync` called after every polling tick** | One-time at startup | Keeps timer aligned with latest exchange data |
| D17 | Toast notifications for manual sync actions | Silent background | User needs feedback for explicit actions |
| D18 | `lastFundingTime !== '0'` guard before storing | Always store | Zero-summaries from API errors shouldn't overwrite valid cache |
| D19 | Exclude current month from lastMonth/3M/6M/1Y | Include current month | Consistent calendar-month definitions |
| D20 | Exclude OKX from 6M/1Y averages | Include OKX (with note) | Partial data produces misleading averages |
| D21 | RateTooltip on every rate cell | Only column headers | Users need immediate value understanding |
| D22 | FundingRateFlash on next funding only | Flash on all columns | Only next funding changes dynamically |
