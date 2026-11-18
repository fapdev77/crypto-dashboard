import { describe, it, expect, vi, beforeEach } from 'vitest';
import Big from 'big.js';
import { BitgetClassicAdapter } from '../BitgetClassicAdapter';
import { ApiCredentials } from '../../../store/apiKeysStore';
import * as proxyModule from '../../../utils/proxyFetch';

/**
 * Precision characterization for the fee accumulation inside
 * `BitgetClassicAdapter.fetchAndNormalize`, which does
 * `totalFee += parseFloat(...)` while PRD §6.2.6 requires Big.js for
 * accumulated fees.
 *
 * Two separate claims are measured here:
 *  1. the accumulated value is a float, not an exact decimal;
 *  2. the cent-level error does NOT come from the accumulation itself, but
 *     from rounding the float with `toFixed` (half-cent boundary).
 */
vi.mock('../../../utils/proxyFetch', () => ({ proxyFetch: vi.fn() }));

const mockKey: ApiCredentials = {
  id: 'key-bitget-fee-precision',
  label: 'Bitget Fee Precision',
  exchange: 'bitget',
  apiKey: 'k',
  apiSecret: 's',
  passphrase: 'p',
  isActive: true,
};

const adapter = new BitgetClassicAdapter();

// 0.1 + 0.2 + 0.3 = 0.6 exactly in decimal; the float sum is 0.6000000000000001.
// netProfit 11.3 keeps the drift visible after the subtraction that yields closedPnl.
const floatRow = {
  symbol: 'BTCUSDT',
  holdSide: 'long',
  openAvgPrice: '60000',
  closeAvgPrice: '60100',
  closeTotalPos: '0.01',
  netProfit: '11.3',
  openFee: '0.1',
  closeFee: '0.2',
  fee: '0.3',
  ctime: '1700000000000',
  utime: '1700003600000',
  productType: 'USDT-FUTURES',
};

// Fees that land exactly on a half-cent: 0.35 + 0.35 + 0.305 = 1.005.
const halfCentRow = { ...floatRow, openFee: '0.35', closeFee: '0.35', fee: '0.305' };

const fetchWith = async (row: Record<string, unknown>) => {
  vi.mocked(proxyModule.proxyFetch).mockResolvedValue({
    code: '00000',
    data: { entList: [row], endId: '' },
  } as never);
  const [record] = await adapter.fetchAndNormalize(mockKey);
  if (typeof record.tradingFee !== 'number') throw new Error('tradingFee missing from adapter output');
  if (typeof record.closedPnl !== 'number') throw new Error('closedPnl missing from adapter output');
  return { ...record, tradingFee: record.tradingFee, closedPnl: record.closedPnl };
};

describe('BitgetClassicAdapter fee precision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accumulates tradingFee with float addition (0.1 + 0.2 + 0.3 drifts)', async () => {
    const record = await fetchWith(floatRow);

    expect(record.tradingFee).toBe(0.6000000000000001);
    expect(new Big(record.tradingFee).eq('0.6')).toBe(false);
    expect(new Big('0.1').plus('0.2').plus('0.3').toString()).toBe('0.6');
  });

  it('carries that drift into closedPnl, which is derived by subtraction', async () => {
    const record = await fetchWith(floatRow);

    // closedPnl = netProfit - funding(0) - totalFee, all in float.
    const exactClosedPnl = new Big('11.3').minus('0.6');
    expect(new Big(record.closedPnl.toString()).eq(exactClosedPnl)).toBe(false);
    const delta = new Big(record.closedPnl.toString()).minus(exactClosedPnl).abs();
    expect(delta.gt(0)).toBe(true);
    expect(delta.lt('1e-12')).toBe(true);
  });

  it('the float sum itself stays inside the cent, so no cent is lost to accumulation', async () => {
    const record = await fetchWith(floatRow);

    // 1e-16 of drift cannot move a 2-decimal display.
    const drift = new Big(record.tradingFee.toString()).minus('0.6').abs();
    expect(drift.lt('0.005')).toBe(true);
  });

  it('rounding the same money with toFixed loses a cent at a half-cent boundary', async () => {
    const record = await fetchWith(halfCentRow);

    // Exact decimal total is 1.005; the float holds 1.0049999999999999.
    expect(new Big('0.35').plus('0.35').plus('0.305').toFixed(2)).toBe('1.01');
    expect(record.tradingFee.toFixed(2)).toBe('1.00');
    // Same value, two answers depending on the rounding path — this is the real defect.
    expect(record.tradingFee.toFixed(2)).not.toBe(new Big('0.35').plus('0.35').plus('0.305').toFixed(2));
  });

  it('Intl-based display is not affected by the half-cent boundary', async () => {
    const record = await fetchWith(halfCentRow);

    const display = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(record.tradingFee);
    expect(display).toBe('$1.01');
  });
});
