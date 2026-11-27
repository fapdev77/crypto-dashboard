import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SecurityBackupCard } from '../SecurityBackupCard';
import { useApiKeysStore } from '../../store/apiKeysStore';
import { useSettingsStore } from '../../store/settingsStore';
import { encryptData, decryptData } from '../../utils/cryptoLib';
import toast from 'react-hot-toast';
import i18n from '../../i18n/config';

vi.mock('../../utils/cryptoLib', () => ({
  encryptData: vi.fn().mockResolvedValue('ENCRYPTED_PAYLOAD'),
  decryptData: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const key = (id: string, label: string, exchange: 'bybit' | 'bitget' = 'bybit') => ({
  id,
  label,
  exchange,
  apiKey: `api-${id}`,
  apiSecret: `secret-${id}`,
  isActive: true,
});

const baseSettings = {
  vaultAutoLockEnabled: true,
  vaultAutoLockMinutes: 15,
  showVaultSetupNoticeOnStartup: true,
  setVaultAutoLockEnabled: vi.fn(),
  setVaultAutoLockMinutes: vi.fn(),
  setShowVaultSetupNoticeOnStartup: vi.fn(),
};

const baseVault = {
  keys: [] as ReturnType<typeof key>[],
  isEncrypted: false,
  isInitialized: false,
  isUnlocked: false,
  encryptedData: null as string | null,
  initializeVault: vi.fn().mockResolvedValue(undefined),
  changePassphrase: vi.fn().mockResolvedValue(true),
  lock: vi.fn(),
  importKeys: vi.fn(),
  removeKey: vi.fn(),
};

describe('SecurityBackupCard', () => {
  beforeEach(() => {
    i18n.changeLanguage('en-US');
    vi.clearAllMocks();
    useApiKeysStore.setState(baseVault as never);
    useSettingsStore.setState(baseSettings as never);
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('renders the three tabs and the locked vault status by default', () => {
    render(<SecurityBackupCard />);

    expect(screen.getByText('Security & Credential Vault')).toBeInTheDocument();
    expect(screen.getByText('Vault & Auto-Lock')).toBeInTheDocument();
    expect(screen.getByText('Export Backup')).toBeInTheDocument();
    expect(screen.getByText('Import Backup')).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(screen.getByText(/PBKDF2-SHA256 \(600,000 iterations\)/)).toBeInTheDocument();
  });

  it('shows the unlock/lock action only when the vault is unlocked with encrypted data', () => {
    render(<SecurityBackupCard />);
    expect(screen.queryByText('Lock Vault Now')).not.toBeInTheDocument();

    cleanup();
    useApiKeysStore.setState({ isUnlocked: true, encryptedData: 'cipher' } as never);
    render(<SecurityBackupCard />);

    fireEvent.click(screen.getByText('Lock Vault Now'));

    expect(useApiKeysStore.getState().lock).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
  });

  it('toggles the inactivity auto-lock setting', () => {
    render(<SecurityBackupCard />);

    const switches = screen.getAllByRole('checkbox') as HTMLInputElement[];
    fireEvent.click(switches[0]);

    expect(baseSettings.setVaultAutoLockEnabled).toHaveBeenCalledWith(false);
    expect(toast.success).toHaveBeenCalled();
  });

  it('updates the auto-lock interval from the range slider', () => {
    render(<SecurityBackupCard />);

    fireEvent.change(screen.getByRole('slider'), { target: { value: '45' } });

    expect(baseSettings.setVaultAutoLockMinutes).toHaveBeenCalledWith(45);
  });

  it('rejects a master passphrase shorter than 8 characters', () => {
    render(<SecurityBackupCard />);

    fireEvent.change(screen.getByPlaceholderText('Enter at least 8 characters'), { target: { value: 'short' } });
    fireEvent.click(screen.getByText('Initialize Secure Vault'));

    expect(screen.getByText(/at least 8 characters/)).toBeInTheDocument();
    expect(baseVault.initializeVault).not.toHaveBeenCalled();
  });

  it('lists keys in the export tab and disables export until a passphrase is typed', () => {
    useApiKeysStore.setState({ keys: [key('1', 'Alpha'), key('2', 'Beta', 'bitget')] } as never);
    render(<SecurityBackupCard />);

    fireEvent.click(screen.getByText('Export Backup'));

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    const exportButton = screen.getByRole('button', { name: /Export 2 Keys/ });
    expect(exportButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Strong passphrase'), { target: { value: 'passphrase123' } });
    expect(exportButton).not.toBeDisabled();
  });

  it('encrypts the selected keys and triggers a download on export', async () => {
    useApiKeysStore.setState({ keys: [key('1', 'Alpha'), key('2', 'Beta')] } as never);
    render(<SecurityBackupCard />);

    fireEvent.click(screen.getByText('Export Backup'));
    fireEvent.change(screen.getByPlaceholderText('Strong passphrase'), { target: { value: 'passphrase123' } });
    fireEvent.click(screen.getByRole('button', { name: /Export 2 Keys/ }));

    await waitFor(() => expect(encryptData).toHaveBeenCalledTimes(1));
    const [payload, passphrase] = vi.mocked(encryptData).mock.calls[0];
    expect(passphrase).toBe('passphrase123');
    expect(JSON.parse(payload)).toHaveLength(2);
    expect(toast.success).toHaveBeenCalledWith('API keys exported successfully!');
  });

  it('shows the empty export state when there are no keys', () => {
    render(<SecurityBackupCard />);

    fireEvent.click(screen.getByText('Export Backup'));

    expect(screen.getByText('No API keys available to export.')).toBeInTheDocument();
  });

  it('refuses to decrypt an import without a selected file', async () => {
    render(<SecurityBackupCard />);

    fireEvent.click(screen.getByText('Import Backup'));
    fireEvent.change(screen.getByPlaceholderText('Backup passphrase'), { target: { value: 'passphrase123' } });
    fireEvent.click(screen.getByRole('button', { name: /Decrypt/ }));

    expect(await screen.findByText('Please select a backup file first.')).toBeInTheDocument();
    expect(decryptData).not.toHaveBeenCalled();
  });

  it('decrypts a valid backup file and reports the imported keys', async () => {
    vi.mocked(decryptData).mockResolvedValue(JSON.stringify([key('i1', 'Imported Key')]));
    render(<SecurityBackupCard />);

    fireEvent.click(screen.getByText('Import Backup'));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['ciphertext'], 'backup.enc', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    fireEvent.change(screen.getByPlaceholderText('Backup passphrase'), { target: { value: 'passphrase123' } });
    fireEvent.click(screen.getByRole('button', { name: /Decrypt/ }));

    await waitFor(() => expect(decryptData).toHaveBeenCalledWith('ciphertext', 'passphrase123'));
    expect(toast.success).toHaveBeenCalledWith('Backup file decrypted successfully!');
  });
});
