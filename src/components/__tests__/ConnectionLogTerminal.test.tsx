import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import i18n from '../../i18n/config';
import { ConnectionLogTerminal } from '../ConnectionLogTerminal';
import { useLogStore } from '../../store/logStore';

describe('ConnectionLogTerminal Internationalization (i18n)', () => {
  beforeEach(async () => {
    useLogStore.setState({ entries: [] });
    await i18n.changeLanguage('en-US');
  });

  it('renders toolbar elements in English by default', () => {
    render(<ConnectionLogTerminal />);

    expect(screen.getByText('Live Connection Log')).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Important')).toBeInTheDocument();
    expect(screen.getByText('Errors')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search logs...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '[Clear]' })).toBeInTheDocument();
    expect(screen.getByText('ALL CONNECTIONS')).toBeInTheDocument();
    expect(screen.getByText('History:')).toBeInTheDocument();
    expect(screen.getByText('0 / 10000 lines')).toBeInTheDocument();
  });

  it('renders toolbar elements in Portuguese (pt-BR)', async () => {
    await i18n.changeLanguage('pt-BR');
    render(<ConnectionLogTerminal />);

    expect(screen.getByText('Logs de Conexão em Tempo Real')).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();
    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByText('Importantes')).toBeInTheDocument();
    expect(screen.getByText('Erros')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buscar nos logs...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '[Limpar]' })).toBeInTheDocument();
    expect(screen.getByText('TODAS AS CONEXÕES')).toBeInTheDocument();
    expect(screen.getByText('Histórico:')).toBeInTheDocument();
    expect(screen.getByText('0 / 10000 linhas')).toBeInTheDocument();
  });

  it('renders toolbar elements in Italian (it-IT)', async () => {
    await i18n.changeLanguage('it-IT');
    render(<ConnectionLogTerminal />);

    expect(screen.getByText('Log di Connessione in Tempo Reale')).toBeInTheDocument();
    expect(screen.getByText('Tutti')).toBeInTheDocument();
    expect(screen.getByText('Importanti')).toBeInTheDocument();
    expect(screen.getByText('Errori')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Cerca nei log...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '[Cancella]' })).toBeInTheDocument();
    expect(screen.getByText('TUTTE LE CONNESSIONI')).toBeInTheDocument();
    expect(screen.getByText('Cronologia:')).toBeInTheDocument();
    expect(screen.getByText('0 / 10000 righe')).toBeInTheDocument();
  });

  it('renders toolbar elements in Spanish (es-419)', async () => {
    await i18n.changeLanguage('es-419');
    render(<ConnectionLogTerminal />);

    expect(screen.getByText('Registros de Conexión en Tiempo Real')).toBeInTheDocument();
    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByText('Importantes')).toBeInTheDocument();
    expect(screen.getByText('Errores')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buscar en registros...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '[Limpiar]' })).toBeInTheDocument();
    expect(screen.getByText('TODAS LAS CONEXIONES')).toBeInTheDocument();
  });

  it('clears logs when clear button is clicked', async () => {
    await i18n.changeLanguage('en-US');
    useLogStore.getState().addLog('INFO', 'System', 'Test message 1');
    expect(useLogStore.getState().entries).toHaveLength(1);

    render(<ConnectionLogTerminal />);
    expect(screen.getByText('1 / 10000 lines')).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: '[Clear]' });
    fireEvent.click(clearBtn);

    expect(useLogStore.getState().entries).toHaveLength(0);
    expect(screen.getByText('0 / 10000 lines')).toBeInTheDocument();
  });

  it('filters entries when preset is selected', async () => {
    await i18n.changeLanguage('en-US');
    useLogStore.getState().addLog('INFO', 'System', 'Info message');
    useLogStore.getState().addLog('ERROR', 'System', 'Error message');

    render(<ConnectionLogTerminal />);

    // Default preset is ERROR, WARN, SYSTEM -> INFO is not visible initially
    expect(screen.queryByText('Info message')).not.toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Click "All" preset
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByText('Info message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Click "Errors" preset
    fireEvent.click(screen.getByRole('button', { name: 'Errors' }));
    expect(screen.queryByText('Info message')).not.toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });
});
