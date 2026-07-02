# Unified Interfaces Specification (`unified-interfaces.md`)

This document defines the unified interfaces (`UnifiedBalance`, `UnifiedPosition`, `UnifiedHistoryPosition`, `UnifiedBillRecord`, and `SymbolPnLRecord`) to serve as the single source of truth for the frontend UI. It maps exchange-specific API payloads to normalized fields as defined in `src/types.ts`.

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
  raw?: any;
}
```

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
  raw?: any; // To store the original broker data if needed
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
  raw?: any;
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
  raw?: any;
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

