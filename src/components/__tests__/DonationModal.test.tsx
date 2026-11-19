import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DonationModal, formatShortAddress, DONATION_NETWORKS } from '../DonationModal';
import { DonationToggleButton } from '../DonationToggleButton';
import { TooltipProvider } from '../ui/Tooltip';
import i18n, { resources } from '../../i18n/config';

describe('DonationToggleButton', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt-BR');
  });

  it('renders beer mug button with discrete pulse class and triggers onClick', () => {
    const onClick = vi.fn();
    render(
      <TooltipProvider>
        <DonationToggleButton isOpen={false} onClick={onClick} />
      </TooltipProvider>
    );

    const button = screen.getByRole('button', { name: /Pague uma cerveja/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('donation-beer-btn');
    expect(button).toHaveAttribute('data-open', 'false');

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('reflects open state via data-open and aria-expanded', () => {
    render(
      <TooltipProvider>
        <DonationToggleButton isOpen={true} onClick={vi.fn()} />
      </TooltipProvider>
    );

    const button = screen.getByRole('button', { name: /Fechar janela de doação/i });
    expect(button).toHaveAttribute('data-open', 'true');
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('DonationModal', () => {
  const solanaAddress = 'Cw2cMC5Z23QBkp5NsuXyucoQtv62UB4D8SjsH5HeWXsX';
  const evmAddress = '0xe2237ae1e8f2e37bbd9241f6f1510a7154b3ddf9';
  const btcAddress = '3DykwcnfJi1SaGq1WR6Jowq44hHtAGhRRL';

  const originalClipboard = navigator.clipboard;
  const originalVibrate = navigator.vibrate;

  beforeEach(async () => {
    await i18n.changeLanguage('pt-BR');
    vi.clearAllMocks();

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    });
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: originalVibrate,
    });
  });

  it('renders nothing when isOpen is false', () => {
    render(<DonationModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders humorous message, truncated addresses, EVM network chips, and BTC info alert', () => {
    render(<DonationModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Apoie o desenvolvedor via criptomoedas')).toBeInTheDocument();
    expect(screen.getByText(/sardinha insandecida/i)).toBeInTheDocument();

    expect(screen.getByTestId('donation-address-solana')).toHaveTextContent('Cw2cMC...HeWXsX');
    expect(screen.getByTestId('donation-address-evm')).toHaveTextContent('0xe223...3ddf9');
    expect(screen.getByTestId('donation-address-btc')).toHaveTextContent('3Dykwc...AGhRRL');

    expect(screen.getByText('Ethereum')).toBeInTheDocument();
    expect(screen.getByText('Polygon')).toBeInTheDocument();
    expect(screen.getByText('Arbitrum')).toBeInTheDocument();

    const btcAlert = screen.getByTestId('donation-btc-alert');
    expect(btcAlert).toBeInTheDocument();
    expect(btcAlert).toHaveTextContent(/apenas para depositar BTC/i);
    expect(btcAlert.querySelector('svg')).toBeInTheDocument();

    const footerNote = screen.getByTestId('donation-footer-note');
    expect(footerNote).toBeInTheDocument();
    expect(footerNote).toHaveTextContent(
      'As doações são voluntárias! Nunca entraremos em contato solicitando qualquer valor ou pagamento'
    );
    expect(footerNote.querySelector('svg')).toBeInTheDocument();
  });

  it('toggles full address display on click while keeping formatting helper accurate', () => {
    expect(formatShortAddress(solanaAddress, 6, 6)).toBe('Cw2cMC...HeWXsX');
    expect(formatShortAddress(evmAddress, 6, 5)).toBe('0xe223...3ddf9');
    expect(formatShortAddress(btcAddress, 6, 6)).toBe('3Dykwc...AGhRRL');

    render(<DonationModal isOpen={true} onClose={vi.fn()} />);

    const expandSolanaBtn = screen.getByRole('button', { name: /Ver completo Solana/i });
    fireEvent.click(expandSolanaBtn);
    expect(screen.getByTestId('donation-address-solana')).toHaveTextContent(solanaAddress);

    const hideSolanaBtn = screen.getByRole('button', { name: /Resumir Solana/i });
    fireEvent.click(hideSolanaBtn);
    expect(screen.getByTestId('donation-address-solana')).toHaveTextContent('Cw2cMC...HeWXsX');

    const expandBtcBtn = screen.getByRole('button', { name: /Ver completo Bitcoin/i });
    fireEvent.click(expandBtcBtn);
    expect(screen.getByTestId('donation-address-btc')).toHaveTextContent(btcAddress);
  });

  it('copies full address, shows Copiado! for 3 seconds, and triggers haptic vibration', async () => {
    vi.useFakeTimers();
    render(<DonationModal isOpen={true} onClose={vi.fn()} />);

    const copyEvmBtn = screen.getByTestId('donation-copy-evm');
    await act(async () => {
      fireEvent.click(copyEvmBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(evmAddress);
    expect(navigator.vibrate).toHaveBeenCalledWith(40);
    expect(copyEvmBtn).toHaveTextContent('Copiado!');

    act(() => {
      vi.advanceTimersByTime(2900);
    });
    expect(copyEvmBtn).toHaveTextContent('Copiado!');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(copyEvmBtn).toHaveTextContent('Copiar');
  });

  it('expands QR Code inline inside the corresponding network card and scrolls/focuses it', async () => {
    const scrollIntoViewMock = vi.fn();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      });

    try {
      render(<DonationModal isOpen={true} onClose={vi.fn()} />);

      expect(screen.queryByTestId('donation-qr-panel-btc')).not.toBeInTheDocument();

      const qrBtn = screen.getByTestId('donation-qr-btn-btc');
      fireEvent.click(qrBtn);

      const qrPanel = screen.getByTestId('donation-qr-panel-btc');
      expect(qrPanel).toBeInTheDocument();
      expect(qrPanel.querySelector('svg')).toBeInTheDocument();
      expect(screen.queryByTestId('donation-qr-panel-evm')).not.toBeInTheDocument();
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
      expect(document.activeElement).toBe(qrPanel);

      fireEvent.click(qrBtn);
      expect(screen.queryByTestId('donation-qr-panel-btc')).not.toBeInTheDocument();
    } finally {
      rafSpy.mockRestore();
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it('closes on Escape key press', () => {
    const onClose = vi.fn();
    render(<DonationModal isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('contains all donation i18n keys across all 6 supported locales and renders translated text', async () => {
    const requiredKeys = [
      'buttonTooltipOpen',
      'buttonTooltipClose',
      'title',
      'subtitle',
      'message',
      'solanaLabel',
      'solanaBadge',
      'evmLabel',
      'evmAcceptedNote',
      'btcLabel',
      'btcBadge',
      'btcAlert',
      'copy',
      'copied',
      'showFull',
      'hideFull',
      'qrShow',
      'qrHide',
      'qrHintSolana',
      'qrHintEvm',
      'qrHintBtc',
      'footerNote',
    ];

    const locales = ['en-US', 'en-GB', 'it-IT', 'es-419', 'pt-BR', 'pt-PT'] as const;
    for (const locale of locales) {
      const trans = resources[locale].translation as unknown as { donation?: Record<string, string> };
      expect(trans.donation, `Missing donation object in ${locale}`).toBeDefined();
      for (const key of requiredKeys) {
        expect(trans.donation?.[key], `Missing donation.${key} in ${locale}`).toBeTruthy();
      }
    }

    await i18n.changeLanguage('en-US');
    render(<DonationModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Buy Me a Beer')).toBeInTheDocument();
    expect(screen.getByText(/crazy retail degen/i)).toBeInTheDocument();
    expect(screen.getByTestId('donation-btc-alert')).toHaveTextContent(
      "Only use this address to deposit BTC. Please don't deposit inscriptions, NFTs, or any other non-BTC assets, as they can't be credited or returned."
    );
    expect(DONATION_NETWORKS).toHaveLength(3);
  });
});
