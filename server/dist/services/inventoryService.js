"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const Inventory_js_1 = require("../models/Inventory.js");
const Product_js_1 = require("../models/Product.js");
const database_js_1 = require("../config/database.js");
const database_js_2 = require("../database.js");
class InventoryService {
    /**
     * Atomically reserves stock for an order using MongoDB condition checking ($gte)
     * Prevents concurrent race conditions and overselling
     */
    static async reserveStock(items, orderId, performedBy = 'Checkout Service') {
        if (!(0, database_js_1.isMongoConnected)()) {
            // Hybrid fallback: check SQLite stock
            for (const item of items) {
                try {
                    const prod = database_js_2.db.prepare('SELECT id, stock_quantity FROM products WHERE id = ?').get(item.productId);
                    if (!prod || prod.stock_quantity < item.quantity) {
                        return { success: false, failedItem: item };
                    }
                }
                catch {
                    return { success: false, failedItem: item };
                }
            }
            return { success: true };
        }
        const reservedSoFar = [];
        for (const item of items) {
            // Atomic find and update with guard: available_quantity >= item.quantity
            const updated = await Inventory_js_1.Inventory.findOneAndUpdate({
                product_id: item.productId,
                available_quantity: { $gte: item.quantity },
            }, {
                $inc: {
                    available_quantity: -item.quantity,
                    reserved_quantity: item.quantity,
                },
                $push: {
                    movements: {
                        movement_type: 'reservation',
                        quantity_changed: -item.quantity,
                        previous_stock: 0, // Placeholder
                        new_stock: 0,
                        reference_id: orderId,
                        reference_type: 'ORDER',
                        notes: `Atomic reservation for Order #${orderId}`,
                        performed_by: performedBy,
                        timestamp: new Date(),
                    },
                },
            }, { new: true });
            if (!updated) {
                // Rollback any items already reserved for this order
                await this.releaseStock(reservedSoFar, orderId, 'Reservation Rollback');
                return { success: false, failedItem: item };
            }
            // Also sync stock_quantity on Product document
            await Product_js_1.Product.updateOne({ id: item.productId }, { $inc: { stock_quantity: -item.quantity } });
            reservedSoFar.push(item);
        }
        return { success: true };
    }
    /**
     * Releases previously reserved stock on order cancellation or payment failure
     */
    static async releaseStock(items, orderId, performedBy = 'Order Cancellation') {
        if (!(0, database_js_1.isMongoConnected)())
            return;
        for (const item of items) {
            await Inventory_js_1.Inventory.updateOne({ product_id: item.productId }, {
                $inc: {
                    available_quantity: item.quantity,
                    reserved_quantity: -item.quantity,
                },
                $push: {
                    movements: {
                        movement_type: 'cancellation',
                        quantity_changed: item.quantity,
                        previous_stock: 0,
                        new_stock: 0,
                        reference_id: orderId,
                        reference_type: 'ORDER',
                        notes: `Stock released due to cancellation of Order #${orderId}`,
                        performed_by: performedBy,
                        timestamp: new Date(),
                    },
                },
            });
            await Product_js_1.Product.updateOne({ id: item.productId }, { $inc: { stock_quantity: item.quantity } });
        }
    }
    /**
     * Permanently marks stock as sold once payment is settled
     */
    static async confirmSale(items, orderId, performedBy = 'Payment Gateway') {
        if (!(0, database_js_1.isMongoConnected)())
            return;
        for (const item of items) {
            await Inventory_js_1.Inventory.updateOne({ product_id: item.productId }, {
                $inc: {
                    reserved_quantity: -item.quantity,
                    sold_quantity: item.quantity,
                },
                $push: {
                    movements: {
                        movement_type: 'sale',
                        quantity_changed: -item.quantity,
                        previous_stock: 0,
                        new_stock: 0,
                        reference_id: orderId,
                        reference_type: 'ORDER',
                        notes: `Stock finalized for paid Order #${orderId}`,
                        performed_by: performedBy,
                        timestamp: new Date(),
                    },
                },
            });
        }
    }
}
exports.InventoryService = InventoryService;
