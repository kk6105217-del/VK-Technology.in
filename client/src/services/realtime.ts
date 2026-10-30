/**
 * Real-time Live Catalog Synchronization for VK Technology
 * Synchronizes product, category, pricing, and inventory updates across
 * all active browser tabs, accounts, windows, and remote devices.
 * 
 * Supports:
 * 1. Server-Sent Events (SSE) from /api/events with auto-reconnect
 * 2. Cross-tab BroadcastChannel for zero-latency local tab synchronization
 * 3. Visibility-based refetching when user returns to tab
 * 4. Offline-to-online reconnection synchronization
 * 5. Periodic polling fallback via /api/products/sync/status
 */

export interface CatalogEvent {
  type: string;
  data?: any;
  catalogVersion?: number;
  catalogTimestamp?: string;
  timestamp?: number | string;
}

type CatalogUpdateListener = (event: CatalogEvent) => void;

class RealtimeSyncManager {
  private eventSource: EventSource | null = null;
  private listeners: Set<CatalogUpdateListener> = new Set();
  private reconnectTimer: any = null;
  private pollTimer: any = null;
  private isConnected = false;
  private channel: BroadcastChannel | null = null;
  private lastKnownVersion = 0;
  private lastKnownTimestamp = '';

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    // 1. Cross-tab BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('vk_catalog_channel');
        this.channel.onmessage = (e) => {
          if (e.data && e.data.type) {
            this.dispatchToListeners(e.data);
          }
        };
      } catch (err) {
        console.warn('[Realtime] BroadcastChannel unavailable:', err);
      }
    }

    // 2. Connect to server SSE
    this.connect();

    // 3. Tab visibility change: immediately re-verify sync status when focused
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkSyncStatus();
        this.dispatchToListeners({ type: 'TAB_FOCUSED' });
        if (!this.isConnected) {
          this.connect();
        }
      }
    });

    // 4. Online event: re-synchronize catalog when device reconnects to internet
    window.addEventListener('online', () => {
      this.checkSyncStatus();
      this.dispatchToListeners({ type: 'NETWORK_ONLINE' });
      this.connect();
    });

    // 5. Polling fallback every 10 seconds via lightweight status endpoint
    this.pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        this.checkSyncStatus();
      }
    }, 10000);
  }

  private connect() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
    }

    const apiBase = (import.meta as any).env?.VITE_API_URL || '/api';
    const streamUrl = `${apiBase}/events`;

    try {
      this.eventSource = new EventSource(streamUrl);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type && payload.type !== 'CONNECTED') {
            if (payload.catalogVersion) {
              this.lastKnownVersion = payload.catalogVersion;
            }
            if (payload.catalogTimestamp) {
              this.lastKnownTimestamp = payload.catalogTimestamp;
            }
            this.dispatchToListeners(payload);
          } else if (payload.type === 'CONNECTED') {
            if (payload.catalogVersion) {
              this.lastKnownVersion = payload.catalogVersion;
            }
            if (payload.lastCatalogUpdate) {
              this.lastKnownTimestamp = payload.lastCatalogUpdate;
            }
          }
        } catch (err) {
          console.warn('[Realtime] Parse error:', err);
        }
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        try {
          this.eventSource?.close();
        } catch {}
        this.eventSource = null;

        // Auto-reconnect with backoff
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 4000);
        }
      };
    } catch {
      this.isConnected = false;
    }
  }

  public async checkSyncStatus() {
    try {
      const apiBase = (import.meta as any).env?.VITE_API_URL || '/api';
      const res = await fetch(`${apiBase}/products/sync/status`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.catalogVersion) {
        if (this.lastKnownVersion > 0 && data.catalogVersion !== this.lastKnownVersion) {
          this.lastKnownVersion = data.catalogVersion;
          this.lastKnownTimestamp = data.lastUpdated || '';
          this.dispatchToListeners({
            type: 'CATALOG_CHANGED',
            data,
            catalogVersion: data.catalogVersion,
            catalogTimestamp: data.lastUpdated
          });
        } else {
          this.lastKnownVersion = data.catalogVersion;
          this.lastKnownTimestamp = data.lastUpdated || '';
        }
      }
    } catch {}
  }

  subscribe(listener: CatalogUpdateListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify(type: string, data: any = {}) {
    const eventObj: CatalogEvent = {
      type,
      data,
      timestamp: Date.now()
    };

    // 1. Notify in-memory listeners in this window
    this.dispatchToListeners(eventObj);

    // 2. Broadcast across tabs/windows via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(eventObj);
      } catch {}
    }
  }

  private dispatchToListeners(event: CatalogEvent) {
    this.listeners.forEach((fn) => {
      try {
        fn(event);
      } catch (e) {
        console.error('[Realtime] Listener callback error:', e);
      }
    });

    // Also dispatch a browser-wide DOM event
    try {
      window.dispatchEvent(
        new CustomEvent('vk_catalog_updated', {
          detail: event
        })
      );
    } catch {}
  }
}

export const realtimeSync = new RealtimeSyncManager();
