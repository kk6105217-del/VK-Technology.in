"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRouter = void 0;
const express_1 = require("express");
const database_js_1 = require("../database.js");
const auth_js_1 = require("../middleware/auth.js");
exports.settingsRouter = (0, express_1.Router)();
// Public: Get all store settings
exports.settingsRouter.get('/', (req, res) => {
    try {
        const rows = database_js_1.db.prepare('SELECT key, value FROM website_settings').all();
        const settings = {};
        rows.forEach(r => { settings[r.key] = r.value; });
        res.json({ settings });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings.' });
    }
});
// Admin: Update store settings
const handleUpdateSettings = (req, res) => {
    try {
        const raw = req.body;
        const settings = (raw && typeof raw === 'object' && raw.settings) ? raw.settings : raw;
        const updateStmt = database_js_1.db.prepare(`
      INSERT INTO website_settings (key, value, updated_at) 
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `);
        for (const [key, val] of Object.entries(settings)) {
            if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
                updateStmt.run(key, String(val));
            }
        }
        res.json({ message: 'Settings updated successfully.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update settings.' });
    }
};
exports.settingsRouter.put('/admin', auth_js_1.authenticateToken, auth_js_1.requireAdmin, handleUpdateSettings);
exports.settingsRouter.put('/', auth_js_1.authenticateToken, auth_js_1.requireAdmin, handleUpdateSettings);
// Admin: Dashboard Statistics
exports.settingsRouter.get('/admin/stats', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        // 1. Sales & Order Counts
        const orderStats = database_js_1.db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN payment_status = 'Paid' OR (payment_method = 'cod' AND order_status != 'Cancelled') THEN total_amount ELSE 0 END), 0) as total_sales,
        COUNT(CASE WHEN order_status IN ('Pending Payment', 'Processing', 'Packed') THEN 1 END) as pending_orders,
        COUNT(CASE WHEN order_status = 'Delivered' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN order_status = 'Cancelled' THEN 1 END) as cancelled_orders
      FROM orders
    `).get();
        // 2. Inventory Stats
        const productStats = database_js_1.db.prepare(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN stock_quantity <= 5 AND stock_quantity > 0 THEN 1 END) as low_stock_products,
        COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock_products
      FROM products
      WHERE is_active = 1
    `).get();
        // 3. Recent Orders
        const recentOrders = database_js_1.db.prepare(`
      SELECT id, order_number, customer_name, total_amount, payment_status, order_status, created_at
      FROM orders
      ORDER BY id DESC
      LIMIT 8
    `).all();
        // 4. Best Selling Products
        const bestSellers = database_js_1.db.prepare(`
      SELECT 
        p.id, p.name, p.slug, p.regular_price, p.discounted_price, p.stock_quantity, p.rating_avg,
        COALESCE(SUM(oi.quantity), 0) as units_sold,
        (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC LIMIT 1) as image_url
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      GROUP BY p.id
      ORDER BY units_sold DESC, p.view_count DESC
      LIMIT 5
    `).all();
        // 5. Daily Sales History (Past 14 Days)
        const dailySales = database_js_1.db.prepare(`
      SELECT 
        date(created_at) as sale_date,
        COUNT(*) as orders_count,
        COALESCE(SUM(total_amount), 0) as total_revenue
      FROM orders
      WHERE created_at >= date('now', '-14 days')
      GROUP BY date(created_at)
      ORDER BY sale_date ASC
    `).all();
        res.json({
            stats: {
                total_sales: Math.round(orderStats.total_sales * 100) / 100,
                total_orders: orderStats.total_orders,
                pending_orders: orderStats.pending_orders,
                completed_orders: orderStats.completed_orders,
                cancelled_orders: orderStats.cancelled_orders,
                total_products: productStats.total_products,
                low_stock_products: productStats.low_stock_products,
                out_of_stock_products: productStats.out_of_stock_products
            },
            recentOrders,
            bestSellers,
            dailySales
        });
    }
    catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to calculate dashboard statistics.' });
    }
});
// Admin: Sales Report CSV Export
exports.settingsRouter.get('/admin/sales-report-csv', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        const reportData = database_js_1.db.prepare(`
      SELECT 
        date(created_at) as sale_date,
        COUNT(*) as orders_count,
        COALESCE(SUM(subtotal), 0) as total_subtotal,
        COALESCE(SUM(discount_amount), 0) as total_discounts,
        COALESCE(SUM(shipping_fee), 0) as total_shipping_revenue,
        COALESCE(SUM(total_amount), 0) as net_sales
      FROM orders
      GROUP BY date(created_at)
      ORDER BY sale_date DESC
    `).all();
        const headers = ['Date', 'Total Orders', 'Subtotal (INR)', 'Discounts (INR)', 'Shipping (INR)', 'Net Sales (INR)'];
        const rows = reportData.map(r => [
            r.sale_date,
            r.orders_count,
            r.total_subtotal,
            r.total_discounts,
            r.total_shipping_revenue,
            r.net_sales
        ].join(','));
        const csvContent = [headers.join(','), ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=vk_technology_sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
        res.send(csvContent);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to export sales report.' });
    }
});
