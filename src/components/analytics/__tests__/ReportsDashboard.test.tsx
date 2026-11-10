import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { ReportsDashboard } from '../ReportsDashboard';
import '../../../i18n/config';

import { PrivacyProvider } from '../../../context/PrivacyContext';

import { TooltipProvider } from '@radix-ui/react-tooltip';

// Mock hook
vi.mock('../../../hooks/usePositionHistory', () => ({
  usePositionHistory: () => ({
    positions: [],
    isLoading: false,
  }),
}));

describe('ReportsDashboard Component', () => {
  it('renders the reports header and export dropdown button', () => {
    render(
      <TooltipProvider>
        <PrivacyProvider>
          <ReportsDashboard />
        </PrivacyProvider>
      </TooltipProvider>
    );

    expect(screen.getByText(/reports & exports|relatórios e exportações/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export|exportar/i })).toBeInTheDocument();
  });
});
