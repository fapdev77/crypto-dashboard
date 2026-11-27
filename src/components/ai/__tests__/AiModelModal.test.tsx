import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AiModelModal } from '../AiModelModal';
import '../../../../src/i18n/config';

vi.mock('../../../ui/Tooltip', () => ({
  AppTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('AiModelModal component', () => {
  const onClose = vi.fn();
  const onSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal in add mode with header and save button', () => {
    render(<AiModelModal isOpen={true} onClose={onClose} onSave={onSave} />);

    expect(screen.getByText(/Configure New AI Model|Add AI Model/i)).toBeInTheDocument();
    expect(screen.getByText(/Service Provider/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Model/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });
});
