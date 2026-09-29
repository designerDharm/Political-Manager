'use client';

import React, { useState } from 'react';
import { LogOut, AlertTriangle, RotateCw } from 'lucide-react';
import { offlineDB } from '@/lib/offline/db';
import { useRouter } from 'next/navigation';

export function AgentLogoutButton() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogoutClick = async () => {
    try {
      const pending = await offlineDB.getPendingMutations();
      const unsyncedCount = pending.filter((m) => m.localStatus === 'PENDING' || m.localStatus === 'SYNCING').length;

      if (unsyncedCount > 0) {
        setWarningMessage(`You have ${unsyncedCount} unsynced field operation(s) on this device. Logging out now may prevent automatic synchronization.`);
        setShowConfirm(true);
        return;
      }

      await executeLogout(true);
    } catch {
      await executeLogout(true);
    }
  };

  const executeLogout = async (clearCache: boolean) => {
    setLoggingOut(true);
    try {
      if (clearCache) {
        // Clear cached operational data but preserve pending queue if any
        await offlineDB.clearOperationalCache(true);
      }

      const res = await fetch('/api/v1/auth/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/login';
      } else {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    }
  };

  return (
    <div className="pt-2">
      {showConfirm && (
        <div className="p-3 mb-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Unsynced Work Warning</span>
          </div>
          <p className="text-[11px] leading-relaxed">{warningMessage}</p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => executeLogout(false)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700"
            >
              Sign Out Anyway
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 font-semibold text-[11px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleLogoutClick}
        disabled={loggingOut}
        className="w-full py-3 px-4 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
      >
        {loggingOut ? (
          <RotateCw className="w-4 h-4 animate-spin" />
        ) : (
          <LogOut className="w-4 h-4" />
        )}
        <span>{loggingOut ? 'Signing Out...' : 'Sign Out'}</span>
      </button>
    </div>
  );
}
