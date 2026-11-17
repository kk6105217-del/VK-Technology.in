"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDatabaseBackup = createDatabaseBackup;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_js_1 = require("../config/database.js");
const index_js_1 = require("../models/index.js");
async function createDatabaseBackup() {
    console.log('[Backup] Initiating automated database backup...');
    try {
        await (0, database_js_1.connectToDatabase)();
        if (!(0, database_js_1.isMongoConnected)()) {
            console.warn('[Backup] MongoDB offline, cannot create Atlas snapshot.');
            return null;
        }
        const backupDir = path_1.default.resolve(process.cwd(), 'backups');
        if (!fs_1.default.existsSync(backupDir)) {
            fs_1.default.mkdirSync(backupDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilePath = path_1.default.join(backupDir, `vktech-backup-${timestamp}.json`);
        const backupData = {
            meta: {
                created_at: new Date().toISOString(),
                store: 'VK Technology',
                platform: 'MongoDB Atlas',
                version: '1.0.0',
            },
            collections: {
                users: await index_js_1.User.find().lean(),
                admins: await index_js_1.Admin.find().lean(),
                categories: await index_js_1.Category.find().lean(),
                products: await index_js_1.Product.find().lean(),
                inventory: await index_js_1.Inventory.find().lean(),
                orders: await index_js_1.Order.find().lean(),
                payments: await index_js_1.Payment.find().lean(),
                coupons: await index_js_1.Coupon.find().lean(),
                tutorials: await index_js_1.Tutorial.find().lean(),
                apps: await index_js_1.AppItem.find().lean(),
                settings: await index_js_1.WebsiteSetting.find().lean(),
            },
        };
        fs_1.default.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
        const stats = fs_1.default.statSync(backupFilePath);
        console.log(`[Backup] Successfully exported backup to: ${backupFilePath} (${(stats.size / 1024).toFixed(2)} KB)`);
        // Rotate backups: keep the 30 most recent files
        const allBackups = fs_1.default
            .readdirSync(backupDir)
            .filter((f) => f.startsWith('vktech-backup-') && f.endsWith('.json'))
            .sort()
            .reverse();
        if (allBackups.length > 30) {
            allBackups.slice(30).forEach((oldFile) => {
                try {
                    fs_1.default.unlinkSync(path_1.default.join(backupDir, oldFile));
                    console.log(`[Backup] Pruned old backup archive: ${oldFile}`);
                }
                catch { }
            });
        }
        await index_js_1.AuditLog.create({
            admin_email: 'system@vktechnology.shop',
            action: 'DATABASE_BACKUP_CREATED',
            resource_type: 'System',
            result: 'success',
            change_summary: {
                details: `Created backup file ${path_1.default.basename(backupFilePath)}`,
            },
            timestamp: new Date(),
        });
        return backupFilePath;
    }
    catch (err) {
        console.error('[Backup] Backup creation failed:', err.message);
        return null;
    }
}
if (process.argv[1]?.endsWith('backup.ts') || process.argv[1]?.endsWith('backup.js')) {
    createDatabaseBackup().then(async () => {
        await (0, database_js_1.disconnectDatabase)();
        process.exit(0);
    });
}
