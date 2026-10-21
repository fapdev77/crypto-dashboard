import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VaultSetupNoticeModal } from '../VaultSetupNoticeModal';
import { useSettingsStore } from '../../store/settingsStore';

describe('VaultSetupNoticeModal', () => {
  const onClose = vi.fn();
  const onConfigureNow = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({ showVaultSetupNoticeOnStartup: true });
  });

  it('renders nothing when isOpen is false', () => {
    render(<VaultSetupNoticeModal isOpen={false} onClose={onClose} onConfigureNow={onConfigureNow} />);
    expect(screen.queryByText(/Cofre Local Não Inicializado/i)).toBeNull();
  });

  it('renders notice modal with countdown and message when isOpen is true', () => {
    render(<VaultSetupNoticeModal isOpen={true} onClose={onClose} onConfigureNow={onConfigureNow} />);
    expect(screen.getByText(/Cofre Local Não Inicializado/i)).toBeInTheDocument();
    expect(screen.getByText(/PBKDF2 600k iterações/i)).toBeInTheDocument();
    expect(screen.getByText('5s')).toBeInTheDocument();
  });

  it('triggers onConfigureNow and onClose when clicking Configurar Cofre Agora', () => {
    render(<VaultSetupNoticeModal isOpen={true} onClose={onClose} onConfigureNow={onConfigureNow} />);
    const configureBtn = screen.getByRole('button', { name: /Configurar Cofre Agora/i });
    fireEvent.click(configureBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfigureNow).toHaveBeenCalledTimes(1);
  });

  it('triggers onClose when clicking Dispensar', () => {
    render(<VaultSetupNoticeModal isOpen={true} onClose={onClose} onConfigureNow={onConfigureNow} />);
    const dismissBtn = screen.getByRole('button', { name: /Dispensar/i });
    fireEvent.click(dismissBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows toggling showVaultSetupNoticeOnStartup', () => {
    render(<VaultSetupNoticeModal isOpen={true} onClose={onClose} onConfigureNow={onConfigureNow} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(useSettingsStore.getState().showVaultSetupNoticeOnStartup).toBe(false);
  });

  it('counts down and auto-closes after 5 seconds', () => {
    vi.useFakeTimers();
    render(<VaultSetupNoticeModal isOpen={true} onClose={onClose} onConfigureNow={onConfigureNow} />);

    expect(screen.getByText('5s')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('3s')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
