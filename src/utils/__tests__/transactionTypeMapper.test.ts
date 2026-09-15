import { describe, it, expect } from 'vitest';
import {
  getBybitUniversalType,
  getBitgetUniversalType,
  getOkxUniversalType,
  matchUniversalTxType,
  getUniversalBadge,
  UNIVERSAL_TX_FILTER_OPTIONS,
  UNIVERSAL_BADGE_STYLE
} from '../transactionTypeMapper';

describe('transactionTypeMapper', () => {
  describe('UNIVERSAL_TX_FILTER_OPTIONS', () => {
    it('should have 10 standard filter options', () => {
      expect(UNIVERSAL_TX_FILTER_OPTIONS).toHaveLength(10);
      expect(UNIVERSAL_TX_FILTER_OPTIONS.map(o => o.value)).toEqual([
        'ALL',
        'TRADE',
        'FUNDING_FEE',
        'TRANSFER_IN',
        'TRANSFER_OUT',
        'LIQUIDATION',
        'INTEREST',
        'REWARDS',
        'DELIVERY',
        'OTHERS'
      ]);
    });
  });

  describe('Bybit mapping (getBybitUniversalType)', () => {
    it('maps SETTLEMENT and funding entries to FUNDING_FEE', () => {
      expect(getBybitUniversalType('SETTLEMENT')).toBe('FUNDING_FEE');
      expect(getBybitUniversalType('FUNDING')).toBe('FUNDING_FEE');
      expect(getBybitUniversalType('SETTLEMENT', '-1.5')).toBe('FUNDING_FEE');
      expect(getBybitUniversalType({ type: 'SETTLEMENT', funding: '0' })).toBe('FUNDING_FEE');
    });

    it('maps trade types to TRADE', () => {
      expect(getBybitUniversalType('TRADE')).toBe('TRADE');
      expect(getBybitUniversalType('SPOT')).toBe('TRADE');
      expect(getBybitUniversalType('CURRENCY_BUY')).toBe('TRADE');
      expect(getBybitUniversalType('CURRENCY_SELL')).toBe('TRADE');
    });

    it('maps transfers to TRANSFER_IN / TRANSFER_OUT', () => {
      expect(getBybitUniversalType('TRANSFER_IN')).toBe('TRANSFER_IN');
      expect(getBybitUniversalType('DEPOSIT')).toBe('TRANSFER_IN');
      expect(getBybitUniversalType('TRANSFER')).toBe('TRANSFER_IN');
      expect(getBybitUniversalType('TRANSFER_OUT')).toBe('TRANSFER_OUT');
      expect(getBybitUniversalType('WITHDRAW')).toBe('TRANSFER_OUT');
    });

    it('maps liquidations to LIQUIDATION', () => {
      expect(getBybitUniversalType('LIQUIDATION')).toBe('LIQUIDATION');
      expect(getBybitUniversalType('ADL')).toBe('LIQUIDATION');
    });

    it('maps interest to INTEREST', () => {
      expect(getBybitUniversalType('INTEREST')).toBe('INTEREST');
      expect(getBybitUniversalType('BORROW')).toBe('INTEREST');
      expect(getBybitUniversalType('REPAY')).toBe('INTEREST');
    });

    it('maps rewards/bonus to REWARDS', () => {
      expect(getBybitUniversalType('BONUS')).toBe('REWARDS');
      expect(getBybitUniversalType('AIRDROP')).toBe('REWARDS');
      expect(getBybitUniversalType('FEE_REFUND')).toBe('REWARDS');
    });

    it('maps delivery to DELIVERY', () => {
      expect(getBybitUniversalType('DELIVERY')).toBe('DELIVERY');
    });
  });

  describe('Bitget mapping (getBitgetUniversalType)', () => {
    it('maps settle fees and funding to FUNDING_FEE', () => {
      expect(getBitgetUniversalType('SETTLE_FEE')).toBe('FUNDING_FEE');
      expect(getBitgetUniversalType('CONTRACT_MAIN_SETTLE_FEE')).toBe('FUNDING_FEE');
      expect(getBitgetUniversalType('FUNDING_FEE')).toBe('FUNDING_FEE');
      expect(getBitgetUniversalType('SETTLE_FEE', '0.5')).toBe('FUNDING_FEE');
    });

    it('maps trade types to TRADE', () => {
      expect(getBitgetUniversalType('TRADE')).toBe('TRADE');
      expect(getBitgetUniversalType('ORDER_DEALT_IN')).toBe('TRADE');
      expect(getBitgetUniversalType('ORDER_DEALT_OUT')).toBe('TRADE');
      expect(getBitgetUniversalType('OPEN_LONG')).toBe('TRADE');
      expect(getBitgetUniversalType('CLOSE_SHORT')).toBe('TRADE');
      expect(getBitgetUniversalType('REALIZED_PNL')).toBe('TRADE');
    });

    it('maps transfers to TRANSFER_IN / TRANSFER_OUT', () => {
      expect(getBitgetUniversalType('TRANS_FROM_EXCHANGE')).toBe('TRANSFER_IN');
      expect(getBitgetUniversalType('TRANSFER_IN')).toBe('TRANSFER_IN');
      expect(getBitgetUniversalType('DEPOSIT')).toBe('TRANSFER_IN');
      expect(getBitgetUniversalType('TRANS_TO_EXCHANGE')).toBe('TRANSFER_OUT');
      expect(getBitgetUniversalType('TRANSFER_OUT')).toBe('TRANSFER_OUT');
      expect(getBitgetUniversalType('WITHDRAW')).toBe('TRANSFER_OUT');
    });

    it('maps liquidations to LIQUIDATION', () => {
      expect(getBitgetUniversalType('LIQUIDATION')).toBe('LIQUIDATION');
      expect(getBitgetUniversalType('ADL')).toBe('LIQUIDATION');
    });

    it('maps interest to INTEREST', () => {
      expect(getBitgetUniversalType('INTEREST')).toBe('INTEREST');
      expect(getBitgetUniversalType('BORROW')).toBe('INTEREST');
      expect(getBitgetUniversalType('REPAY')).toBe('INTEREST');
    });

    it('maps rewards/trial fund to REWARDS', () => {
      expect(getBitgetUniversalType('TRIAL_FUND')).toBe('REWARDS');
      expect(getBitgetUniversalType('BONUS')).toBe('REWARDS');
      expect(getBitgetUniversalType('AIRDROP')).toBe('REWARDS');
      expect(getBitgetUniversalType('FEE_REFUND')).toBe('REWARDS');
    });

    it('maps delivery to DELIVERY', () => {
      expect(getBitgetUniversalType('DELIVERY')).toBe('DELIVERY');
      expect(getBitgetUniversalType('DELIVERY_FEE')).toBe('DELIVERY');
    });
  });

  describe('OKX mapping (getOkxUniversalType)', () => {
    it('maps type 8 and funding fees to FUNDING_FEE', () => {
      expect(getOkxUniversalType({ typeCode: '8' })).toBe('FUNDING_FEE');
      expect(getOkxUniversalType({ typeCode: '8', subTypeCode: '100' })).toBe('FUNDING_FEE');
      expect(getOkxUniversalType({ fundingFee: '-0.25' })).toBe('FUNDING_FEE');
      expect(getOkxUniversalType('FUNDING_FEE')).toBe('FUNDING_FEE');
    });

    it('maps type 2, 14, and trades to TRADE', () => {
      expect(getOkxUniversalType({ typeCode: '2' })).toBe('TRADE');
      expect(getOkxUniversalType({ typeCode: '14' })).toBe('TRADE');
      expect(getOkxUniversalType({ subTypeCode: '1' })).toBe('TRADE');
      expect(getOkxUniversalType('TRADE')).toBe('TRADE');
      expect(getOkxUniversalType('REALIZED_PNL')).toBe('TRADE');
    });

    it('maps type 5, 9, 10 to LIQUIDATION', () => {
      expect(getOkxUniversalType({ typeCode: '5' })).toBe('LIQUIDATION');
      expect(getOkxUniversalType({ typeCode: '9' })).toBe('LIQUIDATION');
      expect(getOkxUniversalType({ typeCode: '10' })).toBe('LIQUIDATION');
      expect(getOkxUniversalType('LIQUIDATION')).toBe('LIQUIDATION');
    });

    it('maps transfer in and out', () => {
      expect(getOkxUniversalType({ typeCode: '1', subTypeCode: '11' })).toBe('TRANSFER_IN');
      expect(getOkxUniversalType({ typeCode: '1', subTypeCode: '12' })).toBe('TRANSFER_OUT');
      expect(getOkxUniversalType('DEPOSIT')).toBe('TRANSFER_IN');
      expect(getOkxUniversalType('WITHDRAW')).toBe('TRANSFER_OUT');
    });

    it('maps interest to INTEREST', () => {
      expect(getOkxUniversalType({ typeCode: '18' })).toBe('INTEREST');
      expect(getOkxUniversalType({ typeCode: '22' })).toBe('INTEREST');
      expect(getOkxUniversalType({ subTypeCode: '110' })).toBe('INTEREST');
    });

    it('maps rewards/bonus to REWARDS', () => {
      expect(getOkxUniversalType({ typeCode: '26' })).toBe('REWARDS');
      expect(getOkxUniversalType({ typeCode: '27' })).toBe('REWARDS');
      expect(getOkxUniversalType({ subTypeCode: '180' })).toBe('REWARDS');
    });

    it('maps delivery to DELIVERY', () => {
      expect(getOkxUniversalType({ typeCode: '3' })).toBe('DELIVERY');
      expect(getOkxUniversalType({ subTypeCode: '113' })).toBe('DELIVERY');
    });
  });

  describe('matchUniversalTxType across all exchanges', () => {
    it('returns true when filter is ALL or empty', () => {
      expect(matchUniversalTxType('bybit', { type: 'TRADE' }, 'ALL')).toBe(true);
      expect(matchUniversalTxType('bitget', { type: 'ORDER_DEALT_IN' }, 'All')).toBe(true);
      expect(matchUniversalTxType('okx', { typeCode: '8' }, '')).toBe(true);
    });

    it('matches universal types for Bybit', () => {
      expect(matchUniversalTxType('bybit', { type: 'SETTLEMENT' }, 'FUNDING_FEE')).toBe(true);
      expect(matchUniversalTxType('bybit', { type: 'TRADE' }, 'TRADE')).toBe(true);
      expect(matchUniversalTxType('bybit', { type: 'TRADE' }, 'FUNDING_FEE')).toBe(false);
      expect(matchUniversalTxType('bybit', { type: 'SETTLEMENT' }, 'SETTLEMENT')).toBe(true);
    });

    it('matches universal types for Bitget', () => {
      expect(matchUniversalTxType('bitget', { type: 'CONTRACT_MAIN_SETTLE_FEE' }, 'FUNDING_FEE')).toBe(true);
      expect(matchUniversalTxType('bitget', { type: 'ORDER_DEALT_IN' }, 'TRADE')).toBe(true);
      expect(matchUniversalTxType('bitget', { type: 'TRANS_FROM_EXCHANGE' }, 'TRANSFER_IN')).toBe(true);
      expect(matchUniversalTxType('bitget', { type: 'TRANS_TO_EXCHANGE' }, 'TRANSFER_OUT')).toBe(true);
    });

    it('matches universal types for OKX', () => {
      expect(matchUniversalTxType('okx', { typeCode: '8' }, 'FUNDING_FEE')).toBe(true);
      expect(matchUniversalTxType('okx', { typeCode: '2' }, 'TRADE')).toBe(true);
      expect(matchUniversalTxType('okx', { typeCode: '1', subTypeCode: '11' }, 'TRANSFER_IN')).toBe(true);
      expect(matchUniversalTxType('okx', { typeCode: '5' }, 'LIQUIDATION')).toBe(true);
    });
  });

  describe('getUniversalBadge', () => {
    it('returns valid badge config with universalType', () => {
      const badgeBybit = getUniversalBadge('bybit', { type: 'SETTLEMENT' });
      expect(badgeBybit.universalType).toBe('FUNDING_FEE');
      expect(badgeBybit.label).toBe('Funding Fee');
      expect(badgeBybit.textColor).toBe('text-purple-400');

      const badgeBitget = getUniversalBadge('bitget', { type: 'ORDER_DEALT_IN' });
      expect(badgeBitget.universalType).toBe('TRADE');
      expect(badgeBitget.label).toBe('Trade');

      const badgeOkx = getUniversalBadge('okx', { typeCode: '1', subTypeCode: '11' });
      expect(badgeOkx.universalType).toBe('TRANSFER_IN');
      expect(badgeOkx.label).toBe('Transfer In');
    });
  });
});
