"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseRouter = void 0;
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const database_js_1 = require("../config/database.js");
const environment_js_1 = require("../config/environment.js");
const index_js_1 = require("../models/index.js");
const migrateFromSqlite_js_1 = require("../migrations/migrateFromSqlite.js");
const backup_js_1 = require("../scripts/backup.js");
const restore_js_1 = require("../scripts/restore.js");
const authenticate_js_1 = require("../middleware/authenticate.js");
const authorize_js_1 = require("../middleware/authorize.js");
const database_js_2 = require("../database.js");
exports.databaseRouter = (0, express_1.Router)();
/**
 * Public/Protected Database Status & Health Diagnostic
 */
exports.databaseRouter.get('/status', async (_req, res) => {
    const isConnected = (0, database_js_1.isMongoConnected)();
    let collectionCounts = {};
    if (isConnected) {
        try {
            collectionCounts = {
                users: await index_js_1.User.countDocuments(),
                admins: await index_js_1.Admin.countDocuments(),
                products: await index_js_1.Product.countDocuments(),
                categories: await index_js_1.Category.countDocuments(),
                orders: await index_js_1.Order.countDocuments(),
                payments: await index_js_1.Payment.countDocuments(),
                inventory: await index_js_1.Inventory.countDocuments(),
                reviews: await index_js_1.Review.countDocuments(),
                coupons: await index_js_1.Coupon.countDocuments(),
                tutorials: await index_js_1.Tutorial.countDocuments(),
                audit_logs: await index_js_1.AuditLog.countDocuments(),
            };
        }
        catch (err) {
            console.warn('[DB Status] Count query warning:', err.message);
        }
    }
    res.json({
        database: 'MongoDB Atlas',
        status: isConnected ? 'CONNECTED' : 'STANDBY_FALLBACK',
        mongooseReadyState: mongoose_1.default.connection.readyState,
        databaseName: environment_js_1.env.mongodbDbName,
        collectionsCount: Object.keys(collectionCounts).length,
        counts: collectionCounts,
        replicaSet: Boolean(mongoose_1.default.connection.client?.options?.replicaSet),
        timestamp: new Date().toISOString(),
    });
});
/**
 * Trigger Migration from SQLite to MongoDB
 */
exports.databaseRouter.post('/migrate', authenticate_js_1.authenticateToken, authorize_js_1.requireSuperAdmin, async (_req, res) => {
    try {
        const result = await (0, migrateFromSqlite_js_1.runMigrationToMongo)();
        res.json({
            message: 'Migration process executed',
            ...result,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * Create Database Backup Snapshot (Super Admin only)
 */
exports.databaseRouter.post('/backup', authenticate_js_1.authenticateToken, authorize_js_1.requireSuperAdmin, async (_req, res) => {
    try {
        const backupPath = await (0, backup_js_1.createDatabaseBackup)();
        if (!backupPath) {
            res.status(500).json({ error: 'Database backup creation failed.' });
            return;
        }
        res.json({
            success: true,
            message: 'Database backup archive created successfully',
            backupPath,
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * Restore Database Backup (Super Admin only)
 */
exports.databaseRouter.post('/restore', authenticate_js_1.authenticateToken, authorize_js_1.requireSuperAdmin, async (req, res) => {
    try {
        const { filePath } = req.body || {};
        const result = await (0, restore_js_1.restoreDatabaseBackup)(filePath);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * Inspect Collection Indexes
 */
exports.databaseRouter.get('/indexes', authenticate_js_1.authenticateToken, authorize_js_1.requireSuperAdmin, async (_req, res) => {
    if (!(0, database_js_1.isMongoConnected)()) {
        res.status(503).json({ error: 'MongoDB connection is not active.' });
        return;
    }
    try {
        const results = {
            users: await index_js_1.User.collection.indexes(),
            admins: await index_js_1.Admin.collection.indexes(),
            products: await index_js_1.Product.collection.indexes(),
            categories: await index_js_1.Category.collection.indexes(),
            orders: await index_js_1.Order.collection.indexes(),
            payments: await index_js_1.Payment.collection.indexes(),
            inventory: await index_js_1.Inventory.collection.indexes(),
            reviews: await index_js_1.Review.collection.indexes(),
            coupons: await index_js_1.Coupon.collection.indexes(),
            audit_logs: await index_js_1.AuditLog.collection.indexes(),
        };
        res.json({ indexes: results });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * Admin Audit Logs Explorer (Supports MongoDB Atlas & SQLite fallback)
 */
exports.databaseRouter.get('/audit-logs', authenticate_js_1.authenticateToken, (0, authorize_js_1.requireAdminRole)(), async (req, res) => {
    if (!(0, database_js_1.isMongoConnected)()) {
        try {
            const logs = database_js_2.db.prepare('SELECT id, admin_email, action, target_type as resource_type, target_id as resource_id, details, created_at as timestamp FROM admin_audit_logs ORDER BY id DESC LIMIT 100').all();
            res.json({
                logs,
                pagination: {
                    page: 1,
                    limit: 100,
                    total: logs.length,
                    pages: 1,
                },
            });
            return;
        }
        catch {
            res.json({ logs: [], total: 0 });
            return;
        }
    }
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '50', 10);
        const skip = (page - 1) * limit;
        const query = {};
        if (req.query.action)
            query.action = String(req.query.action).toUpperCase();
        if (req.query.resource_type)
            query.resource_type = req.query.resource_type;
        if (req.query.admin_email)
            query.admin_email = String(req.query.admin_email).toLowerCase();
        const [logs, total] = await Promise.all([
            index_js_1.AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
            index_js_1.AuditLog.countDocuments(query),
        ]);
        res.json({
            logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
