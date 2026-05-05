# Product Requirements Document (PRD)

## 1. Project Overview
**Project Name:** Multi-Exchange Crypto Dashboard  
**Objective:** A Unified Cryptocurrency Trading Terminal that consolidates real-time wallet balances, financial history, and active positions directly from the Top 3 global crypto exchanges: **Bitget**, **OKX**, and **Bybit**. 

## 2. Core Objectives
- **Real-time Aggregation:** Combine balances, PnL, and open positions across multiple crypto exchanges into a single unified interface.
- **Zero-Trust Security Architecture:** Secret keys (`API_SECRET`) NEVER leave the local browser environment. There is no cloud database. Everything remains local.
- **Modern Analytical Interface:** High-density, professional UI focusing on financial tracking utilizing a native Dark Mode, monospace fonts for data, and intuitive navigation.

## 3. User Stories
- **Auth:** As a local user or trader, I want to securely input my API keys so that only my browser can read and cryptographically sign payloads with them.
- **Economics:** As a trader, I want to see my aggregated total net worth in USD calculating live across all connected exchanges.
- **Operations:** As a trader, I want to see my live futures positions and my wallet balances updating in true real-time.
- **Usability:** As a trader, I want to filter, search, and sort my wallet balances (by asset, exchange, or USD value) to easily locate assets among hundred of dust coins.

## 4. Key Workflows
1. **API Onboarding:** User adds keys through a modal. Keys are saved in `localStorage`.
2. **Connection Bootstrap:** App fetches the stored keys and initiates REST calls (via Proxy) to load initial states (e.g. Bybit Wallet Snapshots) and directly opens WSS (Secure WebSockets) for real-time streams.
3. **Data Ingestion:** Zustand state management parses incoming data from WebSockets and harmonizes schemas (Bitget vs OKX vs Bybit) into a unified `BalanceItem` or `PositionItem` UI constraint.
4. **Data Presentation:** React UI renders tables and global financial counters that re-compute instantly on state change.
