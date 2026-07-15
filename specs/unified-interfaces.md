# Unified Interfaces Specification (`unified-interfaces.md`)

This document defines the unified interfaces (`UnifiedBalance`, `UnifiedPosition`, `UnifiedHistoryPosition`, `UnifiedBillRecord`, `SymbolPnLRecord`, `UnifiedOrder`, `UnifiedFundingFee`, `FundingFeeAggregated`, and `BybitTransactionLogEntry`) to serve as the single source of truth for the frontend UI. It maps exchange-specific API payloads to normalized fields as defined in `src/types.ts`.

---

## 0. Common Type Aliases

These type aliases are shared across all unified interfaces and defined in `src/types.ts`:

```typescript
export type ExchangeName = 'bybit' | 'bitget' | 'okx';
export type PositionSide = 'long' | 'short' | 'net';
export type UnifiedMarginMode = 'cross' | 'isolated' | 'unknown';
export type UnifiedPositionMode = 'hedge' | 'one_way' | 'unknown';
export type UnifiedInstrumentType = 'SPOT' | 'PERP' | 'INVERSE' | 'FUTURES' | 'OPTION' | 'UNKNOWN';
export type UnifiedAssetCategory = 'CRYPTO' | 'STOCK' | 'UNKNOWN';
export type UnifiedOrderStatus = 'NEW' | 'FILLED' | 'CANCELLED' | 'PARTIALLY_FILLED' | 'UNTRIGGERED' | 'TRIGGERED' | 'REJECTED';
export type UnifiedOrderType = 'LIMIT' | 'MARKET' | 'TP' | 'SL' | 'CONDITIONAL';
export type BillType = 'deposit' | 'withdrawal' | 'funding' | 'fee' | 'transfer' | 'other';
```

| Type | Used by | Purpose |
|------|---------|---------|
| `ExchangeName` | All interfaces | Supported exchange identifiers |
| `PositionSide` | UnifiedPosition, UnifiedHistoryPosition, UnifiedOrder | Direction of a position |
| `UnifiedMarginMode` | UnifiedPosition, UnifiedHistoryPosition, UnifiedOrder | Cross vs isolated margin |
| `UnifiedPositionMode` | UnifiedPosition | Hedge vs one-way mode |
| `UnifiedInstrumentType` | UnifiedPosition, UnifiedHistoryPosition, UnifiedOrder | Instrument class (spot, perp, inverse, futures, option) |
| `UnifiedAssetCategory` | AssetClassifierAggregator | High-level asset classification (crypto, stock, unknown) |
| `UnifiedOrderStatus` | UnifiedOrder | Order lifecycle state |
| `UnifiedOrderType` | UnifiedOrder | Order type (limit, market, TP, SL, conditional) |
| `BillType` | UnifiedBillRecord | Wallet flow classification |

---

## 1. Unified Balance Interface (`UnifiedBalance`)

Designed to capture wallet equity, margin parameters, and coin balances across Spot and Derivatives accounts.

```typescript
export interface UnifiedBalance {
  id: string; // e.g., 'connId-ccy'
  connectionId: string;
  exchange: ExchangeName; // 'bybit' | 'bitget' | 'okx'
  label: string;
  ccy: string;
  amount: number;
  usdValue: number;
  totalEquity?: number;
  walletBalance?: number;
  availableMargin?: number;
  unrealizedPnl?: number;
  raw?: RawBalanceItem;
}
```

### 1.1 OKX Dual Balance Integration (Trading & Funding)

To provide a complete representation of user assets on OKX, the `OkxAdapter` aggregates balances from both the **Unified Trading account** and the **Funding account** concurrently:
1. **Trading Account (`/api/v5/account/balance`):** Fetches active trading equity, adjusted equity, available margin, and floating unrealized profit/loss across all assets.
2. **Funding Account (`/api/v5/asset/balances`):** Fetches passive asset holdings, including available and frozen balances in the user's Funding wallet.
3. **Valuation Aggregation:** Dynamic exchange rates are extracted on-the-fly from active trading-account valuations (or fallback to stablecoin defaults like 1.0 USD for USDT/USDC). Funding assets are evaluated and summed up into the parent account's overall `totalEquity` and `walletBalance`.
4. **Visual Segregation:** Asset origins are tracked using unique ID suffixes (e.g., `-UNIFIED-` and `-FUNDING-`), which are mapped by the frontend UI to display clear asset tagging (`UNIFIED` and `FUNDING` tags).

