import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from '../ErrorBoundary';

const BombComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Explosion error in test component');
  }
  return <div>Component Loaded Safely</div>;
};

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <BombComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Component Loaded Safely')).toBeDefined();
  });

  it('catches render error and displays recovery fallback', () => {
    // Suppress console.error during expected throw
    const originalConsoleError = console.error;
    console.error = vi.fn();

    render(
      <ErrorBoundary fallbackTitle="Custom Module Failure" isolateScope="Trade History">
        <BombComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Module Failure')).toBeDefined();
    expect(screen.getByText(/Explosion error in test component/)).toBeDefined();
    expect(screen.getByText(/Retry Module/)).toBeDefined();

    console.error = originalConsoleError;
  });
});
