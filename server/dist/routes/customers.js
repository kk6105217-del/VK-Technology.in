"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customersRouter = void 0;
const express_1 = require("express");
const database_js_1 = require("../database.js");
const auth_js_1 = require("../middleware/auth.js");
exports.customersRouter = (0, express_1.Router)();
// Admin: Get all customers with summary statistics
exports.customersRouter.get('/', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        const { search, status, page = 1, limit = 50 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        let whereClauses = ["u.role = 'customer'"];
        let params = [];
        if (search && typeof search === 'string' && search.trim()) {
            const pattern = `%${search.trim().toLowerCase()}%`;
            whereClauses.push('(LOWER(u.full_name) LIKE ? OR LOWER(u.email) LIKE ? OR u.phone LIKE ?)');
            params.push(pattern, pattern, pattern);
        }
        if (status === 'blocked') {
            whereClauses.push('u.is_blocked = 1');
        }
        else if (status === 'active') {
            whereClauses.push('(u.is_blocked = 0 OR u.is_blocked IS NULL)');
        }
        const whereSql = whereClauses.join(' AND ');
        const countRow = database_js_1.db.prepare(`SELECT COUNT(*) as total FROM users u WHERE ${whereSql}`).get(...params);
        const total = countRow?.total || 0;
        const customers = database_js_1.db.prepare(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        COALESCE(u.is_blocked, 0) as is_blocked,
        u.block_reason,
        u.created_at,
        u.updated_at,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(CASE WHEN o.order_status != 'Cancelled' THEN o.total_amount ELSE 0 END), 0) as total_spent,
        MAX(o.created_at) as last_order_date
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id
      WHERE ${whereSql}
      GROUP BY u.id
      ORDER BY u.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset);
        res.json({
            customers,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Failed to fetch customers:', error);
        res.status(500).json({ error: 'Failed to retrieve customers list.' });
    }
});
// Admin: Export customers list to CSV
exports.customersRouter.get('/export/csv', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        const customers = database_js_1.db.prepare(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        CASE WHEN u.is_blocked = 1 THEN 'Blocked' ELSE 'Active' END as account_status,
        u.block_reason,
        u.created_at as registered_at,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(CASE WHEN o.order_status != 'Cancelled' THEN o.total_amount ELSE 0 END), 0) as total_spent_inr
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id
      WHERE u.role = 'customer'
      GROUP BY u.id
      ORDER BY u.id DESC
    `).all();
        const headers = ['ID', 'Full Name', 'Email', 'Phone', 'Status', 'Block Reason', 'Registered At', 'Total Orders', 'Total Spent (INR)'];
        const rows = customers.map(c => [
            c.id,
            `"${(c.full_name || '').replace(/"/g, '""')}"`,
            `"${(c.email || '').replace(/"/g, '""')}"`,
            `"${c.phone || ''}"`,
            c.account_status,
            `"${(c.block_reason || '').replace(/"/g, '""')}"`,
            c.registered_at,
            c.total_orders,
            c.total_spent_inr
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=vktechnology-customers-${new Date().toISOString().slice(0, 10)}.csv`);
        res.send(csvContent);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to export customer report.' });
    }
});
// Admin: Get specific customer details with full order history and addresses
exports.customersRouter.get('/:id', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        const customerId = req.params.id;
        const user = database_js_1.db.prepare(`
      SELECT id, full_name, email, phone, role, COALESCE(is_blocked, 0) as is_blocked, block_reason, created_at, updated_at
      FROM users
      WHERE id = ?
    `).get(customerId);
        if (!user) {
            res.status(404).json({ error: 'Customer not found.' });
            return;
        }
        const orders = database_js_1.db.prepare(`
      SELECT id, order_number, total_amount, payment_method, payment_status, order_status, tracking_number, created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY id DESC
    `).all(customerId);
        const addresses = database_js_1.db.prepare(`
      SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC
    `).all(customerId);
        res.json({
            customer: user,
            orders,
            addresses
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch customer profile.' });
    }
});
// Admin: Block or Unblock Customer Account
exports.customersRouter.patch('/:id/status', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        const customerId = req.params.id;
        const { is_blocked, block_reason } = req.body;
        const user = database_js_1.db.prepare('SELECT id, email, full_name, role FROM users WHERE id = ?').get(customerId);
        if (!user) {
            res.status(404).json({ error: 'Customer not found.' });
            return;
        }
        if (user.role !== 'customer') {
            res.status(400).json({ error: 'Cannot block administrative or staff accounts through customer controls.' });
            return;
        }
        const blockedVal = is_blocked ? 1 : 0;
        const reasonVal = block_reason || (blockedVal ? 'Suspended by store administrator' : null);
        database_js_1.db.prepare(`
      UPDATE users 
      SET is_blocked = ?, block_reason = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(blockedVal, reasonVal, customerId);
        (0, database_js_1.recordAuditLog)(req.user?.email || 'admin@vktechnology.shop', blockedVal ? 'BLOCK_CUSTOMER' : 'UNBLOCK_CUSTOMER', 'User', customerId, { email: user.email, name: user.full_name, reason: reasonVal });
        res.json({
            success: true,
            message: blockedVal ? `Account for ${user.full_name} has been suspended.` : `Account for ${user.full_name} has been reactivated.`,
            is_blocked: blockedVal === 1,
            block_reason: reasonVal
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update customer status.' });
    }
});