### Mappings Table
| Field | Bybit (V5 UTA) | Bitget (V2) | OKX (V5) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `amount` | `walletBalance` / `equity` | `available` + `frozen` | `cashBal` | Liquid asset amount |
| `usdValue` | `usdValue` | `usdtEquity` (or item count * price) | `eqUsd` | Asset USD value |
| `totalEquity` | `totalEquity` | `usdtEquity` (account level) | `totalEq` | Account total value |
| `walletBalance` | `totalWalletBalance` | `usdtBalance` / `crossedMaxAvailable` | `adjEq` | Net balance (cash + margin) |
| `availableMargin`| `totalAvailableBalance`| `crossedMaxAvailable` / `available` | `availEq` | Free margin available |
| `unrealizedPnl` | `totalPerpUPL` | `unrealizedPL` | `upl` | Open positions floating profit |

---

## 2. Unified Position Interface (`UnifiedPosition`)

Captures active futures/margin positions with unified sides and metrics.

```typescript
export interface UnifiedPosition {
  id: string; // Ex: 'connId-okx-BTC-USDT-long'
  connectionId: string;
  exchange: ExchangeName;
  label: string; // Account label/name
  symbol: string;
  baseCoin: string; // E.g., 'BTC'
  quoteCoin: string; // E.g., 'USDT' or 'USD'
  ccy?: string; // Margin/PNL currency (e.g. USDT, BTC)
  side: PositionSide; // 'long' | 'short' | 'net'
  size: number; // For position size
  notionalUsd?: number; // True notional value from API
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  closedPnl?: number; // Net closed position profit (after all fees)
  leverage: number;
  marginMode?: UnifiedMarginMode; // 'cross' | 'isolated' | 'unknown'
  positionMode?: UnifiedPositionMode; // 'hedge' | 'one_way' | 'unknown'
  margin?: number; // Position Margin / Isolated Margin
  maintenanceMargin?: number; // Maintenance Margin value (calculated or fetched directly)
  marginRatio?: number; // Tiered MMR or Margin Ratio (%)
  liquidationPrice?: number;
  breakEvenPrice?: number;
  roe?: number; // Return on Equity (%)
  tp?: number; // Take profit limit
  sl?: number; // Stop loss limit
  instrumentType?: UnifiedInstrumentType; // 'SPOT' | 'PERP' | 'INVERSE' | 'FUTURES' | 'OPTION' | 'UNKNOWN'
  accumulatedFunding?: string;
  accumulatedTradingFee?: string;
  raw?: RawPositionData; // To store the original broker data if needed
}
```

### Mappings Table
| Field | Bybit (V5) | Bitget (V2) | OKX (V5) | Normalization Logic |
| :--- | :--- | :--- | :--- | :--- |
| `id` | Computed | Computed | Computed | Synthesized string to identify position uniquely |
| `symbol` | `symbol` | `symbol` | `instId` | Direct mapping |
| `baseCoin` | Extracted via logic | Extracted via logic | Extracted via logic | Clean asset string e.g., BTC |
| `quoteCoin` | Extracted via logic | Extracted via logic | Extracted via logic | Pair asset string e.g., USDT/USD |
| `ccy` | `settleCoin` / `coin` | `marginCoin` | `ccy` / `marginCoin` | Base asset currency for margin/PnL |
| `instrumentType`| `category` | `instType` | `instType` & `ccy` | Mapped to `UnifiedInstrumentType` |
| `side` | `side` (`Buy`/`Sell`) | `holdSide` / `posSide` | `posSide` | `long`, `short`, `net` |
| `size` | `size` (calc inverse vs USDT) | `total` | `pos` / `notionalUsd / markPx` | Base asset mapped normalized size |
| `notionalUsd`| `positionValue` | `total * markPrice` | `notionalUsd` | Notional USD conversion fallback |
| `entryPrice` | `avgPrice` / `entryPrice` | `openPriceAvg` | `avgPx` | Average entry price |
| `markPrice` | `markPrice` | `markPrice` | `markPx` | Current mark price |
| `unrealizedPnl` | `unrealisedPnl` | `unrealizedPL` | `upl` | Floating PnL |
| `realizedPnl` | `curRealisedPnl` | `achievedProfits` | `realizedPnl` | Already realized profits / fees |
| `leverage` | `leverage` | `leverage` | `lever` | Active position leverage |
| `marginMode` | `tradeMode` / `marginMode`| `marginMode` | `mgnMode` | `cross` \| `isolated` |
| `positionMode` | `positionIdx` | N/A (One Way fallback) | N/A | `hedge` \| `one_way` |
| `margin` | `positionIMByMp` / `positionIM`| `marginSize` | `imr` (cross) / `margin` (isolated) | Active margin assigned. For OKX, `imr` is mapped if cross-margin, and `margin` if isolated-margin. |
| `maintenanceMargin`| `positionMMByMp` / `positionMM`| Calculated (`margin * leverage * keepMarginRate`)| `mmr` | Maintenance margin requirement value |
| `marginRatio`| Computed (`MM / IM * 100`) | `keepMarginRate * 100` | `mgnRatio * 100` | Tiered MMR or Margin Ratio (%) |
| `liquidationPrice`| `liqPrice` | `liquidationPrice`| `liqPx` | Liquidation reference |
| `breakEvenPrice` | `breakEvenPrice` | `breakEvenPrice` | `bePx` | The 0 profit reference price |
| `tp` | `takeProfit` | `takeProfit` | N/A | Take profit reference |
| `sl` | `stopLoss` | `stopLoss` | N/A | Stop loss reference |
| `roe` | Calculated (`UPL / IM`) | Calculated / `uplRatio` | `uplRatio * 100` | Normalized ROE % |
| `closedPnl` | `curRealisedPnl + funding + fee` | `achievedProfits` | `pnl` | Net closed position profit (after all fees) |

