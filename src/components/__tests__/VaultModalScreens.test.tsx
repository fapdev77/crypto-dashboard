import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MandatoryVaultMigrationScreen } from '../MandatoryVaultMigrationScreen';
import { VaultSetupModal } from '../VaultSetupModal';
import { useApiKeysStore, ApiCredentials } from '../../store/apiKeysStore';

describe('MandatoryVaultMigrationScreen', () => {
  const onMigrated = vi.fn();
  const mockLegacyKeys: ApiCredentials[] = [
    {
      id: 'leg-1',
      exchange: 'bybit',
      label: 'Main Trading Bybit',
      apiKey: 'bybit-api-key-12345678',
      apiSecret: 'secret-1',
      isActive: true,
    },
    {
      id: 'leg-2',
      exchange: 'bitget',
      label: 'Secondary Bitget',
      apiKey: 'bitget-api-key-87654321',
      apiSecret: 'secret-2',
      isActive: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useApiKeysStore.setState({
      keys: [],
      isEncrypted: true,
      isInitialized: false,
      encryptedData: null,
      isUnlocked: false,
    });
  });

  it('renders mandatory migration lockout with detected keys count', () => {
    render(<MandatoryVaultMigrationScreen legacyKeys={mockLegacyKeys} onMigrated={onMigrated} />);

    expect(screen.getByText(/Mandatory Vault Encryption/i)).toBeInTheDocument();
    expect(screen.getByText(/Detected Connections to Secure \(2\):/i)).toBeInTheDocument();
    expect(screen.getByText(/Main Trading Bybit/i)).toBeInTheDocument();
    expect(screen.getByText(/Secondary Bitget/i)).toBeInTheDocument();
  });

  it('validates minimum 8 characters and matching passphrases before encrypting', async () => {
    render(<MandatoryVaultMigrationScreen legacyKeys={mockLegacyKeys} onMigrated={onMigrated} />);

    const submitBtn = screen.getByRole('button', { name: /Encrypt Keys & Unlock Terminal/i });
    expect(submitBtn).toBeDisabled();

    const inputs = screen.getAllByPlaceholderText(/master passphrase/i);
    const passInput = inputs[0];
    const confirmInput = screen.getByPlaceholderText(/Repeat master passphrase/i);

    // Mismatched or too short
    fireEvent.change(passInput, { target: { value: 'short' } });
    fireEvent.change(confirmInput, { target: { value: 'short' } });
    expect(submitBtn).toBeDisabled();

    // Valid matching
    fireEvent.change(passInput, { target: { value: 'ValidPassphrase2026!' } });
    fireEvent.change(confirmInput, { target: { value: 'ValidPassphrase2026!' } });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onMigrated).toHaveBeenCalledTimes(1);
    });

    const storeState = useApiKeysStore.getState();
    expect(storeState.isInitialized).toBe(true);
    expect(storeState.isUnlocked).toBe(true);
    expect(storeState.encryptedData).toBeDefined();
    expect(storeState.keys).toHaveLength(2);
  });

  it('supports discarding legacy credentials if user chooses fresh start', () => {
    render(<MandatoryVaultMigrationScreen legacyKeys={mockLegacyKeys} onMigrated={onMigrated} />);

    const discardLink = screen.getByText(/Discard keys & start fresh/i);
    fireEvent.click(discardLink);

    expect(screen.getByText(/Discard Legacy Credentials\?/i)).toBeInTheDocument();
    const confirmDiscardBtn = screen.getByRole('button', { name: /Yes, Discard/i });
    fireEvent.click(confirmDiscardBtn);

    expect(onMigrated).toHaveBeenCalledTimes(1);
    expect(useApiKeysStore.getState().keys).toEqual([]);
  });
});

describe('VaultSetupModal', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useApiKeysStore.setState({
      keys: [],
      isEncrypted: true,
      isInitialized: false,
      encryptedData: null,
      isUnlocked: false,
    });
  });

  it('renders nothing when isOpen is false', () => {
    render(<VaultSetupModal isOpen={false} onClose={onClose} onSuccess={onSuccess} />);
    expect(screen.queryByText(/Activate Security Vault/i)).toBeNull();
  });

  it('renders modal with title and reason when isOpen is true', () => {
    render(
      <VaultSetupModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        reason="Required to add exchange API keys"
      />
    );

    expect(screen.getByText(/Activate Security Vault/i)).toBeInTheDocument();
    expect(screen.getByText(/Required to add exchange API keys/i)).toBeInTheDocument();
  });

  it('initializes vault and triggers onSuccess when valid passphrase is provided', async () => {
    render(<VaultSetupModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    const passInput = screen.getByPlaceholderText(/Enter passphrase \(min\. 8 characters\)/i);
    const confirmInput = screen.getByPlaceholderText(/Confirm your passphrase/i);
    const submitBtn = screen.getByRole('button', { name: /Activate Vault & Continue/i });

    fireEvent.change(passInput, { target: { value: 'MasterPassphrase2026!' } });
    fireEvent.change(confirmInput, { target: { value: 'MasterPassphrase2026!' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    const storeState = useApiKeysStore.getState();
    expect(storeState.isInitialized).toBe(true);
    expect(storeState.isUnlocked).toBe(true);
    expect(storeState.encryptedData).toBeDefined();
  });
});
