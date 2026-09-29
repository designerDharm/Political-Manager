// Offline Sync Manager for Political Agent
// Manages device ID, queuing mutations, network detection, and automatic/manual sync with /api/v1/sync

import { offlineDB, PendingMutation } from './db';

const DEVICE_ID_KEY = 'campaignops_device_id';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server_device';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export type SyncStateListener = (state: {
  isOnline: boolean;
  pendingCount: number;
  syncingCount: number;
  conflictCount: number;
  lastSyncTime: string | null;
}) => void;

class SyncManager {
  private isSyncing = false;
  private listeners: Set<SyncStateListener> = new Set();
  private autoSyncInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      window.addEventListener('focus', () => {
        if (navigator.onLine) this.syncPendingMutations();
      });

      // Periodically check pending queue every 30s when online
      this.autoSyncInterval = setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
          this.syncPendingMutations();
        }
      }, 30000);
    }
  }

  private handleNetworkChange(isOnline: boolean) {
    this.notifyState();
    if (isOnline) {
      this.syncPendingMutations();
    }
  }

  subscribe(listener: SyncStateListener): () => void {
    this.listeners.add(listener);
    this.notifyState();
    return () => {
      this.listeners.delete(listener);
    };
  }

  async notifyState(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const pending = await offlineDB.getPendingMutations();
      const pendingCount = pending.filter((m) => m.localStatus === 'PENDING').length;
      const syncingCount = pending.filter((m) => m.localStatus === 'SYNCING').length;
      const conflictCount = pending.filter((m) => m.localStatus === 'CONFLICT').length;
      const lastSyncTime = await offlineDB.getMetadata<string>('last_successful_sync');

      const state = {
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        pendingCount,
        syncingCount,
        conflictCount,
        lastSyncTime: lastSyncTime || null,
      };

      this.listeners.forEach((fn) => {
        fn(state);
      });
    } catch {
      // Ignore in background
    }
  }

  // Queue a new field action
  async queueFieldMutation(params: {
    campaignId: string;
    entityType: 'household' | 'issue' | 'interaction';
    entityId: string;
    operation: string;
    payload: Record<string, any>;
    baseVersion?: number;
  }): Promise<PendingMutation> {
    const mutationId = `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const deviceId = getOrCreateDeviceId();
    const now = new Date().toISOString();

    const mutation: PendingMutation = {
      mutationId,
      deviceId,
      campaignId: params.campaignId,
      entityType: params.entityType,
      entityId: params.entityId,
      baseVersion: params.baseVersion || 1,
      operation: params.operation,
      payload: params.payload,
      clientOccurredAt: now,
      queuedAt: now,
      attemptCount: 0,
      localStatus: 'PENDING',
    };

    await offlineDB.enqueueMutation(mutation);
    await this.notifyState();

    // Trigger sync immediately if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      setTimeout(() => this.syncPendingMutations(), 100);
    }

    return mutation;
  }

  // Execute sync against /api/v1/sync
  async syncPendingMutations(): Promise<{
    success: boolean;
    appliedCount: number;
    conflictCount: number;
    errorCount: number;
  }> {
    if (this.isSyncing || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return { success: false, appliedCount: 0, conflictCount: 0, errorCount: 0 };
    }

    this.isSyncing = true;
    let appliedCount = 0;
    let conflictCount = 0;
    let errorCount = 0;

    try {
      const allMutations = await offlineDB.getPendingMutations();
      // Filter mutations ready for sync (PENDING or retrying non-permanent FAILED)
      const toSync = allMutations.filter(
        (m) => m.localStatus === 'PENDING' || (m.localStatus === 'FAILED' && (m.attemptCount || 0) < 5)
      );

      if (toSync.length === 0) {
        this.isSyncing = false;
        await this.notifyState();
        return { success: true, appliedCount: 0, conflictCount: 0, errorCount: 0 };
      }

      // Mark batch as SYNCING
      for (const m of toSync) {
        await offlineDB.updateMutationStatus(m.mutationId, 'SYNCING');
      }
      await this.notifyState();

      // Send to authoritative PostgreSQL sync endpoint
      const payload = {
        mutations: toSync.map((m) => ({
          mutationId: m.mutationId,
          deviceId: m.deviceId,
          campaignId: m.campaignId,
          entityType: m.entityType,
          entityId: m.entityId,
          baseVersion: m.baseVersion,
          operation: m.operation,
          payload: m.payload,
          clientOccurredAt: m.clientOccurredAt,
          queuedAt: m.queuedAt,
        })),
      };

      const res = await fetch('/api/v1/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Transient server or auth error: return to PENDING
        for (const m of toSync) {
          await offlineDB.updateMutationStatus(m.mutationId, 'PENDING', `HTTP_${res.status}`);
        }
        errorCount = toSync.length;
        return { success: false, appliedCount: 0, conflictCount: 0, errorCount };
      }

      const json = await res.json();
      const results: any[] = json.data?.results || [];

      for (const item of results) {
        if (item.status === 'APPLIED' || item.status === 'ALREADY_APPLIED') {
          appliedCount++;
          await offlineDB.removeMutation(item.mutationId);
          await offlineDB.logSyncResult({
            mutationId: item.mutationId,
            syncedAt: new Date().toISOString(),
            status: 'APPLIED',
            serverVersion: item.newVersion,
          });
        } else if (item.status === 'CONFLICT') {
          conflictCount++;
          await offlineDB.updateMutationStatus(item.mutationId, 'CONFLICT', item.reason || 'Version conflict');
          await offlineDB.logSyncResult({
            mutationId: item.mutationId,
            syncedAt: new Date().toISOString(),
            status: 'CONFLICT',
            reason: item.reason,
            serverVersion: item.serverVersion,
          });
        } else if (item.status === 'FORBIDDEN') {
          // Permanent authorization denial: do NOT retry automatically
          errorCount++;
          await offlineDB.updateMutationStatus(item.mutationId, 'FAILED', 'AUTHORIZATION_DENIED_BY_SERVER');
        } else {
          errorCount++;
          await offlineDB.updateMutationStatus(item.mutationId, 'FAILED', item.reason || 'Sync error');
        }
      }

      await offlineDB.setMetadata('last_successful_sync', new Date().toISOString());
      return { success: true, appliedCount, conflictCount, errorCount };
    } catch (err: any) {
      console.error('[SyncManager] Network glitch during sync:', err);
      return { success: false, appliedCount, conflictCount, errorCount: errorCount + 1 };
    } finally {
      this.isSyncing = false;
      await this.notifyState();
    }
  }

  // Preload permitted operational dataset into IndexedDB when online
  async prefetchAgentScope(campaignId: string): Promise<void> {
    if (typeof window === 'undefined' || !navigator.onLine) return;

    try {
      // 1. Fetch assigned households
      const hhRes = await fetch(`/api/v1/households?campaignId=${campaignId}&limit=50`);
      const hhJson = await hhRes.json();
      if (hhJson.data && Array.isArray(hhJson.data)) {
        await offlineDB.saveHouseholds(hhJson.data);
      }

      // 2. Fetch assigned tasks
      const taskRes = await fetch(`/api/v1/tasks?campaignId=${campaignId}`);
      const taskJson = await taskRes.json();
      if (taskJson.data && Array.isArray(taskJson.data)) {
        await offlineDB.saveTasks(taskJson.data);
      }

      await offlineDB.setMetadata('cache_timestamp', new Date().toISOString());
    } catch (err) {
      console.warn('[SyncManager] Failed to prefetch agent scope:', err);
    }
  }
}

export const syncManager = new SyncManager();