---

## 3. Unified History Position Interface (`UnifiedHistoryPosition`)

Standardizes closed positions or trades history to provide a uniform PnL ledger.

```typescript
export interface UnifiedHistoryPosition {
  id: string;
  connectionId: string;
  exchange: ExchangeName;
  label: string;
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  ccy?: string;
  side: PositionSide;
  realizedPnl: number;
  closedPnl?: number;
  closeUpdateTime: number; // timestamp
  createdTime?: number; // open time timestamp
  entryPrice?: number;
  closePrice?: number;
  size?: number;
  fundingFee?: number;
  tradingFee?: number;
  leverage?: number;
  marginMode?: UnifiedMarginMode;
  positionMode?: UnifiedPositionMode;
  notionalUsd?: number;
  roi?: number;
  instrumentType?: UnifiedInstrumentType;
  raw?: RawHistoryPositionData;
}
```

### Mappings Table
| Field | Bybit (V5) | Bitget (V2) | OKX (V5) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | Computed | Computed | Computed | Synthesized string ID (using closed pos ID and/or timestamp) |
| `symbol` | `symbol` | `instId` / `symbol` | `instId` | Direct mapping of the ticker |
| `baseCoin` | Extracted via logic | Extracted via logic | Extracted via logic | Clean asset string e.g., BTC |
| `quoteCoin` | Extracted via logic | Extracted via logic | Extracted via logic | Pair asset string e.g., USDT/USD |
| `ccy` | `settleCoin` / `coin` | `marginCoin` | `ccy` / `marginCoin` | Base asset currency for margin/PnL |
| `side` | `side` (`Buy`/`Sell`) | `holdSide` / `side` | `posSide` / `direction` | `long`, `short`, `net` |
| `realizedPnl` | `closedPnl` | `netProfit` / `achievedProfits` | `realizedPnl` / `pnl` | Total final PnL of closed position |
| `createdTime` | `createdTime` | `cTime` | `cTime` | Milliseconds timestamp of creation |
| `closeUpdateTime`| `updatedTime` | `utime` / `cTime` | `uTime` / `cTime` | Milliseconds timestamp of closure |
| `entryPrice`| `avgEntryPrice`| `openPriceAvg` | `openAvgPx` | Average open order fill price |
| `closePrice`| `avgExitPrice` | `closePriceAvg` | `avgPx` / `closeAvgPx` | Average close order fill price |
| `size` | `closedSize` | `closeTotalPos` | `closeVol` / `closeTotalPos`| Volume of the closed position |
| `fundingFee` | `fundingFee` | `totalFunding` | `fundingFee` | Cost of funding period |
| `tradingFee` | `execFee` | `fee` / sum(openFee, closeFee) | `fee` | Platform trade fee |
| `leverage` | `leverage` | `leverage` | `lever` | Active position leverage upon closing |
| `instrumentType`| Mapped (`category`) | `instType` / `productType` | `instType` | Mapped `UnifiedInstrumentType` |

### Advanced Normalization Logic for Sizing & Value (Inverse vs Linear)

To guarantee exact consistency across all historical positions, the application uses helper utilities in `src/utils/inverseUtils.ts` (specifically `getHistoryPositionSizeAndValue(pos)`) with the following mapping and conversion rules:

#### 1. Bybit
*   **Inverse Contracts (e.g., BTCUSD, ETHUSD):**
    *   The `cumEntryValue` property returned by Bybit API is denominated in the **coin** (e.g., `0.00021896 BTC`).
    *   The `size` property represents the contract size in **USD** (e.g., `13`).
    *   *Result:* Mapped `size` (actual coin size) = `cumEntryValue` (e.g. `0.00021896`), and `notionalUsd` (position value USD) = `size` (e.g. `13`).
