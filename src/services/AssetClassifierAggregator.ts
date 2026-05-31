import { UnifiedAssetCategory, ExchangeName } from '../types';
import { getAssetMetadata, saveAssetMetadata } from './historyCache';
import { useSettingsStore } from '../store/settingsStore';
import { BitgetAdapter } from './adapters/BitgetAdapter';
import { BybitAdapter } from './adapters/BybitAdapter';
import { OkxAdapter } from './adapters/OkxAdapter';

export class AssetClassifierAggregator {
  
  private static memCache: Record<string, UnifiedAssetCategory> = {};

  /**
   * Synchronous getter for formatting immediately while async resolution happens
   */
  public static getCategorySync(exchange: ExchangeName, symbol: string): UnifiedAssetCategory {
     return this.getGlobalCategorySync(symbol);
  }

  public static getGlobalCategorySync(symbol: string): UnifiedAssetCategory {
     const cleanSymbol = symbol.toUpperCase().trim();
     const key = `GLOBAL_${cleanSymbol}`;
     if (this.memCache[key]) {
         return this.memCache[key];
     }
     
     // Trigger async fetch in background so next render has it
     this.getGlobalAssetCategory(cleanSymbol).catch(console.error);

     return 'CRYPTO'; // Default assumption
  }

  /**
   * Identificação Positiva de Stock via Hierarquia: OKX -> Bybit -> Bitget
   */
  public static async getGlobalAssetDetails(baseSymbol: string) {
    const symbol = baseSymbol.toUpperCase().trim().replace(/[^A-Z0-9-]/g, '');
    const cacheKey = `GLOBAL_${symbol}`;

    if (this.memCache[cacheKey]) return { category: this.memCache[cacheKey], source: 'Local Cache' };

    const cached = await getAssetMetadata(cacheKey);
    const ttlHours = useSettingsStore.getState().metadataCacheTtlHours || 24;
    const ttlMs = ttlHours * 60 * 60 * 1000;
    
    if (cached && (Date.now() - cached.updatedAt < ttlMs)) {
      this.memCache[cacheKey] = cached.category;
      return { category: cached.category, source: 'IDB Cache' };
    }

    // --- Passo 1 (OKX) ---
    try {
      const okx = new OkxAdapter();
      if (okx.fetchInstrumentMetadata) {
         const vars = [symbol, `${symbol}-USDT`, `${symbol}-USDC`];
         for (const v of vars) {
             const cat = await okx.fetchInstrumentMetadata(v);
             if (cat === 'STOCK' || cat === 'CRYPTO') {
                 return this.saveAndReturnDetails(cacheKey, cat, 'OKX');
             }
         }
      }
    } catch (e) { console.warn('[Agregador] Falha OKX:', e); }

    // --- Passo 2 (Fallback Bybit) ---
    try {
      const bybit = new BybitAdapter();
      if (bybit.fetchInstrumentMetadata) {
         const vars = [symbol, `${symbol}USDT`];
         for (const v of vars) {
             const cat = await bybit.fetchInstrumentMetadata(v);
             if (cat === 'STOCK' || cat === 'CRYPTO') {
                 return this.saveAndReturnDetails(cacheKey, cat, 'Bybit');
             }
         }
      }
    } catch (e) { console.warn('[Agregador] Falha Bybit:', e); }

    // --- Passo 3 (Fallback Bitget) ---
    try {
      const bitget = new BitgetAdapter();
      if (bitget.fetchInstrumentMetadata) {
         const vars = [symbol, `${symbol}USDT`];
         for (const v of vars) {
             const cat = await bitget.fetchInstrumentMetadata(v);
             if (cat === 'STOCK' || cat === 'CRYPTO') {
                 return this.saveAndReturnDetails(cacheKey, cat, 'Bitget');
             }
         }
      }
    } catch (e) { console.warn('[Agregador] Falha Bitget:', e); }

    // --- Passo 4 (Default) ---
    return this.saveAndReturnDetails(cacheKey, 'CRYPTO', 'Fallback (Default)');
  }

  private static async saveAndReturnDetails(cacheKey: string, category: UnifiedAssetCategory, source: string) {
     try {
       await saveAssetMetadata(cacheKey, category);
     } catch (e) {
       console.warn('[Agregador] Erro ao salvar cache', e);
     }
     this.memCache[cacheKey] = category;
     return { category, source };
  }

  public static async getGlobalAssetCategory(baseSymbol: string): Promise<UnifiedAssetCategory> {
      const details = await this.getGlobalAssetDetails(baseSymbol);
      return details.category;
  }

  private static async saveAndReturn(cacheKey: string, category: UnifiedAssetCategory): Promise<UnifiedAssetCategory> {
     try {
       await saveAssetMetadata(cacheKey, category);
     } catch (e) {
       console.warn('[Agregador] Erro ao salvar cache', e);
     }
     this.memCache[cacheKey] = category;
     return category;
  }

  // Compatibilidade caso algum código ainda envie a exchange como param
  public static async getAssetCategory(exchange: ExchangeName | string, symbol: string): Promise<UnifiedAssetCategory> {
     return this.getGlobalAssetCategory(symbol);
  }
}

