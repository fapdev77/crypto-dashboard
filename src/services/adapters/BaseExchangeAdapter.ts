import { proxyFetch } from '../../utils/proxyFetch';

/**
 * Abstract base class for all exchange adapters.
 * Provides a shared `syncTime()` implementation that eliminates
 * the duplicated time-sync logic across Bybit, Bitget, and OKX adapters.
 *
 * Each subclass must override:
 * - `_timeSyncUrl`     – the public REST endpoint that returns server time
 * - `_parseTimeResponse` – extracts server time in milliseconds from the raw response
 */
export abstract class BaseExchangeAdapter {
  static timeOffset = 0;
  static lastSyncTime = 0;
  private static readonly SYNC_THROTTLE_MS = 300_000;

  /** Override in subclass with the exchange-specific time endpoint. */
  protected static _timeSyncUrl = '';

  /**
   * Override in subclass to extract server time (in milliseconds) from the API response.
   * Return `null` if the response is invalid or parsing fails.
   */
  protected static _parseTimeResponse(_data: any): number | null {
    return null;
  }

  /** Extract a human-readable exchange name from the time-sync URL. */
  protected static extractExchangeName(): string {
    const hostname = this._timeSyncUrl.replace(/https?:\/\//, '').split('/')[0];
    const parts = hostname.split('.');
    return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  }

  /**
   * Fetches the server time from the exchange's public endpoint,
   * computes the clock offset, and caches it for 5 minutes.
   * Safe to call multiple times – throttled internally.
   */
  static async syncTime(): Promise<void> {
    // Throttle: only sync every 5 minutes max
    if (Date.now() - this.lastSyncTime < this.SYNC_THROTTLE_MS) return;
    if (!this._timeSyncUrl) return;

    try {
      let data: any;
      try {
        const res = await fetch(this._timeSyncUrl, { method: 'GET' });
        if (res.ok) data = await res.json();
        else throw new Error();
      } catch {
        data = await proxyFetch({ targetUrl: this._timeSyncUrl, method: 'GET', headers: {} });
      }

      const serverTimeMs = this._parseTimeResponse(data);
      if (serverTimeMs !== null) {
        this.timeOffset = serverTimeMs - Date.now();
        this.lastSyncTime = Date.now();
        const name = this.extractExchangeName();
        console.log(`[Time-Sync] ${name} synced. Offset: ${this.timeOffset}ms`);
      }
    } catch (e) {
      const name = this.extractExchangeName();
      console.error(`[Time-Sync] ${name} time sync error:`, e);
    }
  }
}
