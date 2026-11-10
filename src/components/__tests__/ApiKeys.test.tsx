import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ApiKeys } from '../ApiKeys';
import { useApiKeysStore } from '../../store/apiKeysStore';
import '../../i18n/config';

vi.mock('../ui/Tooltip', () => ({
  AppTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ApiKeys component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useApiKeysStore.setState({
      keys: [],
      isEncrypted: true,
      isInitialized: true,
      isUnlocked: true,
    });
  });

  it('renders API connections title and action buttons', () => {
    render(<ApiKeys />);

    expect(screen.getByText(/API Connections and status:/i)).toBeInTheDocument();
    expect(screen.getByText(/Expand All/i)).toBeInTheDocument();
    expect(screen.getByText(/Collapse All/i)).toBeInTheDocument();
    expect(screen.getByText(/New API Key/i)).toBeInTheDocument();
  });

  it('renders empty state when no keys configured', () => {
    render(<ApiKeys />);

    expect(screen.getByText(/No keys configured for this exchange/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Activate Vault & Add Key|Add First API Key/i })).toBeInTheDocument();
  });
});
