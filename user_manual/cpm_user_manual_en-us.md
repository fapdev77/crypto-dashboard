# 📘 User Manual - Crypto Portfolio Manager (CPM)

> **Application Version:** 2.16.0  
> **Supported Exchanges:** Bybit (API V5 UTA), Bitget (API V2 Classic & UTA), OKX (API V5)  
> **Security Architecture:** Zero-Trust Client-Side (Web Crypto PBKDF2 + AES-GCM 256-bit Encryption)

Welcome to the **Crypto Portfolio Manager (CPM)**! This institutional-grade analytics terminal is designed to consolidate, monitor, and audit your multi-exchange cryptocurrency balances, derivatives positions, Delta-Neutral hedge risk, funding fees, order execution logs, and full transaction histories across **Bitget**, **Bybit**, and **OKX** in real-time.

Our highest foundational priority is **zero-trust client security** and **uncompromising privacy preservation**: your API credentials, encryption passphrases, and transaction records remain strictly under your local browser sandbox custody, never touching or being stored on third-party cloud databases.

---

## 📌 Table of Contents

1. [Zero-Trust Security Architecture](#1-zero-trust-security-architecture)
2. [Initial Configuration & API Keys Setup](#2-initial-configuration--api-keys-setup)
   - [Bybit Regional Endpoints & Origin Headers](#bybit-regional-endpoints--origin-headers)
   - [Bitget: Classic vs UTA Selection, Sub-Accounts & Funding](#bitget-classic-vs-uta-selection-sub-accounts--funding)
   - [OKX: Dual-Wallet (Trading & Funding Accounts)](#okx-dual-wallet-trading--funding-accounts)
3. [Global Master Password, Encrypted Backups & Mandatory Vault Migration](#3-global-master-password-encrypted-backups--mandatory-vault-migration)
4. [Simulation Mode (Mock Data)](#4-simulation-mode-mock-data)
5. [Integrated Log Terminal (Connection Logs)](#5-integrated-log-terminal-connection-logs)
6. [Synchronization, Retention & Cache Settings](#6-synchronization-retention--cache-settings)
7. [Screens & Daily Usability Guide](#7-screens--daily-usability-guide)
   - [🏠 Dashboard Home](#-dashboard-home)
   - [⚡ Positions Ticker (Real-Time Header Marquee)](#-positions-ticker-real-time-header-marquee)
   - [🛡️ Hedge Pro Dashboard (Delta-Neutral & Inverse Contracts)](#-hedge-pro-dashboard-delta-neutral--inverse-contracts)
   - [💼 Open Positions (Active Positions — Detailed & Lite Modes)](#-open-positions-active-positions--detailed--lite-modes)
   - [📂 Closed Positions (Historical Positions & Analytics)](#-closed-positions-historical-positions--analytics)
   - [📝 Order Reports (Open Orders & Order History)](#-order-reports-open-orders--order-history)
   - [🔄 Trade History (Fill Executions & Fee Auditing)](#-trade-history-fill-executions--fee-auditing)
   - [📜 Consolidated Net Change & Multi-Exchange Transactions](#-consolidated-net-change--multi-exchange-transactions)
   - [📊 Portfolio Performance (Evolution Analytics & Institutional Metrics)](#-portfolio-performance-evolution-analytics--institutional-metrics)
   - [📈 Market Analytics (Quantitative Intelligence & Derivatives Flow)](#-market-analytics-quantitative-intelligence--derivatives-flow)
   - [📊 PnL by Symbol (Profit & Loss Distribution)](#-pnl-by-symbol-profit--loss-distribution)
   - [💸 Funding Fees Dashboard (Cross-Exchange Analytics)](#-funding-fees-dashboard-cross-exchange-analytics)
   - [📑 Reports (Operational & Executive Export)](#-reports-operational--executive-export)
   - [⚡ API Tester (REST & WebSocket Diagnostics)](#-api-tester-rest--websocket-diagnostics)
   - [👁️ Privacy Mode](#-privacy-mode)
   - [📊 PnL by Symbol (Profit & Loss Distribution)](#-pnl-by-symbol-profit--loss-distribution)
   - [💸 Funding Fees Dashboard (Cross-Exchange Analytics)](#-funding-fees-dashboard-cross-exchange-analytics)
   - [📑 Reports (Operational & Executive Export)](#-reports-operational--executive-export)
   - [⚡ API Tester (REST & WebSocket Diagnostics)](#-api-tester-rest--websocket-diagnostics)
   - [👁️ Privacy Mode](#-privacy-mode)
8. [PIKA Assistant (Portfolio Information & Knowledge Assistant)](#8-pika-assistant-portfolio-information--knowledge-assistant)
   - [Security & Privacy Principles](#-security--privacy-principles)
   - [Supported Providers (Local Ollama, Cloud Gemini, OpenRouter)](#-supported-providers-local-ollama-cloud-gemini-openrouter)
   - [Analytical Tool Calling Catalog (9 Tools)](#-analytical-tool-calling-catalog-9-tools)
   - [Tool Compatibility Audit](#-tool-compatibility-audit)
   - [Deep Telemetry, Daily Token Charts & Audit Export](#-deep-telemetry-daily-token-charts--audit-export)
   - [Global Shortcut & Chat Drawer](#-global-shortcut--chat-drawer)
9. [Inverse Contract Normalization & Numeric Precision](#9-inverse-contract-normalization--numeric-precision)
10. [Dynamic Token Pricing & Proxy Price Fallbacks](#10-dynamic-token-pricing--proxy-price-fallbacks)
11. [Connection Resilience, Fail-Fast Auth & Global Error Boundary](#11-connection-resilience-fail-fast-auth--global-error-boundary)
12. [PWA Support (Installable Desktop & Mobile App)](#12-pwa-support-installable-desktop--mobile-app)
13. [Frequently Asked Questions (FAQ)](#13-frequently-asked-questions-faq)

---

## 1. Zero-Trust Security Architecture

CPM was designed from the ground up under a strict decentralized privacy model:
- **No External Database for Credentials**: We do not operate cloud databases or servers to store your private keys or trade logs. All network requests communicate directly from your browser client to the official exchange servers.
- **Client-Side Encrypted Storage (`localStorage`)**: Your API credentials reside solely inside your browser's local sandbox, protected with optional military-grade encryption (**PBKDF2 with 100,000 iterations and AES-GCM 256-bit**).
- **Dumb Local / Serverless Proxy (`server.ts` / `/api/proxy`)**: To bypass native browser Cross-Origin Resource Sharing (CORS) blocks, CPM routes API traffic through a lightweight, zero-knowledge proxy. The client computes all cryptographic signatures (HMAC-SHA256, timestamps) locally before dispatch. The proxy acts purely as an in-flight relay, unable to decrypt or tamper with signed headers and never storing secret credentials.
- **NEVER Supply Keys with Trading or Withdrawal Permissions**: CPM requires **READ-ONLY permissions** exclusively. Never create or upload API keys authorized to transfer funds, execute orders, or withdraw capital.

---

## 2. Initial Configuration & API Keys Setup

To connect your exchange accounts to CPM:

1. **Create Read-Only API Keys on Your Exchanges:**
   - **Bybit**: API V5 (Read-only, permissions for Account, Position, and Trade).
   - **OKX**: API V5 (Read-only, enter a strong custom **Passphrase** when generating the key).
   - **Bitget**: API V2 (Read-only, **Passphrase** required; supports both Classic and UTA accounts).
2. **Open the Keys Manager**: In the left sidebar, click on **API Keys** and select **+ Add Exchange**.
3. **Fill Out the Connection Form:**
   - **Exchange**: Select Bitget, Bybit, or OKX.
   - **Label**: A unique friendly name (e.g., *Main Bybit UTA*, *Bitget Hedge Account*). Minimum 3 characters; duplicate labels per exchange are prevented.
   - **API Key** and **API Secret**.
   - **Passphrase**: Required for Bitget and OKX.

### Bybit Regional Endpoints & Origin Headers
For Bybit accounts, the connection modal provides regional compliance and network options:
- **Environment**: Switch between **Mainnet** (Production) and **Testnet** (Simulated Network).
- **Account Region / Origin**: Automatically routes to the legally compliant regional domain:
  - *Global Default* (`api.bybit.com`)
  - *Netherlands* (`api.bybit.nl`)
  - *Turkey* (`api.bybit-tr.com`)
  - *Hong Kong* (`api.bybit.com.hk`)
  - *Kazakhstan* (`api.bybit.kz`)
  - *Georgia* (`api.bybit.com.ge`)
  - *Brazil International* (`api.bybit.com` with auto-injected official header `x-site-id: 10001`)
  - *Argentina International* (`api.bybit.com` with auto-injected official header `x-site-id: 10002`)

### Bitget: Classic vs UTA Selection, Sub-Accounts & Funding
- **Account Type**:
  - **Classic**: For accounts operating on the classic segmented wallet model (Mix/Futures and Spot).
  - **UTA (Unified Trading Account)**: For upgraded Bitget unified margin accounts.
- **Include Funding Account**: When checked, fetches and displays assets held in the Funding/Spot wallet.
- **Sub-account**: Marks the connection as a sub-account subordinate to a master account, allowing clear visual tagging in balance tables and transaction filters.

### OKX: Dual-Wallet (Trading & Funding Accounts)
The `OkxAdapter` concurrently queries the Unified Trading account (`/api/v5/account/balance`) and the Funding account (`/api/v5/asset/balances`). Asset valuations are dynamically aggregated into the account's total equity with distinct UI badges: `UNIFIED` for trading margin and `FUNDING` for passive deposits.

---

## 3. Global Master Password, Zero-Trust Vault & Inactivity Auto-Lock

To safeguard your sensitive financial telemetry and credentials on personal, shared, or office workstations, CPM incorporates a comprehensive security vault lifecycle:

1. **Vault Initialization upon First Connection Setup**:
   - When adding your very first API key (**+ Add Exchange**), CPM detects if your local vault has not yet been initialized and prompts you to configure a **Master Passphrase** (minimum 8 characters).
   - All credentials are encrypted on the client side prior to persistence in `localStorage`, using **PBKDF2-SHA256 key derivation with 600,000 iterations** coupled with authenticated **AES-GCM 256-bit** symmetric encryption.
2. **Global Session Lock Screen**:
   - Upon page refresh, browser restart, or opening the tab, a full-screen lock prompt prevents data rendering until your correct master passphrase is provided.
   - If forgotten, a factory reset option (*Wipe Data*) is available to purge local records and start fresh securely.
3. **Inactivity Auto-Lock (`useVaultAutoLock`)**:
   - Under **Settings** $\to$ **Security Settings**, you can enable the **Auto-Lock on Inactivity** engine.
   - **Customizable Idle Slider**: Set your preferred idle timeout between **1 and 60 minutes** (default: 15 minutes).
   - The `useVaultAutoLock` hook tracks active user inputs (mouse moves, keyboard strokes, touch gestures, and scroll events). Once the idle duration elapses, CPM automatically locks the vault and **instantly purges all decrypted keys from system RAM**.
4. **On-Demand Manual Lock (Lock Vault Now)**:
   - In the security panel, click the **Lock Vault Now** button to immediately lock the application and discard active keys from memory without needing to refresh the page.
5. **Master Passphrase Updating & Re-encryption**:
   - Need to change your master passphrase? Go to **Security Settings** $\to$ **Change Passphrase**. Provide your current passphrase and your new passphrase (minimum 8 characters). CPM safely re-encrypts all configured connections in a single atomic batch, preserving all your account labels and configurations.
6. **Startup Vault Setup Notice Modal**:
   - If you use the application without having configured a master password, an unobtrusive 5-second countdown alert appears at startup informing you of the vault's security benefits and providing a 1-click shortcut to set it up. This notice can be toggled off at any time in Settings.
7. **Encrypted File Backups (`.cpmbackup`)**:
   - Export all your configured exchange connections and preferences in a single encrypted `.cpmbackup` file.
   - The backup can be safely moved to another device or saved in an offline password vault.
8. **Backup Restoration**:
   - Import your `.cpmbackup` file and enter your master password to instantly recover all connections and preferences.

---

## 4. Simulation Mode (Mock Data)

If you wish to test the terminal or showcase features in videos without entering live API keys:

1. Navigate to **Settings** in the left sidebar.
2. Turn on the **Use Mock Data (Simulation Mode)** toggle.
3. **Simulation Mode Behavior**:
   - Live REST and WebSocket connections are halted instantly.
   - Realistic multi-exchange mock datasets are loaded into memory (balances, active and closed positions, open orders, transaction logs, and hedge metrics).
   - A pulsing yellow badge (**Simulation Mode**) is shown in the top status bar.
   - Manual sync triggers are safely disabled to prevent unwanted network calls.
   - Toggling it off resumes live exchange polling immediately.

---

## 5. Integrated Log Terminal (Connection Logs)

For network transparency and technical diagnostics:

1. **Dedicated View**: Click **Logs** in the sidebar to open the `ConnectionLogTerminal`.
2. **Zero-Leak Secret Redaction**: An automated regex filter masks all API keys, secrets, passphrases, and HMAC signatures, keeping sensitive keys private during troubleshooting.
3. **Log Severities**:
   - `SYSTEM`: Subsystem bootloaders, adapter initialization, timer schedules.
   - `DATA`: Inbound balance updates, price tickers, order deltas.
   - `WARN`: Network latency spikes, rate-limit warnings, clock-skew offsets.
   - `ERROR`: Authentication failures, network disconnects, HTTP errors.
4. **Search & Regex Filtering**: Filter logs by asset ticker (e.g., `BTCUSDT`, `ETH-PERP`) or inspect specific error codes.

---

## 6. Synchronization, Retention & Cache Settings

CPM operates on a high-speed **SWR (Stale-While-Revalidate)** cache engine backed by browser **IndexedDB** (`crypto-dashboard-cache` across 14 specialized stores):

- **Zero-Latency Rendering**: Visualizations and tables load instantly from local IndexedDB cache, while background workers pull delta records to keep data fresh.
- **Global Sync Coordination (`lastSyncTime`)**: Navigating between historical views (Orders, Positions, Trades, PnL by Symbol) avoids duplicate network requests if a sync recently completed.
- **Browser Storage Quota Governance (`storageQuota`)**:
  - Live measurement of used megabytes and available browser quota via `navigator.storage.estimate()`.
  - Color-coded progress bar warning of high disk consumption.
- **Data Retention & History Pruning**:
  - Configurable retention periods: *30 days*, *60 days*, *90 days*, *180 days*, *365 days (Default)*, or *730 days (2 years)*.
  - **"Prune History" Action**: Deletes historical logs and closed positions older than the selected threshold while preserving account metadata and warm cache.
- **Targeted Cache Clearing**:
  - *Clear Orders Cache*, *Clear Funding Cache*, *Clear Transactions Cache*.
  - **Danger Zone — Wipe All Local Client Data**: Factory reset that wipes all stored keys, preferences, and local databases.

---

## 7. Screens & Daily Usability Guide

### 🏠 Dashboard Home
The executive command center of your portfolio:
- **Total Equity**: Real-time aggregated net worth in USD across all connected wallets and sub-accounts.
- **Unrealized PnL**: Floating profit/loss across all active derivative positions.
- **Margin Usage & Available Margin**: Ratio of committed margin versus free collateral.
- **Exchange Allocation & Custody Distribution**: Visual donut chart breaking down capital between Bybit, Bitget, and OKX.
- **Hierarchical Balance Table (`ExchangeHierarchyTable`)**: Expandable overview organized by Exchange $\to$ Sub-Account $\to$ Asset, with balances, USD valuations, `UNIFIED` / `FUNDING` tags, and performance sparklines.

### ⚡ Positions Ticker (Real-Time Header Marquee)
A continuously scrolling marquee bar anchored at the top of the interface displaying real-time quotes, side (Long/Short), size, and floating PnL for all active positions.

### 🛡️ Hedge Pro Dashboard (Delta-Neutral & Inverse Contracts)
Promoted to a **dedicated top-level module** in the sidebar, tailored for funding arbitrage and delta-neutral risk management in COIN-M (Inverse) contracts:
- **Beyond-100% Mathematical Risk Model**:
  - **Real Protection (Locked USD Entry)**: Short positions in inverse contracts lock the USD value at `entryPrice`, shielding the underlying base asset from market drops (up to the coin wallet balance).
  - **Directional Exposure & Leverage**: Long positions in inverse contracts add directional risk and amplify equity swings.
- **Portfolio Exposure Bar**: Visual tri-color gauge showing % Protected Capital (green), % Exposed Capital (yellow), and Leverage Extent (orange/red).
- **Coin Summaries Table (`HedgeProCoinRows`)**: Summarizes base coin balance, spot price, total USD, protected USD, exposed USD, position count, and visual badges for *Overexposed* assets.
- **Decomposed Risk Charts**: `HedgeProBreakdownChart` and `HedgeProCapitalExposureChart` provide immediate visual clarity on portfolio balance.
- **Coin Drawer Metrics (`HedgeProCoinDrawerMetrics`)**: Expand any coin row to inspect individual position levels, entry prices, and margin details.

### 💼 Open Positions (Active Positions — Detailed & Lite Modes)
- **View Density Modes**: Switch between **Detailed** view (comprehensive cards) and **Lite** view (compact high-density tabular layout).
- **Core Indicators**: Live mark price via short-polling, entry price, ROE%, unrealized PnL, margin mode (Cross/Isolated), effective leverage, and Liquidation Price with warning color alerts.
- **Dynamic Coin Logos (`CoinIcon`)**: Multi-tiered fallback logic ensuring crisp visual logos for all traded instruments.

### 📂 Closed Positions (Historical Positions & Analytics)
- **Auditable Ledger**: Comprehensive history of closed positions across all three exchanges.
- **Statistical Performance Summary**: **Win Rate %**, **Profit Factor**, Average Win vs Loss, and Largest Closed Trade.
- **Timeframe Filtering**: Presets (7D, 30D, 90D, custom range) and real-time text/symbol search.
- **Multi-Format Export**: One-click download in **CSV**, **Excel (.xlsx)**, or formatted **PDF**.

### 📝 Order Reports (Open Orders & Order History)
- **Open Orders**: Monitor active Limit, Market, Stop Loss, and Take Profit orders with conditional trigger visualization.
- **Order History**: Historical log of executed, cancelled, and expired orders with regex search and expandable details.

### 🔄 Trade History (Fill Executions & Fee Auditing)
- Detailed trade execution log with fill price, contract size, Maker vs Taker liquidity flag, and exact fee currency deducted.

### 📜 Consolidated Net Change & Multi-Exchange Transactions

#### 🔹 Consolidated Net Change (Cross-Exchange Executive Dashboard)
Positioned as the **first item at the top of the Transactions History submenu**, this dashboard provides a unified view of your net capital movement and cash flow across all connected exchanges:
- **4 Consolidated Macro KPI Cards**:
  - **Total Transactions**: Total number of normalized ledger events across all accounts.
  - **Total Funding**: Consolidated net funding fees earned (credits) or paid (debits).
  - **Total Fees**: Total brokerage trading fees and transaction charges.
  - **Consolidated Net Change**: Total net cash flow variation in USD (`Net Change = Cash Flow + Funding - Fees`), highlighting overall profitability.
- **Hierarchical Two-Tier Grouping**:
  - **Tier 1 (By Exchange)**: Bybit, Bitget, and OKX summaries with total transactions, total fees, total funding, and USD Net Change. Each exchange group can be individually collapsed or expanded.
  - **Tier 2 (By Currency/Asset)**: Under each exchange, individual assets (BTC, ETH, SOL, USDT, etc.) are itemized with trade volume, deposit and withdrawal counts, fees paid, funding received, and net change in both the **base currency** and equivalent **USD**.
- **Sync Coordination & Privacy Controls**:
  - Integrated sync controls with real-time feedback and SWR cache invalidation.
  - Full **Privacy Mode** compatibility, replacing nominal values with secure masks.
- **Comprehensive Multi-Format Export**:
  - Instant export to **CSV**, formatted **Excel (.xlsx)**, or professional **PDF** audit reports with executive summaries.

#### 🔹 Exchange-Specific Transactions Log (Bybit, Bitget & OKX Transactions)
Comprehensive accounting ledger and cash flow reconciliation per broker:
- **Dynamic Navigation**: Sidebar transactions section automatically reflects only the exchanges that currently have active keys or simulation data.
- **Progressive Deep Sync**: 7-day chunked backfills with IndexedDB checkpoints for extensive historical depth (Bybit UTA up to 2 years; OKX recent and 3-month archive; Bitget Classic & UTA).
- **Universal Transaction Mapper (10 Normalized Categories)**:
  1. *Trade & Orders* (Trades, order executions, and closed PnL)
  2. *Funding Fee* (Periodic funding payments and payouts)
  3. *Transfer In / Deposit* (Inbound transfers and wallet deposits)
  4. *Transfer Out / Withdraw* (Outbound transfers and withdrawals)
  5. *Liquidation & ADL* (Forced liquidations and auto-deleveraging)
  6. *Interest & Loans* (Margin interest, borrow fees, and repayments)
  7. *Rewards & Bonus* (Vouchers, trial funds, and airdrops)
  8. *Delivery & Settle* (Futures delivery settlements and options exercise)
  9. *Others* (Conversions and administrative adjustments)
  10. *All Types* (Unfiltered ledger)
- **Details Modal with Total Stats Summary**: Clicking a transaction opens a detailed modal with an executive top summary showing total volume, net fees, and net change.
- **Cash Flow Reconciliation**: Mathematical validation: `Net Change = Cash Flow + Funding - Fees`.

---

### 📊 Portfolio Performance (Evolution Analytics & Institutional Metrics)
Located at the top of the **Analytics** menu, this quantitative dashboard implements the executive portfolio evolution model and institutional metrics glossary:

#### 1. Filter Controls & Denomination
- **Denomination Selector**: Toggle between the native base asset (e.g., *BTC Native*) or consolidated **USD** portfolio denomination.
- **Time Periods**: Ultra-fast default initial window of **7 Days**, with presets for **30 Days**, **90 Days**, **180 Days**, **1 Year**, and **All Time**.
- **Exchange & Account Filters**: Filter by specific exchange connection or evaluate cross-exchange combined portfolios.
- **Export Report**: Export full metrics, tables, and distribution breakdowns to CSV, Excel, or PDF.

#### 2. Balance Evolution & Cash Flow (Area Chart)
- **Dual Area Curve**:
  - **Balance Evolution**: Real-time line reflecting total asset portfolio value over time.
  - **Cumulative Net Result / Net Change**: Net cumulative profit/loss trajectory, separating trading alpha from inbound/outbound capital deposits.
- **Interactive Tooltips**: Date, balance, daily delta, and cumulative return at each timestamp.

#### 3. Temporal Performance Breakdown
- **Monthly PnL**: Vertical bar chart highlighting profit and loss per calendar month (green for profit, red for loss).
- **Day of Week PnL**: Statistical analysis of performance grouped from Monday to Sunday, revealing day-of-week seasonality and alpha patterns.

#### 4. Price Milestone Analysis
- Segmented performance analysis relative to the underlying asset's price levels:
- **Configurable Intervals**: Intelligent asset-specific presets (e.g., $1,000 for BTC, $100 for ETH) or custom interval inputs.
- **Return by Price Band**: Identifies at which price intervals strategy performance yielded maximum return.

#### 5. Primary Results & Executive Return
- **Invested Capital**: Baseline capital committed to operations.
- **Final Balance**: Net portfolio value at the end of the selected period.
- **Gross vs. Net Result**: Clear segregation between operational gains and post-fee results.
- **Net ROI %**: Net percentage return on invested capital.
- **Annualized Return**: Compounded annualized rate of return for institutional comparison.

#### 6. Operations & Fee Deconstruction (Operations & Fees)
- **Total Operations Count**: Transaction frequency in the selected period.
- **Trades vs. Account Transfers**: Clear distinction between active trading transactions and deposit/withdrawal transfers.
- **Fee Breakdown**: Deconstructs Trading Fees, Funding Fees, and Transfer charges.
- **Fee Drag Ratio**: Percentage of gross trading performance absorbed by transaction and financing fees.

#### 7. Advanced Risk & Consistency Metrics
- **Profit Factor**: Ratio of gross profits to gross losses (`Gross Gains / |Gross Losses|`), tagged with qualitative badges:
  - *Excellent* (> 2.0)
  - *Good* (1.5 - 2.0)
  - *Acceptable* (1.1 - 1.5)
  - *Poor* (< 1.1)
- **Daily Win Rate**: Percentage of days with positive return vs. total days evaluated.
- **Consistency Index**: Statistical measurement of daily return dispersion and stability:
  - *High Consistency*: Stable daily returns with low tail risk.
  - *Moderate Consistency*: Balanced performance with controlled dispersion.
  - *High Dispersion*: High variance with dependency on few outlier sessions.

#### 8. High-Performance Architecture
- Defaults to 7-day window for instant rendering without lag.
- Downsamples long series to maximum 80 data points for responsive interaction.
- Recharts SVG animations disabled (`isAnimationActive={false}`) for immediate tab and filter switches.
- Granular Zustand subscriptions and memoized sub-sections (`React.memo`).

---

### 📈 Market Analytics (Quantitative Intelligence & Derivatives Flow)
Cross-exchange derivatives intelligence terminal:
- **Multi-Market Overview Mode**:
  - *Asset Selector with Starred Favorites*: Persists preferred pairs (e.g., BTC, ETH, SOL) in local storage.
  - *Market Types*: Filter by PERP (Linear), INVERSE (Coin-M), SPOT, or ALL.
  - *Circular Auto-Refresh Countdown*: Selectable intervals (5s, 10s, 15s, 30s, 60s, or Paused) with circular countdown visualization and instant manual refresh.
  - *Open Interest (OI) & Leverage Monitor*: Dual-axis chart correlating asset price with total open interest in USD.
  - *Algorithmic Market Regime Detector*:
    - `Long Accumulation`: Price ↑ & OI ↑ (Bullish accumulation by buyers).
    - `Short Squeeze`: Price ↑ & OI ↓ (Rally driven by short liquidations).
    - `Aggressive Shorting`: Price ↓ & OI ↑ (Bearish short expansion).
    - `Long Liquidation`: Price ↓ & OI ↓ (Cascading long liquidations).
    - `Neutral Consolidation`: Flat price and OI without clear conviction.
  - *Cross-Exchange Funding Arbitrage*: Real-time scanner for rate divergences across Bybit, OKX, and Bitget, displaying 8h spread, annualized APR (`Spread APR = Spread 8h * 3 * 365`), and recommended Long/Short venues.
  - *Order Flow & Cumulative Volume Delta (CVD)*: Aggressive market orders tracked via `Net Delta = Taker Buy - Taker Sell` with automated alerts for Bullish and Bearish divergences.
  - *Smart Money vs Retail Sentiment*: Compares retail account Long/Short ratio against the top 20% of traders by volume, accompanied by the Fear & Greed index.
- **Inverse Coin-M Dashboard Mode**:
  - Dedicated view for inverse contracts with exchange breakdowns (8h funding, 24h volume, OI, and arbitrage spread) plus batch Expand/Collapse All controls.

### 📊 PnL by Symbol (Profit & Loss Distribution)
- Net profit/loss breakdown per coin, separating Long versus Short results with profit factor metrics and financial intensity bars.

### 💸 Funding Fees Dashboard (Cross-Exchange Analytics)
- **Aggregation-First Pipeline**: High-precision math using Big.js stored as compact summaries (`FundingRateSummary`) in IndexedDB.
- **Multi-Period Coverage**: Next Rate, Last Rate, Today, Current Month, Last Month, 3 Months, 6 Months, and 1 Year (excluding current month from multi-month buckets for accounting rigor).
- **Horizontal Comparison Chart**: Interactive sorting with quick filters for Favorites, Open Positions, and COIN-M / Inverse pairs.
- **Smart Auto-Sync**: Scheduled automatically for `nearestFundingTime + 60s`.

### 📑 Reports (Operational & Executive Export)
- Generate branded PDF, Excel, and CSV export packages containing current balances, top closed positions, and aggregated trading metrics for accounting and tax records.

### ⚡ API Tester (REST & WebSocket Diagnostics)
- Technical diagnostic sandbox: perform authenticated REST requests, test WebSocket handshakes in isolation, and audit roundtrip network latencies.

### 👁️ Privacy Mode
- Toggle the **Eye Icon** in the top navigation bar to mask all financial balances and values with security masks (`$••••`), ideal for screen sharing or public review.

---

## 8. PIKA Assistant (Portfolio Information & Knowledge Assistant)

**PIKA** is the native quantitative AI auditor built directly into CPM. It synthesizes complex derivatives positions, liquidation hazards, and cross-exchange hedge mismatches into clear narrative briefs using structured local tool execution.

### 🔒 Security & Privacy Principles
1. **Disabled by Default**: Completely inactive until enabled by the user in **AI Settings**.
2. **Zero-Trust Credentials**: The AI engine **never sees or receives API Keys, Secrets, or Passphrases**.
3. **Strictly Consultative (Read-Only)**: PIKA has no tools capable of placing orders, moving assets, or altering connection credentials.
4. **Automated Privacy Mode Masking**: When Privacy Mode is active in the CPM header, data passed into PIKA tools is automatically converted to percentage proportions and masked to shield nominal values.
5. **Environment Variable Kill-Switch**: Supports `AI_CHAT_BOT_ENABLED` / `VITE_AI_CHAT_BOT_ENABLED` to completely strip all AI UI components in restricted enterprise environments.

### ⚙️ Supported Providers (Local Ollama, Cloud Gemini, OpenRouter)
- **Ollama (100% Local & Private)**:
  - Connects to your local Ollama daemon (`http://localhost:11434` or custom network endpoint).
  - Automatically discovers installed models (`llama3.2`, `qwen2.5`, etc.).
  - Zero financial data leaves your local machine.
- **Google Gemini Cloud**:
  - High-performance multimodal cloud integration via the official `@google/genai` TypeScript SDK.
  - Server-side proxy routing for secure key management.
- **OpenRouter / OpenAI / Anthropic / Custom**:
  - Connects to any standard OpenAPI endpoint using your own private API key stored in local browser memory.
- **Automatic Fallback Policy**: If your primary provider encounters a timeout or connection failure, PIKA automatically falls back to your configured secondary model.

### 🛠️ Analytical Tool Calling Catalog (9 Tools)
PIKA has access to 9 verified read-only tools:
1. `get_consolidated_balances`: Aggregated equity and balances by currency, wallet, and exchange.
2. `get_open_positions`: Active positions, entry prices, mark prices, leverage, and liquidation risks.
3. `get_order_history`: Recent orders, statuses, and execution history.
4. `get_funding_rates`: Current rates and upcoming funding settlement projections.
5. `get_hedge_pro_metrics`: Capital protection, locked USD, and inverse contract exposure.
6. `get_market_analytics`: Open Interest, market regime classification, and CVD indicators.
7. `get_transaction_summary`: Cash flow reconciliation, fee totals, and net transaction changes.
8. `get_exchange_connection_health`: Live connectivity, sync status, and latency metrics.
9. `get_pnl_by_symbol`: Consolidated profit/loss distribution by asset.

### 🔍 Tool Compatibility Audit
Under **AI Settings** $\to$ **Manage Models**, CPM automatically audits whether each available model supports structured function calling (*Tool-Calling*), displaying visual capability badges.

### 📊 Deep Telemetry, Daily Token Charts & Audit Export
- **Telemetry Cards**: Track average roundtrip latency, request success rate, and total token usage.
- **Daily Token Consumption Chart**: Recharts bar visualization tracking token burn over time.
- **Audit Table & Raw JSON Viewer**: Complete historical ledger displaying prompts, triggered tools, raw request payloads, and assistant responses.
- **Audit Log Export**: Export complete diagnostic logs in **JSON** or **CSV** formats.

### ⌨️ Global Shortcut & Chat Drawer
- Press **`Ctrl + J`** (or **`Cmd + J`** on macOS) from any screen to toggle the PIKA Assistant drawer.
- The drawer includes quick prompt chips, formatted Markdown with syntax highlighting, financial tables, and embedded interactive charts.

---

## 9. Inverse Contract Normalization & Numeric Precision

Different exchanges employ conflicting conventions for Linear (USDT-M) versus Inverse (COIN-M) derivatives:
- **Bybit Inverse**: The `size` property represents USD notional value. CPM derives the base coin size by dividing cumulative entry value by entry price (`cumEntryValue / entryPrice`).
- **Bybit Linear**: The `size` property represents the direct cryptocurrency coin quantity.
- **Bitget Inverse**: Raw contract units are multiplied by the official contract value constant (`getBitgetInverseContractVal`) to determine true coin quantity.
- **OKX**: Quantities are scaled using the instrument contract multiplier (`ctVal`).
- **Precision Math**: All critical balance, hedge, and funding computations use the **Big.js** library, avoiding JavaScript floating-point rounding inaccuracies.

---

## 10. Dynamic Token Pricing & Proxy Price Fallbacks

To ensure non-USDT funding balances and smaller cap tokens on Bitget and OKX are accurately valued in USD:
- CPM executes real-time market ticker lookups via `/api/v2/spot/market/tickers`.
- If an asset lacks a direct USDT pair, CPM executes a secondary fallback lookup via a secure proxy helper (`fetchTokenUsdPrice`), ensuring exact equity valuation across all account cards.

---

## 11. Connection Resilience, Anti-SSRF Defense, Code-Splitting & Global Error Boundary

- **Advanced Anti-SSRF Protection (`ssrfValidator.ts`)**:
  - Both the local server proxy (`server.ts`) and Vercel serverless functions (`/api/proxy.ts`) implement strict upstream URL validation.
  - Active blocking of cloud instance metadata IP endpoints (such as `169.254.169.254`, `metadata.google.internal`), reserved system ports, and disallowed URL protocols.
  - Exchange APIs and authorized AI providers (OpenAI, OpenRouter) are verified against strict domain allowlists. For local Ollama instances, local network (LAN) and localhost routes are securely permitted (`allowLanIps: true`).
- **Performance Code-Splitting (React Suspense & TabLoadingSkeleton)**:
  - To ensure instant application bundle startup, heavy analytical tabs (`MarketAnalyticsDashboard`, `HedgeProDashboard`, `FundingDashboard`, `ClosedPositions`, transaction views, reports, and settings) are dynamically split using `React.lazy`.
  - Seamless loading skeletons (`TabLoadingSkeleton`) render smoothly during tab switches, preventing UI freezes on lower-end devices.
- **Fail-Fast Authentication Detection**: If an API key fails with invalid credentials, insufficient permissions, or whitelist restrictions (HTTP 401/403, Bybit `10003/10004/10005/33004`, OKX `50100/50105/50111/50113`, Bitget `40001/40005/40006/40014`), CPM aborts retries immediately to prevent your IP from being banned by Cloudflare or Akamai rate limiters.
- **Exponential Backoff with Jitter for Network Drops**: Transient connectivity drops retry on an exponential delay schedule (5s $\to$ 10s $\to$ 20s $\to$ 40s $\to$ 60s) with random jitter, stopping after 5 attempts via circuit breaker.
- **Global Error Boundary**: Unhandled React rendering errors trigger an intuitive **Safe Recovery** screen with error stack diagnostics and single-click recovery buttons: **Reload Dashboard** and **Clear Cache & Reload**.
- **Instant Scroll Position Reset**: Tab transitions automatically reset scroll positions to top-left (`useLayoutEffect`), ensuring optimal viewing upon switching views.
- **CI Quality Gate**: Automated GitHub Actions workflow enforcing strict TypeScript checks, production builds, and our full suite of **65 test files with 660 unit and integration tests**.

---

## 12. PWA Support (Installable Desktop & Mobile App)

CPM is built as a Progressive Web App (PWA):
- **Desktop & Mobile Installation**: Use the browser address bar icon in Chrome, Edge, or Safari to install CPM as a standalone application.
- **Offline Asset Cache**: Core static assets are cached by the Service Worker for lightning-fast launch speeds.
- **Update Notifications (`UpdateNotification`)**: A subtle banner informs you when a new version of CPM is ready, enabling single-click updates.

---

## 13. Frequently Asked Questions (FAQ)

### My API key fails to connect or throws an authentication error. What should I check?
1. Ensure there are no accidental leading or trailing spaces in the key or secret.
2. Verify you selected the right exchange (Bybit keys will not authenticate on OKX).
3. On **Bitget** and **OKX**, ensure you entered the exact **Passphrase** chosen during key creation.
4. On **Bybit**, if you are located in specific regulatory jurisdictions (e.g., Netherlands or Turkey) or hold an international Brazil/Argentina account, select the corresponding entry under **Account Region / Origin** so CPM injects the required headers.
5. On **Bitget**, if your account uses unified trading, select the **UTA** account type.

### Can I recover a forgotten Master Password via email?
No. Because CPM follows a zero-trust model, there are no cloud accounts or recovery servers. If you forget your master password, use the factory reset button on the unlock screen to clear local keys, then re-enter your credentials or import an existing `.cpmbackup` file.

### PIKA Assistant is timing out or failing to respond.
1. If using **Ollama Local**, verify the Ollama service is active on your machine (`http://localhost:11434`) and that your chosen model is installed (`ollama run llama3.2`).
2. If using **Google Gemini Cloud**, verify that a valid Gemini API key is configured in **AI Settings**.
3. Set up a secondary fallback model in **AI Settings** so queries automatically fail over if the primary model is slow.

### Does CPM support ultra-wide monitors and mobile devices?
Yes. CPM is engineered with responsive grid columns, collapsible sidebars, and horizontally contained scroll containers, adapting seamlessly from mobile smartphones to multi-monitor professional trading desks.

---

*Crypto Portfolio Manager — Professional Multi-Exchange Connectivity, Advanced Analytics & Zero-Trust Security.*
