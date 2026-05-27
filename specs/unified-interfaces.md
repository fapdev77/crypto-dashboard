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
  leverage: number;
  marginMode?: UnifiedMarginMode; // 'cross' | 'isolated'
  margin?: number; // Position Margin / Isolated Margin
  marginRatio?: number; // Tiered MMR or Margin Ratio (%)
  liquidationPrice?: number;
  breakEvenPrice?: number;
  roe?: number; // Return on Equity (%)
  tp?: number; // Take profit limit
  sl?: number; // Stop loss limit
  instrumentType?: UnifiedInstrumentType; // 'SPOT' | 'PERP' | 'INVERSE' | 'FUTURES' | 'OPTION' | 'UNKNOWN'
  raw?: any; // To store the original broker data if needed
}
```

### Mappings Table
| Field | Bybit (V5) | Bitget (V2) | OKX (V5) | Normalization Logic |
| :--- | :--- | :--- | :--- | :--- |
| `symbol` | `symbol` | `symbol` | `instId` | Direct mapping |
| `instrumentType`| `category` | `instType` | `instType` & `ccy` | Mapped to `UnifiedInstrumentType` |
| `side` | `side` (`Buy`/`Sell`) | `holdSide` / `posSide` | `posSide` | `long`, `short`, `net` |
| `size` | `size` (calc inverse vs USDT) | `total` | `pos` / `notionalUsd / markPx` | Base asset mapped normalized size |
| `notionalUsd`| `positionValue` | `total * markPrice` | `notionalUsd` | Notional USD conversion fallback |
| `entryPrice` | `avgPrice` / `entryPrice` | `openPriceAvg` | `avgPx` | Average entry price |
| `markPrice` | `markPrice` | `markPrice` | `markPx` | Current mark price |
| `unrealizedPnl` | `unrealisedPnl` | `unrealizedPL` | `upl` | Floating PnL |
| `realizedPnl` | `curRealisedPnl` | `achievedProfits` | `realizedPnl` | Already realized profits / fees |
| `margin` | `positionIM` | `marginSize` | `margin` | Active margin assigned |
| `liquidationPrice`| `liqPrice` | `liquidationPrice`| `liqPx` | Liquidation reference |
| `roe` | Calculated (`UPL / IM`) | Calculated / `uplRatio` | `uplRatio * 100` | Normalized ROE % |

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
  closeUpdateTime: number; // timestamp
  entryPrice?: number;
  closePrice?: number;
  size?: number;
  fundingFee?: number;
  tradingFee?: number;
  instrumentType?: UnifiedInstrumentType;
  raw?: any;
}
```

### Mappings Table
| Field | Bybit (V5) | Bitget (V2) | OKX (V5) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `realizedPnl` | `closedPnl` | `netProfit` / `achievedProfits` | `realizedPnl` | Total final PnL of closed position |
| `closeUpdateTime`| `updatedTime` | `utime` / `cTime` | `uTime` / `cTime` | Milliseconds timestamp of closure |
| `entryPrice`| `avgEntryPrice`| `openPriceAvg` | `openAvgPx` | Average open order fill price |
| `closePrice`| `avgExitPrice` | `closePriceAvg` | `avgPx` / `closeAvgPx` | Average close order fill price |
| `size` | `closedSize` | `closeTotalPos` | `closeVol` / `closeTotalPos`| Volume of the closed position |
| `instrumentType`| N/A | `instType` | `instType` | Mapped `UnifiedInstrumentType` |

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
  exchange: 'bitget' | 'bybit' | 'okx';
  lastActivity: number;
}
```
