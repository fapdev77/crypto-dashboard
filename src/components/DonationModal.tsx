import React, { useState, useEffect, useRef } from 'react';
import { X, Beer, Copy, Check, QrCode, Eye, EyeOff, Info, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';

export interface DonationNetwork {
  id: 'solana' | 'evm' | 'btc';
  address: string;
  shortPrefixLen: number;
  shortSuffixLen: number;
  chips?: Array<{
    name: string;
    className: string;
  }>;
}

export const DONATION_NETWORKS: DonationNetwork[] = [
  {
    id: 'solana',
    address: 'Cw2cMC5Z23QBkp5NsuXyucoQtv62UB4D8SjsH5HeWXsX',
    shortPrefixLen: 6,
    shortSuffixLen: 6,
  },
  {
    id: 'evm',
    address: '0xe2237ae1e8f2e37bbd9241f6f1510a7154b3ddf9',
    shortPrefixLen: 6,
    shortSuffixLen: 5,
    chips: [
      {
        name: 'Ethereum',
        className: 'donation-chip-eth',
      },
      {
        name: 'Polygon',
        className: 'donation-chip-polygon',
      },
      {
        name: 'Arbitrum',
        className: 'donation-chip-arbitrum',
      },
    ],
  },
  {
    id: 'btc',
    address: '3DykwcnfJi1SaGq1WR6Jowq44hHtAGhRRL',
    shortPrefixLen: 6,
    shortSuffixLen: 6,
  },
];

export function formatShortAddress(address: string, prefixLen = 6, suffixLen = 6): string {
  if (!address || address.length <= prefixLen + suffixLen + 3) {
    return address;
  }
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below if Clipboard API is blocked
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }

  return false;
}

