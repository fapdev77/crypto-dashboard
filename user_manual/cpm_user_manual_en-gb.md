# 📘 User Manual - Crypto Portfolio Manager (CPM)

> **Application Version:** 2.35.0  
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
3. [Global Master Password, Encrypted Backups & Mandatory Vault Inactivity Auto-Lock](#3-global-master-password-encrypted-backups--mandatory-vault-inactivity-auto-lock)
4. [Simulation Mode (Mock Data)](#4-simulation-mode-mock-data)
5. [Integrated Log Terminal (Connection Logs)](#5-integrated-log-terminal-connection-logs)
6. [Appearance, Themes, Synchronisation & Settings](#6-appearance-themes-synchronisation--settings)
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
8. [PIKA Assistant (Portfolio Information & Knowledge Assistant)](#8-pika-assistant-portfolio-information--knowledge-assistant)
   - [Security & Privacy Principles](#-security--privacy-principles)
   - [Supported Providers (Local Ollama, Cloud Gemini, OpenRouter)](#supported-providers-local-ollama-cloud-gemini-openrouter)
   - [Analytical Tool Calling Catalogue (7 Tools)](#analytical-tool-calling-catalogue-7-tools)
   - [Tool Compatibility Audit](#tool-compatibility-audit)
   - [Deep Telemetry, Daily Token Charts & Audit Export](#-deep-telemetry-daily-token-charts--audit-export)
   - [Global Shortcut & Chat Drawer](#-global-shortcut--chat-drawer)
9. [Inverse Contract Normalisation & Numeric Precision](#9-inverse-contract-normalisation--numeric-precision)
10. [Dynamic Token Pricing & Proxy Price Fallbacks](#10-dynamic-token-pricing--proxy-price-fallbacks)
11. [Connection Resilience, Fail-Fast Auth & Global Error Boundary](#11-connection-resilience-fail-fast-auth--global-error-boundary)
12. [PWA Support (Installable Desktop & Mobile App)](#12-pwa-support-installable-desktop--mobile-app)
13. [Frequently Asked Questions (FAQ)](#13-frequently-asked-questions-faq)

---

## 1. Zero-Trust Security Architecture

CPM was designed from the ground up under a strict decentralised privacy model:
- **No External Database for Credentials**: We do not operate cloud databases or servers to store your private keys or trade logs. All network requests communicate directly from your browser client to the official exchange servers.
- **Client-Side Encrypted Storage (`localStorage`)**: Your API credentials reside solely inside your browser's local sandbox, protected with optional military-grade encryption (**PBKDF2 with 600,000 iterations and AES-GCM 256-bit**).
- **Dumb Local / Serverless Proxy (`server.ts` / `/api/proxy`)**: To bypass native browser Cross-Origin Resource Sharing (CORS) blocks, CPM routes API traffic through a lightweight, zero-knowledge proxy. The client computes all cryptographic signatures (HMAC-SHA256, timestamps) locally before dispatch. The proxy acts purely as an in-flight relay, unable to decrypt or tamper with signed headers and never storing secret credentials.
- **NEVER Supply Keys with Trading or Withdrawal Permissions**: CPM requires **READ-ONLY permissions** exclusively. Never create or upload API keys authorised to transfer funds, execute orders, or withdraw capital.

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
- **Account Region / Origin**: Automatically routes across 15 supported regional presets:
  - *Global Default* (`api.bybit.com`) and *Global / Bytick* (`api.bytick.com`)
  - *Brazil (Standard)* (`api.bybit.com`) and *Brazil - Int* (`api.bybit.com` with `x-site-id: BRA_BTL` header)
  - *Argentina (Standard)* (`api.bybit.com`) and *Argentina - Int* (`api.bybit.com` with `x-site-id: ARG_BTL` header)
  - *Netherlands* (`api.bybit.nl`)
  - *Turkey* (`api.bybit.tr`)
  - *Kazakhstan* (`api.bybit.kz`)
  - *Georgia* (`api.bybitgeorgia.ge`)
  - *UAE* (`api.bybit.ae`)
  - *EEA* (`api.bybit.eu`)
  - *Indonesia* (`api.bybit.id`)
  - *Japan* (`api.manepa.jp` / Testnet: `api-testnet.manepa.jp`)
  - *Hong Kong* (`api.spark-fintech.com` / Testnet: `api-testnet.spark-fintech.com` with `x-refer-site-id: HKG` header)

### Bitget: Classic vs UTA Selection, Sub-Accounts & Funding
- **Account Type**:
  - **Classic**: For accounts operating on the classic segmented wallet model (Mix/Futures and Spot).
  - **UTA (Unified Trading Account)**: For upgraded Bitget unified margin accounts.
- **Include Funding Account**: When checked, fetches and displays assets held in the Funding/Spot wallet.
- **Sub-account**: Marks the connection as a sub-account subordinate to a master account, allowing clear visual tagging in balance tables and transaction filters.

### OKX: Dual-Wallet (Trading & Funding Accounts)
The `OkxAdapter` concurrently queries the Unified Trading account (`/api/v5/account/balance`) and the Funding account (`/api/v5/asset/balances`). Asset valuations are dynamically aggregated into the account's total equity with distinct UI badges: `UNIFIED` for trading margin and `FUNDING` for passive deposits.

---

## 3. Global Master Password, Encrypted Backups & Mandatory Vault Inactivity Auto-Lock

To safeguard your sensitive financial telemetry and credentials on personal, shared, or office workstations, CPM incorporates a comprehensive security vault lifecycle:

1. **Vault Initialisation upon First Connection Setup**:
   - When adding your very first API key (**+ Add Exchange**), CPM detects if your local vault has not yet been initialised and prompts you to configure a **Master Passphrase** (minimum 8 characters).
   - All credentials are encrypted on the client side prior to persistence in `localStorage`, using **PBKDF2-SHA256 key derivation with 600,000 iterations** coupled with authenticated **AES-GCM 256-bit** symmetric encryption.
2. **Global Session Lock Screen**:
   - Upon page refresh, browser restart, or opening the tab, a full-screen lock prompt prevents data rendering until your correct master passphrase is provided.
3. **Inactivity Auto-Lock (`useVaultAutoLock`)**:
   - Under **Settings** $\to$ **Security Settings**, you can enable the **Auto-Lock on Inactivity** engine.
   - **Customisable Idle Slider**: Set your preferred idle timeout between **1 and 60 minutes** (default: 15 minutes).
   - The `useVaultAutoLock` hook tracks active user inputs. Once the idle duration elapses, CPM automatically locks the vault and **instantly purges all decrypted keys from system RAM**.
4. **On-Demand Manual Lock (Lock Vault Now)**:
   - In the security panel, click the **Lock Vault Now** button to immediately lock the application without needing to refresh the page.
5. **Encrypted File Backups (`.enc`)**:
   - Export and restore all your configured exchange connections and preferences in a single encrypted file (`crypto_dashboard_keys_YYYY-MM-DD.enc`).

---

## 4. Simulation Mode (Mock Data)

If you wish to test the terminal or showcase features in videos without entering live API keys:
1. Navigate to **Settings** in the left sidebar.
2. Turn on the **Use Mock Data (Simulation Mode)** toggle.
3. Live REST and WebSocket connections are halted instantly, and realistic multi-exchange mock datasets are loaded into memory.

---

## 5. Integrated Log Terminal (Connection Logs)

For network transparency and technical diagnostics:
1. **Dedicated View**: Click **Logs** in the sidebar to open the `ConnectionLogTerminal`.
2. **Zero-Leak Secret Redaction**: An automated regex filter masks all API keys, secrets, passphrases, and HMAC signatures.
3. **Log Severities**: `SYSTEM`, `DATA`, `WARN`, `ERROR`.

---

## 6. Appearance, Themes, Synchronisation & Settings

The **Settings** screen organises configuration across **10 modular cards**:

### Multi-Theme Engine & Custom Theme Builder
- **5 Built-In Modes**: Switch seamlessly via the header `ThemeModeButton` or **Appearance & Themes** between **Terminal Dark**, **Terminal Light**, **Wise Dark**, **Wise Light**, and **Custom**.
- **Custom Palette Editor**: Customise **10 CSS tokens** (`canvas`, `surface`, `elevated`, `line`, `fg`, `fgMuted`, `accent`, `success`, `danger`, `warning`) with live card preview and automatic contrast adaptation.
- **Quick Presets & Named Themes**: Apply 4 presets (*Wise Dark*, *Wise Light*, *Midnight Navy*, *Dracula*) or save, load, and delete multiple named custom themes (shown beside Custom in the header theme menu). Click **Custom design** in the header menu to jump straight to the customiser tab.

### Language, Fiat Currency & API Diagnostics
- **6 Locales & 4 Fiat Currencies**: Full coverage across `pt-BR`, `pt-PT`, `en-US`, `en-GB`, `es-419`, and `it-IT`, with live conversion to **USD**, **BRL**, **EUR**, and **GBP**.
- **Dual-Provider Engine**: Fetches fiat FX rates from **Frankfurter API v2** (`api.frankfurter.dev`) and **USDT/USD** spot rate from **CoinGecko** (`api.coingecko.com`) with configurable TTL (5–60m), offline cache fallback, and live API diagnostics.

### Synchronisation, Retention & Cache Settings
CPM operates on a high-speed **SWR (Stale-While-Revalidate)** cache engine backed by browser **IndexedDB** (14 object stores, DB v12):
- **Zero-Latency Rendering**: Visualisations and tables load instantly from local IndexedDB cache, while background workers pull delta records to keep data fresh.
- **Browser Storage Quota Governance (`storageQuota`)**: Live measurement of used megabytes and available browser quota via `navigator.storage.estimate()`.
- **Data Retention & History Pruning**: Configurable retention periods: *30 days*, *60 days*, *90 days*, *180 days*, *365 days (Default)*, or *730 days (2 years)*.

---

## 7. Screens & Daily Usability Guide

### 🏠 Dashboard Home
The executive command centre of your portfolio:
- **Total Equity**: Real-time aggregated net worth in USD across all connected wallets and sub-accounts.
- **Unrealized PnL**: Floating profit/loss across all active derivative positions.
- **Margin Usage & Available Margin**: Ratio of committed margin versus free collateral.
- **Hierarchical Balance Table (`ExchangeHierarchyTable`)**: Expandable overview organised by Exchange $\to$ Sub-Account $\to$ Asset.

### ⚡ Positions Ticker (Real-Time Header Marquee)
A continuously scrolling marquee bar displaying real-time quotes, side (Long/Short), size, and floating PnL.

### 🛡️ Hedge Pro Dashboard (Delta-Neutral & Inverse Contracts)
Dedicated module for funding arbitrage and delta-neutral risk management in COIN-M (Inverse) contracts:
- **Real Protection (Locked USD Entry)**: Short positions in inverse contracts lock the USD value at `entryPrice`, shielding the underlying base asset from market drops.
- **Portfolio Exposure Bar**: Visual tri-colour gauge showing % Protected Capital (green), % Exposed Capital (yellow), and Leverage Extent (orange/red).

### 💼 Open Positions (Active Positions — Detailed & Lite Modes)
- Switch between **Detailed** view and **Lite** view with live mark prices, entry prices, ROE%, and liquidation warnings.

### 📂 Closed Positions (Historical Positions & Analytics)
- Auditable ledger of closed positions with **Win Rate %**, **Profit Factor**, and export to **CSV**, **Excel (.xlsx)**, and **PDF**.

### 📜 Consolidated Net Change & Multi-Exchange Transactions
- Unified cross-exchange dashboard tracking cash flow, funding payments, trading fees, and net change in USD.

---

## 8. PIKA Assistant (Portfolio Information & Knowledge Assistant)

**PIKA** is the native quantitative AI auditor built directly into CPM (disabled by default and controllable via `AI_CHAT_BOT_ENABLED`):
- **Zero-Trust**: Never sees or receives API Keys, Secrets, or Passphrases, and automatically masks nominal values when Privacy Mode is active.
- **Read-Only**: Purely consultative without execution permissions.
- **Supported Providers**: Local Ollama (`llama3.2:latest`), Google Gemini (`gemini-3.8-flash`), OpenRouter, OpenAI, Anthropic, and custom OpenAPI endpoints.
- **7 Read-Only Analytical Tools**: `aiGetPortfolioBalances`, `aiGetOpenPositions`, `aiGetHedgeCorrelationSummary`, `aiGetFundingFeesHistory`, `aiGetMarketFundingRates`, `aiGetTradingFeesHistory`, and `aiGetClosedPositionsSummary`.
- **Shortcut**: Press **`Ctrl + J`** (or **`Cmd + J`** on macOS) from any screen to open the assistant.

---

## 9. Inverse Contract Normalisation & Numeric Precision

Different exchanges employ conflicting conventions for Linear (USDT-M) versus Inverse (COIN-M) derivatives. CPM normalises all calculations to coin units and USD using the high-precision **Big.js** mathematics library.

---

## 10. Dynamic Token Pricing & Proxy Price Fallbacks

CPM performs dynamic price discovery for secondary assets using spot market tickers and fallback pricing endpoints.

---

## 11. Connection Resilience, Fail-Fast Auth & Global Error Boundary

- **Fail-Fast Authentication Detection**: Prevents IP rate-limiting bans upon authentication errors.
- **Global Error Boundary**: Catch-all screen offering seamless app recovery and cache reset.

---

## 12. PWA Support (Installable Desktop & Mobile App)

Install CPM directly from your browser as a standalone Progressive Web App with offline static caching.

---

## 13. Frequently Asked Questions (FAQ)

### My API key fails to authenticate. What should I check?
1. Ensure there are no accidental spaces in the key or secret.
2. Confirm the correct exchange was selected.
3. Verify the Passphrase for Bitget and OKX.
4. For Bybit, ensure the appropriate regional domain is selected if in a regulated jurisdiction.

---

*Crypto Portfolio Manager — Professional Multi-Exchange Connectivity, Advanced Analytics & Zero-Trust Security.*
