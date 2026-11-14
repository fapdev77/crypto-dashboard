import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { ThemeModeButton } from '../ui/ThemeModeButton';
import { TooltipProvider } from '../ui/Tooltip';
import { useSettingsStore } from '../../store/settingsStore';
import i18n from '../../i18n/config';

const renderButton = () =>
  render(
    <TooltipProvider>
      <ThemeModeButton />
    </TooltipProvider>,
  );

describe('ThemeModeButton', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en-US');
    useSettingsStore.setState({ themeMode: 'dark' });
    document.documentElement.setAttribute('data-mode', 'dark');
  });

  it('opens the menu with both application themes', () => {
    renderButton();

    fireEvent.click(screen.getByRole('button', { name: /Interface theme/i }));

    expect(screen.getByRole('menuitemradio', { name: /Terminal Dark/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: /Terminal Light/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: /Wise Dark/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: /Wise Light/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: /Custom/i })).toBeInTheDocument();
  });

  it('marks the active theme as checked', () => {
    renderButton();

    fireEvent.click(screen.getByRole('button', { name: /Interface theme/i }));

    expect(screen.getByRole('menuitemradio', { name: /Terminal Dark/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('menuitemradio', { name: /Terminal Light/i })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('repaints the document to Terminal Light and closes the menu', () => {
    renderButton();

    fireEvent.click(screen.getByRole('button', { name: /Interface theme/i }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Terminal Light/i }));

    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
    expect(useSettingsStore.getState().themeMode).toBe('light');
    expect(screen.queryByRole('menuitemradio')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Terminal Light/i })).toBeInTheDocument();
  });

  it('switches back to Terminal Dark', () => {
    useSettingsStore.setState({ themeMode: 'light' });
    document.documentElement.setAttribute('data-mode', 'light');
    renderButton();

    fireEvent.click(screen.getByRole('button', { name: /Interface theme/i }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Terminal Dark/i }));

    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
  });
});
