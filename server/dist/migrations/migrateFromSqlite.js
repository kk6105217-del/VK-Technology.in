"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrationToMongo = runMigrationToMongo;
const database_js_1 = require("../database.js");
const database_js_2 = require("../config/database.js");
const index_js_1 = require("../models/index.js");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function runMigrationToMongo() {
    console.log('[Migration] Starting automated data migration from local storage to MongoDB...');
    const counts = {
        users: 0,
        admins: 0,
        categories: 0,
        products: 0,
        inventory: 0,
        coupons: 0,
        banners: 0,
        tutorials: 0,
        apps: 0,
        settings: 0,
    };
    const errors = [];
    try {
        await (0, database_js_2.connectToDatabase)();
        if (!(0, database_js_2.isMongoConnected)()) {
            throw new Error('MongoDB connection is not active. Check MONGODB_URI.');
        }
        // 1. Migrate Categories
        try {
            const rows = database_js_1.db.prepare('SELECT * FROM categories').all() || [];
            for (const row of rows) {
                const existing = await index_js_1.Category.findOne({ slug: row.slug });
                if (!existing) {
                    await index_js_1.Category.create({
                        id: row.id,
                        name: row.name,
                        slug: row.slug,
                        description: row.description,
                        icon: row.icon || 'Cpu',
                        image_url: row.image_url,
                        sort_order: row.sort_order || 0,
                        is_active: true,
                    });
                    counts.categories++;
                }
            }
        }
        catch (e) {
            errors.push(`Categories migration warning: ${e.message}`);
        }
        // 2. Migrate Products & Inventory
        try {
            const rows = database_js_1.db.prepare('SELECT * FROM products').all() || [];
            for (const row of rows) {
                const existing = await index_js_1.Product.findOne({ sku: row.sku });
                if (!existing) {
                    let specs = {};
                    try {
                        if (row.specifications)
                            specs = JSON.parse(row.specifications);
                    }
                    catch { }
                    // Fetch product images
                    let images = [];
                    try {
                        const imgRows = database_js_1.db.prepare('SELECT * FROM product_images WHERE product_id = ?').all(row.id) || [];
                        images = imgRows.map((img) => ({
                            url: img.image_url,
                            alt_text: img.alt_text || row.name,
                            sort_order: img.sort_order || 0,
                            is_primary: Boolean(img.is_primary),
                        }));
                    }
                    catch { }
                    if (images.length === 0 && row.image_url) {
                        images.push({
                            url: row.image_url,
                            alt_text: row.name,
                            sort_order: 0,
                            is_primary: true,
                        });
                    }
                    const newProd = await index_js_1.Product.create({
                        id: row.id,
                        name: row.name,
                        slug: row.slug,
                        sku: row.sku,
                        category_id: row.category_id,
                        category_slug: row.category_slug || 'arduino-boards-and-kits',
                        brand: row.brand || 'VK Technology',
                        description: row.description,
                        short_description: row.short_description,
                        image_url: row.image_url || images[0]?.url,
                        images,
                        price: row.price,
                        discounted_price: row.discounted_price,
                        stock_quantity: row.stock_quantity ?? 10,
                        min_stock_alert: 5,
                        specifications: specs,
                        compatibility: row.compatibility,
                        is_featured: Boolean(row.is_featured),
                        is_active: Boolean(row.is_active !== undefined ? row.is_active : 1),
                        deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
                    });
                    counts.products++;
                    // Initialize Inventory record
                    const invExists = await index_js_1.Inventory.findOne({ product_id: row.id });
                    if (!invExists) {
                        await index_js_1.Inventory.create({
                            product_id: row.id,
                            product_ref: newProd._id,
                            sku: row.sku,
                            available_quantity: row.stock_quantity ?? 10,
                            reserved_quantity: 0,
                            sold_quantity: 0,
                            min_stock_alert: 5,
                            movements: [
                                {
                                    movement_type: 'initial',
                                    quantity_changed: row.stock_quantity ?? 10,
                                    previous_stock: 0,
                                    new_stock: row.stock_quantity ?? 10,
                                    reference_type: 'INITIAL_IMPORT',
                                    notes: 'Initial inventory baseline imported into MongoDB Atlas',
                                    performed_by: 'Migration Script',
                                    timestamp: new Date(),
                                },
                            ],
                        });
                        counts.inventory++;
                    }
                }
            }
        }
        catch (e) {
            errors.push(`Products migration warning: ${e.message}`);
        }
        // 3. Migrate Users & Admins
        try {
            const rows = database_js_1.db.prepare('SELECT * FROM users').all() || [];
            for (const row of rows) {
                const existing = await index_js_1.User.findOne({ email: row.email.toLowerCase() });
                if (!existing) {
                    await index_js_1.User.create({
                        id: row.id,
                        full_name: row.full_name,
                        email: row.email.toLowerCase(),
                        phone: row.phone,
                        password_hash: row.password_hash,
                        role: row.role || 'customer',
                        account_status: 'active',
                        email_verified: true,
                    });
                    counts.users++;
                }
                // If user is admin, also populate Admin collection
                if (row.role === 'admin' || row.role === 'SUPER_ADMIN') {
                    const adminExists = await index_js_1.Admin.findOne({ email: row.email.toLowerCase() });
                    if (!adminExists) {
                        await index_js_1.Admin.create({
                            admin_id: row.id,
                            name: row.full_name,
                            email: row.email.toLowerCase(),
                            password_hash: row.password_hash,
                            role: 'SUPER_ADMIN',
                            permissions: ['SUPER_ADMIN_OVERRIDE'],
                            account_status: 'active',
                        });
                        counts.admins++;
                    }
                }
            }
        }
        catch (e) {
            errors.push(`Users migration warning: ${e.message}`);
        }
        // Ensure Super Admin exists
        const superAdminExists = await index_js_1.Admin.findOne({ email: 'admin@vktechnology.shop' });
        if (!superAdminExists) {
            const salt = bcryptjs_1.default.genSaltSync(10);
            const hash = bcryptjs_1.default.hashSync('Admin@VK2026!', salt);
            await index_js_1.Admin.create({
                admin_id: 1,
                name: 'VK Technology Administrator',
                email: 'admin@vktechnology.shop',
                password_hash: hash,
                role: 'SUPER_ADMIN',
                account_status: 'active',
            });
            counts.admins++;
        }
        // 4. Migrate Coupons
        try {
            const rows = database_js_1.db.prepare('SELECT * FROM coupons').all() || [];
            for (const row of rows) {
                const existing = await index_js_1.Coupon.findOne({ code: row.code.toUpperCase() });
                if (!existing) {
                    await index_js_1.Coupon.create({
                        id: row.id,
                        code: row.code.toUpperCase(),
                        description: row.description,
                        discount_type: row.discount_type || 'percent',
                        discount_value: row.discount_value,
                        min_order_value: row.min_order_value || 0,
                        max_discount_amount: row.max_discount_amount,
                        is_active: Boolean(row.is_active),
                        status: 'active',
                    });
                    counts.coupons++;
                }
            }
        }
        catch (e) {
            errors.push(`Coupons migration warning: ${e.message}`);
        }
        // 5. Migrate Banners
        try {
            const rows = database_js_1.db.prepare('SELECT * FROM banners').all() || [];
            for (const row of rows) {
                const existing = await index_js_1.Banner.findOne({ title: row.title });
                if (!existing) {
                    await index_js_1.Banner.create({
                        id: row.id,
                        title: row.title,
                        subtitle: row.subtitle,
                        image_url: row.image_url,
                        link_url: row.link_url,
                        button_text: row.button_text,
                        display_order: row.display_order || 0,
                        is_active: true,
                    });
                    counts.banners++;
                }
            }
        }
        catch (e) {
            errors.push(`Banners migration warning: ${e.message}`);
        }
        // 6. Migrate DIY Projects to Tutorials collection
        try {
            const rows = database_js_1.db.prepare('SELECT * FROM projects').all() || [];
            for (const row of rows) {
                const existing = await index_js_1.Tutorial.findOne({ slug: row.slug });
                if (!existing) {
                    let compRows = [];
                    try {
                        compRows = database_js_1.db.prepare('SELECT * FROM project_components WHERE project_id = ?').all(row.id) || [];
                    }
                    catch { }
                    await index_js_1.Tutorial.create({
                        id: row.id,
                        tutorial_title: row.title,
                        slug: row.slug,
                        description: row.description,
                        category: row.category || 'IoT & Robotics',
                        difficulty: row.difficulty || 'Intermediate',
                        estimated_time: row.estimated_time || '2-3 Hours',
                        images: row.image_url ? [row.image_url] : [],
                        hardware_components: compRows.map((c) => ({
                            name: c.name,
                            quantity: c.quantity || 1,
                            notes: c.notes,
                        })),
                        source_code: {
                            snippet: row.code_snippet,
                            language: 'cpp',
                        },
                        access_permissions: 'public',
                        is_published: true,
                    });
                    counts.tutorials++;
                }
            }
        }
        catch (e) {
            errors.push(`DIY Projects migration warning: ${e.message}`);
        }
        // 7. Migrate Companion Apps
        try {
            const rows = database_js_1.db.prepare('SELECT * FROM apps').all() || [];
            for (const row of rows) {
                const existing = await index_js_1.AppItem.findOne({ slug: row.slug });
                if (!existing) {
                    await index_js_1.AppItem.create({
                        id: row.id,
                        title: row.title,
                        slug: row.slug,
                        description: row.description,
                        category: row.category || 'Robotics',
                        platform: row.platform || 'Web / Android',
                        app_url: row.app_url,
                        download_url: row.download_url,
                        icon: row.icon || 'Smartphone',
                        version: row.version || '1.0.0',
                        is_active: true,
                    });
                    counts.apps++;
                }
            }
        }
        catch (e) {
            errors.push(`Apps migration warning: ${e.message}`);
        }
        // 8. Migrate Website Settings
        try {
            const rows = database_js_1.db.prepare('SELECT * FROM website_settings').all() || [];
            for (const row of rows) {
                const existing = await index_js_1.WebsiteSetting.findOne({ key: row.key });
                if (!existing) {
                    await index_js_1.WebsiteSetting.create({
                        key: row.key,
                        value: row.value,
                    });
                    counts.settings++;
                }
            }
        }
        catch (e) {
            errors.push(`Settings migration warning: ${e.message}`);
        }
        // Log Migration Audit Event
        await index_js_1.AuditLog.create({
            admin_email: 'admin@vktechnology.shop',
            action: 'DATABASE_MIGRATION_COMPLETED',
            resource_type: 'System',
            result: 'success',
            change_summary: {
                details: 'Completed data migration from local storage to MongoDB Atlas collections.',
                after: counts,
            },
            timestamp: new Date(),
        });
        console.log('[Migration] Migration completed successfully!', counts);
        return { success: true, migratedCounts: counts, errors };
    }
    catch (err) {
        console.error('[Migration] Migration fatal error:', err.message);
        errors.push(err.message);
        return { success: false, migratedCounts: counts, errors };
    }
}
