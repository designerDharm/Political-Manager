// Type-safe, Versioned IndexedDB Database for Political Agent Offline Operations
// Stores: metadata, assignments, tasks, households, voters, pendingMutations, syncResults

export interface CachedHousehold {
  id: string;
  code: string;
  campaignId: string;
  boothId: string | null;
  address: string;
  houseNumber: string;
  status: string;
  version: number;
  aiConfidence?: number;
  primaryContactName?: string | null;
  updatedAt: string;
  members: CachedVoter[];
  interactions?: Array<{
    id: string;
    status: string;
    notes?: string | null;
    occurredAt: string;
  }>;
}

export interface CachedVoter {
  id: string;
  name: string;
  age: number;
  gender: string;
  epicNumber: string;
  householdId: string | null;
  roleInHousehold?: string | null;
  relationshipType?: string | null;
  guardianName?: string | null;
  houseNumber?: string;
  boothId?: string | null;
}

export interface CachedTask {
  id: string;
  campaignId: string;
  userId: string;
  scopeType: string;
  scopeTarget: string;
  taskType: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export interface PendingMutation {
  mutationId: string;
  deviceId: string;
  campaignId: string;
  entityType: 'household' | 'voter' | 'issue' | 'interaction' | 'VIS_EVENT';
  entityId: string;
  baseVersion: number;
  operation: string;
  payload: Record<string, any>;
  clientOccurredAt: string;
  queuedAt: string;
  attemptCount: number;
  localStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'CONFLICT' | 'FAILED';
  errorReason?: string;
}

export interface SyncResultRecord {
  mutationId: string;
  syncedAt: string;
  status: 'APPLIED' | 'CONFLICT' | 'REJECTED' | 'ERROR';
  reason?: string;
  serverVersion?: number;
}

const DB_NAME = 'campaignops_agent_offline_db';
const DB_VERSION = 1;

class OfflineDB {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('IndexedDB is only accessible in the browser'));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (ev: IDBVersionChangeEvent) => {
          const db = req.result;

          // 1. metadata store (key-value)
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata');
          }

          // 2. tasks & assignments
          if (!db.objectStoreNames.contains('tasks')) {
            const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
            taskStore.createIndex('campaignId', 'campaignId', { unique: false });
          }

          // 3. households (minimal operational subset)
          if (!db.objectStoreNames.contains('households')) {
            const hhStore = db.createObjectStore('households', { keyPath: 'id' });
            hhStore.createIndex('code', 'code', { unique: false });
            hhStore.createIndex('boothId', 'boothId', { unique: false });
            hhStore.createIndex('campaignId', 'campaignId', { unique: false });
          }

          // 4. voters (minimal members in assigned booths)
          if (!db.objectStoreNames.contains('voters')) {
            const voterStore = db.createObjectStore('voters', { keyPath: 'id' });
            voterStore.createIndex('epicNumber', 'epicNumber', { unique: false });
            voterStore.createIndex('householdId', 'householdId', { unique: false });
            voterStore.createIndex('name', 'name', { unique: false });
          }

          // 5. pendingMutations queue
          if (!db.objectStoreNames.contains('pendingMutations')) {
            const mutStore = db.createObjectStore('pendingMutations', { keyPath: 'mutationId' });
            mutStore.createIndex('localStatus', 'localStatus', { unique: false });
            mutStore.createIndex('queuedAt', 'queuedAt', { unique: false });
          }

