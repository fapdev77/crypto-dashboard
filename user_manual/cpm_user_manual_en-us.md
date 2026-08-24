# 📘 User Manual - Crypto Portfolio Manager (CPM)

Welcome to the **Crypto Portfolio Manager (CPM)**! This professional terminal is designed to consolidate and monitor your trading performance, balances, active positions, hedge risk exposure, and order history across **Bitget**, **Bybit**, and **OKX** in one single, unified interface.

Our absolute highest priority is **zero-trust client security** and **strict privacy preservation**, ensuring that your credentials and transaction histories remain entirely under your local browser custody.

---

## 📌 Table of Contents

1. [Zero-Trust Security Architecture](#1-zero-trust-security-architecture)
2. [Initial Configuration & API Keys Setup](#2-initial-configuration--api-keys-setup)
3. [Global Master Password & Encrypted Backups](#3-global-master-password--encrypted-backups)
4. [Simulation Mode (Mock Data)](#4-simulation-mode-mock-data)
5. [Integrated Log Terminal (Connection Logs)](#5-integrated-log-terminal-connection-logs)
6. [Synchronization & Cache Settings](#6-synchronization--cache-settings)
7. [Screens & Daily Usability Guide](#7-screens--daily-usability-guide)
   - [Dashboard Home](#-dashboard-home)
   - [WorkSpace (Customizable Multi-Card Workspace)](#-workspace-customizable-multi-card-workspace)
   - [Open Positions Tracking](#-open-positions-tracking)
   - [Hedge Pro Dashboard (Inverse Contract Risk & Protection)](#-hedge-pro-dashboard-inverse-contract-risk--protection)
   - [Closed Positions](#-closed-positions)
   - [Order Reports (Open & History)](#-order-reports-open--history)
   - [Trade History](#-trade-history)
   - [PnL by Symbol](#-pnl-by-symbol)
   - [Funding Fees Dashboard](#-funding-fees-dashboard)
   - [Bybit Transactions Log](#-bybit-transactions-log)
   - [API Tester (REST & WebSocket Diagnostics)](#-api-tester-rest--websocket-diagnostics)
   - [Privacy Mode](#-privacy-mode)
8. [Inverse Contract Normalization & Smart Pagination](#8-inverse-contract-normalization--smart-pagination)
9. [Exporting Operational Reports](#9-exporting-operational-reports)
10. [PWA Support (Install App)](#10-pwa-support-install-app)
11. [Frequently Asked Questions (FAQ)](#11-frequently-asked-questions-faq)

---

## 1. Zero-Trust Security Architecture

CPM was developed from the ground up to respect a decentralized privacy model:
- **No External Servers**: We do not operate any databases or backend servers to store or monitor your private keys. All API communications flow directly from your browser to the exchanges' official REST and WebSocket endpoints.
- **Secure Browser-Only Storage**: Your API credentials are saved strictly within your browser's local sandbox (`localStorage`), protected by client-side military-grade encryption.
- **NEVER Use Keys with Trade or Withdrawal Privileges**: The terminal requires **READ-ONLY permissions** exclusively. Never supply an API key that allows executing trades or withdrawing funds.

---

## 2. Initial Configuration & API Keys Setup

Follow these simple steps to integrate your exchange accounts:

1. **Log in to your Exchanges** and generate a new **Read-Only** API key pair:
   - **Bybit**: API V5 (Read-only, permissions for Account, Position, and Trade).
   - **OKX**: API V5 (Read-only, choose a secure Passphrase when creating the key).
   - **Bitget**: API V2 (Read-only, passphrase required; browser communication is securely routed through a local proxy endpoint to bypass native CORS limitations).
2. **Open the Keys Configuration**: Go to the **API Keys** page via the left sidebar.
3. **Add a Connection**:
   - Click on **Add New Key**.
   - Select your target exchange.
   - Enter a **Label** (e.g., *Main Account*), your **API Key**, **API Secret**, and **Passphrase** (if applicable).
   - Click **Save Connection**.
4. **Inspect Status**: The connection will start up. A dedicated green visual status indicates a successful connection, while red signifies diagnostic errors (such as wrong keys or clock out-of-sync).

---

## 3. Global Master Password & Encrypted Backups

To provide ultimate privacy and security on shared or personal devices, CPM includes an advanced master password and encryption system:

1. **Global Session Lock Screen**:
   - Set up a Master Password under **Security Settings**.
   - All API keys are encrypted at rest using standard **AES-GCM** with **PBKDF2** key derivation (unique salt and 100,000 iterations).
   - When reopening or refreshing the application, a full-screen unlock prompt prevents access until the correct password is provided.
2. **Encrypted File Backups (`.cpmbackup`)**:
   - Export all your configured exchange connections and preferences in a single encrypted `.cpmbackup` file.
   - The backup can be safely moved to another device or saved in an offline password vault.
3. **Backup Restoration**:
   - Import your `.cpmbackup` file and enter your master password to instantly recover all connections and preferences.

---

## 4. Simulation Mode (Mock Data)

If you wish to explore the dashboard's capabilities without configuring any real exchange accounts, CPM provides an immersive **Simulation Mode**:

1. Click on the **Settings** tab in the sidebar.
2. Toggle on the **Use Mock Data (Simulation Mode)** setting.
3. **What happens under simulation**:
   - Live synchronization with real REST APIs is immediately paused.
   - Realistic multi-exchange balances, open margin positions, trade logs, Bybit transaction logs, and hedge exposure metrics are loaded from structured mocks.
   - An amber **"Simulation Mode"** banner is highlighted at the top of your screen.
   - Manual synchronization buttons are safely disabled to prevent unsolicited API errors.

---

## 5. Integrated Log Terminal (Connection Logs)

To audit connection handshakes, REST API payloads, and system warnings, CPM features a dedicated professional log terminal:

1. **Dedicated Access**: Access the **Connection Logs** tab directly from the sidebar to view the full terminal interface.
2. **Zero-Leak Masking**: The logger automatically intercepts and redacts any private API keys, secrets, or passphrases, rendering safe friendly logs for support audits.
3. **Semantic Log Categorization**: 
   - `SYSTEM`: Internal state machine startups and routing logs.
   - `DATA`: Feeds for REST query status, account updates, and balance states.
   - `WARN` / `ERROR`: Alerts for network timeouts, CORS issues, or credential rejections.
4. **Local Regex Filter**: Easily search logs for specific tickers (e.g. `BTC`) or raw event codes.

---

## 6. Synchronization & Cache Settings

To ensure lightning-fast load times and prevent exchanges from blocking your access due to rate limiting, the application saves your history of positions, orders, and funding fees locally in your browser (IndexedDB Cache).

Through the **Settings** screen in the sidebar, you can easily control how the application behaves:
- **Update Intervals (Polling)**: Adjust how often the system fetches new orders, positions, or funding fees.
- **Selective Cache Clearing (Clear Data)**: Force a complete refresh for specific modules (*Clear Orders Cache*, *Clear Funding Cache*, *Clear Bybit TxLog*).
- **Wipe All Local Client Data**: In the Danger Zone, completely factory reset the application, wiping all stored keys, preferences, and local databases.
- **Simulation Mode**: Toggle mock simulation at any time.

---

## 7. Screens & Daily Usability Guide

### 🏠 Dashboard Home
Your central intelligence center structured in a responsive masonry grid:
- **Unified Net Capital**: Live aggregate of Spot and Futures balances across all exchanges.
- **Custody Allocation**: A sleek donut chart indicating risk allocation per exchange.
- **Asset Treemap**: A visual block matrix sorting your cross-exchange assets by USD size.
- **Capital Protection & Hedge**: A critical indicator tracking the ratio of Long vs. Short positions to shield your capital against systemic liquidations.

### 🗂 WorkSpace (Customizable Multi-Card Workspace)
A modular and adaptable command center for traders and portfolio managers:
- **Dynamic Modular Cards**: Simultaneously track live prices, fast tickers, account balances, and open positions within a single integrated canvas.
- **Operational Flexibility**: Optimized for secondary monitors and persistent trading desk setups.

### 💼 Open Positions Tracking
Monitor your active derivatives contracts in real-time:
- **ROE% and Unrealized PnL**: Color-coded markers indicating live gains and losses.
- **Liquidation Price & Margin**: Gauges turning amber/red when a position approaches its liquidation threshold.
- **Coin Icon Component**: Renders custom official logos for each ticker with robust local fallback logic.
- **Smart Pagination**: Smoothly navigate large position lists with custom items-per-page controls.

### 🛡 Hedge Pro Dashboard (Inverse Contract Risk & Protection)
A specialized analytics dashboard engineered for funding rate arbitrageurs and delta-neutral strategies operating with COIN-M (Inverse) contracts:
- **Locked USD Entry Valuation**: Short positions in inverse contracts lock the USD value at their entry price (`entryPrice`), guaranteeing capital protection against underlying crypto price depreciation (capped by the total asset balance).
- **Directional Exposure & Leverage**: Long positions in inverse contracts do not protect capital; both the asset balance and the leveraged position value are tracked as directional market exposure plus leverage.
- **Portfolio Exposure Bar (Beyond-100% Model)**: Visual bar indicating the proportion of Protected Capital, Exposed Capital, and Leveraged Exposure beyond total equity.
- **Coin Summaries**: Consolidated breakdown per coin/account detailing Coin Balance, USD Value, Protected USD, Exposed USD, Active Positions, and **Overexposed** indicators.
- **Breakdown Chart**: Comparative visual chart analyzing Protected vs Exposed vs Leveraged capital across assets.

### 📂 Closed Positions
- **Operational Metrics**: Displays your global **Win Rate %**, **Profit Factor**, Average profit/loss margins, and your biggest profitable trade.
- **PnL Auditing**: View consolidated final PnL per position, holding duration, and ROE% returns.
- **Quick Exports**: Export closed positions history to CSV, Excel (.xlsx), or PDF.

### 📝 Order Reports (Open & History)
- **Open Orders**: Monitor all pending orders (Limit, Stop Loss, Take Profit) across connected exchanges with pagination and real-time trigger tracking.
- **Order History**: Search historical and canceled orders with regex filters, and expand rows to review execution details and commission fees.

### 🔄 Trade History
A detailed view of all individual order executions and filled trades across your connected exchanges:
- **Complete Execution Log**: Track exact fill price, size, side (Buy/Sell), and role (Taker/Maker).
- **Fee Auditing**: Verify trading fees paid or received per execution with clear fee currency tags.
- **Pagination & Filters**: Smooth pagination and rapid search by symbol or exchange.

### 📊 PnL by Symbol
A managerial reporting tool to analyze the individual performance of every traded asset:
- **Aggregated Metrics**: View Total Gross Profit, Total Gross Loss, Net PnL, Win Rate, and Profit Factor isolated for a specific asset (e.g., BTC, ETH).
- **Performance Ranking**: Quickly discover which assets are your most profitable and which generate recurring losses.
- **Long vs Short Breakdown**: Identify whether your positive returns stem primarily from Long or Short operations.

### 💸 Funding Fees Dashboard
A comprehensive dashboard providing a unified view of real-time and historical funding rates across Bybit, Bitget, and OKX (USDT-M and COIN-M perpetual swaps):
- **Multi-Period Analysis**: Analyze funding rates across multiple timeframes: Next Funding, Last Settlement, Today, Current Month, Last Month, 3 Months, 6 Months, and 1 Year.
- **Smart Aggregation Pipeline & Cache v10**: Uses IndexedDB to store pre-calculated calendar month summaries. Features ultra-fast incremental updates and up to 400 days of historical depth.
- **Visual Indicators**: Flashing animations for rate updates and tooltips explaining funding direction (Longs paying Shorts vs Shorts paying Longs).
- *Note on OKX*: OKX API restricts historical data to ~3 months, and is automatically excluded from 6M and 1Y averages to preserve market accuracy.

### 📜 Multi-Exchange Transactions Log (Bybit, Bitget & OKX Transactions)
Specialized financial audit modules providing full access to raw transaction logs directly from Bybit, Bitget, and OKX:
- **Deep & Incremental Syncing**: Downloads your entire history of trades, funding fees, settlements, liquidations, transfers, deposits, withdrawals, and margin interest, persistently cached in local IndexedDB.
- **Unified Transaction Filters (Universal Transaction Mapper)**: Standardized filtering system and badges across 10 universal transaction types:
  1. *Trade & Orders* (Spot & futures trades, executions, and close PnL)
  2. *Funding Fee* (Periodic funding fee payments and receipts)
  3. *Transfer In / Deposit* (Deposits and incoming subaccount/wallet transfers)
  4. *Transfer Out / Withdraw* (Withdrawals and outgoing subaccount/wallet transfers)
  5. *Liquidation & ADL* (Forced liquidations and auto-deleveraging events)
  6. *Interest & Loans* (Margin interest, borrow, and loan repayments)
  7. *Rewards & Bonus* (Trial funds, coupons, trading bonuses, and airdrops)
  8. *Delivery & Settle* (Futures delivery settlements and option exercises)
  9. *Others* (Currency conversions, auto-deductions, and miscellaneous entries)
  10. *All Types* (Unfiltered complete transaction view)
- **Additional Multi-Criteria Filters**: Filter by instrument category (Spot, Linear, Inverse, Option, Margin), Currency/Coin, Account/Subaccount, Timeframe, and Symbol search.
- **Cash Flow & Realized PnL Calculation**: Computes exact realized net changes based on standard cash flow accounting (`cashFlow + funding - fee`) and reconciles with wallet balance (`walletBalance`).
- **Interactive KPI Cards & Distribution Visuals**: Track total transactions, aggregated USD funding fees, net trading fees paid/rebated, and net period portfolio changes.

### ⚡ API Tester (REST & WebSocket Diagnostics)
Developer and diagnostic utility for testing direct connectivity with exchanges:
- **REST Testing**: Dispatch direct authenticated and public API requests to verify latency, HTTP status, and inspect raw payloads.
- **WebSocket Inspector**: Monitor live WebSocket handshakes and message streams in real-time.

### 👁 Privacy Mode
Toggle the **Eye Icon** in the sidebar header to hide all numerical balances, sizes, and PnL metrics behind secure `***` masks. This is designed for safe streaming, sharing, or public presentations.

---

## 8. Inverse Contract Normalization & Smart Pagination

### Unified Inverse Contract Calculation (COIN-M vs USDT-M)
Exchanges report linear (USDT-M) and inverse (COIN-M) derivatives using fundamentally different parameters:
- **Size and Valuation**: For linear contracts, quantity represents coins and notional value is `size * markPrice`. For inverse contracts, CPM automatically normalizes crypto quantity and USD notional value according to exchange-specific contract units (e.g., Bybit contract value in USD, Bitget contract multiplier).
- **Hedge Entry Price**: For capital protection calculations in hedge strategies, CPM anchors the protected amount to the short position's fixed entry price (`entryPrice`) to prevent market fluctuations from distorting locked USD value.

### Smart Pagination Controls (v1.31.0)
Tables for Open Positions, Open Orders, Order History, and Trade History feature advanced pagination controls:
- **Items Per Page**: Select between 10, 25, 50, or 100 items per view.
- **Fluid Navigation**: Clear page indicators, quick jumps, and responsive table transitions.

---

## 9. Exporting Operational Reports

When auditing accounts or archiving tax reports, navigate to **Reports** in the sidebar to download:
- **PDF Export**: Generates a clean, print-friendly document with custody distributions and key performance stats.
- **Excel (.xlsx) / CSV Export**: Raw tabular sheets sorting timestamps, sides, entry/exit prices, fees, and final realized PnL.

---

## 10. PWA Support (Install App)

CPM is built as a Progressive Web App (PWA). You can install it on your Desktop or Mobile device to run it as a standalone native app. To install it, look for the install icon in your browser address bar (Chrome/Edge) or use the "Add to Home Screen" option on Safari iOS.

---

## 11. Frequently Asked Questions (FAQ)

### My API Key status is failing. How can I fix it?
1. Verify that there are no leading or trailing blank spaces in the copied keys.
2. Confirm you selected the correct exchange in the dropdown menu.
3. For **OKX** and **Bitget**, make sure you typed the exact **Passphrase** configured during key creation.
4. Ensure your key has active **Read** permissions.

### What happens if I forget my Master Password?
Due to zero-trust architecture, passwords are never stored on any server. If forgotten, you can reset local client data on the unlock screen (Wipe Data) and re-import your connection keys or restore from a previously exported `.cpmbackup` file.

### Can I run CPM on my mobile device?
Yes! CPM's interface is completely responsive, reorganizing charts, exposure bars, and complex rows for optimal touch screen tracking.

---

*Crypto Portfolio Manager — Enterprise Connectivity. Uncompromising Security.*
