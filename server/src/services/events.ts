import { Response } from 'express';

export type EventType =
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED'
  | 'PRICE_CHANGED'
  | 'STOCK_CHANGED'
  | 'CATEGORY_UPDATED'
  | 'BANNER_UPDATED'
  | 'ORDER_STATUS_CHANGED'
  | 'SETTINGS_UPDATED';

class EventBroadcaster {
  private clients: Map<string, Response> = new Map();
  private catalogVersion: number = 1;
  private lastCatalogUpdate: string = new Date().toISOString();

  addClient(id: string, res: Response) {
    this.clients.set(id, res);
    // Send initial connection confirmation with current catalog sync metadata
    res.write(`data: ${JSON.stringify({
      type: 'CONNECTED',
      clientId: id,
      catalogVersion: this.catalogVersion,
      lastCatalogUpdate: this.lastCatalogUpdate,
      timestamp: new Date().toISOString()
    })}\n\n`);
  }

  removeClient(id: string) {
    this.clients.delete(id);
  }

  markCatalogUpdated(): { version: number; timestamp: string } {
    this.catalogVersion += 1;
    this.lastCatalogUpdate = new Date().toISOString();
    return {
      version: this.catalogVersion,
      timestamp: this.lastCatalogUpdate
    };
  }

  getCatalogSyncStatus(): { catalogVersion: number; lastUpdated: string; serverTime: string } {
    return {
      catalogVersion: this.catalogVersion,
      lastUpdated: this.lastCatalogUpdate,
      serverTime: new Date().toISOString()
    };
  }

  broadcast(type: EventType, data: any) {
    const meta = this.markCatalogUpdated();
    const payload = JSON.stringify({
      type,
      data,
      catalogVersion: meta.version,
      catalogTimestamp: meta.timestamp,
      timestamp: meta.timestamp
    });

    for (const [id, res] of this.clients.entries()) {
      try {
        res.write(`data: ${payload}\n\n`);
      } catch (err) {
        this.clients.delete(id);
      }
    }
  }

  sendHeartbeat() {
    for (const [id, res] of this.clients.entries()) {
      try {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      } catch {
        this.clients.delete(id);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const eventBroadcaster = new EventBroadcaster();

// Keep SSE streams alive across proxies / Vercel Edge with a 15-second heartbeat
setInterval(() => {
  eventBroadcaster.sendHeartbeat();
}, 15000);