*   **Linear/USDT Contracts (e.g., BTCUSDT):**
    *   The `cumEntryValue` property represents the value in **USD/USDT** (e.g., `5588.88 USDT`).
    *   The `size` property represents the size in **coin** (e.g., `0.2 BTC`).
    *   *Result:* Mapped `size` (actual coin size) = `size` (e.g. `0.2`), and `notionalUsd` (position value USD) = `cumEntryValue` (e.g. `5588.88`).

#### 2. Bitget
*   **API Response Consistency:** Bitget's historical position response (`/api/v2/mix/position/history-position`) exhibits inconsistencies in field names depending on the account setup and market conditions.
    *   **Prices:** Uses `openAvgPrice || openPriceAvg` for `entryPrice`, and `closeAvgPrice || closePriceAvg` for `closePrice` to prevent zero prices.
    *   **Quantities:** Uses `closeTotalPos || openTotalPos` as the raw position size.
*   **Contract Sizing Scaling:**
    *   For **Inverse Contracts**, the raw size (contracts) is multiplied by the contract unit value (`getBitgetInverseContractVal(symbol)`) to obtain the true actual coin size.
    *   For **Linear Contracts**, the raw size is used directly as the coin size.

#### 3. OKX
*   **Contract Sizing Scaling:** Mapped `size` is scaled using the contract multiplier (`ctVal` from instrument info) against the closed volume, ensuring the actual coin quantity is reflected.

---

## 4. Unified Bill Record (`UnifiedBillRecord`)

Describes wallet flows such as deposits and withdrawals across platforms.

```typescript
export type BillType = 'deposit' | 'withdrawal' | 'funding' | 'fee' | 'transfer' | 'other';

export interface UnifiedBillRecord {
  id: string;
  connectionId: string;
  exchange: ExchangeName;
  label: string;
  type: BillType;
  amount: number;
  ccy: string;
  timestamp: number;
  raw?: any;
}
```

### Mappings Table
| Field | Bybit (V5) | Bitget (V2) | OKX (V5) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | mapped to args | mapped to args | mapped to args | Either `'deposit'` or `'withdrawal'` |
| `amount` | `amount` | `size` / `amount` | `amt` | Transferred volume |
| `ccy` | `coin` | `coin` | `ccy` | Asset token ticker |
| `timestamp`| `successAt` / `updateTime` | `uTime` / `cTime` | `ts` | Transfer time |

---

## 5. Symbol PnL Record (`SymbolPnLRecord`)

Used mainly by the Analytics Dashboard to aggregate profit and losses by symbol across the accounts and history cache.

```typescript
export interface SymbolPnLRecord {
  symbol: string;
  instrument: string;
  ccy: string;
  totalPnL: Big;
  longPnL: Big;
  shortPnL: Big;
  exchange: ExchangeName;
  lastActivity: number;
}
```

## 6. Unified Order Interface (`UnifiedOrder`)

Captures exchange orders (open and historical) with normalized fields for uniform display.

```typescript
export type UnifiedOrderStatus = 'NEW' | 'FILLED' | 'CANCELLED' | 'PARTIALLY_FILLED' | 'UNTRIGGERED' | 'TRIGGERED' | 'REJECTED';
export type UnifiedOrderType = 'LIMIT' | 'MARKET' | 'TP' | 'SL' | 'CONDITIONAL';

export interface UnifiedOrder {
  id: string;
  exchangeOrderId: string;
  connectionId: string;
  exchange: ExchangeName;
  label?: string;
  symbol: string;
  category: UnifiedInstrumentType | string;
  side: 'buy' | 'sell';
  positionSide?: PositionSide;
  type: UnifiedOrderType;
  status: UnifiedOrderStatus;
  price: number;
  avgPrice: number;
  qty: number;
  filledQty: number;
  value?: number;
  triggerPrice?: number;
  reduceOnly?: boolean;
  timeInForce?: string;
  createdTime: number;
  updatedTime: number;
  fees?: number;
  leverage?: number;
  marginMode?: UnifiedMarginMode;
  raw?: RawOrderData;
}
```

