# Asset Classifier Logic

## 1. Specification (What)
We need a dynamic asset classifier (`AssetClassifierAggregator`) to distinguish between `CRYPTO` and `STOCK` instruments using strictly the metadata provided by each exchange's public API endpoints, without manual whitelists. The system will categorize instruments, cache the metadata to avoid hitting rate limits for static data, and apply formatting correctly (e.g., STOCK with 2 decimals, CRYPTO with 8 decimals).

## 2. Planning (How)

### Exchange Metadata Endpoints & Mappings
*   **OKX:** 
    *   **Endpoint:** `/api/v5/public/instruments`
    *   **Field:** `instFamily` (OKX usually sets instrument family, but if it has `instCategory` as mentioned we will map `instCategory` as `1`=CRYPTO, `3`=STOCK).
    *   *Note:* standard OKX Spot does not always have `instCategory`, but if the requirements state ``instCategory`: `1` (CRYPTO), `3` (STOCK)`, we'll parse this response.
*   **Bybit:**
    *   **Endpoint:** `/v5/market/instruments-info`
    *   **Field:** `symbolType`
    *   **Mapping:** `stock` or `xstocks` means `STOCK`, else `CRYPTO`.
*   **Bitget:**
    *   **Endpoint:** `/api/v2/spot/public/symbols` (and possibly derivatives)
    *   **Field:** `isRwa`
    *   **Mapping:** `YES` means `STOCK`, else `CRYPTO`.

### Caching Strategy
*   Use IndexedDB (e.g. extending `src/services/historyCache.ts` or via a new `metadataCache.ts`).
*   Configurable TTL (1h to 24h) handled globally, adjustable via Settings.
*   Data Structure: Key: `exchange:symbol`, Value: `{ category: 'CRYPTO' | 'STOCK', ts: number }`.

### Formatters
*   Update `src/utils/formatters.ts` functions like `formatAssetAmount` (or `formatCrypto`) to consume this classifier and format `STOCK` with strictly 2 decimals, and `CRYPTO` with up to 8 decimals using `Big.js`.

### Settings UI
*   Add a card "Asset Metadata Cache Management".
*   Slider for Metadata TTL (1 to 24 hours). State in `dashboardStore` or `settingsStore`.
*   Display cache size.
*   Button to "Clear Metadata Cache".

## 3. Decomposition (Tasks)
1.  **Types:** Add `UnifiedAssetCategory = 'CRYPTO' | 'STOCK' | 'UNKNOWN'` to `src/types.ts`.
2.  **API Adapters:** Add `fetchInstrumentMetadata(symbol: string): Promise<UnifiedAssetCategory>` or batch fetch `fetchAllInstrumentMetadata()` in Bitget, Bybit, and OKX adapters.
3.  **Caching Engine:** Implement `storeMetadata`, `getMetadata`, `clearMetadataCache`, and `getMetadataCacheSize` in IndexedDB (`assetMetadata` object store).
4.  **Aggregator Service:** Create `src/services/AssetClassifierAggregator.ts`. It acts as a facade, checking the cache first, then lazy-fetching if TTL expired.
5.  **Formatter Updates:** Use `AssetClassifierAggregator` in the formatting utils (must handle synchronous formatting properly if formatters are used in React renders. Since metadata fetching is async, the formats will use the synchronously available cached metadata and trigger a background fetch if missing).
6.  **Settings UI Integration:** Implement the slider and cache management.
7.  **Playground:** Create the MVP Test tool under "Informações de Ativos".
8.  **Mocks:** Update `generateMocks.js` and `mock` interfaces.

Do you approve this Technical Plan?
