import { Router, Response } from 'express';
import { db } from '../database.js';
import { config } from '../config.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { sendOrderStatusUpdate } from '../services/notifications.js';

export const upiRouter = Router();

// Public: Get UPI QR payment configuration for checkout
upiRouter.get('/config', (req, res) => {
  try {
    const settingsRows = db.prepare(`
      SELECT key, value FROM website_settings 
      WHERE key IN ('upi_qr_enabled', 'upi_id', 'upi_payee_name', 'upi_qr_image_url', 'owner_whatsapp_number')
    `).all() as Array<{ key: string; value: string }>;

    const settingsMap: Record<string, string> = {};
    settingsRows.forEach(r => { settingsMap[r.key] = r.value; });

    res.json({
      enabled: settingsMap['upi_qr_enabled'] !== 'false',
      upi_id: settingsMap['upi_id'] || '8555997052@ybl',
      payee_name: settingsMap['upi_payee_name'] || 'VK Technology',
      qr_image_url: settingsMap['upi_qr_image_url'] || '',
      owner_whatsapp: settingsMap['owner_whatsapp_number'] || '+91 8555997052'
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch UPI configuration.' });
  }
});

// Admin: Get all UPI payment transactions for verification
upiRouter.get('/admin/all', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, search } = req.query;

    let conditions = ['1=1'];
    let params: any[] = [];

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

    const payments = db.prepare(sql).all(...params);

    // Summary stats
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN status = 'Pending Verification' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected_count,
        COALESCE(SUM(CASE WHEN status = 'Approved' THEN amount ELSE 0 END), 0) as approved_amount
      FROM upi_payments
    `).get();

    res.json({ payments, stats });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load UPI payment transactions.' });
  }
});

// Admin: Approve UPI Payment after manual verification against bank records
const handleApprovePayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentId = req.params.id;
    const adminEmail = req.user?.email || config.adminEmail;

    const payment = db.prepare('SELECT * FROM upi_payments WHERE id = ?').get(paymentId) as any;
    if (!payment) {
      res.status(404).json({ error: 'UPI payment record not found.' });
      return;
    }

    if (payment.status === 'Approved') {
      res.status(400).json({ error: 'This payment has already been verified and approved.' });
      return;
    }

    // 1. Update UPI payment status
    db.prepare(`
      UPDATE upi_payments SET
        status = 'Approved',
        verified_by = ?,
        verified_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(adminEmail, paymentId);

    // 2. Update parent Order status to Paid and Confirmed
    db.prepare(`
      UPDATE orders SET
        payment_status = 'Paid',
        order_status = 'Confirmed',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(payment.order_id);

    // 3. Record in Admin Audit Log
    db.prepare(`
      INSERT INTO admin_audit_logs (admin_email, action, target_type, target_id, details)
      VALUES (?, 'approve_upi_payment', 'upi_payment', ?, ?)
    `).run(
      adminEmail,
      String(paymentId),
      `Approved UPI payment for order #${payment.order_number} (Amount: ₹${payment.amount}, UTR: ${payment.utr_number})`
    );

    // 4. Notify customer of verification
    await sendOrderStatusUpdate(payment.order_id, 'Payment Verified & Confirmed');

    res.json({ message: 'UPI payment successfully verified and marked as Paid.' });
  } catch (error: any) {
    console.error('Approval error:', error);
    res.status(500).json({ error: 'Failed to approve payment.' });
  }
};
upiRouter.post('/admin/:id/approve', authenticateToken, requireAdmin, handleApprovePayment);
upiRouter.patch('/admin/:id/approve', authenticateToken, requireAdmin, handleApprovePayment);
upiRouter.post('/:id/approve', authenticateToken, requireAdmin, handleApprovePayment);
upiRouter.patch('/:id/approve', authenticateToken, requireAdmin, handleApprovePayment);
upiRouter.post('/payments/:id/approve', authenticateToken, requireAdmin, handleApprovePayment);
upiRouter.patch('/payments/:id/approve', authenticateToken, requireAdmin, handleApprovePayment);

// Admin: Reject UPI Payment
const handleRejectPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentId = req.params.id;
    const { reason, notes } = req.body;
    const adminEmail = req.user?.email || config.adminEmail;

    const payment = db.prepare('SELECT * FROM upi_payments WHERE id = ?').get(paymentId) as any;
    if (!payment) {
      res.status(404).json({ error: 'UPI payment record not found.' });
      return;
    }

    const rejectionReason = reason || 'Payment could not be verified in bank records';

    // 1. Update UPI payment
    db.prepare(`
      UPDATE upi_payments SET
        status = 'Rejected',
        admin_notes = ?,
        verified_by = ?,
        verified_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(`${rejectionReason}${notes ? ` - ${notes}` : ''}`, adminEmail, paymentId);

    // 2. Update order payment status to Failed
    db.prepare(`
      UPDATE orders SET
        payment_status = 'Failed',
        notes = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(`UPI Payment Rejected: ${rejectionReason}`, payment.order_id);

    // 3. Record Audit Log
    db.prepare(`
      INSERT INTO admin_audit_logs (admin_email, action, target_type, target_id, details)
      VALUES (?, 'reject_upi_payment', 'upi_payment', ?, ?)
    `).run(
      adminEmail,
      String(paymentId),
      `Rejected UPI payment for order #${payment.order_number} (UTR: ${payment.utr_number}). Reason: ${rejectionReason}`
    );

    res.json({ message: 'UPI payment rejected.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reject payment.' });
  }
};
upiRouter.post('/admin/:id/reject', authenticateToken, requireAdmin, handleRejectPayment);
upiRouter.patch('/admin/:id/reject', authenticateToken, requireAdmin, handleRejectPayment);
upiRouter.post('/:id/reject', authenticateToken, requireAdmin, handleRejectPayment);
upiRouter.patch('/:id/reject', authenticateToken, requireAdmin, handleRejectPayment);
upiRouter.post('/payments/:id/reject', authenticateToken, requireAdmin, handleRejectPayment);
upiRouter.patch('/payments/:id/reject', authenticateToken, requireAdmin, handleRejectPayment);

// Admin: Add or update internal note on UPI payment
upiRouter.put('/admin/:id/note', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentId = req.params.id;
    const { admin_notes } = req.body;

    db.prepare(`
      UPDATE upi_payments SET
        admin_notes = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(admin_notes || null, paymentId);

    res.json({ message: 'Internal note saved.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to save internal note.' });
  }
});

// Admin: Get Audit Trail
upiRouter.get('/admin/audit-logs', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = db.prepare('SELECT * FROM admin_audit_logs ORDER BY id DESC LIMIT 100').all();
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load audit logs.' });
  }
});
