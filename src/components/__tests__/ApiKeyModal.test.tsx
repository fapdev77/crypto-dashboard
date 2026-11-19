import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ApiKeyModal } from '../ApiKeyModal';
import { useApiKeysStore } from '../../store/apiKeysStore';
import '../../i18n/config';

vi.mock('../ui/Tooltip', () => ({
  AppTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ApiKeyModal component', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useApiKeysStore.setState({
      keys: [],
      isInitialized: true,
      isUnlocked: true,
    });
  });

  it('renders modal in create mode with exchange and fields', () => {
    render(<ApiKeyModal isOpen={true} onClose={onClose} mode="create" />);

    expect(screen.getByText(/Add API Connection|Connect New Exchange API Key/i)).toBeInTheDocument();
    expect(screen.getByText(/Connection Label/i)).toBeInTheDocument();
    expect(screen.getByText(/^Exchange$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Configuration|Save API Key/i })).toBeInTheDocument();
  });
});
