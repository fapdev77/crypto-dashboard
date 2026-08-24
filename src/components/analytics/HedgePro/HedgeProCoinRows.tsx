import React, { useState } from 'react';
import { HedgeCoinSummary } from '../../../utils/hedgeUtils';
import { HedgeProCoinRow } from './HedgeProCoinRow';
import { usePagination } from '../../../hooks/usePagination';
import { Pagination } from '../../ui/Pagination';

interface HedgeProCoinRowsProps {
  summaries: HedgeCoinSummary[];
  formatCurrency: (value: number | undefined | null, type?: 'usd' | 'crypto' | 'price' | 'compact', decimalsOrSymbol?: number | string) => string;
  itemsPerPage?: number;
}

/**
 * HedgeProCoinRows — Row-based list of coins matching the Open Orders table pattern.
 */
export function HedgeProCoinRows({
  summaries,
  formatCurrency,
  itemsPerPage = 25,
}: HedgeProCoinRowsProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const { page, setPage, paginated, totalItems } = usePagination(
    summaries,
    itemsPerPage,
    [summaries]
  );

  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-[#151619] border border-[#2a2b30] rounded-xl flex-1 text-center">
        <p className="text-[#8E9299] text-sm">No inverse coin positions found matching the current filters.</p>
      </div>
    );
  }

  const handleToggle = (key: string) => {
    setExpandedKey(prev => (prev === key ? null : key));
  };

  return (
    <div className="flex flex-col gap-3 flex-1 pb-2">
      {paginated.map(coin => (
        <HedgeProCoinRow
          key={coin.key}
          coin={coin}
          isExpanded={expandedKey === coin.key}
          onToggle={() => handleToggle(coin.key)}
          formatCurrency={formatCurrency}
        />
      ))}

      {totalItems > itemsPerPage && (
        <Pagination
          currentPage={page}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

export default HedgeProCoinRows;
