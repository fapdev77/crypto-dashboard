# Specification: PnL by Symbol Report & Intensity Bars

## 1. Data Schema Definition (SymbolPnLRecord)
Based on the existing `UnifiedHistoryPosition` and the new requirements, we will aggregate the historical data into the following schema:

```typescript
import Big from 'big.js';

export interface SymbolPnLRecord {
  symbol: string;      // e.g., "ETHUSDT"
  instrument: string;  // Derived from raw data (e.g., "USDT-FUTURES", "linear", "SWAP")
  totalPnL: Big;       // Aggregated Total Realized PnL (including fees if requested, but base is Realized)
  longPnL: Big;        // Aggregated PnL for Long positions
  shortPnL: Big;       // Aggregated PnL for Short positions
  exchange: 'bitget' | 'bybit' | 'okx';
  lastActivity: number; // Latest timestamp for this symbol
}
```
*Note: We will use `Big.js` internally during aggregation to prevent floating point inaccuracies, parsing to formatted strings or numbers only at the UI layer.*

## 2. Deriving the Instrument Type
Since the `UnifiedHistoryPosition` interface doesn't strictly hold the 'instrument' type directly, we will extract it from the `raw` data payload during aggregation:
- **Bitget**: Infer from `raw.productType` or `raw.marginCoin`.
- **Bybit**: Infer from `raw.symbol` suffix or implicit category (`linear` / `inverse`).
- **OKX**: Infer from `raw.instType` (e.g., `SWAP`, `FUTURES`).

## 3. Logic for "Intensity Bars" (Visual Representation)

Looking at the provided reference image (`ModeloRelatorioPNL.png`), each PnL column (Total, Long, Short) has an intensity bar behind or below the text.
The bars are bi-directional from a central "Zero" axis.

### Calculation Strategy:
For a given column (e.g., `Total PnL`) across the currently filtered list of $N$ symbols:
1. **Find Maximum Absolute Value**: 
   $$MaxAbs = \max(|PnL_1|, |PnL_2|, ..., |PnL_N|)$$
2. **Calculate Proportional Width**: 
   For each row $i$:
   $$Ratio_i = (|PnL_i| / MaxAbs) \times 100$$
   *(This gives a percentage from 0% to 100%)*
3. **Bar Rendering (CSS/Tailwind)**:
   The bar container is divided into two halves (Left for Negative, Right for Positive).
   - If $PnL_i > 0$: The bar starts precisely at 50% (the center) and extends to the right by `Ratio / 2` percent of the total container width. Color: Green.
   - If $PnL_i < 0$: The bar extends to the left from the 50% mark by `Ratio / 2` percent of the total container width. Color: Pink/Red.
   
```tsx
// Abstract UI Component concept
const IntensityBar = ({ value, maxAbs }: { value: Big, maxAbs: Big }) => {
   const valNum = Number(value);
   const maxNum = Number(maxAbs) === 0 ? 1 : Number(maxAbs);
   const percentage = (Math.abs(valNum) / maxNum) * 100; // 0 to 100
   const isPositive = valNum > 0;
   
   return (
     <div className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded flex relative overflow-hidden">
        {/* Negative Side */}
        <div className="w-1/2 h-full flex justify-end">
           {!isPositive && <div className="h-full bg-pink-500 rounded-l" style={{ width: `${percentage}%` }} />}
        </div>
        {/* Positive Side */}
        <div className="w-1/2 h-full flex justify-start">
           {isPositive && <div className="h-full bg-green-500 rounded-r" style={{ width: `${percentage}%` }} />}
        </div>
     </div>
   )
}
```

## 4. Recursive Fetching & Pagination Strategy
The history is already efficiently requested via `PositionHistoryService` and cached via IndexedDB (`historyCache.ts`). We will:
1. Load all cached positions for the active connections.
2. Filter the loaded historical positions by the selected time period array (`start` and `end` timestamps).
3. Aggregate the mapped list into the unique `SymbolPnLRecord` dictionary using `Big.js` arithmetic increments.

*(End of Specification File)*