          // 6. syncResults historical logs
          if (!db.objectStoreNames.contains('syncResults')) {
            const resStore = db.createObjectStore('syncResults', { keyPath: 'mutationId' });
            resStore.createIndex('syncedAt', 'syncedAt', { unique: false });
          }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }

    return this.dbPromise;
  }

  // --- Metadata helpers ---
  async getMetadata<T = any>(key: string): Promise<T | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async setMetadata(key: string, value: any): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- Households Store ---
  async saveHouseholds(households: CachedHousehold[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['households', 'voters'], 'readwrite');
      const hhStore = tx.objectStore('households');
      const voterStore = tx.objectStore('voters');

      for (const hh of households) {
        hhStore.put(hh);
        if (hh.members && Array.isArray(hh.members)) {
          for (const m of hh.members) {
            voterStore.put({
              ...m,
              householdId: hh.id,
              houseNumber: hh.houseNumber,
              boothId: hh.boothId,
            });
          }
        }
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getHousehold(idOrCode: string): Promise<CachedHousehold | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('households', 'readonly');
      const store = tx.objectStore('households');
      const req = store.get(idOrCode);

      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result);
        } else {
          // Fallback search by code index
          const codeIndex = store.index('code');
          const codeReq = codeIndex.get(idOrCode);
          codeReq.onsuccess = () => resolve(codeReq.result || null);
          codeReq.onerror = () => reject(codeReq.error);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAllHouseholds(): Promise<CachedHousehold[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('households', 'readonly');
      const store = tx.objectStore('households');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // --- Tasks Store ---
  async saveTasks(tasks: CachedTask[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tasks', 'readwrite');
      const store = tx.objectStore('tasks');
      for (const t of tasks) {
        store.put(t);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAllTasks(): Promise<CachedTask[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tasks', 'readonly');
      const store = tx.objectStore('tasks');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // --- Offline Search across cached voters ---
  async searchCachedVoters(query: string): Promise<CachedVoter[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('voters', 'readonly');
      const store = tx.objectStore('voters');
      const req = store.getAll();

      req.onsuccess = () => {
        const all: CachedVoter[] = req.result || [];
        if (!query.trim()) {
          resolve(all.slice(0, 30));
          return;
        }
        const q = query.toLowerCase().trim();
        const matches = all.filter((v) => {
          return (
            (v.name && v.name.toLowerCase().includes(q)) ||
            (v.epicNumber && v.epicNumber.toLowerCase().includes(q)) ||
            (v.houseNumber && v.houseNumber.toLowerCase().includes(q))
          );
        });
        resolve(matches.slice(0, 50));
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- Pending Mutations Queue ---
  async enqueueMutation(mutation: PendingMutation): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pendingMutations', 'readwrite');
      const store = tx.objectStore('pendingMutations');
      const req = store.put(mutation);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getPendingMutations(): Promise<PendingMutation[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pendingMutations', 'readonly');
      const store = tx.objectStore('pendingMutations');
      const req = store.getAll();
      req.onsuccess = () => {
        const list: PendingMutation[] = req.result || [];
        // Sort in chronological FIFO order
        list.sort((a, b) => new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime());
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async updateMutationStatus(
    mutationId: string,
    status: PendingMutation['localStatus'],
    errorReason?: string
  ): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pendingMutations', 'readwrite');
      const store = tx.objectStore('pendingMutations');
      const getReq = store.get(mutationId);

      getReq.onsuccess = () => {
        const mut: PendingMutation = getReq.result;
        if (mut) {
          mut.localStatus = status;
          if (errorReason) mut.errorReason = errorReason;
          if (status === 'SYNCING') mut.attemptCount = (mut.attemptCount || 0) + 1;
          store.put(mut);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async removeMutation(mutationId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pendingMutations', 'readwrite');
      const store = tx.objectStore('pendingMutations');
      const req = store.delete(mutationId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async logSyncResult(result: SyncResultRecord): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncResults', 'readwrite');
      const store = tx.objectStore('syncResults');
      store.put(result);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Safe Cache Clean / Logout ---
  async clearOperationalCache(preservePendingQueue = true): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const stores = ['households', 'voters', 'tasks'];
      if (!preservePendingQueue) {
        stores.push('pendingMutations');
        stores.push('syncResults');
        stores.push('metadata');
      }
      const tx = db.transaction(stores, 'readwrite');
      for (const s of stores) {
        tx.objectStore(s).clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const offlineDB = new OfflineDB();
