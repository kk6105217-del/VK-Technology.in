"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkOrdersRouter = void 0;
const express_1 = require("express");
const BulkOrder_js_1 = require("../models/BulkOrder.js");
const database_js_1 = require("../config/database.js");
const authenticate_js_1 = require("../middleware/authenticate.js");
const authorize_js_1 = require("../middleware/authorize.js");
const auditService_js_1 = require("../services/auditService.js");
const database_js_2 = require("../database.js");
exports.bulkOrdersRouter = (0, express_1.Router)();
// Submit Bulk Order Inquiry (Public)
exports.bulkOrdersRouter.post('/', async (req, res) => {
    try {
        const { institution_name, contact_person, email, phone, product_requirements, quantity, gstin, } = req.body || {};
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
        let inquiryId = '';
        if ((0, database_js_1.isMongoConnected)()) {
            const order = await BulkOrder_js_1.BulkOrder.create({
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
            const resSql = database_js_2.db.prepare(`
        INSERT INTO bulk_orders (
          institution_name, contact_person, email, phone, product_requirements, quantity, gstin, approval_status, order_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'inquiry', datetime('now'), datetime('now'))
      `).run(cleanInst, cleanPerson, cleanEmail, cleanPhone, cleanReqs, qty, cleanGst);
            if (!inquiryId)
                inquiryId = Number(resSql.lastInsertRowid);
        }
        catch (sqlErr) {
            // Non-critical if table doesn't exist
        }
        res.status(201).json({
            success: true,
            message: 'Your bulk order requirement has been received. Our engineering team in Pedamiram will review and dispatch a discounted quotation within 24 hours.',
            inquiryId,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to submit bulk order' });
    }
});
// List Bulk Orders (Admin)
exports.bulkOrdersRouter.get('/admin', authenticate_js_1.authenticateToken, (0, authorize_js_1.requireAdminRole)(), async (req, res) => {
    if ((0, database_js_1.isMongoConnected)()) {
        try {
            const orders = await BulkOrder_js_1.BulkOrder.find().sort({ created_at: -1 }).lean();
            res.json({ bulkOrders: orders });
            return;
        }
        catch (err) {
            // Fallback to SQLite
        }
    }
    try {
        const orders = database_js_2.db.prepare('SELECT * FROM bulk_orders ORDER BY id DESC').all();
        res.json({ bulkOrders: orders });
    }
    catch (err) {
        res.json({ bulkOrders: [] });
    }
});
// Update Bulk Order Status / Quotation (Admin)
exports.bulkOrdersRouter.patch('/admin/:id', authenticate_js_1.authenticateToken, (0, authorize_js_1.requireAdminRole)(), async (req, res) => {
    const { approval_status, order_status, quotation_amount, notes } = req.body || {};
    const id = req.params.id;
    if ((0, database_js_1.isMongoConnected)()) {
        try {
            const updated = await BulkOrder_js_1.BulkOrder.findByIdAndUpdate(id, {
                ...(approval_status ? { approval_status } : {}),
                ...(order_status ? { order_status } : {}),
                ...(quotation_amount !== undefined ? { quotation_amount: Number(quotation_amount) } : {}),
                ...(notes ? { notes } : {}),
            }, { new: true });
            if (updated) {
                await auditService_js_1.AuditService.log({
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
        }
        catch { }
    }
    try {
        database_js_2.db.prepare(`
      UPDATE bulk_orders SET
        approval_status = COALESCE(?, approval_status),
        order_status = COALESCE(?, order_status),
        quotation_amount = COALESCE(?, quotation_amount),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(approval_status !== undefined ? approval_status : null, order_status !== undefined ? order_status : null, quotation_amount !== undefined ? Number(quotation_amount) : null, notes !== undefined ? notes : null, id);
        const updated = database_js_2.db.prepare('SELECT * FROM bulk_orders WHERE id = ?').get(id);
        res.json({ success: true, bulkOrder: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update bulk order' });
    }
});
