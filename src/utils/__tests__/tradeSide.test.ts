import { describe, it, expect } from 'vitest';
import { classifyTradeSide } from '../tradeSide';

describe('classifyTradeSide', () => {
  it('classifies plain spot sides', () => {
    expect(classifyTradeSide('Buy')).toBe('buy');
    expect(classifyTradeSide('Sell')).toBe('sell');
  });

  it('classifies opening a position as the entry direction', () => {
    expect(classifyTradeSide('Open Long')).toBe('buy');
    expect(classifyTradeSide('Open Short')).toBe('sell');
  });

  it('classifies closing a long as a sale', () => {
    expect(classifyTradeSide('Close Long')).toBe('sell');
    expect(classifyTradeSide('close_long')).toBe('sell');
    expect(classifyTradeSide('Reduce Long')).toBe('sell');
  });

  it('classifies closing a short as a purchase', () => {
    expect(classifyTradeSide('Close Short')).toBe('buy');
    expect(classifyTradeSide('reduce_short')).toBe('buy');
  });

  it('falls back to the bare position side', () => {
    expect(classifyTradeSide('long')).toBe('buy');
    expect(classifyTradeSide('SHORT')).toBe('sell');
  });

  it('returns null when there is no direction', () => {
    expect(classifyTradeSide('None')).toBeNull();
    expect(classifyTradeSide('')).toBeNull();
    expect(classifyTradeSide(undefined)).toBeNull();
  });
});
