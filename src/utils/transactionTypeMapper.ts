// ============================================================================
// Universal Transaction Type Mapper for Bybit, Bitget, and OKX
// ============================================================================

export type UniversalTxType =
  | 'ALL'
  | 'TRADE'
  | 'FUNDING_FEE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'LIQUIDATION'
  | 'INTEREST'
  | 'REWARDS'
  | 'DELIVERY'
  | 'OTHERS';

export interface UniversalFilterOption {
  value: UniversalTxType;
  label: string;
  description: string;
}

export const UNIVERSAL_TX_FILTER_OPTIONS: UniversalFilterOption[] = [
  { value: 'ALL', label: 'All Types', description: 'Show all transactions without type filter' },
  { value: 'TRADE', label: 'Trade & Orders', description: 'Spot, Futures & Margin trades, buy/sell executions and PnL settlements' },
  { value: 'FUNDING_FEE', label: 'Funding Fee', description: 'Periodic contract funding fee payments and incomes' },
  { value: 'TRANSFER_IN', label: 'Transfer In / Deposit', description: 'Deposits and incoming transfers from other accounts or subaccounts' },
  { value: 'TRANSFER_OUT', label: 'Transfer Out / Withdraw', description: 'Withdrawals and outgoing transfers to other accounts or subaccounts' },
  { value: 'LIQUIDATION', label: 'Liquidation & ADL', description: 'Forced liquidation and auto-deleveraging (ADL) executions' },
  { value: 'INTEREST', label: 'Interest & Loans', description: 'Margin interest charges, borrow, loan repayments and funding deductions' },
  { value: 'REWARDS', label: 'Rewards & Bonus', description: 'Trial funds, trading bonuses, airdrops, vouchers and fee rebates/refunds' },
  { value: 'DELIVERY', label: 'Delivery & Settle', description: 'Futures contract expiry delivery and options exercise settlement' },
  { value: 'OTHERS', label: 'Others', description: 'Currency conversions, auto-deductions, system adjustments and miscellaneous' }
];

