# 📘 User Manual - Crypto Portfolio Manager (CPM)

Welcome to the **Crypto Portfolio Manager (CPM)**! This professional terminal is designed to consolidate and monitor your trading performance, balances, active positions, and order history across **Bitget**, **Bybit**, and **OKX** in one single, unified interface.

Our absolute highest priority is **zero-trust client security** and **strict privacy preservation**, ensuring that your credentials and transaction histories remain entirely under your local browser custody.

---

## 📌 Table of Contents

1. [Zero-Trust Security Architecture](#1-zero-trust-security-architecture)
2. [Initial Configuration & API Keys Setup](#2-initial-configuration--api-keys-setup)
3. [Simulation Mode (Mock Data)](#3-simulation-mode-mock-data)
4. [Integrated Log Terminal (Connection Logs)](#4-integrated-log-terminal-connection-logs)
5. [Synchronization & Cache Settings](#5-synchronization--cache-settings)
6. [Screens & Daily Usability Guide](#6-screens--daily-usability-guide)
7. [Exporting Operational Reports](#7-exporting-operational-reports)
8. [PWA Support (Install App)](#8-pwa-support-install-app)
9. [Frequently Asked Questions (FAQ)](#9-frequently-asked-questions-faq)

---

## 1. Zero-Trust Security Architecture

CPM was developed from the ground up to respect a decentralized privacy model:
- **No External Servers**: We do not operate any databases or backend servers to store or monitor your private keys. All API communications flow directly from your browser to the exchanges' official REST and WebSocket endpoints.
- **Secure Browser-Only Storage**: Your API credentials are saved strictly within your browser's local sandbox (`localStorage`) in an encrypted temporary state.
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

## 3. Simulation Mode (Mock Data)

If you wish to explore the dashboard's capabilities without configuring any real exchange accounts, CPM provides an immersive **Simulation Mode**:

1. Click on the **Settings** tab in the sidebar.
2. Toggle on the **Use Mock Data (Simulation Mode)** setting.
3. **What happens under simulation**:
   - Live synchronization with real REST APIs is immediately paused.
   - Realistic multi-exchange balances, open margin metrics, trade logs, and orders are immediately populated using structured JSON mocks.
   - An amber **"Simulation Mode"** banner is highlighted at the top of your screen.
   - Manual synchronization buttons are safely disabled to prevent unsolicited API errors.

---
## 4. Integrated Log Terminal (Connection Logs)

To audit connection handshakes, REST API payloads, and system warnings, CPM features a dedicated professional log terminal:

1. **Dedicated Access**: Access the **Connection Logs** tab directly from the sidebar to view the full terminal interface.
2. **Zero-Leak Masking**: The logger automatically intercepts and redacts any private API keys, secrets, or passphrases, rendering safe friendly logs for support audits.
3. **Semantic Log Categorization**: 
   - `SYSTEM`: Internal state machine startups and routing logs.
   - `DATA`: Feeds for REST query status, account updates, and balance states.
   - `WARN` / `ERROR`: Alerts for network timeouts, CORS issues, or credential rejections.
4. **Local Regex Filter**: Easily search logs for specific tickers (e.g. `BTC`) or raw event codes.

---
## 5. Synchronization & Cache Settings

To ensure lightning-fast load times and prevent exchanges from blocking your access due to rate limiting, the application saves your history of positions, orders, and funding fees locally in your browser (Cache).

Through the **Settings** screen in the sidebar, you can easily control how the application behaves:
- **Update Intervals (Polling)**: Adjust how often the system fetches new orders, positions, or funding fees. This is useful if you want faster updates or prefer to reduce network consumption.
- **Clear Cache (Clear Data)**: If you feel the application is displaying outdated data, stuck orders, or inconsistencies after trading directly on the exchange, you can use the clear cache buttons (e.g., *Clear Orders Cache*, *Clear Funding Cache*). This will force the application to redownload your entire history on the next synchronization.
- **Wipe All Local Client Data**: In the Danger Zone, you can completely factory reset the application. This will wipe all stored API keys, historical caches, and user preferences from your browser, returning the application to its original clean state.
- **Simulation Mode**: Toggle the mock data simulation on or off at any time to test the interface without using real API keys.

---
## 6. Screens & Daily Usability Guide

### 🏠 Dashboard Home
Your central intelligence center structured in a responsive masonry grid:
- **Unified Net Capital**: Live aggregate of Spot and Futures balances across all exchanges.
- **Custody Allocation**: A sleek donut chart indicating risk allocation per exchange.
- **Asset Treemap**: A beautiful visual block matrix sorting your cross-exchange assets by USD size.
- **Capital Protection & Hedge**: A critical indicator tracking the ratio of Long vs. Short positions to shield your capital against systemic liquidations.

### 💼 Open Positions Tracking
Monitor your active derivatives contracts in real-time:
- **ROE% and Unrealized PnL**: Color-coded markers indicating live gains and losses.
- **Liquidation Price & Margin**: Gauges turning amber/red when a position approaches its liquidation threshold.
- **Coin Icon Component**: Renders custom official logos for each ticker with robust local fallback logic.

### 📂 Closed Positions
- **Operational Metrics**: Displays your global **Win Rate %**, **Profit Factor**, Average profit/loss margins, and your biggest profitable trade.
- **PnL Auditing**: View the consolidated final PnL per position, total time the position remained open, and ROE% rates.

### 📝 Order Reports (Open & History)
- **Open Orders**: Monitor all your pending orders (Limit, Stop Loss, Take Profit) across connected exchanges in a unified table, visualizing current status, quantities, and price triggers in real-time.
- **Order History**: Search historical and canceled orders with regex filters, and expand rows to review exchange order IDs and cumulative commissions.

### 🔄 Trade History
A detailed view of all individual order executions and filled trades across your connected exchanges.
- **Complete Execution Log**: Track the exact fill price, size, side (Buy/Sell), and role (Taker/Maker) for every single transaction.
- **Fee Auditing**: Verify exactly how much you paid or received in trading fees per execution, highlighting the specific fee currency.
- **Search & Filters**: Use the search bar to quickly find trades for a specific ticker symbol or filter results by exchange.

### 📊 PnL by Symbol
A managerial reporting tool to analyze the individual performance of every traded asset.
- **Aggregated Metrics**: View Total Gross Profit, Total Gross Loss, Net PnL, Win Rate, and Profit Factor isolated for a specific asset (e.g., BTC, ETH).
- **Performance Ranking**: Quickly discover which assets are your most profitable and which are generating consistent losses by sorting the data columns.
- **Deep Analysis**: Identify whether the majority of your positive outcome on an asset stems from Long or Short operations, allowing you to optimize your strategies.

### 💸 Funding Fees Dashboard
A comprehensive dashboard providing a unified view of real-time and historical funding rates across Bybit, Bitget, and OKX (USDT-M and COIN-M perpetual swaps). 
- **Multi-Period Analysis**: Analyze funding rates across different timeframes including Next Funding, Last Settlement, Today, Current Month, Last Month, 3 Months, 6 Months, and 1 Year.
- **Smart Caching**: Uses IndexedDB to cache historical funding data. Once the full history (~400 days) is synced, the app performs ultra-fast incremental updates, only downloading new records.
- **Visual Indicators**: Flashing animations for rate changes and clear tooltips explaining the direction of the funding fee (e.g., Longs paying Shorts).
- *Note on OKX*: OKX API restricts historical data to approximately 3 months. Therefore, OKX data is excluded from the 6M and 1Y averages to ensure accurate market representations.

### 📜 Bybit Transactions Log
A specialized tracking tool specifically built for Bybit users to download, store, and analyze the full raw transaction log directly from the exchange.
- **Deep Syncing**: Downloads your entire history of settlements, funding fees paid/received, and trading fees into the local IndexedDB cache.
- **Realized PnL Calculation**: Computes exact realized gains and losses based on cash flow, funding, and fees.
- **Incremental Updates**: Performs smart incremental syncs after the initial download, keeping your data up-to-date with minimal API usage.

### 👁 Privacy Mode
Toggle the **Eye Icon** in the sidebar header to hide all numerical balances, sizes, and PnL metrics behind secure `***` masks. This is designed for safe streaming, sharing, or public presentations.

---

## 7. Exporting Operational Reports

When auditing accounts or archiving tax reports, navigate to **Reports** in the sidebar to download:
- **PDF Export**: Generates a clean, print-friendly file with custody distributions and key performance stats.
- **Excel (.xlsx) / CSV Export**: Raw tabular sheets sorting timestamps, sides, entry/exit prices, fees, and final realized PnP.

---

## 8. PWA Support (Install App)

CPM is built as a Progressive Web App (PWA). You can install it on your Desktop or Mobile device to run it as a standalone native app. To install it, look for the install icon in your browser address bar (Chrome/Edge) or use the "Add to Home Screen" option on Safari iOS.

---

## 9. Frequently Asked Questions (FAQ)

### My API Key status is failing. How can I fix it?
1. Verify that there are no leading or trailing blank spaces in the copied keys.
2. Confirm you selected the correct exchange in the dropdown menu.
3. For **OKX** and **Bitget**, make sure you typed the exact **Passphrase** configured during key creation.
4. Ensure your key has active **Read** permissions.

### Can I run CPM on my mobile device?
Yes! CPM's interface is completely responsive, reorganizing charts and complex rows for optimal touch screen tracking.

---

*Crypto Portfolio Manager — Enterprise Connectivity. Uncompromising Security.*
