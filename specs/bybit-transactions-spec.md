# Bybit Transactions Module — Technical Specification

> **Status:** Draft  
> **Version:** 1.0  
> **Created:** 2026-07-09  
> **Based on:** Bybit V5 API (`GET /v5/account/transaction-log`), user interviews, codebase analysis

---

## 1. Purpose

The **BybitTransactions** module provides a complete, searchable, locally-cached replica of the Bybit Unified Trading Account's transaction-log database. Users can audit every transaction (trades, settlements, deliveries, liquidations, transfers, bonuses) spanning up to 2 years, with zero-latency queries against IndexedDB, background incremental syncs, and rich filtering/export capabilities.

**Key UX Goals:**
- Single Pane of Glass for all Bybit transaction history across multiple accounts
- SWR (Stale-While-Revalidate): instant load from cache, fresh data from API in background
- Intelligent progress tracking during initial 2-year deep sync
- Full compliance with project's Zero-Trust, Privacy, and Clean Code mandates

---

## 2. Data Contract

### 2.1. API Endpoint

| Property | Value |
|---|---|
| **Endpoint** | `GET https://api.bybit.com/v5/account/transaction-log` |
| **Permission** | Account — Position |
| **Account Type** | UTA (Unified Trading Account) — all accounts |
| **Max Range** | `endTime - startTime <= 7 days` per request |
| **Max History** | Up to 2 years |
| **Default Window** | 24 hours when no time range provided |
| **Pagination** | Cursor-based (`nextPageCursor`) |

### 2.2. Raw API Response Fields

```typescript
interface BybitTransactionLogRaw {
  id: string;                        // Unique id
  symbol: string;                    // Symbol name
  category: string;                  // Product type (linear, inverse, spot, option)
  side: 'Buy' | 'Sell' | 'None';
  transactionTime: string;           // Transaction timestamp (ms)
  type: string;                      // See §2.3
  transSubType: string;              // 'movePosition' or ''
  qty: string;                       // Quantity
  size: string;                      // Rest position size after execution (direction-aware)
  currency: string;                  // e.g., USDC, USDT, BTC, ETH
  tradePrice: string;                // Trade price
  funding: string;                   // Funding fee (+receive, -pay)
  fee: string;                       // Trading fee (+expense, -rebate)
  cashFlow: string;                  // Cash flow (PnL realization, settlement, transfer)
  change: string;                    // change = cashFlow + funding - fee
  cashBalance: string;               // Wallet balance after change
  feeRate: string;                   // Fee rate (TRADE=trading fee, SETTLEMENT=funding fee)
  bonusChange: string;               // Bonus change
  tradeId: string;                   // Trade ID
  orderId: string;                   // Order ID
  orderLinkId: string;               // User customised order ID
  extraFees: string;                 // Extra fee info (spot-specific)
}
```

### 2.3. Transaction Types (Enum)

All types from the Bybit UTA endpoint will be stored and displayed:

| Type | Description | Display |
|---|---|---|
| `TRADE` | Trade execution | ✅ Show |
| `SETTLEMENT` | Funding/session settlement | ✅ Show |
| `DELIVERY` | Futures contract delivery | ✅ Show |
| `LIQUIDATION` | Position liquidation | ✅ Show |
| `BONUS` | Bonus credit/debit | ✅ Show |
| `TRANSFER` | Internal transfer | ✅ Show |
| `MOVE_PROFIT_LOSS` | Move position PnL | ✅ Show |
| `SPOT` | Spot trade | ✅ Show |

### 2.4. Normalized Interface (`BybitTransactionLogEntry`)

