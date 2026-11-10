import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

interface MissingRatesNoticeProps {
  /** Currencies that were left out of the USD totals because no price was available. */
  currencies: string[];
  className?: string;
}

/**
 * Same wording as the on-screen notice, as a single line for exported file headers.
 * Returns undefined when every currency had a price.
 */
export function missingRatesNote(t: TFunction, currencies: string[]): string | undefined {
  if (!currencies || currencies.length === 0) return undefined;
  const title = t('transactions.common.missingRatesTitle', 'Incomplete USD totals');
  const text = t('transactions.common.missingRatesText', {
    currencies: currencies.join(', '),
    defaultValue: 'No USD price found for {{currencies}} — these assets are excluded from the totals.',
  });
  return `${title}: ${text}`;
}

/**
 * Tells the user which currencies are missing a USD price, so a USD total that
 * silently ignored them is never presented as complete.
 */
export function MissingRatesNotice({ currencies, className = '' }: MissingRatesNoticeProps) {
  const { t } = useTranslation();
  if (!currencies || currencies.length === 0) return null;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-[#FF9C2E]/40 bg-[#FF9C2E]/10 px-3 py-2 text-[11px] leading-relaxed text-[#FF9C2E] ${className}`}
      role="status"
    >
      <AlertTriangle className="mt-[1px] h-3.5 w-3.5 shrink-0" />
      <span>
        <span className="font-semibold">
          {t('transactions.common.missingRatesTitle', 'Incomplete USD totals')}
        </span>{' '}
        {t('transactions.common.missingRatesText', {
          currencies: currencies.join(', '),
          defaultValue: 'No USD price found for {{currencies}} — these assets are excluded from the totals.',
        })}
      </span>
    </div>
  );
}
