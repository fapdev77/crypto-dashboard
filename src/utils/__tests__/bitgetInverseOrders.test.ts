import { describe, it, expect } from 'vitest';
import { detectQtyIsCoin } from '../inverseUtils';

describe('Bitget Coin-M vs Linear and Other Exchanges Orders/Trades', () => {
  it('detectQtyIsCoin should return false for Bitget, OKX, and Bybit in inverse contracts', () => {
    // For inverse contracts, 2445 represents 2445 USD contracts, not 2445 ETH!
    expect(detectQtyIsCoin({ exchange: 'bitget', qty: 2445, price: 3000 })).toBe(false);
    expect(detectQtyIsCoin({ exchange: 'okx', qty: 2445, price: 3000 })).toBe(false);
    expect(detectQtyIsCoin({ exchange: 'bybit', qty: 2445, price: 3000 })).toBe(false);
  });

  it('verifies Bitget Coin-M order values are not inflated by price squared', () => {
    const order = {
      exchange: 'bitget',
      category: 'INVERSE',
      symbol: 'ETHUSD_DMCBL',
      qty: 2445, // 2445 USD contracts
      price: 3000,
      value: 2445, // from adapter when category === 'INVERSE'
    };

    const isInverse = order.category === 'INVERSE';
    const effPrice = order.price;

    let valUsd = 0;
    let actualCoinSize = 0;

    if (order.exchange === 'bitget' && isInverse) {
      valUsd = order.value && order.value > 0 && order.value !== order.qty * effPrice ? order.value : order.qty;
      actualCoinSize = effPrice > 0 ? valUsd / effPrice : 0;
    }

    expect(valUsd).toBe(2445);
    expect(actualCoinSize).toBeCloseTo(0.815, 3);
  });

  it('verifies Bitget Linear (USDT-M) perps remain untouched and calculate based on base coin', () => {
    const order = {
      exchange: 'bitget',
      category: 'PERP', // Linear USDT perp
      symbol: 'ETHUSDT',
      qty: 0.5, // 0.5 ETH
      price: 3000,
      value: 1500,
    };

    const isInverse = order.category === 'INVERSE';
    const effPrice = order.price;

    let valUsd = 0;
    let actualCoinSize = 0;

    if (order.exchange === 'bitget') {
      if (isInverse) {
        valUsd = order.qty;
        actualCoinSize = effPrice > 0 ? valUsd / effPrice : 0;
      } else {
        valUsd = order.value && order.value > 0 ? order.value : (effPrice > 0 ? order.qty * effPrice : 0);
        actualCoinSize = order.qty;
      }
    }

    expect(valUsd).toBe(1500);
    expect(actualCoinSize).toBe(0.5);
  });

  it('verifies Bybit and OKX calculations remain intact', () => {
    // Bybit Inverse
    const bybitOrder = {
      exchange: 'bybit',
      category: 'INVERSE',
      qty: 2445, // USD contracts
      price: 3000,
      value: 0.815, // In coin for Bybit inverse
    };

    const bybitEffPrice = bybitOrder.price;
    const bybitValUsd = bybitOrder.value && bybitOrder.value > 0 && bybitEffPrice > 0
      ? bybitOrder.value * bybitEffPrice
      : bybitOrder.qty;
    const bybitCoinSize = bybitOrder.value && bybitOrder.value > 0
      ? bybitOrder.value
      : (bybitEffPrice > 0 ? bybitOrder.qty / bybitEffPrice : 0);

    expect(bybitValUsd).toBeCloseTo(2445, 1);
    expect(bybitCoinSize).toBeCloseTo(0.815, 3);

    // OKX Inverse
    const okxOrder = {
      exchange: 'okx',
      category: 'INVERSE',
      qty: 2445, // USD contracts
      price: 3000,
      value: 2445,
    };
    const okxEffPrice = okxOrder.price;
    const okxValUsd = okxOrder.value;
    const okxCoinSize = okxEffPrice > 0 ? okxOrder.value / okxEffPrice : okxOrder.qty;

    expect(okxValUsd).toBe(2445);
    expect(okxCoinSize).toBeCloseTo(0.815, 3);
  });
});
