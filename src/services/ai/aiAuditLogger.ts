import { openDB, IDBPDatabase } from 'idb';
import { AiAuditLogEntry } from '../../types/aiTypes';

const AI_AUDIT_DB_NAME = 'pika-ai-audit-db';
const AI_AUDIT_STORE_NAME = 'audit-logs';
const AI_AUDIT_DB_VERSION = 1;

class AiAuditLogger {
  private inMemoryCache: AiAuditLogEntry[] = [];
  private dbPromise: Promise<IDBPDatabase<any>> | null = null;

  private async getDB(): Promise<IDBPDatabase<any> | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return null;
    }

    if (!this.dbPromise) {
      this.dbPromise = openDB(AI_AUDIT_DB_NAME, AI_AUDIT_DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(AI_AUDIT_STORE_NAME)) {
            const store = db.createObjectStore(AI_AUDIT_STORE_NAME, { keyPath: 'id' });
            store.createIndex('by-timestamp', 'timestamp');
            store.createIndex('by-modelId', 'modelId');
            store.createIndex('by-status', 'status');
          }
        },
      });
    }

    return this.dbPromise;
  }

  public async logEntry(entry: Omit<AiAuditLogEntry, 'id'>): Promise<string> {
    const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const fullEntry: AiAuditLogEntry = {
      ...entry,
      id,
    };

    this.inMemoryCache.unshift(fullEntry);
    if (this.inMemoryCache.length > 200) {
      this.inMemoryCache.pop();
    }

    try {
      const db = await this.getDB();
      if (db) {
        await db.put(AI_AUDIT_STORE_NAME, fullEntry);
      }
    } catch {
      // In-memory cache ensures continuity if IndexedDB fails
    }

    return id;
  }

  public async getLogById(id: string): Promise<AiAuditLogEntry | null> {
    const memoryMatch = this.inMemoryCache.find((l) => l.id === id);
    if (memoryMatch) return memoryMatch;

    try {
      const db = await this.getDB();
      if (db) {
        const entry = await db.get(AI_AUDIT_STORE_NAME, id);
        if (entry) return entry;
      }
    } catch {
      // Ignored
    }

    return null;
  }

  public async updateLog(id: string, updates: Partial<AiAuditLogEntry>): Promise<void> {
    const idx = this.inMemoryCache.findIndex((l) => l.id === id);
    if (idx !== -1) {
      this.inMemoryCache[idx] = { ...this.inMemoryCache[idx], ...updates };
    }

    try {
      const db = await this.getDB();
      if (db) {
        const existing = await db.get(AI_AUDIT_STORE_NAME, id);
        if (existing) {
          await db.put(AI_AUDIT_STORE_NAME, { ...existing, ...updates });
        }
      }
    } catch {
      // Ignored
    }
  }

  public async getRecentLogs(limit = 50): Promise<AiAuditLogEntry[]> {
    try {
      const db = await this.getDB();
      if (db) {
        const tx = db.transaction(AI_AUDIT_STORE_NAME, 'readonly');
        const index = tx.store.index('by-timestamp');
        const all = await index.getAll();
        all.reverse(); // most recent first
        return all.slice(0, limit);
      }
    } catch {
      // Fallback to in-memory
    }

    return this.inMemoryCache.slice(0, limit);
  }

  public async getLogsCount(): Promise<number> {
    try {
      const db = await this.getDB();
      if (db) {
        return await db.count(AI_AUDIT_STORE_NAME);
      }
    } catch {
      // Fallback
    }

    return this.inMemoryCache.length;
  }

  public async clearLogs(): Promise<void> {
    this.inMemoryCache = [];
    try {
      const db = await this.getDB();
      if (db) {
        await db.clear(AI_AUDIT_STORE_NAME);
      }
    } catch {
      // Ignored
    }
  }

  public async exportLogsAsJson(): Promise<string> {
    const logs = await this.getRecentLogs(500);
    return JSON.stringify(logs, null, 2);
  }

  public async exportLogsAsCsv(): Promise<string> {
    const logs = await this.getRecentLogs(500);
    const headers = ['Timestamp', 'Model', 'Provider', 'Type', 'Status', 'DurationMs', 'Tokens', 'UserMessage', 'ToolsInvoked'];
    const rows = logs.map((l) => [
      new Date(l.timestamp).toISOString(),
      `"${l.modelName.replace(/"/g, '""')}"`,
      l.provider,
      l.type,
      l.status,
      l.durationMs,
      l.totalTokens,
      `"${(l.userMessage || '').replace(/"/g, '""').substring(0, 100)}"`,
      `"${(l.toolsInvoked || []).map((t) => t.name).join('; ')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const aiAuditLogger = new AiAuditLogger();
