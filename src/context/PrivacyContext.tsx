import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PrivacyContextType {
  isPrivateMode: boolean;
  togglePrivacyMode: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [isPrivateMode, setIsPrivateMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('app_privacy_mode');
      // Default to true (safe fallback) if key does not exist
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_privacy_mode', String(isPrivateMode));
    } catch (err) {
      console.error('Failed to save privacy mode to localStorage:', err);
    }
  }, [isPrivateMode]);

  const togglePrivacyMode = () => {
    setIsPrivateMode((prev) => !prev);
  };

  return (
    <PrivacyContext.Provider value={{ isPrivateMode, togglePrivacyMode }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
}