```typescript
interface BybitTransactionLogEntry {
  // Primary key = `${connectionId}-${raw.id}-${transactionTime}`
  id: string;
  connectionId: string;              // Originating API key UUID
  exchange: 'bybit';
  label: string;                     // Account label (e.g., 'bybit-main')

  // Core data (preserved from raw)
  rawId: string;                     // Original 'id' from Bybit
  symbol: string;
  category: string;                  // linear, inverse, spot, option
  side: 'Buy' | 'Sell' | 'None';
  transactionTime: number;           // Parsed ms timestamp
  type: string;                      // Transaction type (see §2.3)
  transSubType: string;
  qty: string;                       // Big-compatible string
  size: string;
  currency: string;
  tradePrice: string;
  funding: string;                   // Big-compatible string
  fee: string;
  cashFlow: string;
  change: string;                    // change = cashFlow + funding - fee
  cashBalance: string;
  feeRate: string;
  bonusChange: string;
  tradeId: string;
  orderId: string;
  orderLinkId: string;

  // Computed
  fundingBig: Big;
  feeBig: Big;
  cashFlowBig: Big;
  changeBig: Big;
  cashBalanceBig: Big;

  // Raw payload (for debug/audit)
  raw: Record<string, unknown>;
}
```

---

## 3. IndexedDB Schema

### 3.1. Store: `bybit-transaction-log`

One store for all transaction data with multiple indexes.

| Property | Type | Key/Index |
|---|---|---|
| `id` | `string` | **Primary Key** (`connectionId-rawId-transactionTime`) |
| `connectionId` | `string` | **Index: `by-connectionId`** |
| `transactionTime` | `number` | **Index: `by-transactionTime`** |
| `symbol` | `string` | **Index: `by-symbol`** |
| `type` | `string` | **Index: `by-type`** |
| `currency` | `string` | **Index: `by-currency`** |
| `category` | `string` | **Index: `by-category`** |
| `label` | `string` | Not indexed (small cardinality) |
| *(all other fields)* | `string` | Data only |

### 3.2. Store: `bybit-transaction-meta`

One document per connectionId storing sync metadata.

| Field | Type | Description |
|---|---|---|
| `connectionId` | `string` | **Primary Key** |
| `oldestTransactionTime` | `number` | Earliest cached transaction timestamp |
| `latestTransactionTime` | `number` | Latest cached transaction timestamp |
| `totalRecords` | `number` | Total records cached for this connection |
| `updatedAt` | `number` | Last cache write timestamp |
| `isSyncing` | `boolean` | Whether a sync is in progress |
| `lastCursor` | `string` | Last pagination cursor used (for resume) |
| `syncProgressEnd` | `number` | Target end timestamp for current sync |

### 3.3. DB Version Upgrade

Increment `DB_VERSION` from **7** to **8** in `src/services/historyCache.ts`.  
Add migration in the `upgrade()` callback:

```typescript
if (oldVersion < 8) {
  if (!db.objectStoreNames.contains('bybit-transaction-log')) {
    const txLogStore = db.createObjectStore('bybit-transaction-log', { keyPath: 'id' });
    txLogStore.createIndex('by-connectionId', 'connectionId');
    txLogStore.createIndex('by-transactionTime', 'transactionTime');
    txLogStore.createIndex('by-symbol', 'symbol');
    txLogStore.createIndex('by-type', 'type');
    txLogStore.createIndex('by-currency', 'currency');
    txLogStore.createIndex('by-category', 'category');
  }
  if (!db.objectStoreNames.contains('bybit-transaction-meta')) {
    db.createObjectStore('bybit-transaction-meta', { keyPath: 'connectionId' });
  }
}
```

---

## 4. Service Layer

### 4.1. New File: `src/services/bybit/BybitTransactionService.ts`

Class `BybitTransactionService` that encapsulates all transaction-log logic.

**Responsibilities:**
- `fetchWithCache(key, period)`: Main entry point — loads cache, fetches deltas, merges
- `deepSync(key)`: Full 2-year backfill with progressive chunking
- `incrementalSync(key)`: Fetch only records `> latestTransactionTime + 1`
- `fetchPage(key, startTime, endTime, cursor?)`: Single paginated call to API
- `filterByPeriod(entries, period)`: In-memory period filter
- `applyFilters(entries, filters)`: Apply symbol, type, currency, category filters

