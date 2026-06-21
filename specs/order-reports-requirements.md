# Order Reports (MVP) - Requirements Analysis

## 1. Objective
Consolidate and display Open (Pending) and Closed (History) orders from multiple exchanges (Bybit, Bitget, OKX) in a unified, filterable report interface within the "MVP Tests" section of the application.

## 2. Functional Scope
The system will fetch, normalize, and present orders through the `OrderReportAggregator` (or equivalent service/hook).
Users will be able to filter orders based on various criteria.

### 2.1 Supported Exchanges & Endpoints
- **Bybit (V5):**
  - Pending: `/v5/order/realtime`
  - History: `/v5/order/history`
- **Bitget (V2):**
  - Pending: `/api/v2/mix/order/orders-pending`
  - History: `/api/v2/mix/order/orders-history`
- **OKX (V5):**
  - Pending: `/api/v5/trade/orders-pending`
  - History: `/api/v5/trade/orders-history-archive` (or regular `history` depending on the period limit)

### 2.2 Filters Required
1. **Exchange Filter:** Bybit, Bitget, OKX
2. **Account/Wallet Filter:** UTA, Classic, Trading (Depends on exchange connection)
3. **Order Type Filter:** LIMIT, MARKET, TP, SL, CONDITIONAL
4. **Symbol Filter:** Text search / active symbols dropdown
5. **Time Period Filter (History only):** Today, 7 days, 14 days, 30 days, 90 days (Bounded to 90 days for OKX/Bitget normalization)

### 2.3 User Interface (UI)
- **Table Layout:** Responsive and clean table displaying consolidated order data.
- **Expand/Collapse (Accordion):** Rows can be expanded to view granular details (e.g., execution IDs, fees).
- **Clean Design:** Filter dropdowns instead of tab structures, adhering to minimalist design principles without visual clutter.
- **Feedback:** Clear loading states, error boundaries, and empty states.

## 3. Data Contract (`UnifiedOrder`)

Strict mapping to the normalized common interface:

```typescript
export type UnifiedOrderStatus = 'NEW' | 'FILLED' | 'CANCELLED' | 'PARTIALLY_FILLED' | 'UNTRIGGERED' | 'TRIGGERED' | 'REJECTED';
export type UnifiedOrderType = 'LIMIT' | 'MARKET' | 'TP' | 'SL' | 'CONDITIONAL';

export interface UnifiedOrder {
  id: string; // Exchange + System OrderId
  exchangeOrderId: string; // Original ID from exchange
  connectionId: string;
  exchange: 'bybit' | 'bitget' | 'okx';
  symbol: string;
  category: 'linear' | 'inverse' | 'spot' | 'option'; // Or mapped to UnifiedInstrumentType
  side: 'buy' | 'sell';
  positionSide?: 'long' | 'short' | 'net'; // For derivatives
  type: UnifiedOrderType;
  status: UnifiedOrderStatus;
  price: number; // Requested order price
  avgPrice: number; // Average fill price (8 decimal places for assets)
  qty: number; // Order quantity
  filledQty: number; // Executed quantity
  value?: number; // Total order value
  triggerPrice?: number; // For TP/SL/Conditional
  reduceOnly?: boolean;
  timeInForce?: string;
  createdTime: number; // Timestamp ms
  updatedTime: number; // Timestamp ms
  fees?: number; // Executed fees if any
  raw?: any; // Original payload
}
```

## 4. Arithmetic & Rules
- **Precision:** `Big.js` must be used for any PnL, price averaging, or fee summation calculations. A fixed 8 decimals should be presented for asset prices.
- **Return Early:** Adapters and Aggregators will validate input parameters (like dates) and return early if out of bounds or missing API definitions.
- **Date Normalization:** When using 90-day filters, the API fetching must manage cursor pagination or timestamps boundaries respectfully (max 90 days for Bitget/OKX).
