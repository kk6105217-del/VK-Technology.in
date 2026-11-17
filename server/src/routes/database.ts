import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { isMongoConnected, connectToDatabase } from '../config/database.js';
import { env } from '../config/environment.js';
import {
  User,
  Admin,
  Product,
  Category,
  Order,
  Payment,
  Inventory,
  Cart,
  Wishlist,
  Review,
  Coupon,
  Notification,
  BulkOrder,
  Tutorial,
  AuditLog,
} from '../models/index.js';
import { runMigrationToMongo } from '../migrations/migrateFromSqlite.js';
import { createDatabaseBackup } from '../scripts/backup.js';
import { restoreDatabaseBackup } from '../scripts/restore.js';
import { authenticateToken } from '../middleware/authenticate.js';
import { requireSuperAdmin, requireAdminRole } from '../middleware/authorize.js';
import { db } from '../database.js';

export const databaseRouter = Router();

/**
 * Public/Protected Database Status & Health Diagnostic
 */
databaseRouter.get('/status', async (_req: Request, res: Response) => {
  const isConnected = isMongoConnected();
  let collectionCounts: Record<string, number> = {};

  if (isConnected) {
    try {
      collectionCounts = {
        users: await User.countDocuments(),
        admins: await Admin.countDocuments(),
        products: await Product.countDocuments(),
        categories: await Category.countDocuments(),
        orders: await Order.countDocuments(),
        payments: await Payment.countDocuments(),
        inventory: await Inventory.countDocuments(),
        reviews: await Review.countDocuments(),
        coupons: await Coupon.countDocuments(),
        tutorials: await Tutorial.countDocuments(),
        audit_logs: await AuditLog.countDocuments(),
      };
    } catch (err: any) {
      console.warn('[DB Status] Count query warning:', err.message);
    }
  }

  res.json({
    database: 'MongoDB Atlas',
    status: isConnected ? 'CONNECTED' : 'STANDBY_FALLBACK',
    mongooseReadyState: mongoose.connection.readyState,
    databaseName: env.mongodbDbName,
    collectionsCount: Object.keys(collectionCounts).length,
    counts: collectionCounts,
    replicaSet: Boolean((mongoose.connection as any).client?.options?.replicaSet),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Trigger Migration from SQLite to MongoDB
 */
databaseRouter.post('/migrate', authenticateToken, requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await runMigrationToMongo();
    res.json({
      message: 'Migration process executed',
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create Database Backup Snapshot (Super Admin only)
 */
databaseRouter.post('/backup', authenticateToken, requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    const backupPath = await createDatabaseBackup();
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Restore Database Backup (Super Admin only)
 */
databaseRouter.post('/restore', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { filePath } = req.body || {};
    const result = await restoreDatabaseBackup(filePath);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Inspect Collection Indexes
 */
databaseRouter.get('/indexes', authenticateToken, requireSuperAdmin, async (_req: Request, res: Response) => {
  if (!isMongoConnected()) {
    res.status(503).json({ error: 'MongoDB connection is not active.' });
    return;
  }

  try {
    const results: Record<string, any[]> = {
      users: await User.collection.indexes(),
      admins: await Admin.collection.indexes(),
      products: await Product.collection.indexes(),
      categories: await Category.collection.indexes(),
      orders: await Order.collection.indexes(),
      payments: await Payment.collection.indexes(),
      inventory: await Inventory.collection.indexes(),
      reviews: await Review.collection.indexes(),
      coupons: await Coupon.collection.indexes(),
      audit_logs: await AuditLog.collection.indexes(),
    };
    res.json({ indexes: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Admin Audit Logs Explorer (Supports MongoDB Atlas & SQLite fallback)
 */
databaseRouter.get('/audit-logs', authenticateToken, requireAdminRole(), async (req: Request, res: Response) => {
  if (!isMongoConnected()) {
    try {
      const logs = db.prepare('SELECT id, admin_email, action, target_type as resource_type, target_id as resource_id, details, created_at as timestamp FROM admin_audit_logs ORDER BY id DESC LIMIT 100').all();
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
    } catch {
      res.json({ logs: [], total: 0 });
      return;
    }
  }

  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const skip = (page - 1) * limit;

    const query: any = {};
    if (req.query.action) query.action = String(req.query.action).toUpperCase();
    if (req.query.resource_type) query.resource_type = req.query.resource_type;
    if (req.query.admin_email) query.admin_email = String(req.query.admin_email).toLowerCase();

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query),
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
