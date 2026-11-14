import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FilterBar } from '../../ui/FilterBar';
import type { PortfolioPerformanceFilters as FilterConfig } from '../../../hooks/usePortfolioPerformance';
import { useApiKeysStore } from '../../../store/apiKeysStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { CoinIcon } from '../../ui/CoinIcon';
import { DollarSign } from 'lucide-react';
import { TIME_PERIOD_OPTIONS } from '../../../utils/dateTimeHelper';
import { getDefaultMilestoneStepForAsset } from '../../../utils/portfolioPerformanceEngine';
import mockAccounts from '../../../mock/accounts.json';

interface Props {
  filters: FilterConfig;
  setFilters?: React.Dispatch<React.SetStateAction<FilterConfig>>;
  onFilterChange?: (filters: FilterConfig | ((prev: FilterConfig) => FilterConfig)) => void;
  onUserDenominationChange?: (denomination: string) => void;
  availableCurrencies: string[];
}

export function PortfolioPerformanceFilters({
  filters,
  setFilters,
  onFilterChange,
  onUserDenominationChange,
  availableCurrencies,
}: Props) {
  const { t } = useTranslation();
  const updateFilters = onFilterChange || setFilters || (() => {});
  const { keys } = useApiKeysStore();
  const useMockData = useSettingsStore((state) => state.useMockData);

  const exchangeOptions = useMemo(() => {
    if (useMockData) return ['bybit', 'bitget', 'okx'];
    const exchs = new Set<string>();
    keys
      .filter((k) => k.isActive)
      .forEach((k) => exchs.add(k.exchange.toLowerCase()));
    return Array.from(exchs);
  }, [keys, useMockData]);

  const accountOptions = useMemo(() => {
    if (useMockData) {
      return mockAccounts
        .map((a) => ({
          id: a.connectionId,
          label: a.label,
          exchange: a.exchange.toLowerCase(),
        }))
        .filter((a) => filters.exchange.toLowerCase() === 'all' || a.exchange === filters.exchange.toLowerCase());
    }

    return keys
      .filter(
        (k) =>
          k.isActive &&
          (filters.exchange.toLowerCase() === 'all' || k.exchange.toLowerCase() === filters.exchange.toLowerCase())
      )
      .map((k) => ({
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
        label: t('analytics.portfolio.consolidatedUsd', 'Consolidated (USD)'),
        icon: <DollarSign className="w-4 h-4 text-success" />,
        tooltip: t('analytics.portfolio.consolidatedUsdTooltip', 'Convert all performance metrics into USD equivalent'),
      },
    ];

    availableCurrencies.forEach((c) => {
      list.push({
        value: c,
        label: t('analytics.portfolio.nativeAsset', '{{asset}} Native', { asset: c }),
        icon: <CoinIcon symbol={c} size={16} />,
        tooltip: t(
          'analytics.portfolio.nativeAssetTooltip',
          'Measure returns in pure {{asset}} units (as in Hedge Pro BTC)',
          { asset: c }
        ),
      });
    });

    return list;
  }, [availableCurrencies, t]);

  return (
    <div className="flex flex-col gap-3">
      <FilterBar
        exchange={{
          value: filters.exchange,
          onChange: (val) => updateFilters((p) => ({ ...p, exchange: val, accountId: 'All' })),
          options: exchangeOptions,
          labelAll: t('analytics.common.allExchanges', 'All Exchanges'),
          tooltip: 'Filter performance metrics by exchange venue',
        }}
        account={{
          value: filters.accountId,
          onChange: (val) => updateFilters((p) => ({ ...p, accountId: val })),
          options: accountOptions,
          labelAll: t('analytics.common.allAccounts', 'All Accounts'),
          tooltip: 'Filter by specific trading account',
        }}
        side={{
          value: filters.denomination,
          onChange: (val) => {
            const nextAsset = val !== 'USD' && val !== 'USDT' && val !== 'USDC' ? val : 'BTC';
            const defaultStep = getDefaultMilestoneStepForAsset(nextAsset);
            onUserDenominationChange?.(val);
            updateFilters((p) => ({
              ...p,
              denomination: val,
              milestoneAsset: val !== 'USD' && val !== 'USDT' && val !== 'USDC' ? val : p.milestoneAsset,
              milestoneStep: defaultStep,
            }));
          },
          options: denominationOptions,
          labelAll: t('analytics.common.selectDenomination', 'Select Denomination'),
          tooltip: 'Select measurement currency: Consolidated USD or specific asset',
        }}
        period={{
          value: String(filters.timePeriod),
          onChange: (val) =>
            updateFilters((p) => ({
              ...p,
              timePeriod: val,
              customStartDate: val === 'custom' ? p.customStartDate : undefined,
              customEndDate: val === 'custom' ? p.customEndDate : undefined,
            })),
          options: TIME_PERIOD_OPTIONS.map((tp) => ({
            value: tp.value,
            label: tp.label,
            tooltip: tp.tooltip,
            isCustom: tp.isCustom,
          })),
          customStartDate: filters.customStartDate,
          customEndDate: filters.customEndDate,
          onCustomDateChange: (start, end) =>
            updateFilters((p) => ({
              ...p,
              timePeriod: 'custom',
              customStartDate: start,
              customEndDate: end,
            })),
          tooltip: 'Evaluation time window (UTC)',
        }}
      />
    </div>
  );
}

export const PortfolioPerformanceFiltersBar = PortfolioPerformanceFilters;
