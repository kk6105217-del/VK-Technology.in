"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryRouter = void 0;
const express_1 = require("express");
const database_js_1 = require("../database.js");
const auth_js_1 = require("../middleware/auth.js");
const events_js_1 = require("../services/events.js");
exports.inventoryRouter = (0, express_1.Router)();
// Admin: Get stock movement audit ledger
exports.inventoryRouter.get('/movements', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        const { product_id, limit = 50 } = req.query;
        let sql = `
      SELECT 
        im.id,
        im.product_id,
        p.name as product_name,
        p.sku as product_sku,
        im.change_type,
        im.quantity_change,
        im.previous_quantity,
        im.new_quantity,
        im.reason,
        im.reference_id,
        im.created_by,
        im.created_at
      FROM inventory_movements im
      LEFT JOIN products p ON im.product_id = p.id
    `;
        const params = [];
        if (product_id) {
            sql += ' WHERE im.product_id = ?';
            params.push(product_id);
        }
        sql += ' ORDER BY im.id DESC LIMIT ?';
        params.push(Number(limit));
        const movements = database_js_1.db.prepare(sql).all(...params);
        res.json({ movements });
    }
    catch (error) {
        console.error('Failed to fetch inventory movements:', error);
        res.status(500).json({ error: 'Failed to retrieve inventory audit ledger.' });
    }
});
// Admin: Manual stock adjustment (Restock, Damage write-off, Return, Supplier delivery)
exports.inventoryRouter.post('/adjust', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        const { product_id, change_type = 'restock', quantity_change, reason, supplier_name } = req.body;
        if (!product_id || quantity_change === undefined || isNaN(Number(quantity_change))) {
            res.status(400).json({ error: 'Valid product_id and numeric quantity_change are required.' });
            return;
        }
        const prod = database_js_1.db.prepare('SELECT id, name, sku, stock_quantity FROM products WHERE id = ?').get(product_id);
        if (!prod) {
            res.status(404).json({ error: 'Product not found.' });
            return;
        }
        const prevQty = Number(prod.stock_quantity);
        const delta = Number(quantity_change);
        const newQty = Math.max(0, prevQty + delta);
        database_js_1.db.prepare(`
      UPDATE products 
      SET stock_quantity = ?, updated_at = datetime('now'), version = version + 1 
      WHERE id = ?
    `).run(newQty, product_id);
        const fullReason = [
            reason || 'Manual inventory adjustment by administrator',
            supplier_name ? `Supplier: ${supplier_name}` : null
        ].filter(Boolean).join(' • ');
        database_js_1.db.prepare(`
      INSERT INTO inventory_movements (
        product_id, change_type, quantity_change, previous_quantity, new_quantity, reason, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(product_id, change_type, delta, prevQty, newQty, fullReason, req.user?.email || 'Administrator');
        (0, database_js_1.recordAuditLog)(req.user?.email || 'admin@vktechnology.shop', 'STOCK_ADJUSTMENT', 'Product', product_id, { sku: prod.sku, name: prod.name, delta, previousStock: prevQty, newStock: newQty, reason: fullReason });
        events_js_1.eventBroadcaster.broadcast('PRODUCT_UPDATED', {
            action: 'stock_adjusted',
            productId: product_id,
            stock: newQty
        });
        res.json({
            success: true,
            message: `Stock for ${prod.name} successfully adjusted from ${prevQty} to ${newQty}.`,
            product: {
                id: product_id,
                name: prod.name,
                sku: prod.sku,
                previous_quantity: prevQty,
                stock_quantity: newQty
            }
        });
    }
    catch (error) {
        console.error('Failed to adjust stock:', error);
        res.status(500).json({ error: 'Failed to process inventory adjustment.' });
    }
});
