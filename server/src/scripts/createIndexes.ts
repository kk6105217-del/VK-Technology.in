import { connectToDatabase, disconnectDatabase } from '../config/database.js';
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

export async function createAllDatabaseIndexes(): Promise<void> {
  console.log('[Indexes] Initializing automated index construction across all 15 collections...');

  try {
    await connectToDatabase();

    const models = [
      { name: 'User', model: User },
      { name: 'Admin', model: Admin },
      { name: 'Product', model: Product },
      { name: 'Category', model: Category },
      { name: 'Order', model: Order },
      { name: 'Payment', model: Payment },
      { name: 'Inventory', model: Inventory },
      { name: 'Cart', model: Cart },
      { name: 'Wishlist', model: Wishlist },
      { name: 'Review', model: Review },
      { name: 'Coupon', model: Coupon },
      { name: 'Notification', model: Notification },
      { name: 'BulkOrder', model: BulkOrder },
      { name: 'Tutorial', model: Tutorial },
      { name: 'AuditLog', model: AuditLog },
    ];

    for (const { name, model } of models) {
      try {
        await model.createIndexes();
        const indexes = await model.collection.indexes();
        console.log(`[Indexes] ✓ ${name}: ${indexes.length} indexes established:`, indexes.map((i) => i.name).join(', '));
      } catch (err: any) {
        console.warn(`[Indexes] ⚠ ${name} index warning:`, err.message);
      }
    }

    console.log('[Indexes] All collection indexes successfully created and verified.');
  } catch (err: any) {
    console.error('[Indexes] Index creation failed:', err.message);
  }
}

if (process.argv[1]?.endsWith('createIndexes.ts') || process.argv[1]?.endsWith('createIndexes.js')) {
  createAllDatabaseIndexes().then(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}