**Sync Algorithm (Progressive):**

```
1. Check meta store: is there a latestTransactionTime?
   A) NO → Deep Sync:
      1. Start from Date.now() going backwards in 7-day chunks
      2. For each chunk: fetch all pages (cursor pagination)
      3. Save each page batch immediately (checkpoint)
      4. After each chunk: update meta (oldestTransactionTime, totalRecords, progress)
      5. Continue until 2 years reached or no more data
      6. Signal completion via syncCoordinatorStore

   B) YES → Incremental Sync:
      1. Fetch from latestTransactionTime + 1 to now in 7-day chunks
      2. Merge new records into cache
      3. Update meta (latestTransactionTime, totalRecords)
```

**Progress Calculation:**
```
progressPct = incremental 
  ? (oldestFetched - syncProgressEnd) / (targetEnd - syncProgressEnd) * 100
  : (oldestFetched - twoYearsAgo) / (now - twoYearsAgo) * 100
```

**Retry & Rate-Limiting:**
- Exponential backoff: 1s → 2s → 4s (max 3 retries per page)
- Log warning on repeated failures, continue to next chunk
- Use `MAX_PAGES_PER_CHUNK = 20` to cap pagination depth per 7-day window

### 4.2. BybitAdapter Update

Add method `getTransactionLog(key, startTime, endTime, cursor?)` to `BybitAdapter.ts`:

```typescript
async getTransactionLog(
  key: ApiCredentials,
  category: string,
  startTime: number,
  endTime: number,
  cursor?: string
): Promise<{ list: BybitTransactionLogRaw[]; nextPageCursor: string }>
```

This method:
1. Signs headers via `BybitAdapter.getHeaders()`
2. Uses `hybridFetch()` to call `/v5/account/transaction-log`
3. Returns raw list + cursor for pagination

---

## 5. Hook Layer

### 5.1. New File: `src/hooks/useBybitTransactionSync.ts`

Global sync hook mounted in `WorkSpace.tsx` (alongside `useHistoryCachePolling`).

**Behavior:**
1. Runs on mount for all active Bybit API keys
2. Checks if a deep sync is needed (no cache or cache is incomplete)
3. If incremental: fetches deltas, merges, updates UI
4. Exposes `isSyncing` state (stored in syncCoordinatorStore)
5. Uses `toast.info()` / `toast.success()` for UX notifications
6. Re-syncs on the `historyCacheInterval` configured in Settings

**State exposed via syncCoordinatorStore:**
```typescript
interface BybitTransactionSyncState {
  isBybitTxSyncing: boolean;
  bybitTxProgress: { pct: number; records: number } | null;
  bybitTxLastSyncTime: number;
  bybitTxLatestTransactionTime: number;
  bybitTxOldestTransactionTime: number;
  bybitTxTotalRecords: number;
  setBybitTxSyncing: (v: boolean) => void;
  setBybitTxProgress: (p: { pct: number; records: number } | null) => void;
  setBybitTxLastSyncTime: (t: number) => void;
  // ...
}
```

### 5.2. New File: `src/hooks/useBybitTransactions.ts`

UI-facing hook used by the `BybitTransactions` component.

**Signature:**
```typescript
function useBybitTransactions(filters: TransactionFilters): {
  entries: BybitTransactionLogEntry[];
  filteredEntries: BybitTransactionLogEntry[];
  isLoading: boolean;
  isSyncing: boolean;
  progress: { pct: number; records: number } | null;
  error: string | null;
  stats: TransactionStats;
}
```