### Mappings Table
| Field | Bybit (V5) | Bitget (V2) | OKX (V5) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | Computed | Computed | Computed | Synthesized connection+orderId |
| `category` | Mapped (`category`) | Mapped (`productType`) | Mapped (`instType`) | Mapped to `UnifiedInstrumentType` |
| `type` | `orderType` | `orderType` / `planType` | `ordType` | LIMIT, MARKET, TP, SL, CONDITIONAL |
| `status` | `orderStatus` | `state` / `status` | `state` | Unified order execution state |
| `qty` | `qty` | `size` | `sz` | Total ordered quantity |
| `filledQty` | `cumExecQty` | `filledQty` / `baseVolume`| `accFillSz` | Accumulated filled quantity |
| `price` | `price` | `price` | `px` | Target order price |
| `avgPrice` | `avgPrice` | `priceAvg` / `avgPrice` | `avgPx` | Average execution fill price |
| `createdTime`| `createdTime` | `cTime` | `cTime` | Milliseconds timestamp of creation |
| `updatedTime`| `updatedTime` | `uTime` / `cTime` | `uTime` / `cTime` | Milliseconds timestamp of last update |
| `timeInForce`| `timeInForce` | `timeInForce` / `force` | `notionalUsd` (fallback) | Order duration constraints |

### Advanced Normalization Logic for Sizing & Value (Inverse vs Linear Orders)

To ensure accurate representation of active and historical orders, each adapter maps quantities and values to the unified interface according to these guidelines:

1. **Bitget (V2)**
   * **Quantity and Fills:** For both Linear and Inverse (`COIN-FUTURES`) contracts, the Bitget API returns the order size (`o.size`) and filled volume (`o.filledQty || o.baseVolume`) denominated in the underlying coin directly (e.g. `0.03 ETH`). Thus, the values are used without scaling by contract multipliers.
   * **Order Value:** The total USD value is computed by fetching `o.quoteVolume` when available, or fallbacks to the target quantity multiplied by the order price (or average price), ensuring proper visual display of the USD volume.
   * **UI Detection:** The `OrderRow` component automatically detects if the order `qty` is denominated in coin (using the price & value relation), rendering the exact coin amount as the actual size and displaying the correct estimated USD value.

2. **Bybit (V5)**
   * For Inverse contracts, `qty` is mapped to the USD value (contract value), which the UI dynamically parses back into coin size using the order price.

3. **OKX (V5)**
   * For derivatives, quantities are scaled using the cached instrument contract multiplier (`ctVal`), and values are calculated accordingly to match.

---

## 7. Unified Funding Fee Interface (`UnifiedFundingFee`)

Standardizes a single funding rate settlement event across all three exchanges. Used as the atomic record stored in the IndexedDB `fundingFees` store.

```typescript
export interface UnifiedFundingFee {
  id: string;                 // `${exchange}-${symbol}-${timestamp}`
  exchange: ExchangeName;
  symbol: string;
  instrumentType: 'USDT-M' | 'COIN-M';
  timestamp: number;          // ms — the settlement time
  fundingRate: number;        // e.g. 0.0001 (decimal, not %)
  realizedRate?: number;      // OKX-specific: actual rate after cap/clamp
}
```

### Mappings Table
| Field | Bybit (V5) | Bitget (V2) | OKX (V5) | Normalization Logic |
| :--- | :--- | :--- | :--- | :--- |
| `id` | Computed | Computed | Computed | `exchange-symbol-fundingRateTimestamp` |
| `exchange` | `'bybit'` | `'bitget'` | `'okx'` | Hardcoded per adapter |
| `symbol` | `symbol` | `symbol` | `instId` | Direct mapping |
| `instrumentType`| Mapped from `category` (`linear`→`USDT-M`, `inverse`→`COIN-M`) | Mapped from `productType` (`USDT-FUTURES`→`USDT-M`, `COIN-FUTURES`→`COIN-M`) | Inferred from `instId` suffix (`USDT-SWAP`→`USDT-M`, `USD-SWAP`→`COIN-M`) | Normalized to `'USDT-M'` or `'COIN-M'` |
| `timestamp` | `fundingRateTimestamp` (ms) | `fundingTime` or `settleTime` (ms) | `fundingTime` (ms) | Parsed via `parseInt()` |
| `fundingRate` | `fundingRate` (string → number) | `fundingRate` (string → number) | `realizedRate` ?? `fundingRate` (string → number) | Parsed via `parseFloat()` with null-check |
| `realizedRate` | — | — | `realizedRate` (string → number) | OKX-only: the actual settled rate after cap/clamp |

### Key Normalization Rules

