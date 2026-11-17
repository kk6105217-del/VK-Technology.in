"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreDatabaseBackup = restoreDatabaseBackup;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_js_1 = require("../config/database.js");
const index_js_1 = require("../models/index.js");
async function restoreDatabaseBackup(targetFilePath) {
    console.log('[Restore] Initiating backup restoration procedure...');
    try {
        await (0, database_js_1.connectToDatabase)();
        if (!(0, database_js_1.isMongoConnected)()) {
            return { success: false, message: 'MongoDB connection not active.' };
        }
        const backupDir = path_1.default.resolve(process.cwd(), 'backups');
        let fileToRestore = targetFilePath;
        if (!fileToRestore) {
            if (!fs_1.default.existsSync(backupDir)) {
                return { success: false, message: 'No backups directory found.' };
            }
            const files = fs_1.default
                .readdirSync(backupDir)
                .filter((f) => f.startsWith('vktech-backup-') && f.endsWith('.json'))
                .sort()
                .reverse();
            if (files.length === 0) {
                return { success: false, message: 'No backup archives found to restore.' };
            }
            fileToRestore = path_1.default.join(backupDir, files[0]);
        }
        if (!fs_1.default.existsSync(fileToRestore)) {
            return { success: false, message: `Backup file does not exist: ${fileToRestore}` };
        }
        console.log(`[Restore] Reading backup file: ${fileToRestore}`);
        const content = fs_1.default.readFileSync(fileToRestore, 'utf-8');
        const backupData = JSON.parse(content);
        const cols = backupData.collections || {};
        if (cols.categories?.length) {
            for (const cat of cols.categories) {
                await index_js_1.Category.findOneAndUpdate({ slug: cat.slug }, cat, { upsert: true });
            }
        }
        if (cols.products?.length) {
            for (const prod of cols.products) {
                await index_js_1.Product.findOneAndUpdate({ sku: prod.sku }, prod, { upsert: true });
            }
        }
        if (cols.inventory?.length) {
            for (const inv of cols.inventory) {
                await index_js_1.Inventory.findOneAndUpdate({ product_id: inv.product_id }, inv, { upsert: true });
            }
        }
        if (cols.coupons?.length) {
            for (const coup of cols.coupons) {
                await index_js_1.Coupon.findOneAndUpdate({ code: coup.code }, coup, { upsert: true });
            }
        }
        if (cols.settings?.length) {
            for (const set of cols.settings) {
                await index_js_1.WebsiteSetting.findOneAndUpdate({ key: set.key }, set, { upsert: true });
            }
        }
        await index_js_1.AuditLog.create({
            admin_email: 'system@vktechnology.shop',
            action: 'DATABASE_BACKUP_RESTORED',
            resource_type: 'System',
            result: 'success',
            change_summary: {
                details: `Restored database state from ${path_1.default.basename(fileToRestore)}`,
            },
            timestamp: new Date(),
        });
        console.log('[Restore] Restoration successfully concluded.');
        return { success: true, message: `Successfully restored from ${path_1.default.basename(fileToRestore)}` };
    }
    catch (err) {
        console.error('[Restore] Restoration failed:', err.message);
        return { success: false, message: err.message };
    }
}
if (process.argv[1]?.endsWith('restore.ts') || process.argv[1]?.endsWith('restore.js')) {
    restoreDatabaseBackup().then(async () => {
        await (0, database_js_1.disconnectDatabase)();
        process.exit(0);
    });
}
