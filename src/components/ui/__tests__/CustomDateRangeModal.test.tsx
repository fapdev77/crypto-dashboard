import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { CustomDateRangeModal } from '../CustomDateRangeModal';
import '../../../i18n/config'; // Ensure i18n is initialized

describe('CustomDateRangeModal Component', () => {
  it('renders modal when open and displays localized elements', () => {
    const handleClose = vi.fn();
    const handleApply = vi.fn();

    render(
      <CustomDateRangeModal
        isOpen={true}
        onClose={handleClose}
        onApply={handleApply}
        initialStartDate="2026-03-01"
        initialEndDate="2026-03-15"
      />
    );

    // Verify header and preview are rendered
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/2026-03-01/)).toBeInTheDocument();
    expect(screen.getByText(/2026-03-15/)).toBeInTheDocument();
  });

  it('preserves exact ISO YYYY-MM-DD date format when onApply is called', () => {
    const handleClose = vi.fn();
    const handleApply = vi.fn();

    render(
      <CustomDateRangeModal
        isOpen={true}
        onClose={handleClose}
        onApply={handleApply}
        initialStartDate="2026-01-10"
        initialEndDate="2026-01-20"
      />
    );

    // Click apply button
    const applyButton = screen.getByRole('button', { name: /apply range|aplicar período|aplicar rango|applica intervallo/i });
    fireEvent.click(applyButton);

    // Verify that the callback receives EXACT ISO strings without locale disruption
    expect(handleApply).toHaveBeenCalledWith('2026-01-10', '2026-01-20');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('validates that start date cannot be after end date', () => {
    const handleClose = vi.fn();
    const handleApply = vi.fn();

    render(
      <CustomDateRangeModal
        isOpen={true}
        onClose={handleClose}
        onApply={handleApply}
        initialStartDate="2026-05-20"
        initialEndDate="2026-05-10"
      />
    );

    // Apply button should be disabled when range is invalid
    const applyButton = screen.getByRole('button', { name: /apply range|aplicar período|aplicar rango|applica intervallo/i });
    expect(applyButton).toBeDisabled();

    fireEvent.click(applyButton);
    expect(handleApply).not.toHaveBeenCalled();
  });

  it('applies quick preset with valid ISO formatted dates', () => {
    const handleClose = vi.fn();
    const handleApply = vi.fn();

    render(
      <CustomDateRangeModal
        isOpen={true}
        onClose={handleClose}
        onApply={handleApply}
      />
    );

    // Click 'Last 7 Days' preset
    const presetBtn = screen.getByRole('button', { name: /last 7 days|últimos 7 dias|últimos 7 días|ultimi 7 giorni/i });
    fireEvent.click(presetBtn);

    const applyButton = screen.getByRole('button', { name: /apply range|aplicar período|aplicar rango|applica intervallo/i });
    fireEvent.click(applyButton);

    expect(handleApply).toHaveBeenCalledTimes(1);
    const [startArg, endArg] = handleApply.mock.calls[0];
    // Must match YYYY-MM-DD ISO format regex
    expect(startArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(endArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