function triggerHapticFeedback(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(40);
    } catch {
      // Ignore environments where vibrate throws
    }
  }
}

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const { t } = useTranslation();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [openQrIds, setOpenQrIds] = useState<Record<string, boolean>>({});
  const [lastOpenedQrId, setLastOpenedQrId] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qrPanelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!isOpen) {
      setCopiedId(null);
      setExpandedIds({});
      setOpenQrIds({});
      setLastOpenedQrId(null);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!lastOpenedQrId || !openQrIds[lastOpenedQrId]) return;
    const panel = qrPanelRefs.current[lastOpenedQrId];
    if (!panel) return;

    const rafId = requestAnimationFrame(() => {
      panel.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      panel.focus?.({ preventScroll: true });
    });

    return () => cancelAnimationFrame(rafId);
  }, [lastOpenedQrId, openQrIds]);

  if (!isOpen) return null;

  const handleCopy = async (network: DonationNetwork) => {
    const copied = await copyTextToClipboard(network.address);
    if (!copied) return;

    triggerHapticFeedback();
    setCopiedId(network.id);

    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopiedId((current) => (current === network.id ? null : current));
      copyTimerRef.current = null;
    }, 3000);
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleQr = (id: string) => {
    const nextOpen = !openQrIds[id];
    setOpenQrIds((prev) => ({ ...prev, [id]: nextOpen }));
    setLastOpenedQrId(nextOpen ? id : null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="donation-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-surface border border-line rounded-2xl shadow-2xl w-full max-w-xl flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="donation-beer-badge w-10 h-10 rounded-xl border flex items-center justify-center shrink-0">
              <Beer className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="donation-modal-title" className="text-lg font-semibold text-fg leading-snug">
                {t('donation.title', 'Pague uma Cerveja')}
              </h3>
              <p className="text-xs text-fg-muted mt-0.5">
                {t('donation.subtitle', 'Apoie o desenvolvedor via criptomoedas')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-line/50 transition-colors shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label={t('common.close', 'Fechar')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
          {/* Humorous Message */}
          <div className="bg-elevated border border-line rounded-xl p-4">
            <p className="text-sm text-fg leading-relaxed">
              {t(
                'donation.message',
                'Curtiu o app e ele está te ajudando? Então não seja uma sardinha insandecida que só queima dinheiro em shitcoin! Considere me pagar uma cerveja 🍺. Voce pode doar essas shitcoins e se livrar desse lixo, mas se quiser pode mandar BTC, ETH, USDT também 😁😁😁! Isso me motiva a continuar trazendo melhorias e novas funções por aqui.'
              )}
            </p>
          </div>

          {/* Network Cards */}
          <div className="space-y-3">
            {DONATION_NETWORKS.map((network) => {
              const isCopied = copiedId === network.id;
              const isExpanded = Boolean(expandedIds[network.id]);
              const isQrOpen = Boolean(openQrIds[network.id]);
              const displayAddress = isExpanded
                ? network.address
                : formatShortAddress(network.address, network.shortPrefixLen, network.shortSuffixLen);

              const networkTitle =
                network.id === 'solana'
                  ? t('donation.solanaLabel', 'Solana')
                  : network.id === 'evm'
                    ? t('donation.evmLabel', 'EVM')
                    : t('donation.btcLabel', 'Bitcoin');

              const qrHint =
                network.id === 'solana'
                  ? t(
                      'donation.qrHintSolana',
                      'Escaneie com sua carteira Solana (Phantom, Solflare, Backpack) para enviar SOL ou tokens SPL.'
                    )
                  : network.id === 'evm'
                    ? t(
                        'donation.qrHintEvm',
                        'Escaneie com sua carteira EVM (MetaMask, Rabby, Trust) selecionando Ethereum, Polygon ou Arbitrum.'
                      )
                    : t(
                        'donation.qrHintBtc',
                        'Escaneie com sua carteira Bitcoin (BlueWallet, Sparrow, Electrum, Ledger) para enviar apenas BTC on-chain.'
                      );

              return (
                <div
                  key={network.id}
                  data-testid={`donation-card-${network.id}`}
                  className="bg-elevated border border-line rounded-xl p-4 transition-colors"
                >
                  {/* Network Header */}
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-fg">{networkTitle}</span>
                      {network.id === 'solana' && (
                        <span className="donation-chip-solana text-[11px] font-medium px-2 py-0.5 rounded-md border">
                          {t('donation.solanaBadge', 'SOL / SPL')}
                        </span>
                      )}
                      {network.id === 'btc' && (
                        <span className="donation-chip-btc text-[11px] font-medium px-2 py-0.5 rounded-md border">
                          {t('donation.btcBadge', 'BTC')}
                        </span>
                      )}
                    </div>

                    {network.chips && (
                      <div className="flex items-center gap-1.5 flex-wrap" aria-label={t('donation.evmAcceptedNote', 'Accepted networks')}>
                        {network.chips.map((chip) => (
                          <span
                            key={chip.name}
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${chip.className}`}
                          >
                            {chip.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {network.id === 'evm' && (
                    <p className="text-[11px] text-fg-muted mb-2.5">
                      {t('donation.evmAcceptedNote', 'Mesmo endereço aceito em Ethereum, Polygon e Arbitrum.')}
                    </p>
                  )}

                  {network.id === 'btc' && (
                    <div
                      role="note"
                      data-testid="donation-btc-alert"
                      className="donation-btc-alert flex items-start gap-2 rounded-lg border px-3 py-2 mb-2.5 text-[11px] leading-relaxed"
                    >
                      <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        {t(
                          'donation.btcAlert',
                          "Only use this address to deposit BTC. Please don't deposit inscriptions, NFTs, or any other non-BTC assets, as they can't be credited or returned."
                        )}
                      </span>
                    </div>
                  )}

                  {/* Address Display + Expand Toggle */}
                  <div className="flex items-center justify-between gap-2 bg-surface border border-line rounded-lg px-3 py-2.5">
                    <code
                      data-testid={`donation-address-${network.id}`}
                      className={`font-mono tabular-nums text-xs sm:text-sm text-fg select-all ${
                        isExpanded ? 'break-all' : 'truncate'
                      }`}
                    >
                      {displayAddress}
                    </code>

                    <button
                      type="button"
                      onClick={() => toggleExpanded(network.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-fg-muted hover:text-fg hover:bg-elevated-hover rounded-md transition-colors shrink-0 whitespace-nowrap cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
                      aria-expanded={isExpanded}
                      aria-label={
                        isExpanded
                          ? `${t('donation.hideFull', 'Resumir')} ${networkTitle}`
                          : `${t('donation.showFull', 'Ver completo')} ${networkTitle}`
                      }
                    >
                      {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>
                        {isExpanded
                          ? t('donation.hideFull', 'Resumir')
                          : t('donation.showFull', 'Ver completo')}
                      </span>
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => handleCopy(network)}
                      data-testid={`donation-copy-${network.id}`}
                      className={`flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-all duration-150 whitespace-nowrap cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${
                        isCopied
                          ? 'bg-success/15 border-success/40 text-success'
                          : 'bg-surface border-line hover:bg-elevated-hover hover:border-line-strong text-fg'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-4 h-4 text-success shrink-0" />
                          <span>{t('donation.copied', 'Copiado!')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-fg-muted shrink-0" />
                          <span>{t('donation.copy', 'Copiar')}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleQr(network.id)}
                      data-testid={`donation-qr-btn-${network.id}`}
                      aria-expanded={isQrOpen}
                      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${
                        isQrOpen
                          ? 'bg-accent/12 border-accent/40 text-accent'
                          : 'bg-surface border-line hover:bg-elevated-hover hover:border-line-strong text-fg-muted hover:text-fg'
                      }`}
                    >
                      <QrCode className="w-4 h-4 shrink-0" />
                      <span>
                        {isQrOpen
                          ? t('donation.qrHide', 'Ocultar QR')
                          : t('donation.qrShow', 'QR Code')}
                      </span>
                    </button>
                  </div>

                  {/* Inline Expandable QR Code Panel */}
                  {isQrOpen && (
                    <div
                      ref={(el) => {
                        qrPanelRefs.current[network.id] = el;
                      }}
                      tabIndex={-1}
                      data-testid={`donation-qr-panel-${network.id}`}
                      className="mt-3 pt-3 border-t border-line/70 flex flex-col sm:flex-row items-center gap-4 animate-in fade-in duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
                    >
                      <div className="bg-white p-2.5 rounded-xl border border-line/40 shadow-xs shrink-0">
                        <QRCodeSVG
                          value={network.address}
                          size={132}
                          level="M"
                          bgColor="#ffffff"
                          fgColor="#0a0a0a"
                          title={`${networkTitle} QR Code`}
                        />
                      </div>
                      <div className="text-center sm:text-left space-y-1.5 min-w-0">
                        <p className="text-xs font-medium text-fg">{networkTitle}</p>
                        <p className="text-xs text-fg-muted leading-relaxed">{qrHint}</p>
                        <p className="font-mono tabular-nums text-[11px] text-fg-muted break-all">
                          {network.address}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-line pt-4 mt-5">
          <div data-testid="donation-footer-note" className="flex items-start sm:items-center gap-2 text-xs text-fg-muted leading-snug">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
            <span>
              {t(
                'donation.footerNote',
                'As doações são voluntárias! Nunca entraremos em contato solicitando qualquer valor ou pagamento'
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-elevated hover:bg-elevated-hover border border-line hover:border-line-strong text-fg rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {t('common.close', 'Fechar')}
          </button>
        </div>
      </div>
    </div>
  );
}
