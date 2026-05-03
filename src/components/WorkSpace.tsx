import React from 'react';
import { useMultiExchangeWS } from '../hooks/useMultiExchangeWS';

export function WorkSpace({ children }: { children: React.ReactNode }) {
  // Initialize WS connections here so they stay alive across tab changes
  useMultiExchangeWS();

  return <>{children}</>;
}
