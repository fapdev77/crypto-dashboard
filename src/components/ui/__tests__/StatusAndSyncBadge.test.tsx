import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusAndSyncBadge } from '../StatusAndSyncBadge';
import { useSettingsStore } from '../../../store/settingsStore';
import { TooltipProvider } from '../Tooltip';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

describe('StatusAndSyncBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({
      historyCacheInterval: 5,
      historyCacheVersion: 1,
      lastSyncTime: 1710000000000,
      cooldownEnd: 0,
      useMockData: false,
    });
  });

  it('renders "Up to Date" status when there is no error and not syncing', () => {
    renderWithProvider(<StatusAndSyncBadge isSyncing={false} />);
    expect(screen.getByText('Up to Date')).toBeDefined();
  });

  it('renders "Syncing..." status when isSyncing is true', () => {
    renderWithProvider(<StatusAndSyncBadge isSyncing={true} syncMessage="Syncing positions..." />);
    expect(screen.getByText('Syncing positions...')).toBeDefined();
  });

  it('renders as a clickable button with aria-label when syncError is present', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    renderWithProvider(<StatusAndSyncBadge isSyncing={false} syncError="Rate limit exceeded (429)" />);

    const badgeButton = screen.getByRole('button', { name: /view sync error details in connection logs/i });
    expect(badgeButton).toBeDefined();
    expect(screen.getByText('Sync Warning')).toBeDefined();

    fireEvent.click(badgeButton);

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const dispatchedEvent = dispatchSpy.mock.calls[0][0] as CustomEvent;
    expect(dispatchedEvent.type).toBe('navigate-to-tab');
    expect(dispatchedEvent.detail).toBe('logs');
    dispatchSpy.mockRestore();
  });

  it('calls custom onErrorClick when provided and clicked in error state', () => {
    const onErrorClick = vi.fn();
    renderWithProvider(<StatusAndSyncBadge isSyncing={false} syncError="Bybit auth failed" onErrorClick={onErrorClick} />);

    const badgeButton = screen.getByRole('button', { name: /view sync error details in connection logs/i });
    fireEvent.click(badgeButton);

    expect(onErrorClick).toHaveBeenCalledTimes(1);
  });
});
