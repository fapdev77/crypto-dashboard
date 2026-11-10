import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import i18n from '../../i18n/config';
import { Settings } from '../Settings';
import { IndexedDBCacheCard } from '../IndexedDBCacheCard';
import { TooltipProvider } from '../ui/Tooltip';
import { PrivacyProvider } from '../../context/PrivacyContext';

vi.mock('../SecurityBackupCard', () => ({
  SecurityBackupCard: () => <div data-testid="security-backup-card">Security Backup Card</div>,
}));

vi.mock('../VersionInfoCard', () => ({
  VersionInfoCard: () => <div data-testid="version-info-card">Version Info Card</div>,
}));

vi.mock('../sync/FundingSyncTimingPanel', () => ({
  FundingSyncTimingPanel: () => <div data-testid="funding-sync-timing-panel">Funding Sync Timing Panel</div>,
}));

vi.mock('../currency/CurrencyApiDiagnostics', () => ({
  CurrencyApiDiagnostics: () => <div data-testid="currency-api-diagnostics">Currency API Diagnostics</div>,
}));

vi.mock('../../services/unifiedSync', () => ({
  UnifiedSyncManager: {
    syncFullApplication: vi.fn(),
    clearAndResyncAll: vi.fn(),
    syncAllTransactions: vi.fn().mockResolvedValue({ total: 10, bybit: 5, bitget: 3, okx: 2, elapsedSeconds: '0.4' }),
    clearAndResyncTransactions: vi.fn(),
  },
}));

vi.mock('../../services/indexedDBHealth', () => ({
  checkIndexedDBHealth: vi.fn().mockResolvedValue({ status: 'healthy', version: 12 }),
  recoverAndResetIndexedDB: vi.fn(),
}));

describe('Settings Internationalization (i18n)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('pt-BR');
  });

  it('renders Settings Preferences & Testing section in Portuguese (pt-BR)', async () => {
    await i18n.changeLanguage('pt-BR');
    render(
      <TooltipProvider>
        <PrivacyProvider>
          <Settings />
        </PrivacyProvider>
      </TooltipProvider>
    );

    expect(screen.getByText(/Preferências & Testes/i)).toBeInTheDocument();
    expect(screen.getByText(/Modo Simulação \(Dados Mockados\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Exibir Guia de Introdução/i)).toBeInTheDocument();
    expect(screen.getByText(/Especificações das Exchanges/i)).toBeInTheDocument();
    expect(screen.getByText(/Zona de Perigo/i)).toBeInTheDocument();
    expect(screen.getByText(/Apagar Todos os Dados Locais do Cliente/i)).toBeInTheDocument();
  });

  it('renders IndexedDBCacheCard in Portuguese (pt-BR) with sliders, TTL and Pruning localized', async () => {
    await i18n.changeLanguage('pt-BR');
    render(
      <TooltipProvider>
        <PrivacyProvider>
          <IndexedDBCacheCard />
        </PrivacyProvider>
      </TooltipProvider>
    );

    expect(screen.getByText(/Mecanismo de Armazenamento IndexedDB/i)).toBeInTheDocument();
    expect(screen.getByText(/Atualização do Histórico em Segundo Plano/i)).toBeInTheDocument();
    expect(screen.getByText(/TTL dos Metadados de Ativos/i)).toBeInTheDocument();
    expect(screen.getByText(/Retenção de Dados & Poda de Histórico/i)).toBeInTheDocument();
    expect(screen.getByText(/Podar Histórico/i)).toBeInTheDocument();
    expect(screen.getByText(/Forçar Sincronização Geral/i)).toBeInTheDocument();
    expect(screen.getByText(/Limpar Todo o Cache/i)).toBeInTheDocument();
    expect(screen.getByText(/Recriar Banco de Dados/i)).toBeInTheDocument();
  });

  it('switches Settings to English (en-US) seamlessly', async () => {
    await i18n.changeLanguage('en-US');
    render(
      <TooltipProvider>
        <PrivacyProvider>
          <Settings />
        </PrivacyProvider>
      </TooltipProvider>
    );

    expect(screen.getByText(/Preferences & Testing/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulation Mode \(Mock Data\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Show Onboarding Guide/i)).toBeInTheDocument();
    expect(screen.getByText(/Exchange Specifications/i)).toBeInTheDocument();
    expect(screen.getByText(/Danger Zone/i)).toBeInTheDocument();
  });

  it('switches IndexedDBCacheCard to English (en-US) with correct labels', async () => {
    await i18n.changeLanguage('en-US');
    render(
      <TooltipProvider>
        <PrivacyProvider>
          <IndexedDBCacheCard />
        </PrivacyProvider>
      </TooltipProvider>
    );

    expect(screen.getByText(/History Background Refresh/i)).toBeInTheDocument();
    expect(screen.getByText(/Asset Metadata TTL/i)).toBeInTheDocument();
    expect(screen.getByText(/Data Retention & History Pruning/i)).toBeInTheDocument();
    expect(screen.getByText(/Force Sync All/i)).toBeInTheDocument();
    expect(screen.getByText(/Clear All Cache/i)).toBeInTheDocument();
  });
});
