"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBroadcaster = void 0;
class EventBroadcaster {
    clients = new Map();
    catalogVersion = 1;
    lastCatalogUpdate = new Date().toISOString();
    addClient(id, res) {
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
    removeClient(id) {
        this.clients.delete(id);
    }
    markCatalogUpdated() {
        this.catalogVersion += 1;
        this.lastCatalogUpdate = new Date().toISOString();
        return {
            version: this.catalogVersion,
            timestamp: this.lastCatalogUpdate
        };
    }
    getCatalogSyncStatus() {
        return {
            catalogVersion: this.catalogVersion,
            lastUpdated: this.lastCatalogUpdate,
            serverTime: new Date().toISOString()
        };
    }
    broadcast(type, data) {
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
            }
            catch (err) {
                this.clients.delete(id);
            }
        }
    }
    sendHeartbeat() {
        for (const [id, res] of this.clients.entries()) {
            try {
                res.write(`: heartbeat ${Date.now()}\n\n`);
            }
            catch {
                this.clients.delete(id);
            }
        }
    }
    getClientCount() {
        return this.clients.size;
    }
}
exports.eventBroadcaster = new EventBroadcaster();
// Keep SSE streams alive across proxies / Vercel Edge with a 15-second heartbeat
setInterval(() => {
    exports.eventBroadcaster.sendHeartbeat();
}, 15000);
