"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoSyncService = void 0;
const events_js_1 = require("./events.js");
class MongoSyncService {
    static isInitialized = false;
    /**
     * Initializes real-time synchronization hooks between MongoDB and clients
     */
    static init() {
        if (this.isInitialized)
            return;
        this.isInitialized = true;
        console.log('[MongoSync] Real-time website synchronization hooks established.');
    }
    /**
     * Dispatches catalog change notifications across the website
     */
    static notifyProductChange(type, productData) {
        console.log(`[MongoSync] Broadcasting product event: ${type} for product ID: ${productData?.id || productData?.sku}`);
        events_js_1.eventBroadcaster.broadcast(type, productData);
    }
    /**
     * Dispatches category change notifications
     */
    static notifyCategoryChange(type, categoryData) {
        console.log(`[MongoSync] Broadcasting category event: ${type} for category: ${categoryData?.slug}`);
        events_js_1.eventBroadcaster.broadcast(type, categoryData);
    }
    /**
     * Dispatches order status change notifications
     */
    static notifyOrderChange(type, orderData) {
        console.log(`[MongoSync] Broadcasting order event: ${type} for order: ${orderData?.order_number || orderData?.id}`);
        events_js_1.eventBroadcaster.broadcast(type, orderData);
    }
}
exports.MongoSyncService = MongoSyncService;
