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

export async function createDatabaseBackup(): Promise<string | null> {
  console.log('[Backup] Initiating automated database backup...');

  try {
    await connectToDatabase();
    if (!isMongoConnected()) {
      console.warn('[Backup] MongoDB offline, cannot create Atlas snapshot.');
      return null;
    }

    const backupDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilePath = path.join(backupDir, `vktech-backup-${timestamp}.json`);

    const backupData: Record<string, any> = {
      meta: {
        created_at: new Date().toISOString(),
        store: 'VK Technology',
        platform: 'MongoDB Atlas',
        version: '1.0.0',
      },
      collections: {
        users: await User.find().lean(),
        admins: await Admin.find().lean(),
        categories: await Category.find().lean(),
        products: await Product.find().lean(),
        inventory: await Inventory.find().lean(),
        orders: await Order.find().lean(),
        payments: await Payment.find().lean(),
        coupons: await Coupon.find().lean(),
        tutorials: await Tutorial.find().lean(),
        apps: await AppItem.find().lean(),
        settings: await WebsiteSetting.find().lean(),
      },
    };

    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
    const stats = fs.statSync(backupFilePath);
    console.log(`[Backup] Successfully exported backup to: ${backupFilePath} (${(stats.size / 1024).toFixed(2)} KB)`);

    // Rotate backups: keep the 30 most recent files
    const allBackups = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith('vktech-backup-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (allBackups.length > 30) {
      allBackups.slice(30).forEach((oldFile) => {
        try {
          fs.unlinkSync(path.join(backupDir, oldFile));
          console.log(`[Backup] Pruned old backup archive: ${oldFile}`);
        } catch {}
      });
    }

    await AuditLog.create({
      admin_email: 'system@vktechnology.shop',
      action: 'DATABASE_BACKUP_CREATED',
      resource_type: 'System',
      result: 'success',
      change_summary: {
        details: `Created backup file ${path.basename(backupFilePath)}`,
      },
      timestamp: new Date(),
    });

    return backupFilePath;
  } catch (err: any) {
    console.error('[Backup] Backup creation failed:', err.message);
    return null;
  }
}

if (process.argv[1]?.endsWith('backup.ts') || process.argv[1]?.endsWith('backup.js')) {
  createDatabaseBackup().then(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}
