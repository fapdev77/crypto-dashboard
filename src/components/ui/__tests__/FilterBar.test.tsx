import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilterBar } from '../FilterBar';
import { TooltipProvider } from '../Tooltip';
import { DEFAULT_TIME_PERIOD_MS } from '../../../utils/dateTimeHelper';
import i18n from '../../../i18n/config';

function FilterBarHarness({
  onPeriodSpy,
  onCustomSpy,
}: {
  onPeriodSpy?: (val: string) => void;
  onCustomSpy?: (start: string, end: string) => void;
}) {
  const [period, setPeriod] = useState<string>(String(DEFAULT_TIME_PERIOD_MS));
  const [customStartDate, setCustomStartDate] = useState<string | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<string | undefined>(undefined);

  return (
    <TooltipProvider>
      <FilterBar
        period={{
          value: period,
          onChange: (val) => {
            setPeriod(val);
            onPeriodSpy?.(val);
            if (val !== 'custom') {
              setCustomStartDate(undefined);
              setCustomEndDate(undefined);
            }
          },
          customStartDate,
          customEndDate,
          onCustomDateChange: (start, end) => {
            setCustomStartDate(start);
            setCustomEndDate(end);
            setPeriod('custom');
            onCustomSpy?.(start, end);
          },
        }}
      />
    </TooltipProvider>
  );
}

describe('FilterBar period selector', () => {
  beforeEach(() => {
    i18n.changeLanguage('en-US');
  });

  it('renders all 12 standardized chronological period options in en-US and uses semantic accent tokens', () => {
    render(<FilterBarHarness />);

    const trigger = screen.getByRole('button', { name: /7 Days/i });
    fireEvent.click(trigger);

    const expectedLabels = [
      'Today',
      '7 Days',
      '14 Days',
      '30 Days',
      '90 Days',
      '120 Days',
      '6 Months',
      '1 Year',
      'MTD',
      'YTD',
      'Custom Range...',
      'All Time',
    ];

    expectedLabels.forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('opens CustomDateRangeModal, applies dates, shows YYYY-MM-DD ~ YYYY-MM-DD badge and localized Edit tag', () => {
    const onPeriodSpy = vi.fn();
    const onCustomSpy = vi.fn();
    render(<FilterBarHarness onPeriodSpy={onPeriodSpy} onCustomSpy={onCustomSpy} />);

    fireEvent.click(screen.getByRole('button', { name: /7 Days/i }));
    fireEvent.click(screen.getByText('Custom Range...'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2026-04-01' } });
    fireEvent.change(screen.getByLabelText(/End Date/i), { target: { value: '2026-04-15' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply Range/i }));

    expect(onCustomSpy).toHaveBeenCalledWith('2026-04-01', '2026-04-15');
    expect(onPeriodSpy).toHaveBeenCalledWith('custom');

    const activeTrigger = screen.getByRole('button', { name: /2026-04-01 ~ 2026-04-15/i });
    expect(activeTrigger).toBeInTheDocument();
    expect(activeTrigger.innerHTML).toContain('text-accent');
    expect(activeTrigger.innerHTML).not.toContain('text-blue-400');

    // Reopen dropdown and check localized Edit label
    fireEvent.click(activeTrigger);
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('renders localized period labels and Edit badge in pt-BR', () => {
    i18n.changeLanguage('pt-BR');
    render(<FilterBarHarness />);

    fireEvent.click(screen.getByRole('button', { name: /7 Dias/i }));
    expect(screen.getByText('Hoje')).toBeInTheDocument();
    expect(screen.getByText('Intervalo personalizado...')).toBeInTheDocument();
    expect(screen.getByText('Todo o período')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Intervalo personalizado...'));
    fireEvent.change(screen.getByLabelText(/Data Inicial/i), { target: { value: '2026-04-01' } });
    fireEvent.change(screen.getByLabelText(/Data Final/i), { target: { value: '2026-04-15' } });
    fireEvent.click(screen.getByRole('button', { name: /Aplicar Período/i }));

    fireEvent.click(screen.getByRole('button', { name: /2026-04-01 ~ 2026-04-15/i }));
    expect(screen.getByText('Editar')).toBeInTheDocument();
  });
});