export interface UniversalBadgeConfig {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export const UNIVERSAL_BADGE_STYLE: Record<UniversalTxType, UniversalBadgeConfig> = {
  ALL: {
    label: 'All',
    bgColor: 'bg-white/10',
    textColor: 'text-white',
    borderColor: 'border-white/20'
  },
  TRADE: {
    label: 'Trade',
    bgColor: 'bg-blue-500/15',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30'
  },
  FUNDING_FEE: {
    label: 'Funding Fee',
    bgColor: 'bg-purple-500/15',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30'
  },
  TRANSFER_IN: {
    label: 'Transfer In',
    bgColor: 'bg-emerald-500/15',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30'
  },
  TRANSFER_OUT: {
    label: 'Transfer Out',
    bgColor: 'bg-amber-500/15',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30'
  },
  LIQUIDATION: {
    label: 'Liquidation',
    bgColor: 'bg-rose-500/15',
    textColor: 'text-rose-400',
    borderColor: 'border-rose-500/30'
  },
  INTEREST: {
    label: 'Interest',
    bgColor: 'bg-orange-500/15',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/30'
  },
  REWARDS: {
    label: 'Reward / Bonus',
    bgColor: 'bg-yellow-500/15',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-500/30'
  },
  DELIVERY: {
    label: 'Delivery',
    bgColor: 'bg-cyan-500/15',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/30'
  },
  OTHERS: {
    label: 'Other',
    bgColor: 'bg-slate-500/15',
    textColor: 'text-slate-300',
    borderColor: 'border-slate-500/30'
  }
};

/**
 * Maps Bybit raw transaction type or entry to universal type
 */
export function getBybitUniversalType(
  rawType: string | any,
  funding?: string | number
): UniversalTxType {
  let t = '';
  let f = 0;

  if (typeof rawType === 'object' && rawType !== null) {
    t = String(rawType.type || rawType.transType || '').trim().toUpperCase();
    f = Number(rawType.funding || rawType.fundingFee || 0);
  } else {
    t = String(rawType || '').trim().toUpperCase();
    f = Number(funding || 0);
  }

  // 1. Funding Fee: Bybit uses SETTLEMENT for 8-hour funding fee settlements, or any type with FUNDING / SETTLE, or non-zero funding field
  if (
    t === 'SETTLEMENT' ||
    t === 'FUNDING' ||
    t === 'FUNDING_FEE' ||
    t === 'SETTLE_FEE' ||
    t.includes('FUNDING') ||
    t.includes('SETTLE') ||
    f !== 0
  ) {
    return 'FUNDING_FEE';
  }

  // 2. Trades & Orders
  if (t === 'TRADE' || t === 'CURRENCY_BUY' || t === 'CURRENCY_SELL' || t === 'SPOT') {
    return 'TRADE';
  }

  // 3. Transfers
  if (t === 'TRANSFER_IN' || t === 'DEPOSIT') {
    return 'TRANSFER_IN';
  }
  if (t === 'TRANSFER_OUT' || t === 'WITHDRAW') {
    return 'TRANSFER_OUT';
  }
  if (t === 'TRANSFER') {
    return 'TRANSFER_IN';
  }

  // 4. Liquidation / ADL
  if (t === 'LIQUIDATION' || t === 'ADL') {
    return 'LIQUIDATION';
  }

  // 5. Interest & Loans
  if (t === 'INTEREST' || t === 'BORROW' || t === 'REPAY') {
    return 'INTEREST';
  }

  // 6. Rewards & Bonuses
  if (t === 'BONUS' || t === 'BONUS_RECOLLECT' || t === 'AIRDROP' || t === 'FEE_REFUND') {
    return 'REWARDS';
  }

  // 7. Delivery / Option Exercise
  if (t === 'DELIVERY' || t.includes('EXERCISE')) {
    return 'DELIVERY';
  }

  return 'OTHERS';
}

/**
 * Maps Bitget raw transaction type/businessType to universal type
 */
export function getBitgetUniversalType(
  rawType: string | any,
  funding?: string | number
): UniversalTxType {
  let t = '';
  let f = 0;

  if (typeof rawType === 'object' && rawType !== null) {
    t = String(rawType.type || rawType.businessType || '').trim().toUpperCase();
    f = Number(rawType.funding || rawType.fundingFee || 0);
  } else {
    t = String(rawType || '').trim().toUpperCase();
    f = Number(funding || 0);
  }

  // Funding fees
  if (
    f !== 0 ||
    t === 'FUNDING_FEE' ||
    t === 'SETTLE_FEE' ||
    t === 'CONTRACT_MAIN_SETTLE_FEE' ||
    t === 'SETTLE_FEE_USER_IN' ||
    t === 'SETTLE_FEE_USER_OUT' ||
    t.includes('SETTLE_FEE') ||
    t.includes('FUNDING')
  ) {
    return 'FUNDING_FEE';
  }

  // Trades
  if (
    t === 'TRADE' ||
    t === 'ORDER_DEALT_IN' ||
    t === 'ORDER_DEALT_OUT' ||
    t === 'OPEN_LONG' ||
    t === 'OPEN_SHORT' ||
    t === 'CLOSE_LONG' ||
    t === 'CLOSE_SHORT' ||
    t === 'REALIZED_PNL' ||
    t === 'CLOSE_PNL' ||
    t === 'BUY' ||
    t === 'SELL' ||
    t.includes('OPEN_') ||
    t.includes('CLOSE_') ||
    t.includes('DEALT')
  ) {
    return 'TRADE';
  }

  // Transfer in / deposits
  if (
    t === 'TRANSFER_IN' ||
    t === 'TRANS_FROM_EXCHANGE' ||
    t === 'TRANS_FROM_CONTRACT' ||
    t === 'TRACE_TRANSFER_USER_IN' ||
    t === 'DEPOSIT' ||
    t === 'MT5_TRANSFER_IN' ||
    t === 'ON_CHAIN_TRANSFER_REFUND' ||
    t.includes('FROM_EXCHANGE') ||
    t.includes('TRANSFER_IN')
  ) {
    return 'TRANSFER_IN';
  }

  // Transfer out / withdrawals
  if (
    t === 'TRANSFER_OUT' ||
    t === 'TRANS_TO_EXCHANGE' ||
    t === 'TRANS_TO_CONTRACT' ||
    t === 'TRACE_TRANSFER_USER_OUT' ||
    t === 'WITHDRAW' ||
    t === 'MT5_TRANSFER_OUT' ||
    t === 'ON_CHAIN_TRANSFER_OUT' ||
    t.includes('TO_EXCHANGE') ||
    t.includes('TRANSFER_OUT')
  ) {
    return 'TRANSFER_OUT';
  }

  // Liquidation / ADL
  if (
    t === 'LIQUIDATION' ||
    t === 'ADL' ||
    t.includes('FORCE_CLOSE') ||
    t.includes('BURST_CLOSE') ||
    t.includes('LIQUIDAT')
  ) {
    return 'LIQUIDATION';
  }

  // Interest & loans
  if (
    t === 'INTEREST' ||
    t === 'BORROW' ||
    t === 'REPAY' ||
    t === 'MARGIN_INTEREST' ||
    t.includes('INTEREST') ||
    t.includes('BORROW') ||
    t.includes('REPAY')
  ) {
    return 'INTEREST';
  }

  // Rewards & bonuses
  if (
    t === 'BONUS' ||
    t === 'BONUS_RECOLLECT' ||
    t === 'TRIAL_FUND' ||
    t === 'TRIAL_FUND_RECYCLE' ||
    t === 'AIRDROP' ||
    t === 'AIRDROP_REWARDS' ||
    t === 'REBATE_REWARDS' ||
    t === 'FEE_REFUND' ||
    t.includes('BONUS') ||
    t.includes('TRIAL_FUND') ||
    t.includes('AIRDROP') ||
    t.includes('REBATE') ||
    t.includes('CASH_GIFT')
  ) {
    return 'REWARDS';
  }

  // Delivery & settle
  if (t === 'DELIVERY' || t === 'DELIVERY_FEE' || t === 'DELIVERY_SETTLE' || t.includes('DELIVERY')) {
    return 'DELIVERY';
  }

  return 'OTHERS';
}

/**
 * Maps OKX raw transaction type / subType / strings to universal type
 */
export function getOkxUniversalType(entry: string | {
  type?: string;
  typeCode?: string;
  subType?: string;
  subTypeCode?: string;
  transType?: string;
  transSubType?: string;
  fundingFee?: string | number;
}): UniversalTxType {
  if (typeof entry === 'string') {
    const raw = entry.toUpperCase().trim();
    if (raw.includes('FUNDING')) return 'FUNDING_FEE';
    if (raw.includes('TRADE') || raw.includes('BUY') || raw.includes('SELL') || raw.includes('OPEN') || raw.includes('CLOSE') || raw === 'REALIZED_PNL') return 'TRADE';
    if (raw.includes('LIQUID') || raw.includes('ADL') || raw.includes('CLAWBACK')) return 'LIQUIDATION';
    if (raw === 'TRANSFER_IN' || raw === 'DEPOSIT' || raw.includes('DEPOSIT') || raw.includes('FROM_EXCHANGE')) return 'TRANSFER_IN';
    if (raw === 'TRANSFER_OUT' || raw === 'WITHDRAW' || raw.includes('WITHDRAW') || raw.includes('TO_EXCHANGE')) return 'TRANSFER_OUT';
    if (raw === 'TRANSFER') return 'TRANSFER_IN';
    if (raw.includes('INTEREST') || raw.includes('BORROW') || raw.includes('REPAY')) return 'INTEREST';
    if (raw.includes('REWARD') || raw.includes('BONUS') || raw.includes('AIRDROP') || raw.includes('FEE_REFUND') || raw.includes('REBATE')) return 'REWARDS';
    if (raw.includes('DELIVERY') || raw.includes('EXERCISE') || raw.includes('SETTLEMENT')) return 'DELIVERY';
    return 'OTHERS';
  }

  const typeCode = String(entry.typeCode ?? entry.type ?? '').trim();
  const subTypeCode = String(entry.subTypeCode ?? entry.subType ?? '').trim();
  const transType = String(entry.transType || '').trim().toUpperCase();
  const transSubType = String(entry.transSubType || '').trim().toUpperCase();
  const f = Number(entry.fundingFee || 0);

  if (f !== 0 || typeCode === '8' || subTypeCode === '100' || subTypeCode === '101' || transSubType.includes('FUNDING')) {
    return 'FUNDING_FEE';
  }

  // Trade (type: 2, 14, or trade subTypes)
  if (
    typeCode === '2' ||
    typeCode === '14' ||
    ['1', '2', '3', '4', '5', '6'].includes(subTypeCode) ||
    transType.includes('TRADE') ||
    transSubType.includes('BUY') ||
    transSubType.includes('SELL') ||
    transSubType.includes('OPEN') ||
    transSubType.includes('CLOSE')
  ) {
    return 'TRADE';
  }

  // Liquidation / ADL (type: 5, 9, 10 or subTypes 100-107, 125-128, 160-162, 170-171)
  if (
    typeCode === '5' ||
    typeCode === '9' ||
    typeCode === '10' ||
    ['100', '101', '102', '103', '104', '105', '106', '107', '125', '126', '127', '128', '160', '161', '162', '170', '171'].includes(subTypeCode) ||
    transType.includes('LIQUID') ||
    transSubType.includes('LIQUID') ||
    transType.includes('ADL') ||
    transSubType.includes('ADL')
  ) {
    return 'LIQUIDATION';
  }

  // Transfer in (type: 1 with subType: 11, or deposit subtypes)
  if (
    (typeCode === '1' && (subTypeCode === '11' || subTypeCode === '1' || subTypeCode === '13' || subTypeCode === '18' || subTypeCode === '201')) ||
    subTypeCode === '11' ||
    transSubType.includes('TRANSFER IN') ||
    transSubType.includes('DEPOSIT')
  ) {
    return 'TRANSFER_IN';
  }

  // Transfer out (type: 1 with subType: 12, or withdraw subtypes)
  if (
    (typeCode === '1' && (subTypeCode === '12' || subTypeCode === '2' || subTypeCode === '14' || subTypeCode === '19' || subTypeCode === '202')) ||
    subTypeCode === '12' ||
    transSubType.includes('TRANSFER OUT') ||
    transSubType.includes('WITHDRAW')
  ) {
    return 'TRANSFER_OUT';
  }

  // Interest & loans (type: 18, 22 or interest subtypes 110, 111, 112)
  if (
    typeCode === '18' ||
    typeCode === '22' ||
    ['110', '111', '112'].includes(subTypeCode) ||
    transType.includes('INTEREST') ||
    transSubType.includes('INTEREST') ||
    transType.includes('BORROW') ||
    transType.includes('REPAY')
  ) {
    return 'INTEREST';
  }

  // Rewards & bonuses (type: 26, 27, 28, 48 or subTypes 180-183)
  if (
    ['26', '27', '28', '48'].includes(typeCode) ||
    ['180', '181', '182', '183'].includes(subTypeCode) ||
    transType.includes('AIRDROP') ||
    transType.includes('REWARD') ||
    transType.includes('BONUS') ||
    transSubType.includes('AIRDROP') ||
    transSubType.includes('REWARD') ||
    transSubType.includes('BONUS')
  ) {
    return 'REWARDS';
  }

  // Delivery (type: 3 or subTypes 113-116)
  if (
    typeCode === '3' ||
    ['113', '114', '115', '116'].includes(subTypeCode) ||
    transType.includes('DELIVERY') ||
    transSubType.includes('DELIVERY') ||
    transType.includes('EXERCISE')
  ) {
    return 'DELIVERY';
  }

  return 'OTHERS';
}

/**
 * Universal matcher for filtering transactions
 */
export function matchUniversalTxType(
  exchange: 'bybit' | 'bitget' | 'okx',
  entry: any,
  filterType: string
): boolean {
  if (!filterType || filterType.toUpperCase() === 'ALL') return true;

  let resolvedUniversal: UniversalTxType;

  if (exchange === 'bybit') {
    resolvedUniversal = getBybitUniversalType(entry.type, entry.funding ?? entry.fundingFee);
  } else if (exchange === 'bitget') {
    resolvedUniversal = getBitgetUniversalType(entry.type, entry.funding ?? entry.fundingFee);
  } else {
    resolvedUniversal = getOkxUniversalType(entry);
  }

  return resolvedUniversal === filterType;
}

/**
 * Resolves the universal type and returns corresponding badge configuration
 */
export function getUniversalBadge(
  exchange: 'bybit' | 'bitget' | 'okx',
  entry: any
): UniversalBadgeConfig & { universalType: UniversalTxType } {
  let universalType: UniversalTxType;

  if (exchange === 'bybit') {
    universalType = getBybitUniversalType(entry.type, entry.funding ?? entry.fundingFee);
  } else if (exchange === 'bitget') {
    universalType = getBitgetUniversalType(entry.type, entry.funding ?? entry.fundingFee);
  } else {
    universalType = getOkxUniversalType(entry);
  }

  const badgeStyle = UNIVERSAL_BADGE_STYLE[universalType] || UNIVERSAL_BADGE_STYLE.OTHERS;

  return {
    ...badgeStyle,
    universalType
  };
}