1. **Bybit `instrumentType`:** Mapped from the `category` enum: `linear` → `'USDT-M'`, `inverse` → `'COIN-M'`.
2. **Bitget `instrumentType`:** Mapped from `productType`: `USDT-FUTURES` → `'USDT-M'`, `COIN-FUTURES` → `'COIN-M'`.
3. **OKX `instrumentType`:** Inferred from the `instId` suffix: `-USDT-SWAP` → `'USDT-M'`, `-USD-SWAP` → `'COIN-M'`.
4. **OKX `fundingRate`:** Uses `realizedRate` when available (the actual settled rate differs from the published `fundingRate` due to the cap/clamp mechanism). Falls back to `fundingRate` if `realizedRate` is absent.
5. **Timestamp parsing:** All exchange timestamps are in **milliseconds** (Unix epoch). `parseInt()` with radix 10 handles string-to-number conversion.
6. **Rate parsing:** `parseFloat()` with null-check. Returns `null` for missing/empty/invalid values; falls back to `0` in the mapped output.

---

### 7.1 CurrentFundingRate (Live Snapshot)

Defined in `src/services/funding/FundingService.ts` (not `types.ts`), used for real-time polling:

```typescript
export interface CurrentFundingRate {
  exchange: ExchangeName;
  symbol: string;
  instrumentType: 'USDT-M' | 'COIN-M';
  fundingRate: number;
  nextFundingTime: number;    // ms timestamp
}
```

## 8. Funding Fee Aggregated Interface (`FundingFeeAggregated`)

The computed per-exchange-symbol row used by the Funding Fees Dashboard UI. Combines live current rates with historical cached data to produce period-aggregated values.

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

### Aggregation Period Definitions (implemented in `useFundingData.ts`)

| Field | Period | Timestamp Range | Excludes Current Month? |
|-------|--------|----------------|------------------------|
| `nextFundingRate` | Next scheduled settlement | N/A (from current-rates API) | N/A |
| `nextFundingTime` | When next settlement occurs | N/A (from current-rates API) | N/A |
| `lastFundingRate` | Most recent completed settlement | `= history[0].fundingRate` (newest record) | N/A |
| `todaySum` | Today (UTC day start → now) | `≥ todayStart` | N/A |
| `currentMonthSum` | Current calendar month (1st → now) | `≥ currentMonthStart` | N/A |
| `lastMonthSum` | Previous calendar month | `≥ lastMonthStart AND ≤ lastMonthEnd` | ✅ Yes |
| `last3MonthsSum` | Previous 3 calendar months | `≥ threeMonthsAgoStart AND < currentMonthStart` | ✅ Yes |
| `last6MonthsSum` | Previous 6 calendar months | `≥ sixMonthsAgoStart AND < currentMonthStart` | ✅ Yes |
| `yearSum` | Previous 12 calendar months | `≥ oneYearAgoStart AND < currentMonthStart` | ✅ Yes |

> **Critical rule:** Multi-month aggregates exclude the current month entirely. The boundary is anchored to the 1st of the current month. For example, on July 15 2026, "Last 6 Months" sums records from January 1 → June 30.

---

## 9. Funding Sync Engine

### 9.1 Architecture

```
useFundingSync.ts
├── fetchCurrentRates()    → FundingService.fetchCurrentRates(exchange)
│                              ├── fetchBybitCurrentRates()  → /v5/market/tickers
│                              ├── fetchBitgetCurrentRates() → /api/v2/mix/market/current-fund-rate
│                              └── fetchOkxCurrentRates()    → /api/v5/public/funding-rate
│
└── syncHistoricalRates(rates)  →  BATCH_SIZE=20 parallel
     └── processSymbol(rate, now)  →  Decision tree (6 scenarios)
           ├── doFullFetch()      →  FundingService.fetchFundingHistory()  [no sinceTimestamp]
           └── doIncrementalFetch() → FundingService.fetchFundingHistory() [with sinceTimestamp]
```

### 9.2 ProcessSymbol Decision Tree

```
1. No cached metadata → doFullFetch (complete 400-day fetch)
2. OKX + fresh (latest < 8h) → SKIP
3. OKX + stale (latest ≥ 8h) → doFullFetch (preserving existing bounds)
4. Bybit/Bitget + fresh + deep (span ≥ 400d) → SKIP
5. Bybit/Bitget + stale + deep → doIncrementalFetch (only new records)
6. Bybit/Bitget + stale + not deep → doFullFetch (extend depth)
```

### 9.3 Incremental Fetch Details

For Bybit/Bitget symbols that already have ≥400 days of cached data:

```typescript
// useFundingSync.ts — doIncrementalFetch()
const history = await FundingService.fetchFundingHistory(
  rate.exchange, rate.symbol, rate.instrumentType, 200, sinceTimestamp = meta.latestTimestamp
);
const newRecords = history.filter(r => r.timestamp > sinceTimestamp);
if (newRecords.length > 0) {
  await saveFundingFeesCache(newRecords);      // upsert to IndexedDB
  await updateFundingMeta(..., newRecords[0].timestamp);  // update latestTimestamp
}
```

