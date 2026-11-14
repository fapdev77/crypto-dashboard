import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UpdateNotification } from '../UpdateNotification';
import { usePwaUpdateStore } from '../../store/pwaUpdateStore';
import i18n, { resources } from '../../i18n/config';

const mockUpdateServiceWorker = vi.fn().mockResolvedValue(undefined);
const mockSetNeedRefresh = vi.fn();
const mockSetOfflineReady = vi.fn();

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [true, mockSetNeedRefresh],
    offlineReady: [false, mockSetOfflineReady],
    updateServiceWorker: mockUpdateServiceWorker,
  }),
}));

describe('UpdateNotification i18n', () => {
  beforeEach(() => {
    usePwaUpdateStore.setState({
      needRefresh: true,
      offlineReady: false,
      isUpdating: false,
      isDismissed: false,
    });
  });

  it('contains all updateNotification keys across all 6 supported locales', () => {
    const requiredKeys = [
      'title',
      'countdown',
      'description',
      'viewChangelog',
      'dismissAria',
      'dismissTitle',
      'notNow',
      'updating',
      'updateNow',
    ];

    const locales = ['en-US', 'en-GB', 'it-IT', 'es-419', 'pt-BR', 'pt-PT'] as const;
    for (const locale of locales) {
      const trans = resources[locale].translation as unknown as {
        updateNotification?: Record<string, string>;
      };
      expect(trans.updateNotification, `Missing updateNotification in ${locale}`).toBeDefined();
      for (const key of requiredKeys) {
        expect(
          trans.updateNotification?.[key],
          `Missing updateNotification.${key} in ${locale}`
        ).toBeTruthy();
      }
    }
  });

  it('renders localized strings in pt-BR when update is available', async () => {
    await i18n.changeLanguage('pt-BR');
    render(<UpdateNotification />);

    expect(screen.getByText('Atualização Disponível')).toBeInTheDocument();
    expect(screen.getByText('em 5s')).toBeInTheDocument();
    expect(
      screen.getByText('Uma nova versão com melhorias de desempenho e atualizações está pronta.')
    ).toBeInTheDocument();
    expect(screen.getByText('Ver Versão e Changelog')).toBeInTheDocument();
    expect(screen.getByText('Agora Não')).toBeInTheDocument();
    expect(screen.getByText('Atualizar Agora')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dispensar notificação' })).toBeInTheDocument();
  });

  it('renders localized strings in en-US and updating label when updating', async () => {
    await i18n.changeLanguage('en-US');
    usePwaUpdateStore.setState({ isUpdating: true });
    render(<UpdateNotification />);

    expect(screen.getByText('Update Available')).toBeInTheDocument();
    expect(screen.getByText('Updating...')).toBeInTheDocument();
  });
});
