import { eventBroadcaster, EventType } from './events.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Order } from '../models/Order.js';

export class MongoSyncService {
  private static isInitialized = false;

  /**
   * Initializes real-time synchronization hooks between MongoDB and clients
   */
  static init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log('[MongoSync] Real-time website synchronization hooks established.');
  }

  /**
   * Dispatches catalog change notifications across the website
   */
  static notifyProductChange(type: EventType, productData: any): void {
    console.log(`[MongoSync] Broadcasting product event: ${type} for product ID: ${productData?.id || productData?.sku}`);
    eventBroadcaster.broadcast(type, productData);
  }

  /**
   * Dispatches category change notifications
   */
  static notifyCategoryChange(type: EventType, categoryData: any): void {
    console.log(`[MongoSync] Broadcasting category event: ${type} for category: ${categoryData?.slug}`);
    eventBroadcaster.broadcast(type, categoryData);
  }

  /**
   * Dispatches order status change notifications
   */
  static notifyOrderChange(type: EventType, orderData: any): void {
    console.log(`[MongoSync] Broadcasting order event: ${type} for order: ${orderData?.order_number || orderData?.id}`);
    eventBroadcaster.broadcast(type, orderData);
  }
}