### 9.4 Lock Mechanisms

| Guard | Implementation | Purpose |
|-------|---------------|---------|
| Sync in progress | `useRef(false)` | Prevents concurrent historical sync runs |
| Fetching current | `useRef(false)` | Prevents concurrent current-rates fetches |
| Rate-limit interval | `lastHistoryFetchRef` + store value | Prevents re-triggering before configured interval |
| Batch concurrency | `Promise.allSettled` on batch of 20 | Controls API load per cycle |

### 9.5 API Pagination Strategies

| Exchange | Strategy | Details |
|----------|----------|---------|
| **Bybit** | Reverse cursor | Uses `endTime` param = oldest record's `fundingRateTimestamp`. Passes both `startTime` and `endTime` for incremental fetch to avoid the "only startTime" error. |
| **Bitget** | Page-based | Full fetch: 15 pages × 100 records in batches of 5 (parallel). Incremental: 2 pages × 100 records (parallel), filtered by `sinceTimestamp`. |
| **OKX** | Cursor-based | Uses `after` param = last record's `fundingTime`. 5 pages × 100 records. Fixed 3-month API limit. No incremental fetch. |

---

## 10. Bybit Transaction Log Entry (`BybitTransactionLogEntry`)

Captures the full raw payload from Bybit's `/v5/account/transaction-log` endpoint after normalization. Unlike other unified interfaces which normalize into abstract fields, `BybitTransactionLogEntry` preserves the complete Bybit schema because its fields are used directly by the transaction log filtering, computation, and display components.

```typescript
export interface BybitTransactionLogEntry {
  // Primary key = `${connectionId}-${rawId}-${transactionTime}`
  id: string;
  connectionId: string;
  exchange: 'bybit';
  label: string;

  // Raw data preserved from Bybit
  rawId: string;
  symbol: string;
  category: string;        // linear, inverse, spot, option
  side: 'Buy' | 'Sell' | 'None';
  transactionTime: number; // ms timestamp
  type: string;            // TRADE, SETTLEMENT, DELIVERY, LIQUIDATION, BONUS, TRANSFER, etc.
  transSubType: string;
  qty: string;
  size: string;
  currency: string;
  tradePrice: string;
  funding: string;
  fee: string;
  cashFlow: string;
  change: string;          // change = cashFlow + funding - fee
  cashBalance: string;
  feeRate: string;
  bonusChange: string;
  tradeId: string;
  orderId: string;
  orderLinkId: string;

  raw: Record<string, unknown>;
}
```

### Key Fields for Funding Analysis

| Field | Description | Used By |
|-------|-------------|---------|
| `transactionTime` | Timestamp of the event | Sorting, grouping, period filtering |
| `type` | Event type (`SETTLEMENT` = funding settlement) | `filterEntries()` for funding-specific aggregation |
| `funding` | Funding fee amount (positive = received, negative = paid) | PnL computation, `computeRealPnL()` |
| `fee` | Trading fee amount | PnL computation |
| `cashFlow` | Cash flow component of the transaction | `computeRealPnL()` — `cashFlow + funding - fee` |
| `change` | Net change to cash balance (`cashFlow + funding - fee`) | Verification, reconciliation |

### Sync & Cache

| Function | Location | Description |
|----------|----------|-------------|
| `syncWithCache(key)` | BybitTransactionService | Initial full sync: fetches all pages from Bybit, deduplicates, writes to IndexedDB |
| `syncIncremental(key, latestTime)` | BybitTransactionService | Incremental sync: fetches only records since `latestTime`, deduplicates, appends to cache |
| `getBybitTxLogCache(connectionId)` | historyCache.ts | Read all entries for a connection from IndexedDB |
| `getAllBybitTxLogCache()` | historyCache.ts | Read ALL entries across all connections |
| `saveBybitTxLogCache(entries)` | historyCache.ts | Bulk upsert to IndexedDB `bybitTxLog` store |

### Computed Statistics (`BybitTransactionService.computeStats`)

Returns derived metrics from filtered entries:

```typescript
{
  totalFunding: number;      // Sum of `funding` field
  totalFees: number;         // Sum of `fee` field
  totalRealized: number;     // Sum of `change` field (cashFlow + funding - fee)
  tradeCount: number;        // Count of `TRADE` type entries
  fundingCount: number;      // Count of `SETTLEMENT` type entries
}
```

---

## 11. Funding Cache Stores (IndexedDB via `historyCache.ts`)

### 11.1 Object Stores

