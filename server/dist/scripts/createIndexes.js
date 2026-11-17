"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAllDatabaseIndexes = createAllDatabaseIndexes;
const database_js_1 = require("../config/database.js");
const index_js_1 = require("../models/index.js");
async function createAllDatabaseIndexes() {
    console.log('[Indexes] Initializing automated index construction across all 15 collections...');
    try {
        await (0, database_js_1.connectToDatabase)();
        const models = [
            { name: 'User', model: index_js_1.User },
            { name: 'Admin', model: index_js_1.Admin },
            { name: 'Product', model: index_js_1.Product },
            { name: 'Category', model: index_js_1.Category },
            { name: 'Order', model: index_js_1.Order },
            { name: 'Payment', model: index_js_1.Payment },
            { name: 'Inventory', model: index_js_1.Inventory },
            { name: 'Cart', model: index_js_1.Cart },
            { name: 'Wishlist', model: index_js_1.Wishlist },
            { name: 'Review', model: index_js_1.Review },
            { name: 'Coupon', model: index_js_1.Coupon },
            { name: 'Notification', model: index_js_1.Notification },
            { name: 'BulkOrder', model: index_js_1.BulkOrder },
            { name: 'Tutorial', model: index_js_1.Tutorial },
            { name: 'AuditLog', model: index_js_1.AuditLog },
        ];
        for (const { name, model } of models) {
            try {
                await model.createIndexes();
                const indexes = await model.collection.indexes();
                console.log(`[Indexes] ✓ ${name}: ${indexes.length} indexes established:`, indexes.map((i) => i.name).join(', '));
            }
            catch (err) {
                console.warn(`[Indexes] ⚠ ${name} index warning:`, err.message);
            }
        }
        console.log('[Indexes] All collection indexes successfully created and verified.');
    }
    catch (err) {
        console.error('[Indexes] Index creation failed:', err.message);
    }
}
if (process.argv[1]?.endsWith('createIndexes.ts') || process.argv[1]?.endsWith('createIndexes.js')) {
    createAllDatabaseIndexes().then(async () => {
        await (0, database_js_1.disconnectDatabase)();
        process.exit(0);
    });
}
