import React, { useMemo } from 'react';
import { OrderFilters as FilterState } from '../../../hooks/useOrderReports';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { FilterBar } from '../../ui/FilterBar';

interface Props {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  showPeriod?: boolean;
  showStatusFilter?: boolean;
}

const ORDER_TYPES = ['All', 'LIMIT', 'MARKET', 'TP', 'SL', 'CONDITIONAL'];
const STATUS_OPTIONS = ['All', 'FILLED', 'CANCELLED', 'PARTIALLY_FILLED', 'REJECTED'];
import { TIME_PERIOD_OPTIONS } from '../../../utils/dateTimeHelper';

export function OrderFilters({ filters, setFilters, showPeriod = false, showStatusFilter = false }: Props) {
  const { keys } = useApiKeysStore();

  const instrumentsAvailable = useMemo(() => {
    return ['All', 'PERP', 'INVERSE', 'SPOT', 'FUTURES', 'OPTION'];
  }, []);

  const activeKeys = useMemo(() => {
    return keys.filter(k => k.isActive && (filters.exchange === 'All' || k.exchange === filters.exchange));
  }, [keys, filters.exchange]);

  // Handle cross-exchange instrument reset
  React.useEffect(() => {
    if (filters.instrument !== 'All' && !instrumentsAvailable.includes(filters.instrument)) {
      setFilters(p => ({ ...p, instrument: 'All' }));
    }
    if (filters.exchange === 'All' && filters.accountId !== 'All') {
      setFilters(p => ({ ...p, accountId: 'All' }));
    } else if (filters.accountId !== 'All' && !activeKeys.some(k => k.id === filters.accountId)) {
      setFilters(p => ({ ...p, accountId: 'All' }));
    }
  }, [filters.exchange, filters.instrument, filters.accountId, instrumentsAvailable, activeKeys, setFilters]);

  const searchConfig = {
    value: filters.symbols,
    onChange: (val: string) => setFilters(p => ({ ...p, symbols: val })),
    placeholder: 'Search symbol...',
  };

  const exchangeConfig = {
    value: filters.exchange,
    onChange: (val: string) => setFilters(p => ({ ...p, exchange: val })),
    labelAll: 'All Exchanges',
  };

  const accountConfig = {
    value: filters.accountId,
    onChange: (val: string) => setFilters(p => ({ ...p, accountId: val })),
    options: activeKeys.map(k => ({ id: k.id, label: k.label || k.exchange, exchange: k.exchange, accountType: k.accountType })),
    disabled: filters.exchange === 'All',
    labelAll: 'All Accounts',
  };

  const instrumentConfig = {
    value: filters.instrument,
    onChange: (val: string) => setFilters(p => ({ ...p, instrument: val })),
    options: instrumentsAvailable,
    labelAll: 'All Instruments',
  };

  const sideConfig = {
    value: filters.side,
    onChange: (val: string) => setFilters(p => ({ ...p, side: val })),
    options: [
      { value: 'buy', label: 'Buy / Long' },
      { value: 'sell', label: 'Sell / Short' },
    ],
    labelAll: 'All Sides',
  };

  const typeConfig = {
    value: filters.type,
    onChange: (val: string) => setFilters(p => ({ ...p, type: val })),
    options: ORDER_TYPES,
    labelAll: 'All Types',
  };

  const statusSelectConfig = showStatusFilter
    ? {
        value: filters.historyStatus || 'All',
        onChange: (val: string) => setFilters(p => ({ ...p, historyStatus: val })),
        options: STATUS_OPTIONS,
        labelAll: 'All Statuses',
      }
    : undefined;

  const periodConfig = showPeriod
    ? {
        value: String(filters.timePeriod),
        onChange: (val: any) => setFilters(p => ({
          ...p,
          timePeriod: val,
          customStartDate: val === 'custom' ? p.customStartDate : undefined,
          customEndDate: val === 'custom' ? p.customEndDate : undefined,
        })),
        options: TIME_PERIOD_OPTIONS.map(tp => ({ value: tp.value, label: tp.label, tooltip: tp.tooltip, isCustom: tp.isCustom })),
        customStartDate: filters.customStartDate,
        customEndDate: filters.customEndDate,
        onCustomDateChange: (start: string, end: string) => setFilters(p => ({
          ...p,
          timePeriod: 'custom',
          customStartDate: start,
          customEndDate: end,
        })),
      }
    : undefined;

  return (
    <FilterBar
      search={searchConfig}
      exchange={exchangeConfig}
      account={accountConfig}
      instrument={instrumentConfig}
      side={sideConfig}
      type={typeConfig}
      statusSelect={statusSelectConfig}
      period={periodConfig}
    />
  );
}

