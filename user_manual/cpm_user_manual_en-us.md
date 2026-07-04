# 📘 User Manual - Crypto Portfolio Manager (CPM)

Welcome to the **Crypto Portfolio Manager (CPM)**! This professional terminal is designed to consolidate and monitor your trading performance, balances, active positions, and order history across **Bitget**, **Bybit**, and **OKX** in one single, unified interface.

Our absolute highest priority is **zero-trust client security** and **strict privacy preservation**, ensuring that your credentials and transaction histories remain entirely under your local browser custody.

---

## 📌 Table of Contents
1. [Zero-Trust Security Architecture](#1-zero-trust-security-architecture)
2. [Initial Configuration & API Keys Setup](#2-initial-configuration--api-keys-setup)
3. [Simulation Mode (Mock Data)](#3-simulation-mode-mock-data)
4. [Latency & Performance Analysis via REST](#4-latency--performance-analysis-via-rest)
5. [Integrated Log Terminal (Connection Logs)](#5-integrated-log-terminal-connection-logs)
6. [Advanced Synchronization with IndexedDB Caching](#6-advanced-synchronization-with-indexeddb-caching)
7. [Screens & Daily Usability Guide](#7-screens--daily-usability-guide)
8. [Exporting Operational Reports](#8-exporting-operational-reports)
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

## 4. Latency & Performance Analysis via REST

To maximize system stability, avoid connection dropouts, and respect browser CORS constraints, CPM has standardized all data collection (balances, positions, and ticker rates) using high-performance **REST Polling** (periodic HTTP queries).

Under the **API Keys** tab, you can inspect visual connection diagnostics:
- **Latency Sparklines**: A continuous mini-chart measuring the round-trip ping time in milliseconds (ms) of REST requests between your browser (via our secure local proxy) and the exchange servers.
- **WebSocket Isolation**: WebSockets are kept isolated exclusively inside the **API Tester** tool (used only for development, connectivity sanity checks, and debugging). All main client dashboard pages operate over highly reliable HTTP REST connections.

---

## 5. Integrated Log Terminal (Connection Logs)

To audit connection handshakes, REST API payloads, and system warnings, CPM features a modular professional terminal:

1. Scroll down to the bottom of the **API Keys** tab to inspect the docked terminal, or view it as an independent screen under **Connection Logs** in the sidebar.
2. **Zero-Leak Masking**: The logger automatically intercepts and redacts any private API keys, secrets, or passphrases, rendering safe friendly logs for support audits.
3. **Semantic Log Categorization**:
   - `SYSTEM`: Internal state machine startups and routing logs.
   - `DATA`: Feeds for REST query status, account updates, and balance states.
   - `WARN` / `ERROR`: Alerts for network timeouts, CORS issues, or credential rejections.
4. **Local Regex Filter**: Easily search logs for specific tickers (e.g. `BTC`) or raw event codes.

---

## 6. Advanced Synchronization with IndexedDB Caching

To circumvent rate-limiting bans (429 errors) and ensure sub-second rendering speeds, CPM uses a **Stale-While-Revalidate (SWR)** caching approach:

- **IndexedDB Database**: CPM establishes a local database (`crypto-dashboard-cache`) inside your browser to persist massive histories of orders and closed positions.
- **SWR Hydration**: On screen entry, the cached data is displayed instantly to avoid empty screens, while a background REST request quietly checks and merges any missing records since your last session.
- **Automatic Arithmetic Normalization (Linear vs. Inverse)**: CPM dynamically identifies whether an active/historical position or order uses Linear (USDT/USDC-M) or Inverse (Coin-M) margins. It seamlessly converts raw contract sizes into exact base asset quantities (e.g., BTC) and calculates correct USD values (Notional USD), bypassing bloated or confusing values from native exchange APIs.
- **OKX Dual-Wallet Ingestion (Trading & Funding)**: The balance system has been extended to pull assets concurrently from both the OKX Unified Trading account and the passive Funding Wallet. Funding assets are dynamically valued based on market rates and aggregated into your net equity and wallet balance, displayed on the balances table with a green `FUNDING` tag.
- **Strict Response Type-Safety**: Raw payloads retrieved from broker servers are strictly typed (`src/types/raw.ts`) inside the `raw` property, ensuring ultimate compilation type safety and runtime stability during background mathematical conversions.
- **Custom Polling Interval**: Navigate to the **Settings** page to fine-tune how frequently background sync cycles run (default is 15 minutes).

---

## 7. Screens & Daily Usability Guide

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

### 📂 Closed Positions & Order History
- **Operational Metrics**: Displays your global **Win Rate %**, **Profit Factor**, Average profit/loss margins, and your biggest profitable trade.
- **Order Reports**: Search open or historical orders with regex filters, and expand rows to review exchange order IDs and cumulative commissions (fees).

### 👁 Privacy Mode
Toggle the **Eye Icon** in the sidebar header to hide all numerical balances, sizes, and PnL metrics behind secure `***` masks. This is designed for safe streaming, sharing, or public presentations.

---

## 8. Exporting Operational Reports

When auditing accounts or archiving tax reports, navigate to **Reports** in the sidebar to download:
- **PDF Export**: Generates a clean, print-friendly file with custody distributions and key performance stats.
- **Excel (.xlsx) / CSV Export**: Raw tabular sheets sorting timestamps, sides, entry/exit prices, fees, and final realized PnP.

---

## 9. Frequently Asked Questions (FAQ)

### My API Key status is failing. How can I fix it?
1. Verify that there are no leading or trailing blank spaces in the copied keys.
2. Confirm you selected the correct exchange in the dropdown menu.
3. For **OKX** and **Bitget**, make sure you typed the exact **Passphrase** configured during key creation.
4. Ensure your key has active **Read** permissions.

### Does high latency affect my current orders?
No. High latency only means the display terminal updates slightly slower. Your actual orders and positions remain active and execute securely on the exchange servers.

### Can I run CPM on my mobile device?
Yes! CPM's interface is completely responsive, reorganizing charts and complex rows for optimal touch screen tracking.

---

*Crypto Portfolio Manager — Enterprise Connectivity. Uncompromising Security.*