| Store Name | Key Path | Indexes | Schema Version Added |
|-----------|----------|---------|---------------------|
| `fundingFees` | `id` (string) | `by-exchange`, `by-symbol`, `by-fundingTime` | DB_VERSION 5 |
| `fundingMeta` | `id` (string) | `by-exchange` | DB_VERSION 5 |

### 10.2 CRUD Operations

| Function | Store | Description |
|----------|-------|-------------|
| `saveFundingFeesCache(entries: UnifiedFundingFee[])` | `fundingFees` | Bulk upsert via `put()` in a transaction |
| `getFundingFeesBySymbol(exchange, symbol)` | `fundingFees` | Read all records for a specific exchange+symbol |
| `getAllFundingFees()` | `fundingFees` | Read ALL records across all exchanges/symbols |
| `getFundingMeta(exchange, symbol)` | `fundingMeta` | Read coverage metadata for a symbol |
| `updateFundingMeta(exchange, symbol, oldest, latest)` | `fundingMeta` | Upsert coverage metadata |

### 10.3 Metadata Schema

```typescript
interface FundingMeta {
  id: string;                 // "exchange-symbol"
  exchange: ExchangeName;
  symbol: string;
  oldestTimestamp: number;    // oldest cached record
  latestTimestamp: number;    // most recent cached record
  recordCount: number;
  updatedAt: number;
}
```

---

## 11. Unifiers and Mathematical Standardizations (`src/utils/`)

A unificação perfeita dos dados repousa sobre utilitários determinísticos e de alta precisão baseados na biblioteca `Big.js` para cálculos financeiros críticos.

### 11.1. Tratamento de Posições e Históricos Inversos (`inverseUtils.ts`)
Para sanar o problema de as corretoras reportarem tamanhos e volumes em unidades fundamentalmente distintas dependendo do tipo de margem (Linear vs Inversa), as lógicas de conversão foram centralizadas:

#### 1. Cálculo de Posições Abertas (`getOpenPositionSizeAndValue`)
*   **Contratos Lineares (ex: BTCUSDT):** 
    *   Tamanho (`size`) = Quantidade de Moedas (`size` bruto).
    *   Valor Nocional USD (`notionalUsd`) = `size` × `markPrice`.
*   **Contratos Inversos Bybit (ex: BTCUSD):**
    *   Tamanho em Cripto (`size`) = `positionIM` (margem) / `entryPrice` ou derivado de `positionValue` / `entryPrice`. No caso Bybit, como o `size` enviado é em USD, convertemos para tamanho de moeda dividindo o valor nocional (USD) pelo preço de entrada (`value / entryPrice`).
    *   Valor Nocional USD (`notionalUsd`) = `size` bruto (que já representa a quantidade em USD do contrato).
*   **Contratos Inversos Bitget (ex: BTCUSD):**
    *   Tamanho em Cripto (`size`) = `size` bruto × `contractValue` (obtido via `getBitgetInverseContractVal(symbol)`).
    *   Valor Nocional USD (`notionalUsd`) = `size` (em cripto) × `markPrice`.

#### 2. Cálculo de Posições Fechadas / Histórico (`getHistoryPositionSizeAndValue`)
*   **Bybit Linear:**
    *   `size` = `size` bruto (em cripto).
    *   `notionalUsd` = `cumEntryValue` (já retornado em USD/USDT).
*   **Bybit Inversa:**
    *   `size` = `cumEntryValue` (valor bruto em cripto).
    *   `notionalUsd` = `size` bruto (volume contratual em USD).
*   **Bitget Inversa:**
    *   `size` = `closeTotalPos` × `getBitgetInverseContractVal(symbol)`.
    *   `notionalUsd` = `size` × `closePrice`.

### 11.2. Extração de Moedas e Mapeamento de Atributos (`unifiers.ts`)
*   **Direção da Posição (`mapPositionSide`):** Normaliza as strings `Buy`/`Sell`/`long`/`short`/`net` para as variantes literais `'long' | 'short' | 'net'`.
*   **Modo de Margem (`mapMarginMode`):** Normaliza `cross`/`isolated`/`fixed`/`crossed`/`0`/`1` para as variantes literais `'cross' | 'isolated' | 'unknown'`.
*   **Ativos Base e Cotação (`extractBaseCoin` & `extractQuoteCoin`):** 
    *   OKX: Realiza o split por hífen (ex: `BTC-USDT-SWAP` -> Base: `BTC`, Quote: `USDT`).
    *   Bybit & Bitget: Filtra sub-caracteres (como `_` em spot) e fatias de strings conhecidas (sufixos `USDT`, `USDC`, `USD`, `PERP`) de forma determinística para isolar os tickers reais das moedas.
