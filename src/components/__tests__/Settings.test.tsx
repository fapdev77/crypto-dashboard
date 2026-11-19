import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Settings } from '../Settings';
import '../../i18n/config';

vi.mock('../ui/Tooltip', () => ({
  AppTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../SecurityBackupCard', () => ({
  SecurityBackupCard: () => <div data-testid="security-backup-card">Security Backup Card</div>,
}));

vi.mock('../VersionInfoCard', () => ({
  VersionInfoCard: () => <div data-testid="version-info-card">Version Info Card</div>,
}));

vi.mock('../IndexedDBCacheCard', () => ({
  IndexedDBCacheCard: () => <div data-testid="indexeddb-cache-card">IndexedDB Cache Card</div>,
}));

vi.mock('../sync/FundingSyncTimingPanel', () => ({
  FundingSyncTimingPanel: () => <div data-testid="funding-sync-timing-panel">Funding Sync Timing Panel</div>,
}));

vi.mock('../currency/CurrencyApiDiagnostics', () => ({
  CurrencyApiDiagnostics: () => <div data-testid="currency-api-diagnostics">Currency API Diagnostics</div>,
}));

describe('Settings component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings title and subtitle correctly', () => {
    render(<Settings />);

    expect(screen.getByRole('heading', { level: 2, name: /Settings/i })).toBeInTheDocument();
    expect(screen.getByText(/Manage application preferences, cache and data/i)).toBeInTheDocument();
  });

  it('renders Language & Currency section', () => {
    render(<Settings />);

    expect(screen.getByText(/Language & Currency/i)).toBeInTheDocument();
    expect(screen.getByText(/Configure your display language/i)).toBeInTheDocument();
    expect(screen.getByText(/^Language$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Display Currency$/i)).toBeInTheDocument();
  });

  it('renders Preferences & Testing and Danger Zone sections', () => {
    render(<Settings />);

    expect(screen.getByText(/Preferences & Testing/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulation Mode \(Mock Data\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Danger Zone/i)).toBeInTheDocument();
    expect(screen.getByText(/Wipe All Local Client Data/i)).toBeInTheDocument();
  });
});
