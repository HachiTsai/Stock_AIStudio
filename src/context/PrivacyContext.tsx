import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  formatPrivateTWD,
  formatPrivateShares,
  formatPrivateLots,
  formatPrivateRawShares,
  formatPrivateCost,
  formatPrivatePct,
  formatPrivateEmail,
} from '../utils/privacyHelper';

export interface PrivacyContextType {
  isPrivacyMaskActive: boolean;
  togglePrivacyMask: () => void;
  setPrivacyMask: (active: boolean) => void;
  maskTWD: (amount: number) => string;
  maskShares: (shares: number) => string;
  maskLots: (shares: number) => string;
  maskRawShares: (shares: number) => string;
  maskCost: (cost: number) => string;
  maskPct: (pct: number, showSign?: boolean) => string;
  maskEmail: (email?: string | null) => string;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export const PrivacyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPrivacyMaskActive, setIsPrivacyMaskActive] = useState<boolean>(() => {
    return localStorage.getItem('inv_privacy_mask') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('inv_privacy_mask', isPrivacyMaskActive ? 'true' : 'false');
  }, [isPrivacyMaskActive]);

  const togglePrivacyMask = () => setIsPrivacyMaskActive((prev) => !prev);
  const setPrivacyMask = (active: boolean) => setIsPrivacyMaskActive(active);

  const maskTWD = (amount: number) => formatPrivateTWD(amount, isPrivacyMaskActive);
  const maskShares = (shares: number) => formatPrivateShares(shares, isPrivacyMaskActive);
  const maskLots = (shares: number) => formatPrivateLots(shares, isPrivacyMaskActive);
  const maskRawShares = (shares: number) => formatPrivateRawShares(shares, isPrivacyMaskActive);
  const maskCost = (cost: number) => formatPrivateCost(cost, isPrivacyMaskActive);
  const maskPct = (pct: number, showSign = true) => formatPrivatePct(pct, isPrivacyMaskActive, showSign);
  const maskEmail = (email?: string | null) => formatPrivateEmail(email, isPrivacyMaskActive);

  return (
    <PrivacyContext.Provider
      value={{
        isPrivacyMaskActive,
        togglePrivacyMask,
        setPrivacyMask,
        maskTWD,
        maskShares,
        maskLots,
        maskRawShares,
        maskCost,
        maskPct,
        maskEmail,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
};

export const usePrivacy = (): PrivacyContextType => {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
};
