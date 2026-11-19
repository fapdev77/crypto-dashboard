import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BitgetClassicAdapter } from '../BitgetClassicAdapter';
import { BitgetUTAAdapter } from '../BitgetUTAAdapter';
import * as proxyModule from '../../../utils/proxyFetch';

vi.mock('../../../utils/proxyFetch', () => ({
  proxyFetch: vi.fn(),
  hybridFetch: vi.fn(),
}));

/**
 * Fiat balances used to be valued 1:1 with USD by the adapters (BRL counted as
 * US$ 1), which inflated the dashboard total equity. These tests pin the fix.
 */
describe('adapter stablecoin/fiat valuation', () => {
  const classic = new BitgetClassicAdapter();
  const uta = new BitgetUTAAdapter();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(proxyModule.proxyFetch).mockImplementation(async ({ targetUrl }: any) => {
      throw new Error(`unexpected network call: ${targetUrl}`);
    });
    vi.mocked(proxyModule.hybridFetch).mockImplementation(async (url: string) => {
      throw new Error(`unexpected network call: ${url}`);
    });
  });

  it('keeps USD-pegged stablecoins at one dollar', async () => {
    await expect(classic.getCoinPrice('USDT')).resolves.toBe(1);
    await expect(uta.getCoinPrice('USDC')).resolves.toBe(1);
    expect(proxyModule.proxyFetch).not.toHaveBeenCalled();
  });

  it('values BRL through the fiat rate table instead of 1:1', async () => {
    const brl = await classic.getCoinPrice('BRL');
    expect(brl).toBeCloseTo(1 / 5.65, 8);
    expect(brl).toBeLessThan(0.2);

    const brlUta = await uta.getCoinPrice('BRL');
    expect(brlUta).toBeCloseTo(1 / 5.65, 8);
  });

  it('values EURT at the euro rate instead of 1:1', async () => {
    const eurt = await classic.getCoinPrice('EURT');
    expect(eurt).toBeCloseTo(1 / 0.92, 8);
    expect(eurt).toBeGreaterThan(1);
  });

  it('still asks the network for balances that need a real quote', async () => {
    // The mocked network throws; the adapter logs and falls back to 0 rather than
    // inventing a price, and the attempt itself is observable.
    await expect(classic.getCoinPrice('SOL')).resolves.toBe(0);
    expect(proxyModule.proxyFetch).toHaveBeenCalled();
  });
});