**Stats (computed from filtered entries):**
```typescript
interface TransactionStats {
  totalCount: number;
  typeBreakdown: Record<string, number>;
  totalFunding: Big;       // funding sum
  totalFees: Big;          // fee sum (absolute)
  totalCashFlow: Big;      // cashFlow sum
  totalChange: Big;        // change sum
  finalBalance: Big;       // cashBalance of last entry
}
```

---

## 6. UI Component Layer

### 6.1. New File: `src/components/analytics/BybitTransactions/BybitTransactions.tsx`

Main page component, matching the style of `OrderHistory.tsx`.

**Layout (top to bottom):**

```
┌─ Header ──────────────────────────────────────────────┐
│ [Bybit Transactions] title              [Export ▼]     │
│ [StatusBadge] [ProgressBadge] [Sync Badge]            │
├─ Stats Cards ──────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │Total Tx  │ │Funding   │ │Fees Paid │ │Balance   │  │
│ │ 12,340   │ │+$245.12  │ │-$89.40   │ │$12,450  │  │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├─ Filters ──────────────────────────────────────────────┤
│ [FilterBar: search, category, type, currency, period] │
├─ Pagination (top) ─────────────────────────────────────┤
├─ Table ────────────────────────────────────────────────┤
│ ┌─ Row 1 (collapsible) ──────────────────────────────┐ │
│ │ Time | Cur | Symbol | Type | Dir | Qty | Price |  │ │
│ │ Funding | Fee | CashFlow | Change | Balance | Act  │ │
│ │ ... expanded: TradeID, OrderID, FeeRate, BonusChg  │ │
│ └──────────────────────────────────────────────────┘ │
│ ┌─ Row 2 ... ────────────────────────────────────────┐ │
│ │ ...                                                │ │
│ └──────────────────────────────────────────────────┘ │
├─ Pagination (bottom) ──────────────────────────────────┤
└────────────────────────────────────────────────────────┘
```

### 6.2. Sub-Components

| File | Component | Purpose |
|---|---|---|
| `BybitTransactions.tsx` | `BybitTransactions` | Main orchestrator |
| `BybitTransactionRow.tsx` | `BybitTransactionRow` | Single row + expand details |
| `BybitTransactionFilters.tsx` | `BybitTransactionFilters` | Filter bar adapter |
| `BybitTransactionProgress.tsx` | `BybitTransactionProgress` | Dynamic sync progress badge |
| `BybitTransactionDetailsModal.tsx` | `BybitTransactionDetailsModal` | Modal displaying detailed stats and reports |
| `BybitTransactionNetChangeReport.tsx`| `BybitTransactionNetChangeReport` | Detailed operational performance and ROI report |

### 6.3. Column Layout

**Main Row (compact mode, 2-col mobile → 8-col desktop):**

| Col | Content | Notes |
|---|---|---|
| 1 | Time + Account Icon | `transactionTime` formatted + connection badge |
| 2 | Currency + Symbol | `currency` + `symbol` with CoinIcon |
| 3 | Type + Category | `type` badge + `category` tag |
| 4 | Direction + Qty | `side` (Buy/Sell) + `qty` |
| 5 | Price + Size | `tradePrice` + `size` (rest position) |
| 6 | Funding + Fee | `funding` (green/red) + `fee` |
| 7 | Cash Flow + Change | `cashFlow` + `change` (computed) |
| 8 | Balance + Action | `cashBalance` + "Details" button |

**Expanded Details (on click):**
```
┌─ Transaction Details ───────────────────────────────┐
│ Trade ID     | Order ID      | Fee Rate              │
│ 0xabc123...  | ord_xyz...    | 0.0006                │
│ Order Link   | Bonus Change  | Extra Fees            │
│ cust-id-001  | +0.00         | --                    │
└──────────────────────────────────────────────────────┘
```

### 6.4. Filter Configuration (via FilterBar)

