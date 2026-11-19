import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import i18n from '../../i18n/config';
import { getTabHeaderMeta, NAV_SECTION_ICONS } from '../../config/navigationConfig';
import { LanguageCurrencyButton } from '../ui/LanguageCurrencyButton';
import { ThemeModeButton } from '../ui/ThemeModeButton';
import { AiPikaChatButton } from '../ai/AiPikaChatButton';
import { DonationToggleButton } from '../DonationToggleButton';
import { HelpToggleButton } from '../HelpToggleButton';
import { PrivacyToggleButton } from '../PrivacyToggleButton';
import { TooltipProvider } from '../ui/Tooltip';
import { PrivacyProvider } from '../../context/PrivacyContext';
import { useSettingsStore } from '../../store/settingsStore';

describe('Header navigation icon registry & mobile-compact toolbar', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt-BR');
    useSettingsStore.setState({
      locale: 'pt-BR',
      fiatCurrency: 'BRL',
      themeMode: 'dark',
    });
  });

  it('maps routes to matching Sidebar icons and localized titles', () => {
    const t = i18n.getFixedT('pt-BR');

    const dashboardMeta = getTabHeaderMeta('dashboard', t);
    expect(dashboardMeta.icon).toBe(NAV_SECTION_ICONS.dashboard);
    expect(dashboardMeta.title).toBe(t('nav.dashboard'));

    const hedgeProMeta = getTabHeaderMeta('analytics-hedge-pro', t);
    expect(hedgeProMeta.icon).toBe(NAV_SECTION_ICONS.hedgePro);
    expect(hedgeProMeta.title).toBe(t('nav.hedgePro'));

    const fundingMeta = getTabHeaderMeta('analytics-funding', t);
    expect(fundingMeta.icon).toBe(NAV_SECTION_ICONS.analytics);
    expect(fundingMeta.title).toBe(t('nav.fundingDashboard'));

    const settingsMeta = getTabHeaderMeta('settings', t);
    expect(settingsMeta.icon).toBe(NAV_SECTION_ICONS.settings);
    expect(settingsMeta.title).toBe(t('nav.settings'));
  });

  it('renders all 6 top-right controls with uniform h-9 sizing and hides labels on mobile when compactOnMobile is enabled', () => {
    const onPikaClick = vi.fn();
    const onDonationClick = vi.fn();
    const onHelpClick = vi.fn();

    render(
      <PrivacyProvider>
        <TooltipProvider>
          <div>
            <LanguageCurrencyButton compactOnMobile />
            <ThemeModeButton compactOnMobile />
            <AiPikaChatButton onClick={onPikaClick} isEnabled={true} compactOnMobile />
            <DonationToggleButton isOpen={false} onClick={onDonationClick} />
            <HelpToggleButton isOpen={false} onClick={onHelpClick} />
            <PrivacyToggleButton />
          </div>
        </TooltipProvider>
      </PrivacyProvider>
    );

    const langBtn = screen.getByRole('button', { name: /PT \/ BRL/i });
    const themeBtn = screen.getByRole('button', { name: /Terminal Dark/i });
    const pikaBtn = screen.getByRole('button', { name: /Open PIKA Assistant/i });
    const beerBtn = screen.getByRole('button', { name: /Pague uma cerveja/i });
    const helpBtn = screen.getByRole('button', { name: /ajuda|help/i });
    const privacyBtn = screen.getByRole('button', { name: /valores numéricos|privado|private/i });

    for (const btn of [langBtn, themeBtn, pikaBtn, beerBtn, helpBtn, privacyBtn]) {
      expect(btn).toHaveClass('h-9');
      expect(btn).toHaveClass('w-9');
    }

    // Labels are hidden on < sm and restored on sm+
    expect(screen.getByText((_, node) => node?.tagName === 'SPAN' && Boolean(node.textContent?.includes('BRL')) && node.classList.contains('hidden'))).toHaveClass('hidden', 'sm:inline');
    expect(screen.getByText('PIKA').closest('span')?.parentElement).toHaveClass('hidden', 'sm:inline-flex');

    fireEvent.click(pikaBtn);
    fireEvent.click(beerBtn);
    fireEvent.click(helpBtn);
    expect(onPikaClick).toHaveBeenCalledTimes(1);
    expect(onDonationClick).toHaveBeenCalledTimes(1);
    expect(onHelpClick).toHaveBeenCalledTimes(1);
  });
});
