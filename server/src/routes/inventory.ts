import { Router, Response } from 'express';
import { db, recordAuditLog } from '../database.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { eventBroadcaster } from '../services/events.js';

export const inventoryRouter = Router();

// Admin: Get stock movement audit ledger
inventoryRouter.get('/movements', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
    const params: any[] = [];

    if (product_id) {
      sql += ' WHERE im.product_id = ?';
      params.push(product_id);
    }

    sql += ' ORDER BY im.id DESC LIMIT ?';
    params.push(Number(limit));

    const movements = db.prepare(sql).all(...params);

    res.json({ movements });
  } catch (error: any) {
    console.error('Failed to fetch inventory movements:', error);
    res.status(500).json({ error: 'Failed to retrieve inventory audit ledger.' });
  }
});

// Admin: Manual stock adjustment (Restock, Damage write-off, Return, Supplier delivery)
inventoryRouter.post('/adjust', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { product_id, change_type = 'restock', quantity_change, reason, supplier_name } = req.body;

    if (!product_id || quantity_change === undefined || isNaN(Number(quantity_change))) {
      res.status(400).json({ error: 'Valid product_id and numeric quantity_change are required.' });
      return;
    }

    const prod = db.prepare('SELECT id, name, sku, stock_quantity FROM products WHERE id = ?').get(product_id) as any;
    if (!prod) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const prevQty = Number(prod.stock_quantity);
    const delta = Number(quantity_change);
    const newQty = Math.max(0, prevQty + delta);

    db.prepare(`
      UPDATE products 
      SET stock_quantity = ?, updated_at = datetime('now'), version = version + 1 
      WHERE id = ?
    `).run(newQty, product_id);

    const fullReason = [
      reason || 'Manual inventory adjustment by administrator',
      supplier_name ? `Supplier: ${supplier_name}` : null
    ].filter(Boolean).join(' • ');

    db.prepare(`
      INSERT INTO inventory_movements (
        product_id, change_type, quantity_change, previous_quantity, new_quantity, reason, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      product_id,
      change_type,
      delta,
      prevQty,
      newQty,
      fullReason,
      req.user?.email || 'Administrator'
    );

    recordAuditLog(
      req.user?.email || 'admin@vktechnology.shop',
      'STOCK_ADJUSTMENT',
      'Product',
      product_id,
      { sku: prod.sku, name: prod.name, delta, previousStock: prevQty, newStock: newQty, reason: fullReason }
    );

    eventBroadcaster.broadcast('PRODUCT_UPDATED', {
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
  } catch (error: any) {
    console.error('Failed to adjust stock:', error);
    res.status(500).json({ error: 'Failed to process inventory adjustment.' });
  }
});
