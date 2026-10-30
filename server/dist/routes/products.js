"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsRouter = void 0;
const express_1 = require("express");
const database_js_1 = require("../database.js");
const auth_js_1 = require("../middleware/auth.js");
const events_js_1 = require("../services/events.js");
const cache_js_1 = require("../utils/cache.js");
exports.productsRouter = (0, express_1.Router)();
// Helper to fetch full populated product record
function fetchFullProduct(idOrSlug) {
    const isId = /^\d+$/.test(String(idOrSlug));
    const sql = `
    SELECT 
      p.*,
      c.name as category_name,
      c.slug as category_slug,
      (
        SELECT image_url FROM product_images pi 
        WHERE pi.product_id = p.id 
        ORDER BY pi.is_primary DESC, pi.sort_order ASC 
        LIMIT 1
      ) as primary_image
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE ${isId ? 'p.id = ?' : 'p.slug = ?'}
  `;
    const prod = database_js_1.db.prepare(sql).get(idOrSlug);
    if (!prod)
        return null;
    try {
        prod.specifications = JSON.parse(prod.specifications_json || '{}');
    }
    catch {
        prod.specifications = {};
    }
    try {
        prod.features = JSON.parse(prod.features_json || '[]');
    }
    catch {
        prod.features = [];
    }
    try {
        prod.package_contents = JSON.parse(prod.package_contents_json || '[]');
    }
    catch {
        prod.package_contents = [];
    }
    prod.images = database_js_1.db.prepare(`
    SELECT id, image_url, alt_text, is_primary, sort_order 
    FROM product_images 
    WHERE product_id = ? 
    ORDER BY is_primary DESC, sort_order ASC
  `).all(prod.id);
    return prod;
}
// Global Catalog Sync Status Endpoint
exports.productsRouter.get('/sync/status', (req, res) => {
    (0, cache_js_1.setDynamicCacheControl)(res);
    const syncStatus = events_js_1.eventBroadcaster.getCatalogSyncStatus();
    const totalRow = database_js_1.db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get();
    res.json({
        ...syncStatus,
        totalProducts: totalRow?.count || 0
    });
});
// Public: Get all products with search, filters, pagination, and sorting
exports.productsRouter.get('/', (req, res) => {
    try {
        const syncStatus = events_js_1.eventBroadcaster.getCatalogSyncStatus();
        (0, cache_js_1.setDynamicCacheControl)(res, syncStatus.catalogVersion, syncStatus.lastUpdated);
        const { q, category, brand, min_price, max_price, in_stock, rating, featured, sort, page = 1, limit = 24 } = req.query;
        let conditions = ['p.is_active = 1'];
        let params = [];
        // Search query
        if (q && typeof q === 'string' && q.trim()) {
            const searchPattern = `%${q.trim()}%`;
            conditions.push(`(
        p.name LIKE ? OR 
        p.sku LIKE ? OR 
        p.short_description LIKE ? OR 
        p.description LIKE ? OR 
        p.brand LIKE ? OR
        p.specifications_json LIKE ? OR
        c.name LIKE ?
      )`);
            params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }
        // Category filter
        if (category && typeof category === 'string') {
            conditions.push('(c.slug = ? OR c.id = ?)');
            params.push(category, category);
        }
        // Brand filter
        if (brand && typeof brand === 'string') {
            conditions.push('p.brand = ?');
            params.push(brand);
        }
        // Price range
        if (min_price) {
            conditions.push('COALESCE(p.discounted_price, p.regular_price) >= ?');
            params.push(parseFloat(min_price));
        }
        if (max_price) {
            conditions.push('COALESCE(p.discounted_price, p.regular_price) <= ?');
            params.push(parseFloat(max_price));
        }
        // In stock
        if (in_stock === 'true' || in_stock === '1') {
            conditions.push('p.stock_quantity > 0');
        }
        // Rating
        if (rating) {
            conditions.push('p.rating_avg >= ?');
            params.push(parseFloat(rating));
        }
        // Featured
        if (featured === 'true' || featured === '1') {
            conditions.push('p.is_featured = 1');
        }
        // Sorting
        let orderBy = 'p.id DESC';
        switch (sort) {
            case 'price-asc':
                orderBy = 'COALESCE(p.discounted_price, p.regular_price) ASC';
                break;
            case 'price-desc':
                orderBy = 'COALESCE(p.discounted_price, p.regular_price) DESC';
                break;
            case 'newest':
                orderBy = 'p.created_at DESC';
                break;
            case 'bestselling':
                orderBy = 'p.rating_count DESC, p.view_count DESC';
                break;
            case 'rating':
                orderBy = 'p.rating_avg DESC';
                break;
            case 'relevance':
            default:
                orderBy = 'p.is_featured DESC, p.id DESC';
                break;
        }
        // Count total matching
        const countSql = `
      SELECT COUNT(*) as count 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${conditions.join(' AND ')}
    `;
        const countRow = database_js_1.db.prepare(countSql).get(...params);
        const total = countRow?.count || 0;
        // Fetch paginated results
        const offset = (Number(page) - 1) * Number(limit);
        const selectSql = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        (
          SELECT image_url FROM product_images pi 
          WHERE pi.product_id = p.id 
          ORDER BY pi.is_primary DESC, pi.sort_order ASC 
          LIMIT 1
        ) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
        const products = database_js_1.db.prepare(selectSql).all(...params, Number(limit), offset);
        // Parse JSON fields
        products.forEach((p) => {
            try {
                p.specifications = JSON.parse(p.specifications_json || '{}');
            }
            catch {
                p.specifications = {};
            }
            try {
                p.features = JSON.parse(p.features_json || '[]');
            }
            catch {
                p.features = [];
            }
            try {
                p.package_contents = JSON.parse(p.package_contents_json || '[]');
            }
            catch {
                p.package_contents = [];
            }
        });
        res.json({
            products,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Products fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch products.' });
    }
});
// Admin: Get all products (including inactive) with inventory status
exports.productsRouter.get('/admin/all', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        (0, cache_js_1.setPrivateCacheControl)(res);
        const { search, category, status } = req.query;
        let conditions = ['1=1'];
        let params = [];
        if (search && typeof search === 'string') {
            conditions.push('(p.name LIKE ? OR p.sku LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        if (category) {
            conditions.push('p.category_id = ?');
            params.push(category);
        }
        if (status === 'active')
            conditions.push('p.is_active = 1');
        if (status === 'inactive')
            conditions.push('p.is_active = 0');
        if (status === 'low_stock')
            conditions.push('p.stock_quantity <= 5 AND p.stock_quantity > 0');
        if (status === 'out_of_stock')
            conditions.push('p.stock_quantity = 0');
        const sql = `
      SELECT 
        p.*,
        c.name as category_name,
        (
          SELECT image_url FROM product_images pi 
          WHERE pi.product_id = p.id 
          ORDER BY pi.is_primary DESC, pi.sort_order ASC 
          LIMIT 1
        ) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.id DESC
    `;
        const products = database_js_1.db.prepare(sql).all(...params);
        res.json({ products });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch admin products.' });
    }
});
// Public: Get single product by slug or id
exports.productsRouter.get('/:slug', (req, res) => {
    try {
        const syncStatus = events_js_1.eventBroadcaster.getCatalogSyncStatus();
        (0, cache_js_1.setDynamicCacheControl)(res, syncStatus.catalogVersion, syncStatus.lastUpdated);
        const product = fetchFullProduct(req.params.slug);
        if (!product) {
            res.status(404).json({ error: 'Product not found.' });
            return;
        }
        // Increment view count safely
        try {
            database_js_1.db.prepare('UPDATE products SET view_count = view_count + 1 WHERE id = ?').run(product.id);
        }
        catch { }
        // Fetch approved reviews
        const reviews = database_js_1.db.prepare(`
      SELECT id, customer_name, rating, title, comment, is_verified_purchase, created_at
      FROM reviews
      WHERE product_id = ? AND status = 'approved'
      ORDER BY id DESC
    `).all(product.id);
        // Fetch related products from same category
        const relatedProducts = database_js_1.db.prepare(`
      SELECT 
        p.id, p.name, p.slug, p.regular_price, p.discounted_price, p.stock_quantity, p.rating_avg, p.rating_count,
        (
          SELECT image_url FROM product_images pi 
          WHERE pi.product_id = p.id 
          ORDER BY pi.is_primary DESC, pi.sort_order ASC 
          LIMIT 1
        ) as primary_image
      FROM products p
      WHERE p.category_id = ? AND p.id != ? AND p.is_active = 1
      ORDER BY p.is_featured DESC, p.id DESC
      LIMIT 4
    `).all(product.category_id, product.id);
        res.json({
            product: {
                ...product,
                reviews,
                relatedProducts
            }
        });
    }
    catch (error) {
        console.error('Product detail error:', error);
        res.status(500).json({ error: 'Failed to fetch product details.' });
    }
});
// Admin: Create product
exports.productsRouter.post('/', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        const { name, slug, sku, category_id, subcategory, short_description, description, regular_price, discounted_price, stock_quantity, brand, specifications, features, compatibility, package_contents, shipping_weight_grams, estimated_dispatch_days, warranty_info, is_featured, is_active, images = [] } = req.body;
        // Strict input validation
        if (!name || typeof name !== 'string' || !name.trim()) {
            res.status(400).json({ error: 'Product name is required.' });
            return;
        }
        if (!sku || typeof sku !== 'string' || !sku.trim()) {
            res.status(400).json({ error: 'SKU code is required.' });
            return;
        }
        if (!category_id) {
            res.status(400).json({ error: 'Category is required.' });
            return;
        }
        if (regular_price === undefined || regular_price === null || isNaN(Number(regular_price)) || Number(regular_price) < 0) {
            res.status(400).json({ error: 'A valid non-negative regular price is required.' });
            return;
        }
        // Slug generation and collision resolution
        let cleanSlug = (slug || name).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (!cleanSlug)
            cleanSlug = `product-${Date.now()}`;
        const existingSlug = database_js_1.db.prepare('SELECT id FROM products WHERE slug = ?').get(cleanSlug);
        if (existingSlug) {
            cleanSlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;
        }
        // SKU deduplication and idempotency protection
        let cleanSku = sku.trim().toUpperCase();
        const existingSku = database_js_1.db.prepare('SELECT id FROM products WHERE sku = ?').get(cleanSku);
        if (existingSku) {
            res.status(409).json({ error: `A product with SKU "${cleanSku}" already exists. Please use a unique SKU.` });
            return;
        }
        let validCatId = Number(category_id);
        const catExists = database_js_1.db.prepare('SELECT id FROM categories WHERE id = ?').get(validCatId);
        if (!catExists) {
            const firstCat = database_js_1.db.prepare('SELECT id FROM categories ORDER BY id ASC LIMIT 1').get();
            if (firstCat)
                validCatId = firstCat.id;
        }
        // Begin database transaction for atomic multi-table write
        database_js_1.db.exec('BEGIN TRANSACTION');
        let productId;
        try {
            const result = database_js_1.db.prepare(`
        INSERT INTO products (
          name, slug, sku, category_id, subcategory, short_description, description,
          regular_price, discounted_price, stock_quantity, brand, specifications_json,
          features_json, compatibility, package_contents_json, shipping_weight_grams,
          estimated_dispatch_days, warranty_info, is_featured, is_active, version, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, 1, datetime('now'), datetime('now')
        )
      `).run(name.trim(), cleanSlug, cleanSku, validCatId, subcategory || null, short_description || null, description || name, Number(regular_price), (discounted_price !== undefined && discounted_price !== null && discounted_price !== '') ? Number(discounted_price) : null, Number(stock_quantity || 0), brand || 'VK Technology', specifications ? JSON.stringify(specifications) : '{}', features ? JSON.stringify(features) : '[]', compatibility || null, package_contents ? JSON.stringify(package_contents) : '[]', Number(shipping_weight_grams || 250), Number(estimated_dispatch_days || 1), warranty_info || '6 Months Warranty', is_featured ? 1 : 0, is_active !== undefined ? (is_active ? 1 : 0) : 1);
            productId = Number(result.lastInsertRowid);
            // Insert product images
            if (Array.isArray(images) && images.length > 0) {
                const imgInsert = database_js_1.db.prepare(`
          INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
          VALUES (?, ?, ?, ?, ?)
        `);
                images.forEach((img, idx) => {
                    const url = typeof img === 'string' ? img : (img.url || img.image_url);
                    if (url) {
                        imgInsert.run(productId, url, name, idx, idx === 0 ? 1 : 0);
                    }
                });
            }
            // Record audit log
            (0, database_js_1.recordAuditLog)(req.user?.email || 'admin@vktechnology.shop', 'CREATE_PRODUCT', 'Product', productId, { name, sku: cleanSku, regular_price, category_id: validCatId });
            database_js_1.db.exec('COMMIT');
        }
        catch (txErr) {
            try {
                database_js_1.db.exec('ROLLBACK');
            }
            catch { }
            throw txErr;
        }
        // Fetch the full newly created product record
        const savedProduct = fetchFullProduct(productId);
        // Broadcast real-time product creation to all connected accounts and devices
        try {
            events_js_1.eventBroadcaster.broadcast('PRODUCT_CREATED', savedProduct);
        }
        catch { }
        res.status(201).json({
            message: 'Product created successfully.',
            product: savedProduct,
            productId,
            updatedAt: savedProduct?.updated_at || new Date().toISOString(),
            version: savedProduct?.version || 1
        });
    }
    catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: error.message || 'Failed to create product.' });
    }
});
// Admin: Update product
exports.productsRouter.put('/:id', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        const productId = req.params.id;
        const { name, slug, sku, category_id, subcategory, short_description, description, regular_price, discounted_price, stock_quantity, brand, specifications, features, compatibility, package_contents, shipping_weight_grams, estimated_dispatch_days, warranty_info, is_featured, is_active, images, primary_image } = req.body;
        const existingProduct = database_js_1.db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
        if (!existingProduct && !name) {
            res.status(404).json({ error: 'Product not found.' });
            return;
        }
        let cleanSlug = slug;
        if (!cleanSlug && existingProduct?.slug)
            cleanSlug = existingProduct.slug;
        if (!cleanSlug && name) {
            cleanSlug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        }
        if (!cleanSlug)
            cleanSlug = `product-${productId}`;
        let cleanSku = sku ? sku.trim().toUpperCase() : (existingProduct?.sku || `VK-${productId}`);
        let validCatId = Number(category_id || (existingProduct?.category_id || 1));
        const catExists = database_js_1.db.prepare('SELECT id FROM categories WHERE id = ?').get(validCatId);
        if (!catExists) {
            const firstCat = database_js_1.db.prepare('SELECT id FROM categories ORDER BY id ASC LIMIT 1').get();
            if (firstCat)
                validCatId = firstCat.id;
        }
        const finalName = name !== undefined ? name.trim() : (existingProduct?.name || 'Product');
        const finalDesc = description !== undefined ? description : (existingProduct?.description || finalName);
        const finalCatId = validCatId;
        const finalBrand = brand !== undefined ? brand : (existingProduct?.brand || 'VK Technology');
        const finalSubcat = subcategory !== undefined ? subcategory : (existingProduct?.subcategory || null);
        const finalShortDesc = short_description !== undefined ? short_description : (existingProduct?.short_description || null);
        const finalRegPrice = regular_price !== undefined ? Number(regular_price) : Number(existingProduct?.regular_price || 0);
        const finalDiscPrice = (discounted_price !== undefined && discounted_price !== null && discounted_price !== '')
            ? Number(discounted_price)
            : (discounted_price === null ? null : (existingProduct?.discounted_price ?? null));
        const finalStock = stock_quantity !== undefined ? Number(stock_quantity) : Number(existingProduct?.stock_quantity ?? 0);
        const finalSpecs = specifications !== undefined
            ? (typeof specifications === 'string' ? specifications : JSON.stringify(specifications))
            : (existingProduct?.specifications_json || '{}');
        const finalFeatures = features !== undefined
            ? (typeof features === 'string' ? features : JSON.stringify(features))
            : (existingProduct?.features_json || '[]');
        const finalContents = package_contents !== undefined
            ? (typeof package_contents === 'string' ? package_contents : JSON.stringify(package_contents))
            : (existingProduct?.package_contents_json || '[]');
        const finalCompat = compatibility !== undefined ? compatibility : (existingProduct?.compatibility || '');
        const finalWeight = shipping_weight_grams !== undefined ? Number(shipping_weight_grams) : Number(existingProduct?.shipping_weight_grams || 250);
        const finalDispatch = estimated_dispatch_days !== undefined ? Number(estimated_dispatch_days) : Number(existingProduct?.estimated_dispatch_days || 1);
        const finalWarranty = warranty_info !== undefined ? warranty_info : (existingProduct?.warranty_info || '6 Months Warranty');
        const finalFeatured = is_featured !== undefined ? (is_featured ? 1 : 0) : (existingProduct?.is_featured ? 1 : 0);
        const finalActive = is_active !== undefined ? (is_active ? 1 : 0) : (existingProduct?.is_active !== undefined ? (existingProduct.is_active ? 1 : 0) : 1);
        // Atomic transaction for product update + images + audit logging
        database_js_1.db.exec('BEGIN TRANSACTION');
        try {
            if (!existingProduct) {
                database_js_1.db.prepare(`
          INSERT INTO products (
            id, name, slug, sku, category_id, subcategory, short_description, description,
            regular_price, discounted_price, stock_quantity, brand, specifications_json,
            features_json, compatibility, package_contents_json, shipping_weight_grams,
            estimated_dispatch_days, warranty_info, is_featured, is_active, version, created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, 1, datetime('now'), datetime('now')
          )
        `).run(productId, finalName, cleanSlug, cleanSku, finalCatId, finalSubcat, finalShortDesc, finalDesc, finalRegPrice, finalDiscPrice, finalStock, finalBrand, finalSpecs, finalFeatures, finalCompat, finalContents, finalWeight, finalDispatch, finalWarranty, finalFeatured, finalActive);
            }
            else {
                database_js_1.db.prepare(`
          UPDATE products SET
            name = ?, slug = ?, sku = ?, category_id = ?, subcategory = ?, short_description = ?, description = ?,
            regular_price = ?, discounted_price = ?, stock_quantity = ?, brand = ?, specifications_json = ?,
            features_json = ?, compatibility = ?, package_contents_json = ?, shipping_weight_grams = ?,
            estimated_dispatch_days = ?, warranty_info = ?, is_featured = ?, is_active = ?,
            version = version + 1, updated_at = datetime('now')
          WHERE id = ?
        `).run(finalName, cleanSlug, cleanSku, finalCatId, finalSubcat, finalShortDesc, finalDesc, finalRegPrice, finalDiscPrice, finalStock, finalBrand, finalSpecs, finalFeatures, finalCompat, finalContents, finalWeight, finalDispatch, finalWarranty, finalFeatured, finalActive, productId);
            }
            // Update images if supplied
            const allImages = Array.isArray(images) && images.length > 0 ? images : (primary_image ? [primary_image] : []);
            if (allImages.length > 0) {
                database_js_1.db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
                const imgInsert = database_js_1.db.prepare(`
          INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
          VALUES (?, ?, ?, ?, ?)
        `);
                allImages.forEach((img, idx) => {
                    const url = typeof img === 'string' ? img : (img.image_url || img.url);
                    if (url) {
                        imgInsert.run(productId, url, finalName, idx, idx === 0 ? 1 : 0);
                    }
                });
            }
            // Record audit log
            (0, database_js_1.recordAuditLog)(req.user?.email || 'admin@vktechnology.shop', 'UPDATE_PRODUCT', 'Product', productId, { name: finalName, price: finalRegPrice, stock: finalStock, active: finalActive });
            database_js_1.db.exec('COMMIT');
        }
        catch (txErr) {
            try {
                database_js_1.db.exec('ROLLBACK');
            }
            catch { }
            throw txErr;
        }
        // Fetch the updated product record with all populated fields
        const updatedProduct = fetchFullProduct(productId);
        // Broadcast real-time product update to all connected accounts and devices
        try {
            events_js_1.eventBroadcaster.broadcast('PRODUCT_UPDATED', updatedProduct);
        }
        catch { }
        res.json({
            message: 'Product updated successfully.',
            product: updatedProduct,
            updatedAt: updatedProduct?.updated_at || new Date().toISOString(),
            version: updatedProduct?.version || 1
        });
    }
    catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: error.message || 'Failed to update product.' });
    }
});
// Admin: Quick update stock
exports.productsRouter.patch('/:id/stock', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        const { stock_quantity } = req.body;
        const productId = req.params.id;
        if (stock_quantity === undefined || isNaN(Number(stock_quantity)) || Number(stock_quantity) < 0) {
            res.status(400).json({ error: 'Valid stock quantity is required.' });
            return;
        }
        database_js_1.db.prepare(`
      UPDATE products 
      SET stock_quantity = ?, version = version + 1, updated_at = datetime('now') 
      WHERE id = ?
    `).run(Number(stock_quantity), productId);
        (0, database_js_1.recordAuditLog)(req.user?.email || 'admin@vktechnology.shop', 'UPDATE_STOCK', 'Product', productId, { new_stock: stock_quantity });
        const updatedProduct = fetchFullProduct(productId);
        try {
            events_js_1.eventBroadcaster.broadcast('STOCK_CHANGED', {
                product: updatedProduct,
                id: Number(productId),
                stock_quantity: Number(stock_quantity)
            });
        }
        catch { }
        res.json({
            message: 'Stock updated successfully.',
            product: updatedProduct,
            updatedAt: updatedProduct?.updated_at || new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update stock.' });
    }
});
// Admin: Quick toggle publish / unpublish
exports.productsRouter.patch('/:id/status', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        const { is_active } = req.body;
        const productId = req.params.id;
        database_js_1.db.prepare(`
      UPDATE products 
      SET is_active = ?, version = version + 1, updated_at = datetime('now') 
      WHERE id = ?
    `).run(is_active ? 1 : 0, productId);
        (0, database_js_1.recordAuditLog)(req.user?.email || 'admin@vktechnology.shop', is_active ? 'PUBLISH_PRODUCT' : 'UNPUBLISH_PRODUCT', 'Product', productId, { is_active: !!is_active });
        const updatedProduct = fetchFullProduct(productId);
        try {
            events_js_1.eventBroadcaster.broadcast('PRODUCT_UPDATED', {
                product: updatedProduct,
                id: Number(productId),
                is_active: !!is_active
            });
        }
        catch { }
        res.json({
            message: `Product ${is_active ? 'published' : 'unpublished'} successfully.`,
            product: updatedProduct,
            updatedAt: updatedProduct?.updated_at || new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update status.' });
    }
});
// Admin: Delete product (with foreign key protection for orders)
exports.productsRouter.delete('/:id', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        const productId = req.params.id;
        // Safety rule: Never delete product if existing orders reference it
        const orderRef = database_js_1.db.prepare('SELECT COUNT(*) as count FROM order_items WHERE product_id = ?').get(productId);
        if (orderRef && orderRef.count > 0) {
            // Soft-delete: unpublish product to preserve customer order history
            database_js_1.db.prepare(`
        UPDATE products 
        SET is_active = 0, version = version + 1, updated_at = datetime('now') 
        WHERE id = ?
      `).run(productId);
            (0, database_js_1.recordAuditLog)(req.user?.email || 'admin@vktechnology.shop', 'ARCHIVE_PRODUCT_IN_ORDERS', 'Product', productId, { reason: 'Product referenced in existing order history, unpublished safely' });
            try {
                events_js_1.eventBroadcaster.broadcast('PRODUCT_DELETED', { id: Number(productId) });
            }
            catch { }
            res.json({
                message: 'Product is referenced in customer orders. It has been safely archived and unpublished from the public storefront.',
                productId: Number(productId),
                timestamp: new Date().toISOString()
            });
            return;
        }
        // Atomic transaction for complete cascade removal
        database_js_1.db.exec('BEGIN TRANSACTION');
        try {
            database_js_1.db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
            database_js_1.db.prepare('DELETE FROM cart_items WHERE product_id = ?').run(productId);
            database_js_1.db.prepare('DELETE FROM wishlists WHERE product_id = ?').run(productId);
            database_js_1.db.prepare('DELETE FROM reviews WHERE product_id = ?').run(productId);
            database_js_1.db.prepare('DELETE FROM products WHERE id = ?').run(productId);
            (0, database_js_1.recordAuditLog)(req.user?.email || 'admin@vktechnology.shop', 'DELETE_PRODUCT', 'Product', productId);
            database_js_1.db.exec('COMMIT');
        }
        catch (txErr) {
            try {
                database_js_1.db.exec('ROLLBACK');
            }
            catch { }
            throw txErr;
        }
        try {
            events_js_1.eventBroadcaster.broadcast('PRODUCT_DELETED', { id: Number(productId) });
        }
        catch { }
        res.json({
            message: 'Product deleted successfully.',
            productId: Number(productId),
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete product.' });
    }
});
