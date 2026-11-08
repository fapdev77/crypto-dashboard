import React, { useMemo } from 'react';
import { FilterBar } from '../../ui/FilterBar';
import type { PortfolioPerformanceFilters as FilterConfig } from '../../../hooks/usePortfolioPerformance';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { CoinIcon } from '../../ui/CoinIcon';
import { DollarSign, Layers } from 'lucide-react';
import { TIME_PERIOD_OPTIONS } from '../../../utils/dateTimeHelper';

interface Props {
  filters: FilterConfig;
  setFilters?: React.Dispatch<React.SetStateAction<FilterConfig>>;
  onFilterChange?: (filters: FilterConfig | ((prev: FilterConfig) => FilterConfig)) => void;
  availableCurrencies: string[];
}

export function PortfolioPerformanceFilters({ filters, setFilters, onFilterChange, availableCurrencies }: Props) {
  const updateFilters = onFilterChange || setFilters || (() => {});
  const { keys } = useApiKeysStore();
  const useMockData = useSettingsStore(state => state.useMockData);

  const exchangeOptions = useMemo(() => {
    if (useMockData) return ['bybit', 'bitget', 'okx'];
    const exchs = new Set<string>();
    keys.filter(k => k.isActive).forEach(k => exchs.add(k.exchange.toLowerCase()));
    return Array.from(exchs);
  }, [keys, useMockData]);

  const accountOptions = useMemo(() => {
    if (useMockData) {
      return [
        { id: 'mock-bybit', label: 'Bybit Demo Account', exchange: 'bybit' },
        { id: 'mock-bitget', label: 'Bitget Demo Account', exchange: 'bitget' },
        { id: 'mock-okx', label: 'OKX Demo Account', exchange: 'okx' },
      ].filter(a => filters.exchange.toLowerCase() === 'all' || a.exchange === filters.exchange.toLowerCase());
    }

    return keys
      .filter(k => k.isActive && (filters.exchange.toLowerCase() === 'all' || k.exchange.toLowerCase() === filters.exchange.toLowerCase()))
      .map(k => ({
        id: k.id,
        label: k.label || k.exchange,
        exchange: k.exchange.toLowerCase(),
        accountType: k.accountType,
      }));
  }, [keys, useMockData, filters.exchange]);

  // Denomination options: Consolidated USD + All tracked assets
  const denominationOptions = useMemo(() => {
    const list = [
      {
        value: 'USD',
        label: 'Consolidated (USD)',
        icon: <DollarSign className="w-4 h-4 text-[#00C853]" />,
        tooltip: 'Convert all performance metrics into USD equivalent',
      },
    ];

    availableCurrencies.forEach(c => {
      list.push({
        value: c,
        label: `${c} Native`,
        icon: <CoinIcon symbol={c} size={16} />,
        tooltip: `Measure returns in pure ${c} units (as in Hedge Pro BTC)`,
      });
    });

    return list;
  }, [availableCurrencies]);

  return (
    <div className="flex flex-col gap-3">
      <FilterBar
        exchange={{
          value: filters.exchange,
          onChange: (val) => updateFilters(p => ({ ...p, exchange: val, accountId: 'All' })),
          options: exchangeOptions,
          labelAll: 'All Exchanges',
          tooltip: 'Filter performance metrics by exchange venue',
        }}
        account={{
          value: filters.accountId,
          onChange: (val) => updateFilters(p => ({ ...p, accountId: val })),
          options: accountOptions,
          labelAll: 'All Accounts',
          tooltip: 'Filter by specific trading account',
        }}
        side={{
          value: filters.denomination,
          onChange: (val) => {
            // Intelligent step default when switching denomination
            let defaultStep = 2500;
            if (val === 'ETH') defaultStep = 100;
            else if (val === 'SOL') defaultStep = 5;
            else if (val === 'USDT' || val === 'USD') defaultStep = 2500;
            updateFilters(p => ({ ...p, denomination: val, milestoneStep: defaultStep }));
          },
          options: denominationOptions,
          labelAll: 'Select Denomination',
          tooltip: 'Select measurement currency: Consolidated USD or specific asset',
        }}
        period={{
          value: String(filters.timePeriod),
          onChange: (val) => updateFilters(p => ({
            ...p,
            timePeriod: val,
            customStartDate: val === 'custom' ? p.customStartDate : undefined,
            customEndDate: val === 'custom' ? p.customEndDate : undefined,
          })),
          options: TIME_PERIOD_OPTIONS.map(tp => ({ value: tp.value, label: tp.label, tooltip: tp.tooltip, isCustom: tp.isCustom })),
          customStartDate: filters.customStartDate,
          customEndDate: filters.customEndDate,
          onCustomDateChange: (start, end) => updateFilters(p => ({
            ...p,
            timePeriod: 'custom',
            customStartDate: start,
            customEndDate: end,
          })),
          tooltip: 'Evaluation time window',
        }}
      />
    </div>
  );
}

export const PortfolioPerformanceFiltersBar = PortfolioPerformanceFilters;
