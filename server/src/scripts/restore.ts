import fs from 'fs';
import path from 'path';
import { connectToDatabase, disconnectDatabase, isMongoConnected } from '../config/database.js';
import {
  User,
  Admin,
  Product,
  Category,
  Order,
  Payment,
  Inventory,
  Coupon,
  Tutorial,
  AppItem,
  WebsiteSetting,
  AuditLog,
} from '../models/index.js';

export async function restoreDatabaseBackup(targetFilePath?: string): Promise<{ success: boolean; message: string }> {
  console.log('[Restore] Initiating backup restoration procedure...');

  try {
    await connectToDatabase();
    if (!isMongoConnected()) {
      return { success: false, message: 'MongoDB connection not active.' };
    }

    const backupDir = path.resolve(process.cwd(), 'backups');
    let fileToRestore = targetFilePath;

    if (!fileToRestore) {
      if (!fs.existsSync(backupDir)) {
        return { success: false, message: 'No backups directory found.' };
      }
      const files = fs
        .readdirSync(backupDir)
        .filter((f) => f.startsWith('vktech-backup-') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length === 0) {
        return { success: false, message: 'No backup archives found to restore.' };
      }
      fileToRestore = path.join(backupDir, files[0]);
    }

    if (!fs.existsSync(fileToRestore)) {
      return { success: false, message: `Backup file does not exist: ${fileToRestore}` };
    }

    console.log(`[Restore] Reading backup file: ${fileToRestore}`);
    const content = fs.readFileSync(fileToRestore, 'utf-8');
    const backupData = JSON.parse(content);

    const cols = backupData.collections || {};

    if (cols.categories?.length) {
      for (const cat of cols.categories) {
        await Category.findOneAndUpdate({ slug: cat.slug }, cat, { upsert: true });
      }
    }

    if (cols.products?.length) {
      for (const prod of cols.products) {
        await Product.findOneAndUpdate({ sku: prod.sku }, prod, { upsert: true });
      }
    }

    if (cols.inventory?.length) {
      for (const inv of cols.inventory) {
        await Inventory.findOneAndUpdate({ product_id: inv.product_id }, inv, { upsert: true });
      }
    }

    if (cols.coupons?.length) {
      for (const coup of cols.coupons) {
        await Coupon.findOneAndUpdate({ code: coup.code }, coup, { upsert: true });
      }
    }

    if (cols.settings?.length) {
      for (const set of cols.settings) {
        await WebsiteSetting.findOneAndUpdate({ key: set.key }, set, { upsert: true });
      }
    }

    await AuditLog.create({
      admin_email: 'system@vktechnology.shop',
      action: 'DATABASE_BACKUP_RESTORED',
      resource_type: 'System',
      result: 'success',
      change_summary: {
        details: `Restored database state from ${path.basename(fileToRestore)}`,
      },
      timestamp: new Date(),
    });

    console.log('[Restore] Restoration successfully concluded.');
    return { success: true, message: `Successfully restored from ${path.basename(fileToRestore)}` };
  } catch (err: any) {
    console.error('[Restore] Restoration failed:', err.message);
    return { success: false, message: err.message };
  }
}

if (process.argv[1]?.endsWith('restore.ts') || process.argv[1]?.endsWith('restore.js')) {
  restoreDatabaseBackup().then(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}
