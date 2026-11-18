"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upiRouter = void 0;
const express_1 = require("express");
const database_js_1 = require("../database.js");
const config_js_1 = require("../config.js");
const auth_js_1 = require("../middleware/auth.js");
const notifications_js_1 = require("../services/notifications.js");
exports.upiRouter = (0, express_1.Router)();
// Public: Get UPI QR payment configuration for checkout
exports.upiRouter.get('/config', (req, res) => {
    try {
        const settingsRows = database_js_1.db.prepare(`
      SELECT key, value FROM website_settings 
      WHERE key IN ('upi_qr_enabled', 'upi_id', 'upi_payee_name', 'upi_qr_image_url', 'owner_whatsapp_number')
    `).all();
        const settingsMap = {};
        settingsRows.forEach(r => { settingsMap[r.key] = r.value; });
        res.json({
            enabled: settingsMap['upi_qr_enabled'] !== 'false',
            upi_id: settingsMap['upi_id'] || '8555997052@ybl',
            payee_name: settingsMap['upi_payee_name'] || 'VK Technology',
            qr_image_url: settingsMap['upi_qr_image_url'] || '',
            owner_whatsapp: settingsMap['owner_whatsapp_number'] || '+91 8555997052'
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch UPI configuration.' });
    }
});
// Admin: Get all UPI payment transactions for verification
exports.upiRouter.get('/admin/all', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        const { status, search } = req.query;
        let conditions = ['1=1'];
        let params = [];
        if (status && status !== 'all') {
            conditions.push('u.status = ?');
            params.push(status);
        }
        if (search && typeof search === 'string') {
            conditions.push('(u.order_number LIKE ? OR u.utr_number LIKE ? OR u.customer_name LIKE ? OR u.customer_phone LIKE ?)');
            const s = `%${search.trim()}%`;
            params.push(s, s, s, s);
        }
        const whereClause = conditions.join(' AND ');
        const sql = `
      SELECT u.*, o.order_status, o.total_amount, o.created_at as order_created_at
      FROM upi_payments u
      JOIN orders o ON u.order_id = o.id
      WHERE ${whereClause}
      ORDER BY u.id DESC
    `;
        const payments = database_js_1.db.prepare(sql).all(...params);
        // Summary stats
        const stats = database_js_1.db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN status = 'Pending Verification' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected_count,
        COALESCE(SUM(CASE WHEN status = 'Approved' THEN amount ELSE 0 END), 0) as approved_amount
      FROM upi_payments
    `).get();
        res.json({ payments, stats });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to load UPI payment transactions.' });
    }
});
// Admin: Approve UPI Payment after manual verification against bank records
const handleApprovePayment = async (req, res) => {
    try {
        const paymentId = req.params.id;
        const adminEmail = req.user?.email || config_js_1.config.adminEmail;
        const payment = database_js_1.db.prepare('SELECT * FROM upi_payments WHERE id = ?').get(paymentId);
        if (!payment) {
            res.status(404).json({ error: 'UPI payment record not found.' });
            return;
        }
        if (payment.status === 'Approved') {
            res.status(400).json({ error: 'This payment has already been verified and approved.' });
            return;
        }
        // 1. Update UPI payment status
        database_js_1.db.prepare(`
      UPDATE upi_payments SET
        status = 'Approved',
        verified_by = ?,
        verified_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(adminEmail, paymentId);
        // 2. Update parent Order status to Paid and Confirmed
        database_js_1.db.prepare(`
      UPDATE orders SET
        payment_status = 'Paid',
        order_status = 'Confirmed',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(payment.order_id);
        // 3. Record in Admin Audit Log
        database_js_1.db.prepare(`
      INSERT INTO admin_audit_logs (admin_email, action, target_type, target_id, details)
      VALUES (?, 'approve_upi_payment', 'upi_payment', ?, ?)
    `).run(adminEmail, String(paymentId), `Approved UPI payment for order #${payment.order_number} (Amount: ₹${payment.amount}, UTR: ${payment.utr_number})`);
        // 4. Notify customer of verification and dispatch confirmed order notifications
        await (0, notifications_js_1.sendOrderStatusUpdate)(payment.order_id, 'Payment Verified & Confirmed');
        (0, notifications_js_1.dispatchOrderNotifications)(payment.order_id).catch(e => console.warn('[UPI Notification Dispatch Warning]:', e.message));
        res.json({ message: 'UPI payment successfully verified and marked as Paid.' });
    }
    catch (error) {
        console.error('Approval error:', error);
        res.status(500).json({ error: 'Failed to approve payment.' });
    }
};
exports.upiRouter.post('/admin/:id/approve', auth_js_1.authenticateToken, auth_js_1.requireAdmin, handleApprovePayment);
exports.upiRouter.patch('/admin/:id/approve', auth_js_1.authenticateToken, auth_js_1.requireAdmin, handleApprovePayment);
exports.upiRouter.post('/:id/approve', auth_js_1.authenticateToken, auth_js_1.requireAdmin, handleApprovePayment);
exports.upiRouter.patch('/:id/approve', auth_js_1.authenticateToken, auth_js_1.requireAdmin, handleApprovePayment);
exports.upiRouter.post('/payments/:id/approve', auth_js_1.authenticateToken, auth_js_1.requireAdmin, handleApprovePayment);
exports.upiRouter.patch('/payments/:id/approve', auth_js_1.authenticateToken, auth_js_1.requireAdmin, handleApprovePayment);
// Admin: Reject UPI Payment
const handleRejectPayment = async (req, res) => {
    try {
        const paymentId = req.params.id;
        const { reason, notes } = req.body;
        const adminEmail = req.user?.email || config_js_1.config.adminEmail;
        const payment = database_js_1.db.prepare('SELECT * FROM upi_payments WHERE id = ?').get(paymentId);
        if (!payment) {
            res.status(404).json({ error: 'UPI payment record not found.' });
            return;
        }
        const rejectionReason = reason || 'Payment could not be verified in bank records';
        // 1. Update UPI payment
        database_js_1.db.prepare(`
      UPDATE upi_payments SET
        status = 'Rejected',
        admin_notes = ?,
        verified_by = ?,
        verified_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(`${rejectionReason}${notes ? ` - ${notes}` : ''}`, adminEmail, paymentId);
        // 2. Update order payment status to Failed
        database_js_1.db.prepare(`
      UPDATE orders SET
        payment_status = 'Failed',
        notes = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(`UPI Payment Rejected: ${rejectionReason}`, payment.order_id);
        // 3. Record Audit Log
        database_js_1.db.prepare(`
      INSERT INTO admin_audit_logs (admin_email, action, target_type, target_id, details)
      VALUES (?, 'reject_upi_payment', 'upi_payment', ?, ?)
    `).run(adminEmail, String(paymentId), `Rejected UPI payment for order #${payment.order_number} (UTR: ${payment.utr_number}). Reason: ${rejectionReason}`);
        res.json({ message: 'UPI payment rejected.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to reject payment.' });
    }
};
exports.upiRouter.post('/admin/:id/reject', auth_js_1.authenticateToken, auth_js_1.requireAdmin, handleRejectPayment);
exports.upiRouter.patch('/admin/:id/reject', auth_js_1.authenticateToken, auth_js_1.requireAdmin, handleRejectPayment);
exports.upiRouter.post('/:id/reject', auth_js_1.authenticateToken, auth_js_1.requireAdmin, handleRejectPayment);
exports.upiRouter.patch('/:id/reject', auth_js_1.authenticateToken, auth_js_1.requireAdmin, handleRejectPayment);
exports.upiRouter.post('/payments/:id/reject', auth_js_1.authenticateToken, auth_js_1.requireAdmin, handleRejectPayment);
exports.upiRouter.patch('/payments/:id/reject', auth_js_1.authenticateToken, auth_js_1.requireAdmin, handleRejectPayment);
// Admin: Add or update internal note on UPI payment
exports.upiRouter.put('/admin/:id/note', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        const paymentId = req.params.id;
        const { admin_notes } = req.body;
        database_js_1.db.prepare(`
      UPDATE upi_payments SET
        admin_notes = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(admin_notes || null, paymentId);
        res.json({ message: 'Internal note saved.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to save internal note.' });
    }
});
// Admin: Get Audit Trail
exports.upiRouter.get('/admin/audit-logs', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        const logs = database_js_1.db.prepare('SELECT * FROM admin_audit_logs ORDER BY id DESC LIMIT 100').all();
        res.json({ logs });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to load audit logs.' });
    }
});
