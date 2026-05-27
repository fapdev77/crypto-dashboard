# Hedge Pro Dashboard - Requirements & Technical Design

## 1. Requirement Analysis

### Purpose
The **HedgeProDashboard** is a specialized analytics and monitoring panel designed exclusively for **Coin-Margined (Inverse) Instruments** across Bybit, Bitget, and OKX. It translates complex inverse derivatives mechanics into actionable portfolio intelligence, specifically highlighting the "Hedge Pro Concept".

### Data Source & Context
- **Source of Truth**: `unified-interfaces.md` (`UnifiedBalance`, `UnifiedPosition`, `UnifiedHistoryPosition`).
- **Target Instruments**: Positions where `instrumentType` is `inverse` or `COIN-FUTURES`. (Note: We will also filter based on settlement currencies like BTC, ETH, omitting USDT/USDC settled linear contracts).
- **Core Libraries**: `Big.js` is mandatory for all PnL and balance arithmetic to avoid floating-point loss.
- **Formatting Constraints**: 
  - Crypto Assets (Base currencies like BTC, ETH): **8 decimal places**.
  - Fiat/Stablecoin values (USD estimate): **2 decimal places**.

### The "Hedge Pro Concept" Business Logic
Inverse contracts use the base crypto asset (e.g., BTC) for settlement and value calculation:
- **Short Positions (Protection / Delta Neutral)**: Holding a 1x Short on an inverse contract conceptually locks the USD value of the collateral. 
  - If the asset price drops, the position generates positive PnL (in crypto) offsetting the collateral's USD devaluation.
  - If the asset price rises, the position generates negative PnL (in crypto), representing "missed profit" relative to just holding the asset, but the total USD value remains stable (Delta Neutral). The UI will present this relationship clearly.
- **Long Positions (Leveraged Exposure)**: Double exposure. 
  - Positive side: You gain collateral appreciation + position PnL (in crypto, whose value is also rising).
  - Negative side: You suffer collateral depreciation + position negative PnL (in crypto, whose value is falling).

### UI/UX Requirements
- **Hierarchy**: Global (Hedge Pro) -> Exchange -> Account -> Asset. Expand/Collapse capability at each node.
- **Asset Fields**: Split presentation for `Wallet Balance`, `Unrealized PnL`, `Margin Balance`, `Position Margin`, and `Available Margin`. Format: `[Asset Value] | [USD Estimate]`.
- **Hedge-Mode Consolidation**: Detect simultaneous Long and Short positions on the exact same symbol and display a "Consolidated Net" view card alongside the individual position cards.
- **Evolution Chart**: Visual representation of the asset's PnL over the last 90 days.
- **Performance Comparator**: Interactive input for "Initial Balance (Asset and USD)" to calculate final percentage and nominal PnL changes against current equity.
- **Orders/Trades List**: Accordion-style layout per account. Collapsed: Totals of Buy/Sell. Expanded: Granular details (Price, Qty, Type, Time).

---

## 2. Technical Design Plan

### Data Flow Architecture
1. **Data Ingestion**: `dashboardStore` (Open Positions, Balances) and `usePositionHistory` (Closed Positions/Trades).
2. **Filtering Engine**: 
   - Accept only balances that are not USDT/USDC (or exclusively the collateral assets in inverse positions).
   - Filter `positions` checking `instrumentType === 'inverse'` (Bybit), `'COIN-FUTURES'` (Bitget), or where the settlement currency isn't a stablecoin.
3. **Aggregation Engine**: Group by `Exchange` -> `Account (connectionId)` -> `Asset/Collateral (ccy)`.
4. **Hedge Processor**: For each symbol within an asset, check `side` ('long' and 'short'). If both exist, calculate `Net Size` and `Net Notional USD`.
5. **Presentation Layer**: React components relying on `Big.js` computations and Tailwind CSS utilities.

### Component Tree
1. `HedgeProDashboard` (Container / Main View)
   - `HedgeProHeader` (Global sum of inverse equity in USD vs Crypto)
   - `HedgeProFilterBar` (Filter by Exchange / Accounts)
   - `ExchangeNode` (Iterated over Bybit, Bitget, OKX)
     - `AccountNode` (Iterated over API keys)
       - `AssetNode` (The core of the logic, e.g., BTC, ETH)
         - `AssetMetrics` (Wallet, PnL, Margins double column format)
         - `PositionCard` (Standalone Long or Short)
         - `HedgeNetCard` (If Hedge Mode active)
         - `AssetPnLChart` (90 days history line chart)
         - `PerformanceSimulator` (Initial balance inputs)
         - `TradesAccordion` (Historical closed position list)

---

## 3. Atomic Implementation Tasks

- [x] **Task 1: Project Setup & Types.** Validate exports in `src/types.ts` and set up the base `HedgeProDashboard.tsx` structure and generic layout.
- [x] **Task 2: Data Hooks & Filtering.** Create custom logic (possibly a hook like `useInverseData`) to consume `dashboardStore` and `historyCache`, applying the `inverse` / `COIN-FUTURES` instrument filter. 
- [x] **Task 3: Asset Metrics & Hierarchy.** Implement `ExchangeNode`, `AccountNode`, and `AssetNode` components. Add formatting utilities for `8 decimals (Crypto)` and `2 decimals (USD)`.
- [x] **Task 4: The Hedge Pro Concept Logic.** Implement position cards. Compute the Delta Neutral stats for Short positions and Double Exposure stats for Long positions using `Big.js`.
- [x] **Task 5: Hedge-Mode Consolidation.** Write the logic to pair Longs and Shorts and render the `HedgeNetCard`. 
- [x] **Task 6: Performance Simulator & Chart.** Add the interactive calculator and 90-days PnL trend chart (utilizing `usePositionHistory`). 
- [x] **Task 7: Trades Accordion & Final Polish.** Build the trades list, ensure Tailwind CSS is pixel-perfect, completely responsive, and follows standard colors.
