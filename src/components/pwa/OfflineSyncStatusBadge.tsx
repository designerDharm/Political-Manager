'use client';

import React, { useState, useEffect } from 'react';
import { syncManager, SyncStateListener } from '@/lib/offline/syncManager';
import { Wifi, WifiOff, RotateCw, AlertTriangle, CheckCircle } from 'lucide-react';

export function OfflineSyncStatusBadge({ campaignId }: { campaignId?: string }) {
  const [syncState, setSyncState] = useState({
    isOnline: true,
    pendingCount: 0,
    syncingCount: 0,
    conflictCount: 0,
    lastSyncTime: null as string | null,
  });

  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    // Subscribe to state updates
    const unsubscribe = syncManager.subscribe((state) => {
      setSyncState(state);
    });

    // Prefetch operational cache if campaignId is present and online
    if (campaignId && typeof navigator !== 'undefined' && navigator.onLine) {
      syncManager.prefetchAgentScope(campaignId);
    }

    return () => {
      unsubscribe();
    };
  }, [campaignId]);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await syncManager.syncPendingMutations();
    } finally {
      setIsManualSyncing(false);
    }
  };

  // State 1: Offline with pending work
  if (!syncState.isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
        <WifiOff className="w-3 h-3 text-amber-600" />
        <span>Offline</span>
        {syncState.pendingCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 font-mono">
            {syncState.pendingCount} pending
          </span>
        )}
      </div>
    );
  }

  // State 2: Syncing in progress
  if (syncState.syncingCount > 0 || isManualSyncing) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <RotateCw className="w-3 h-3 animate-spin text-blue-600" />
        <span>Syncing...</span>
      </div>
    );
  }

  // State 3: Online with conflicts or pending items
  if (syncState.conflictCount > 0) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <AlertTriangle className="w-3 h-3 text-rose-600" />
        <span>{syncState.conflictCount} Conflict</span>
        <button
          onClick={handleManualSync}
          className="underline ml-1 hover:text-rose-900"
        >
          Retry
        </button>
      </div>
    );
  }

  if (syncState.pendingCount > 0) {
    return (
      <button
        onClick={handleManualSync}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
      >
        <RotateCw className="w-3 h-3 text-blue-600" />
        <span>Pending Sync: {syncState.pendingCount}</span>
        <span className="underline ml-0.5">Sync Now</span>
      </button>
    );
  }

  // State 4: Online and fully synced
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      <span>Online</span>
    </div>
  );
}
