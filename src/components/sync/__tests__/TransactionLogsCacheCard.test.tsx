import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { TransactionLogsCacheCard } from '../TransactionLogsCacheCard';
import '../../../i18n/config';
import { TooltipProvider } from '@radix-ui/react-tooltip';

// Mock historyCache functions
vi.mock('../../../services/historyCache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/historyCache')>();
  return {
    ...actual,
    getBybitTxLogTotalCount: vi.fn().mockResolvedValue(10),
    getBitgetTxLogTotalCount: vi.fn().mockResolvedValue(20),
    getOkxTxLogTotalCount: vi.fn().mockResolvedValue(30),
    DB_VERSION: 1,
  };
});

describe('TransactionLogsCacheCard Component', () => {
  it('renders localized titles, breakdown badges and action buttons', async () => {
    render(
      <TooltipProvider>
        <TransactionLogsCacheCard />
      </TooltipProvider>
    );

    expect(screen.getByText(/transaction logs cache|cache de logs de transação|cache de registos de transações|caché de registros de transacciones|cache dei registri delle transazioni/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sync transactions now|sincronizar transações agora|sincronizar agora|sincronizza transazioni ora/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear tx cache now|limpar cache|cancella cache transazioni ora/i })).toBeInTheDocument();
  });
});