| Filter | Type | Options |
|---|---|---|
| **Search** | Text input | Search by symbol |
| **Category** | Select | All, linear, inverse, spot, option |
| **Type** | Select | All, TRADE, SETTLEMENT, DELIVERY, LIQUIDATION, BONUS, TRANSFER |
| **Currency** | Select | All, USDT, USDC, BTC, ETH, SOL, ... |
| **Account** | Select | All, bybit-main, bybit-sub1, ... |
| **Period** | Select | Today, 7d, 14d, 30d, 90d, Custom |

### 6.5. Progress Badge

Rendered next to `StatusAndSyncBadge` when `isSyncing === true`:

```
┌──────────────────────────────────────────────┐
│ ⟳ Syncing 47.2% · 12,340 records · ~2m left │
└──────────────────────────────────────────────┘
```

**Implementation:**
- Spinning icon (RefreshCw with animate-spin)
- Percentage from `syncProgressPct`
- Record count from `totalRecords` in meta store
- Estimated time remaining based on rate of records/sec

---

## 7. Navigation & Integration

### 7.1. Sidebar Update (`Sidebar.tsx`)

Add sub-item under Analytics:

```typescript
{
  id: 'analytics', label: 'Analytics', icon: BarChart2, subItems: [
    { id: 'analytics-pnl-symbol', label: 'PnL by Symbol' },
    { id: 'analytics-bybit-tx', label: 'Bybit Transactions' }  // NEW
  ]
}
```

### 7.2. App.tsx Update

Add routing:

```typescript
import { BybitTransactions } from './components/analytics/BybitTransactions/BybitTransactions';

// In the render switch:
{activeTab === 'analytics-bybit-tx' && <BybitTransactions />}
```

### 7.3. WorkSpace.tsx Update

Mount global sync hook:

```typescript
import { useBybitTransactionSync } from '../hooks/useBybitTransactionSync';

export function WorkSpace({ children }: { children: React.ReactNode }) {
  useBybitTransactionSync();  // NEW
  useHistoryCachePolling();
  // ...
}
```

---

## 8. Privacy & Security

### 8.1. Financial Value Masking

The following fields follow `isPrivateMode` from `PrivacyContext`:
- `funding` → `'****'` when private
- `fee` → `'****'` when private
- `cashFlow` → `'****'` when private
- `change` → `'****'` when private
- `cashBalance` → `'****'` when private

Other fields (`symbol`, `type`, `side`, `qty`, `category`, `tradePrice`, `size`) remain visible.

### 8.2. Zero-Trust

- All API keys remain in localStorage (never sent to server)
- All data fetching goes through `hybridFetch()` → `/api/proxy` (Vercel-compatible)
- No WebSocket connections — REST-only
- Account labels mapped via `connectionId` → `label` mapping from `apiKeysStore`

---

## 9. Edge Cases & Error Handling

| Scenario | Behavior |
|---|---|
| **No Bybit API keys active** | Component shows "Add Bybit API keys to view transactions" |
| **Simulation Mode active** | Show mock transactions from a JSON file, disable sync |
| **API rate-limit hit** | Exponential backoff + LogManager.warn, continue next chunk |
| **Cache corrupted** | Clear connection's meta, force re-sync |
| **Partial sync (user navigates away)** | Sync continues in background, progress updates via zustand store |
| **2 years with no data** | Empty state with message "No transactions found in the last 2 years" |
| **Multi-account same cursor** | Each connectionId has independent sync state |

---

## 10. Export Functionality

Reuse `exportUtils.ts` (exportToCSV, exportToExcel, exportToPDF) following the same pattern as `OrderHistory.tsx`.

**Columns in export:**
Time, Currency, Symbol, Category, Type, Side, Quantity, Position Size, Trade Price, Funding, Fee, Cash Flow, Change, Wallet Balance, Trade ID, Order ID, Fee Rate

---

## 11. Mock Data

### 11.1. New File: `src/mock/bybit-transactions.json`

