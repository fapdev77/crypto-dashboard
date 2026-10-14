import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { useApiKeysStore, ApiCredentials } from '../../store/apiKeysStore';
import { useSettingsStore } from '../../store/settingsStore';

function apiKey(exchange: 'bybit' | 'bitget' | 'okx', isActive = true): ApiCredentials {
  return {
    id: `key-${exchange}`,
    label: `${exchange} key`,
    exchange,
    apiKey: 'api-key',
    apiSecret: 'api-secret',
    isActive,
  };
}

function renderSidebar(activeTab = 'dashboard') {
  return render(<Sidebar activeTab={activeTab} setActiveTab={() => {}} isCollapsed={false} />);
}

beforeEach(() => {
  useSettingsStore.setState({ useMockData: false });
  useApiKeysStore.setState({ keys: [] });
});

describe('Sidebar Transactions History group', () => {
  it('lists only the exchange with an active API key', () => {
    useApiKeysStore.setState({ keys: [apiKey('bybit')] });

    renderSidebar('transactions-history-bybit');

    expect(screen.getByText('Transactions History')).toBeDefined();
    expect(screen.getByText('Bybit Transactions')).toBeDefined();
    expect(screen.queryByText('Bitget Transactions')).toBeNull();
    expect(screen.queryByText('OKX Transactions')).toBeNull();
  });

  it('ignores inactive API keys', () => {
    useApiKeysStore.setState({ keys: [apiKey('bybit'), apiKey('bitget', false)] });

    renderSidebar('transactions-history-bybit');

    expect(screen.getByText('Bybit Transactions')).toBeDefined();
    expect(screen.queryByText('Bitget Transactions')).toBeNull();
  });

  it('hides the group entirely when no exchange holds an active key', () => {
    renderSidebar();

    expect(screen.queryByText('Transactions History')).toBeNull();
    expect(screen.queryByText('Bybit Transactions')).toBeNull();
  });

  it('exposes all three exchanges in Simulation Mode, which ships mock logs for each', () => {
    useSettingsStore.setState({ useMockData: true });

    renderSidebar('transactions-history-okx');

    expect(screen.getByText('Bybit Transactions')).toBeDefined();
    expect(screen.getByText('Bitget Transactions')).toBeDefined();
    expect(screen.getByText('OKX Transactions')).toBeDefined();
  });

  it('no longer lists the transaction pages under Analytics', () => {
    useApiKeysStore.setState({ keys: [apiKey('bybit'), apiKey('bitget'), apiKey('okx')] });

    renderSidebar('analytics-pnl-symbol');

    expect(screen.getByText('Market Analytics')).toBeDefined();
    expect(screen.queryByText('Bybit Transactions')).toBeNull();
    expect(screen.queryByText('Bitget Transactions')).toBeNull();
    expect(screen.queryByText('OKX Transactions')).toBeNull();
  });
});
