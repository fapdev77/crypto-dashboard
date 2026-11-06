import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GlobalUnlockScreen } from '../GlobalUnlockScreen';
import { useSettingsStore } from '../../store/settingsStore';
import i18n from '../../i18n/config';

describe('GlobalUnlockScreen with Language Selector', () => {
  beforeEach(() => {
    i18n.changeLanguage('en-US');
    useSettingsStore.setState({ locale: 'en-US', fiatCurrency: 'USD' });
  });

  it('renders the language & currency button in the header', () => {
    render(<GlobalUnlockScreen />);

    // Globe button should be visible in the card
    const globeBtn = screen.getByRole('button', { name: /Language & Currency/i });
    expect(globeBtn).toBeInTheDocument();
  });

  it('renders localized texts for encrypted storage unlock', () => {
    render(<GlobalUnlockScreen />);

    expect(screen.getByText('Encrypted Storage')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter passphrase')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument();
  });

  it('opens language & currency modal when globe button is clicked', async () => {
    render(<GlobalUnlockScreen />);

    const globeBtn = screen.getByRole('button', { name: /Language & Currency/i });
    fireEvent.click(globeBtn);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Select Interface Language')).toBeInTheDocument();
  });

  it('shows error message when unlocking with empty passphrase', () => {
    render(<GlobalUnlockScreen />);

    const unlockBtn = screen.getByRole('button', { name: 'Unlock' });
    fireEvent.click(unlockBtn);

    expect(screen.getByText('Please enter your passphrase.')).toBeInTheDocument();
  });
});
