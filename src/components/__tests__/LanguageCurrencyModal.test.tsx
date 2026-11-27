import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { LanguageCurrencyModal } from '../ui/LanguageCurrencyModal';
import { useSettingsStore } from '../../store/settingsStore';
import i18n from '../../i18n/config';

describe('LanguageCurrencyModal Component', () => {
  const onCloseMock = vi.fn();

  beforeEach(async () => {
    onCloseMock.mockClear();
    await i18n.changeLanguage('pt-BR');
    useSettingsStore.setState({
      locale: 'pt-BR',
      fiatCurrency: 'USD',
      fiatRates: { USD: 1.0, BRL: 5.65, EUR: 0.92, GBP: 0.79 },
    });
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <LanguageCurrencyModal isOpen={false} onClose={onCloseMock} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with tabs when isOpen is true', () => {
    render(<LanguageCurrencyModal isOpen={true} onClose={onCloseMock} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Language & Currency|Idioma e Moeda|Lingua e Valuta/i)).toBeInTheDocument();
  });

  it('allows switching between Language and Currency tabs', () => {
    render(<LanguageCurrencyModal isOpen={true} onClose={onCloseMock} />);

    // Click on Currency tab button
    const currencyTabBtn = screen.getByRole('button', { name: /Currency|Moeda|Valuta/i });
    fireEvent.click(currencyTabBtn);

    // Should display fiat currency options
    expect(screen.getByText('BRL')).toBeInTheDocument();
    expect(screen.getByText('EUR')).toBeInTheDocument();
    expect(screen.getByText('GBP')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
  });

  it('filters languages with search query', () => {
    render(<LanguageCurrencyModal isOpen={true} onClose={onCloseMock} />);

    const searchInput = screen.getByPlaceholderText(/Search|Buscar|Cerca/i);
    fireEvent.change(searchInput, { target: { value: 'Italiano' } });

    expect(screen.getByText('Italiano')).toBeInTheDocument();
    expect(screen.queryByText('Português (Brasil)')).not.toBeInTheDocument();
  });

  it('filters currencies with search query', () => {
    render(<LanguageCurrencyModal isOpen={true} onClose={onCloseMock} initialTab="currency" />);

    const searchInput = screen.getByPlaceholderText(/Search|Buscar|Cerca/i);
    fireEvent.change(searchInput, { target: { value: 'Real' } });

    expect(screen.getByText('BRL')).toBeInTheDocument();
    expect(screen.queryByText('GBP')).not.toBeInTheDocument();
  });

  it('updates store when a language is selected', () => {
    render(<LanguageCurrencyModal isOpen={true} onClose={onCloseMock} />);

    // Select Italian
    const italianOption = screen.getByText('Italiano');
    fireEvent.click(italianOption);

    expect(useSettingsStore.getState().locale).toBe('it-IT');
  });

  it('updates store when a currency is selected', () => {
    render(<LanguageCurrencyModal isOpen={true} onClose={onCloseMock} initialTab="currency" />);

    const brlOption = screen.getByText('BRL');
    fireEvent.click(brlOption);

    expect(useSettingsStore.getState().fiatCurrency).toBe('BRL');
  });

  it('calls onClose when close button is clicked', () => {
    render(<LanguageCurrencyModal isOpen={true} onClose={onCloseMock} />);

    const closeBtn = screen.getByLabelText(/Close|Fechar|Chiudi|Cerrar/i);
    fireEvent.click(closeBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
