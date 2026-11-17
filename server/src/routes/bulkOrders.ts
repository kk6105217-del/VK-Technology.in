import { Router, Request, Response } from 'express';
import { BulkOrder } from '../models/BulkOrder.js';
import { isMongoConnected } from '../config/database.js';
import { authenticateToken } from '../middleware/authenticate.js';
import { requireAdminRole } from '../middleware/authorize.js';
import { AuditService } from '../services/auditService.js';
import { db } from '../database.js';

export const bulkOrdersRouter = Router();

// Submit Bulk Order Inquiry (Public)
bulkOrdersRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      institution_name,
      contact_person,
      email,
      phone,
      product_requirements,
      quantity,
      gstin,
    } = req.body || {};

    if (!institution_name || !contact_person || !email || !phone || !product_requirements) {
      res.status(400).json({
        error: 'Please provide institution name, contact person, email, phone, and component requirements.',
      });
      return;
    }

    const cleanInst = String(institution_name).trim();
    const cleanPerson = String(contact_person).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = String(phone).trim();
    const cleanReqs = String(product_requirements).trim();
    const qty = parseInt(String(quantity || '1'), 10);
    const cleanGst = gstin ? String(gstin).trim().toUpperCase() : null;

    let inquiryId: string | number = '';

    if (isMongoConnected()) {
      const order = await BulkOrder.create({
        institution_name: cleanInst,
        contact_person: cleanPerson,
        email: cleanEmail,
        phone: cleanPhone,
        product_requirements: cleanReqs,
        quantity: qty,
        gst_details: cleanGst ? { gstin: cleanGst } : undefined,
        approval_status: 'pending',
        order_status: 'inquiry',
      });
      inquiryId = order._id.toString();
    }

    try {
      const resSql = db.prepare(`
        INSERT INTO bulk_orders (
          institution_name, contact_person, email, phone, product_requirements, quantity, gstin, approval_status, order_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'inquiry', datetime('now'), datetime('now'))
      `).run(cleanInst, cleanPerson, cleanEmail, cleanPhone, cleanReqs, qty, cleanGst);
      if (!inquiryId) inquiryId = Number(resSql.lastInsertRowid);
    } catch (sqlErr) {
      // Non-critical if table doesn't exist
    }

    res.status(201).json({
      success: true,
      message: 'Your bulk order requirement has been received. Our engineering team in Pedamiram will review and dispatch a discounted quotation within 24 hours.',
      inquiryId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit bulk order' });
  }
});

// List Bulk Orders (Admin)
bulkOrdersRouter.get('/admin', authenticateToken, requireAdminRole(), async (req: Request, res: Response) => {
  if (isMongoConnected()) {
    try {
      const orders = await BulkOrder.find().sort({ created_at: -1 }).lean();
      res.json({ bulkOrders: orders });
      return;
    } catch (err: any) {
      // Fallback to SQLite
    }
  }

  try {
    const orders = db.prepare('SELECT * FROM bulk_orders ORDER BY id DESC').all();
    res.json({ bulkOrders: orders });
  } catch (err: any) {
    res.json({ bulkOrders: [] });
  }
});

// Update Bulk Order Status / Quotation (Admin)
bulkOrdersRouter.patch('/admin/:id', authenticateToken, requireAdminRole(), async (req: any, res: Response) => {
  const { approval_status, order_status, quotation_amount, notes } = req.body || {};
  const id = req.params.id;

  if (isMongoConnected()) {
    try {
      const updated = await BulkOrder.findByIdAndUpdate(
        id,
        {
          ...(approval_status ? { approval_status } : {}),
          ...(order_status ? { order_status } : {}),
          ...(quotation_amount !== undefined ? { quotation_amount: Number(quotation_amount) } : {}),
          ...(notes ? { notes } : {}),
        },
        { new: true }
      );

      if (updated) {
        await AuditService.log({
          adminEmail: req.user?.email || 'admin@vktechnology.shop',
          action: 'BULK_ORDER_UPDATE',
          resourceType: 'Order',
          resourceId: id,
          changeSummary: {
            after: { approval_status, order_status, quotation_amount },
          },
        });
        res.json({ success: true, bulkOrder: updated });
        return;
      }
    } catch {}
  }

  try {
    db.prepare(`
      UPDATE bulk_orders SET
        approval_status = COALESCE(?, approval_status),
        order_status = COALESCE(?, order_status),
        quotation_amount = COALESCE(?, quotation_amount),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      approval_status !== undefined ? approval_status : null,
      order_status !== undefined ? order_status : null,
      quotation_amount !== undefined ? Number(quotation_amount) : null,
      notes !== undefined ? notes : null,
      id
    );

    const updated = db.prepare('SELECT * FROM bulk_orders WHERE id = ?').get(id);
    res.json({ success: true, bulkOrder: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update bulk order' });
  }
});
