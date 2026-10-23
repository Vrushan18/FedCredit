import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { BankNode } from '../types/contracts';
import { getBankNodes, checkHeadOfficeHealth } from '../services/api';
import { useAuth } from './AuthContext';

interface BankNetworkContextType {
  banks: BankNode[];
  isHeadOfficeOnline: boolean | null;
  isLoading: boolean;
  lastChecked: Date | null;
  error: string | null;
  refreshNetwork: () => Promise<void>;
  getBankById: (bankId: string) => BankNode | undefined;
}

const BankNetworkContext = createContext<BankNetworkContextType | undefined>(undefined);

export const BankNetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [banks, setBanks] = useState<BankNode[]>([]);
  const [isHeadOfficeOnline, setIsHeadOfficeOnline] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshNetwork = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // 1. Health check Head Office
    try {
      await checkHeadOfficeHealth();
      setIsHeadOfficeOnline(true);
    } catch {
      setIsHeadOfficeOnline(false);
    }

    // 2. If authenticated, fetch bank nodes from GET /banks
    if (isAuthenticated) {
      try {
        const bankList = await getBankNodes();
        const patchedBanks = bankList.map((b) => {
          if (b.bank_id === 'BANK_A' && b.api_base_url.includes('100.74.158.82')) {
            return {
              ...b,
              api_base_url: b.api_base_url.replace('100.74.158.82', '100.120.140.95'),
            };
          }
          return b;
        });
        setBanks(patchedBanks);
        setError(null);
      } catch (err: any) {
        // If bank retrieval fails, record message
        setError(err.message || 'Unable to fetch connected bank nodes');
      }
    }

    setLastChecked(new Date());
    setIsLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    refreshNetwork();

    // Periodic network status check every 30 seconds
    const interval = setInterval(refreshNetwork, 30000);
    return () => clearInterval(interval);
  }, [refreshNetwork]);

  const getBankById = (bankId: string) => {
    return banks.find((b) => b.bank_id === bankId);
  };

  return (
    <BankNetworkContext.Provider
      value={{
        banks,
        isHeadOfficeOnline,
        isLoading,
        lastChecked,
        error,
        refreshNetwork,
        getBankById,
      }}
    >
      {children}
    </BankNetworkContext.Provider>
  );
};

export function useBankNetwork() {
  const context = useContext(BankNetworkContext);
  if (!context) {
    throw new Error('useBankNetwork must be used within a BankNetworkProvider');
  }
  return context;
}