Array of mock `BybitTransactionLogEntry` objects (50–100 entries) covering:
- Various types: TRADE, SETTLEMENT, DELIVERY, BONUS, TRANSFER
- Multiple symbols: BTCUSDT, ETHUSDT, SOLUSDT, etc.
- Both linear and inverse categories
- Multiple currencies: USDT, BTC, ETH
- Date range spread across the last 2 years

---

## 12. Tests

### 12.1. New File: `src/services/bybit/__tests__/BybitTransactionService.test.ts`

**Test cases:**
1. `deepSync()` — Verifies chunk creation and cursor pagination
2. `incrementalSync()` — Verifies only records after `latestTransactionTime` are fetched
3. `filterByPeriod()` — Verifies 7d, 30d, 90d filters
4. `applyFilters()` — Verifies symbol, type, currency, category filters
5. Cache hit/miss behavior
6. Rate-limit retry logic
7. Multi-account isolation

---

## 13. Documentation Updates

### 13.1. User Manual

Update both `user_manual/cpm_user_manual_en-us.md` and `user_manual/cpm_user_manual_pt-br.md` with a new section:

> **Bybit Transactions**
> The Bybit Transactions page provides a full audit log of all transactions from your Bybit accounts...
> *How to use:* Navigate to Analytics → Bybit Transactions. The first sync may take a few minutes...
> *Filters:* Use the filter bar to narrow by instrument, transaction type, currency, and period...
> *Export:* Click Export to download your transaction history as CSV, Excel, or PDF.

### 13.2. Architecture Doc

Update `specs/ARCHITECTURE.md` §5 (Data Flow and Synchronization) to include the new Bybit transaction sync engine.

### 13.3. AGENTS.md

No changes needed (the rules already cover the relevant patterns).

---

## 14. File Checklist

### New Files
- [ ] `src/components/analytics/BybitTransactions/BybitTransactions.tsx`
- [ ] `src/components/analytics/BybitTransactions/BybitTransactionRow.tsx`
- [ ] `src/components/analytics/BybitTransactions/BybitTransactionFilters.tsx`
- [ ] `src/components/analytics/BybitTransactions/BybitTransactionProgress.tsx`
- [ ] `src/hooks/useBybitTransactionSync.ts`
- [ ] `src/hooks/useBybitTransactions.ts`
- [ ] `src/services/bybit/BybitTransactionService.ts`
- [ ] `src/mock/bybit-transactions.json`
- [ ] `src/services/bybit/__tests__/BybitTransactionService.test.ts`
- [ ] `specs/bybit-transactions-spec.md` (this file)

### Modified Files
- [ ] `src/services/historyCache.ts` — DB_VERSION 7→8, new stores
- [ ] `src/services/adapters/BybitAdapter.ts` — New `getTransactionLog()` method
- [ ] `src/store/syncCoordinatorStore.ts` — New Bybit Tx sync state
- [ ] `src/components/Sidebar.tsx` — New nav item
- [ ] `src/App.tsx` — New route
- [ ] `src/components/WorkSpace.tsx` — Mount sync hook
- [ ] `user_manual/cpm_user_manual_en-us.md` — New section
- [ ] `user_manual/cpm_user_manual_pt-br.md` — New section
- [ ] `specs/ARCHITECTURE.md` — Updated data flow

---

## 15. Acceptance Criteria

1. ✅ User can view all Bybit transactions from all active Bybit API keys in one unified table
2. ✅ Initial sync progressively backfills up to 2 years, starting with most recent data
3. ✅ Progress badge shows percentage + record count during sync
4. ✅ Filters work against IndexedDB with zero-latency response
5. ✅ Financial values are masked when `isPrivateMode` is enabled
6. ✅ Export to CSV, Excel, and PDF works correctly
7. ✅ Stats cards show total transactions, funding, fees, and balance
8. ✅ Mock data loads correctly in Simulation Mode
9. ✅ All tests pass (existing + new)
10. ✅ TypeScript compiles with no errors
