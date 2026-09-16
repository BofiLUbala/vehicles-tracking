import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SyncService } from '../services/sync.service';

interface SyncCounts {
  gpsPending: number;
  gpsFailed: number;
  validationsPending: number;
  validationsFailed: number;
  fuelPending: number;
  fuelFailed: number;
  total: number;
}

interface SyncContextType {
  isConnected: boolean;
  isSyncing: boolean;
  counts: SyncCounts;
  syncNow: (force?: boolean) => Promise<void>;
  refreshCounts: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [counts, setCounts] = useState<SyncCounts>({
    gpsPending: 0,
    gpsFailed: 0,
    validationsPending: 0,
    validationsFailed: 0,
    fuelPending: 0,
    fuelFailed: 0,
    total: 0,
  });

  const refreshCounts = useCallback(() => {
    try {
      setCounts(SyncService.getPendingCounts());
      setIsConnected(SyncService.getIsConnected());
    } catch {
      // Ignore initial DB loading errors
    }
  }, []);

  useEffect(() => {
    SyncService.init();
    refreshCounts();

    const unsubscribe = SyncService.subscribe(() => {
      refreshCounts();
    });

    return () => {
      unsubscribe();
      SyncService.dispose();
    };
  }, [refreshCounts]);

  const syncNow = async (force = false) => {
    setIsSyncing(true);
    try {
      await SyncService.syncNow(force);
    } finally {
      setIsSyncing(false);
      refreshCounts();
    }
  };

  return (
    <SyncContext.Provider
      value={{
        isConnected,
        isSyncing,
        counts,
        syncNow,
        refreshCounts,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
