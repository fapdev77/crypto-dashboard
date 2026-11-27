import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WelcomeHelpModal } from '../WelcomeHelpModal';
import { useSettingsStore } from '../../store/settingsStore';
import { useApiKeysStore } from '../../store/apiKeysStore';
import i18n, { detectSystemLocale, getInitialLocale } from '../../i18n/config';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../UserManualModal', () => ({
  UserManualModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="user-manual-modal">
        <span>Mock User Manual</span>
        <button type="button" onClick={onClose}>
          Close Manual
        </button>
      </div>
    ) : null,
}));

describe('WelcomeHelpModal (Onboarding Wizard)', () => {
  const onClose = vi.fn();
  const onNavigateToTab = vi.fn();
  const onConfigureVaultAndKey = vi.fn();
  const onActivateSimulation = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en-US');
    useSettingsStore.setState({
      locale: 'en-US',
      fiatCurrency: 'USD',
      fiatRates: { USD: 1, EUR: 0.92, GBP: 0.79, BRL: 5.5 },
      themeMode: 'dark',
      useMockData: false,
      showWelcomeOnStartup: true,
    });
    useApiKeysStore.setState({
      keys: [],
      isEncrypted: true,
      isInitialized: false,
      encryptedData: null,
      isUnlocked: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    render(<WelcomeHelpModal isOpen={false} onClose={onClose} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders Step 1 (Welcome) with a single User Manual button and jumps freely across all 6 steps', () => {
    render(<WelcomeHelpModal isOpen={true} onClose={onClose} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Your crypto portfolio in one local command center/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument();

    // Only the header User Manual button should exist (no duplicate inside Step 1)
    expect(screen.getAllByRole('button', { name: /User Manual/i })).toHaveLength(1);

    // Jump directly to Step 4 (Sidebar)
    fireEvent.click(screen.getByRole('button', { name: /4\s*Sidebar/i }));
    expect(screen.getByText(/Step 4 of 6/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore Sidebar modules by workflow/i)).toBeInTheDocument();

    // Jump back with Previous button to Step 3 (Dashboard)
    fireEvent.click(screen.getByRole('button', { name: /Previous/i }));
    expect(screen.getByText(/Step 3 of 6/i)).toBeInTheDocument();
    expect(screen.getByText(/Understand the Main Dashboard at a glance/i)).toBeInTheDocument();

    // Advance with Next button back to Step 4
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText(/Step 4 of 6/i)).toBeInTheDocument();
  });

  it('supports keyboard navigation (ArrowRight, ArrowLeft, Escape)', () => {
    render(<WelcomeHelpModal isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('detects system locale with en-US fallback and defaults to USD + dark theme', () => {
    const languagesSpy = vi.spyOn(window.navigator, 'languages', 'get');
    localStorage.removeItem('terminal-settings');

    languagesSpy.mockReturnValue(['pt-BR']);
    expect(detectSystemLocale()).toBe('pt-BR');
    expect(getInitialLocale()).toBe('pt-BR');

    languagesSpy.mockReturnValue(['pt-PT']);
    expect(detectSystemLocale()).toBe('pt-PT');

    languagesSpy.mockReturnValue(['es-MX']);
    expect(detectSystemLocale()).toBe('es-419');

    languagesSpy.mockReturnValue(['it-IT']);
    expect(detectSystemLocale()).toBe('it-IT');

    languagesSpy.mockReturnValue(['en-GB']);
    expect(detectSystemLocale()).toBe('en-GB');

    // Unsupported system language falls back to en-US
    languagesSpy.mockReturnValue(['fr-FR']);
    expect(detectSystemLocale()).toBe('en-US');

    expect(useSettingsStore.getState().fiatCurrency).toBe('USD');
    expect(useSettingsStore.getState().themeMode).toBe('dark');
  });

  it('keeps Step 2 language button strictly synced with displayed i18n language and updates preferences live', async () => {
    // Simulate a mismatch where i18n renders pt-BR while store temporarily had en-US
    await i18n.changeLanguage('pt-BR');
    useSettingsStore.setState({ locale: 'en-US' });

    render(<WelcomeHelpModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /2\s*Preferências/i }));

    const ptBrBtn = screen.getByRole('button', { name: /Português \(Brasil\)/i });
    const enUsBtn = screen.getByRole('button', { name: /English \(US\)/i });
    expect(ptBrBtn).toHaveAttribute('aria-pressed', 'true');
    expect(enUsBtn).toHaveAttribute('aria-pressed', 'false');

    // Switch back to English and test Theme / Currency live updates
    fireEvent.click(enUsBtn);
    expect(useSettingsStore.getState().locale).toBe('en-US');

    fireEvent.click(screen.getByRole('button', { name: /Wise Light/i }));
    expect(useSettingsStore.getState().themeMode).toBe('wise-light');

    fireEvent.click(screen.getByRole('button', { name: /BRL/i }));
    expect(useSettingsStore.getState().fiatCurrency).toBe('BRL');
  });

  it('auto-cycles Dashboard zones every 3s in Step 3 starting from Top Toolbar & Status Bar and stops on click', () => {
    vi.useFakeTimers();
    render(<WelcomeHelpModal isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /3\s*Dashboard/i }));

    const controlsBtn = screen.getByRole('button', { name: /Top Toolbar & Status Bar/i });
    const kpisBtn = screen.getByRole('button', { name: /Top 4 KPI Cards/i });
    const chartsBtn = screen.getByRole('button', { name: /Macro & Cross-Exchange Charts/i });
    const hierarchyBtn = screen.getByRole('button', { name: /Hierarchical Balance Table/i });

    // Top Toolbar & Status Bar is first, preserving order of the remaining cards
    expect(controlsBtn.compareDocumentPosition(kpisBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(kpisBtn.compareDocumentPosition(chartsBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(chartsBtn.compareDocumentPosition(hierarchyBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(controlsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(controlsBtn.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.getByText(/Auto-cycling every 3s/i)).toBeInTheDocument();

    // Advance 3 seconds -> cycles to Top 4 KPI Cards
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(kpisBtn).toHaveAttribute('aria-pressed', 'true');
    expect(kpisBtn.querySelector('.animate-spin')).toBeInTheDocument();
    expect(controlsBtn).toHaveAttribute('aria-pressed', 'false');

    // User clicks Hierarchical Balance Table -> selects it & stops auto-cycle
    fireEvent.click(hierarchyBtn);
    expect(hierarchyBtn).toHaveAttribute('aria-pressed', 'true');
    expect(hierarchyBtn.querySelector('.animate-spin')).toBeNull();
    expect(screen.getByText(/Auto-cycle paused/i)).toBeInTheDocument();

    // Advancing another 6s keeps user selection fixed
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(hierarchyBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('auto-cycles Sidebar modules every 3s in Step 4 with subtle spinner feedback, stops on click, and navigates to target tab', () => {
    vi.useFakeTimers();
    render(
      <WelcomeHelpModal
        isOpen={true}
        onClose={onClose}
        onNavigateToTab={onNavigateToTab}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /4\s*Sidebar/i }));

    expect(screen.getByText('/dashboard')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Dashboard$/i }).querySelector('.animate-spin')).toBeInTheDocument();

    // Advance 3 seconds -> cycles to Hedge Pro
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('/analytics-hedge-pro')).toBeInTheDocument();
    const hedgeProBtn = screen.getByRole('button', { name: /^Hedge Pro$/i });
    expect(hedgeProBtn.querySelector('.animate-spin')).toBeInTheDocument();

    // Advance another 3 seconds -> cycles to Positions
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('/positions-open')).toBeInTheDocument();

    // Click Hedge Pro directly -> stops auto-cycle and locks on Hedge Pro
    fireEvent.click(hedgeProBtn);
    expect(screen.getByText('/analytics-hedge-pro')).toBeInTheDocument();
    expect(hedgeProBtn.querySelector('.animate-spin')).toBeNull();
    expect(screen.getByText(/Auto-cycle paused/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByText('/analytics-hedge-pro')).toBeInTheDocument();

    // Open module
    fireEvent.click(screen.getByRole('button', { name: /Open Hedge Pro/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onNavigateToTab).toHaveBeenCalledWith('analytics-hedge-pro');
  });

  it('toggles between Logs Preview and Settings Preview and navigates in Step 5', () => {
    render(
      <WelcomeHelpModal
        isOpen={true}
        onClose={onClose}
        onNavigateToTab={onNavigateToTab}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /5\s*Logs & Settings/i }));

    // Default shows Logs Preview
    expect(screen.getByText(/AES-GCM-256 session unlocked/i)).toBeInTheDocument();

    // Switch to Settings Preview
    fireEvent.click(screen.getByRole('button', { name: /Settings Preview/i }));
    expect(screen.getByText(/1s – 60s REST polling/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Open Settings/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onNavigateToTab).toHaveBeenCalledWith('settings');
  });

  it('handles Quick Start CTAs, startup toggle, and User Manual modal in Step 6', () => {
    render(
      <WelcomeHelpModal
        isOpen={true}
        onClose={onClose}
        onNavigateToTab={onNavigateToTab}
        onConfigureVaultAndKey={onConfigureVaultAndKey}
        onActivateSimulation={onActivateSimulation}
      />
    );

    // Open User Manual from header button
    const manualButtons = screen.getAllByRole('button', { name: /User Manual/i });
    expect(manualButtons).toHaveLength(1);
    fireEvent.click(manualButtons[0]);
    expect(screen.getByTestId('user-manual-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Close Manual/i }));
    expect(screen.queryByTestId('user-manual-modal')).toBeNull();

    // Toggle Show on startup
    const startupCheckbox = screen.getByRole('checkbox', { name: /Show on startup/i });
    expect(startupCheckbox).toBeChecked();
    fireEvent.click(startupCheckbox);
    expect(useSettingsStore.getState().showWelcomeOnStartup).toBe(false);

    // Jump to Step 6
    fireEvent.click(screen.getByRole('button', { name: /6\s*Get Started/i }));
    expect(screen.getByText(/Read-Only Key Checklist/i)).toBeInTheDocument();

    // Activate Vault & Key
    fireEvent.click(screen.getByRole('button', { name: /Activate Vault & Add API Key/i }));
    expect(onConfigureVaultAndKey).toHaveBeenCalledTimes(1);

    // Activate Simulation Mode
    fireEvent.click(screen.getByRole('button', { name: /Explore with Simulation Mode/i }));
    expect(onActivateSimulation).toHaveBeenCalledTimes(1);
  });

  it('enables mock data directly when onActivateSimulation prop is not provided', () => {
    render(
      <WelcomeHelpModal
        isOpen={true}
        onClose={onClose}
        onNavigateToTab={onNavigateToTab}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /6\s*Get Started/i }));
    fireEvent.click(screen.getByRole('button', { name: /Explore with Simulation Mode/i }));

    expect(useSettingsStore.getState().useMockData).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onNavigateToTab).toHaveBeenCalledWith('dashboard');
  });
});
