import { Router, Response } from 'express';
import { db, recordAuditLog, getCanonicalProductsList } from '../database.js';
import { authenticateToken, requireAdmin, requireSuperAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { eventBroadcaster } from '../services/events.js';
import { setDynamicCacheControl, setPrivateCacheControl } from '../utils/cache.js';
import { isMongoConnected } from '../config/database.js';
import { Product as MongoProduct } from '../models/Product.js';

export const productsRouter = Router();

// Helper functions for dual-engine MongoDB Atlas synchronization
async function syncProductToMongo(prod: any) {
  if (!isMongoConnected() || !prod) return;
  try {
    const mongoData: any = {
      id: Number(prod.id),
      name: prod.name,
      slug: prod.slug,
      sku: prod.sku,
      category_id: prod.category_id ? Number(prod.category_id) : undefined,
      category_slug: prod.category_slug || 'diy-electronics',
      brand: prod.brand || 'VK Technology',
      description: prod.description || prod.name,
      short_description: prod.short_description || undefined,
      image_url: prod.primary_image || (Array.isArray(prod.images) && prod.images[0] ? (typeof prod.images[0] === 'string' ? prod.images[0] : prod.images[0].url || prod.images[0].image_url) : 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80'),
      price: Number(prod.regular_price),
      discounted_price: (prod.discounted_price !== null && prod.discounted_price !== undefined) ? Number(prod.discounted_price) : undefined,
      stock_quantity: Number(prod.stock_quantity || 0),
      specifications: prod.specifications || {},
      compatibility: prod.compatibility || 'Arduino IDE, PlatformIO, ESP-IDF, Raspberry Pi OS',
      is_featured: !!prod.is_featured,
      is_active: !!prod.is_active,
      deleted_at: prod.deleted_at ? new Date(prod.deleted_at) : null,
    };

    if (Array.isArray(prod.images)) {
      mongoData.images = prod.images.map((img: any, i: number) => ({
        url: typeof img === 'string' ? img : (img.image_url || img.url),
        sort_order: i,
        is_primary: i === 0
      }));
    }

    await MongoProduct.findOneAndUpdate(
      { $or: [{ id: Number(prod.id) }, { sku: prod.sku }] },
      { $set: mongoData },
      { upsert: true, new: true, runValidators: true }
    );
  } catch (err) {
    console.warn('[MongoSync] Failed to sync product to MongoDB Atlas:', err);
  }
}

async function syncArchiveProductToMongo(idOrIds: number | number[], isArchived: boolean, isActive: boolean = false) {
  if (!isMongoConnected()) return;
  try {
    const ids = (Array.isArray(idOrIds) ? idOrIds : [idOrIds]).map(Number).filter(n => !isNaN(n));
    await MongoProduct.updateMany(
      { id: { $in: ids } },
      {
        $set: {
          deleted_at: isArchived ? new Date() : null,
          is_active: isActive
        }
      },
      { runValidators: true }
    );
  } catch (err) {
    console.warn('[MongoSync] Failed to sync archive state to MongoDB Atlas:', err);
  }
}

async function syncStockToMongo(productId: number, newStock: number) {
  if (!isMongoConnected()) return;
  try {
    await MongoProduct.updateOne(
      { id: Number(productId) },
      { $set: { stock_quantity: Number(newStock) } },
      { runValidators: true }
    );
  } catch (err) {
    console.warn('[MongoSync] Failed to sync stock to MongoDB Atlas:', err);
  }
}

async function syncStatusToMongo(idOrIds: number | number[], isActive: boolean) {
  if (!isMongoConnected()) return;
  try {
    const ids = (Array.isArray(idOrIds) ? idOrIds : [idOrIds]).map(Number).filter(n => !isNaN(n));
    await MongoProduct.updateMany(
      { id: { $in: ids } },
      { $set: { is_active: isActive } },
      { runValidators: true }
    );
  } catch (err) {
    console.warn('[MongoSync] Failed to sync status to MongoDB Atlas:', err);
  }
}

async function syncPermanentDeleteToMongo(ids: number[]) {
  if (!isMongoConnected()) return;
  try {
    const validIds = ids.map(Number).filter(n => !isNaN(n));
    await MongoProduct.deleteMany({ id: { $in: validIds } });
  } catch (err) {
    console.warn('[MongoSync] Failed to sync permanent deletion to MongoDB Atlas:', err);
  }
}

// Helper to fetch full populated product record
function fetchFullProduct(idOrSlug: number | string, allowArchived: boolean = false): any {
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
  const prod = db.prepare(sql).get(idOrSlug) as any;
  if (!prod) return null;
  if (!allowArchived && prod.deleted_at) return null;

  try { prod.specifications = JSON.parse(prod.specifications_json || '{}'); } catch { prod.specifications = {}; }
  try { prod.features = JSON.parse(prod.features_json || '[]'); } catch { prod.features = []; }
  try { prod.package_contents = JSON.parse(prod.package_contents_json || '[]'); } catch { prod.package_contents = []; }

  prod.images = db.prepare(`
    SELECT id, image_url, alt_text, is_primary, sort_order 
    FROM product_images 
    WHERE product_id = ? 
    ORDER BY is_primary DESC, sort_order ASC
  `).all(prod.id);

  return prod;
}

// Global Catalog Sync Status Endpoint
productsRouter.get('/sync/status', (req, res) => {
  setDynamicCacheControl(res);
  const syncStatus = eventBroadcaster.getCatalogSyncStatus();
  const totalRow = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get() as any;
  res.json({
    ...syncStatus,
    totalProducts: totalRow?.count || 0
  });
});

// Handler for administrative product listing (supports /api/admin/products and /api/products/admin/all)
export function handleAdminProductsList(req: AuthenticatedRequest, res: Response) {
  try {
    setPrivateCacheControl(res);

    const { search, category, status } = req.query;
    let conditions: string[] = ['1=1'];
    let params: any[] = [];

    if (search && typeof search === 'string') {
      conditions.push('(p.name LIKE ? OR p.sku LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      conditions.push('p.category_id = ?');
      params.push(category);
    }

    if (status === 'archived' || status === 'recycle_bin') {
      conditions.push('p.deleted_at IS NOT NULL');
    } else {
      conditions.push('p.deleted_at IS NULL');
      if (status === 'active') conditions.push('p.is_active = 1');
      if (status === 'inactive') conditions.push('p.is_active = 0');
      if (status === 'low_stock') conditions.push('p.stock_quantity <= 5 AND p.stock_quantity > 0');
      if (status === 'out_of_stock') conditions.push('p.stock_quantity = 0');
    }

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

    const products = db.prepare(sql).all(...params) as any[];
    const imgStmt = db.prepare('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC');
    products.forEach((p: any) => {
      try { p.specifications = JSON.parse(p.specifications_json || '{}'); } catch { p.specifications = {}; }
      try { p.features = JSON.parse(p.features_json || '[]'); } catch { p.features = []; }
      try { p.package_contents = JSON.parse(p.package_contents_json || '[]'); } catch { p.package_contents = []; }
      try {
        const rows = imgStmt.all(p.id) as { image_url: string }[];
        p.images = rows.map(r => r.image_url);
        if (!p.primary_image && p.images.length > 0) {
          p.primary_image = p.images[0];
        }
      } catch {
        p.images = p.primary_image ? [p.primary_image] : [];
      }
    });

    res.json({ products });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch admin products.' });
  }
}

// Public: Get all products with search, filters, pagination, and sorting
productsRouter.get('/', (req, res) => {
  // If invoked via /api/admin/products route, delegate directly to admin handler
  if (req.baseUrl.includes('admin')) {
    return authenticateToken(req as any, res as any, () => {
      requireAdmin(req as any, res as any, () => {
        handleAdminProductsList(req as any, res);
      });
    });
  }

  try {
    const syncStatus = eventBroadcaster.getCatalogSyncStatus();
    setDynamicCacheControl(res, syncStatus.catalogVersion, syncStatus.lastUpdated);

    const {
      q,
      category,
      brand,
      min_price,
      max_price,
      in_stock,
      rating,
      featured,
      sort,
      page = 1,
      limit = 24
    } = req.query;

    let conditions: string[] = ['p.is_active = 1', 'p.deleted_at IS NULL'];
    let params: any[] = [];

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
      params.push(parseFloat(min_price as string));
    }
    if (max_price) {
      conditions.push('COALESCE(p.discounted_price, p.regular_price) <= ?');
      params.push(parseFloat(max_price as string));
    }

    // In stock
    if (in_stock === 'true' || in_stock === '1') {
      conditions.push('p.stock_quantity > 0');
    }

    // Rating
    if (rating) {
      conditions.push('p.rating_avg >= ?');
      params.push(parseFloat(rating as string));
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
    const countRow = db.prepare(countSql).get(...params) as { count: number };
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

    const products = db.prepare(selectSql).all(...params, Number(limit), offset);

    // Parse JSON fields
    products.forEach((p: any) => {
      try { p.specifications = JSON.parse(p.specifications_json || '{}'); } catch { p.specifications = {}; }
      try { p.features = JSON.parse(p.features_json || '[]'); } catch { p.features = []; }
      try { p.package_contents = JSON.parse(p.package_contents_json || '[]'); } catch { p.package_contents = []; }
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
  } catch (error: any) {
    console.error('Products fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// Admin: Get all products (including inactive) with inventory status
productsRouter.get('/admin/all', authenticateToken, requireAdmin, handleAdminProductsList);

// Public: Get single product by slug or id
productsRouter.get('/:slug', (req, res) => {
  try {
    const syncStatus = eventBroadcaster.getCatalogSyncStatus();
    setDynamicCacheControl(res, syncStatus.catalogVersion, syncStatus.lastUpdated);

    const product = fetchFullProduct(req.params.slug);

    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    // Increment view count safely
    try {
      db.prepare('UPDATE products SET view_count = view_count + 1 WHERE id = ?').run(product.id);
    } catch {}

    // Fetch approved reviews
    const reviews = db.prepare(`
      SELECT id, customer_name, rating, title, comment, is_verified_purchase, created_at
      FROM reviews
      WHERE product_id = ? AND status = 'approved'
      ORDER BY id DESC
    `).all(product.id);

    // Fetch related products from same category
    const relatedProducts = db.prepare(`
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
  } catch (error: any) {
    console.error('Product detail error:', error);
    res.status(500).json({ error: 'Failed to fetch product details.' });
  }
});

// Admin: Create product
productsRouter.post('/', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      slug,
      sku,
      category_id,
      subcategory,
      short_description,
      description,
      regular_price,
      discounted_price,
      stock_quantity,
      brand,
      specifications,
      features,
      compatibility,
      package_contents,
      shipping_weight_grams,
      estimated_dispatch_days,
      warranty_info,
      is_featured,
      is_active,
      images = []
    } = req.body;

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
    if (!cleanSlug) cleanSlug = `product-${Date.now()}`;
    const existingSlug = db.prepare('SELECT id FROM products WHERE slug = ?').get(cleanSlug);
    if (existingSlug) {
      cleanSlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;
    }

    // SKU deduplication and idempotency protection
    let cleanSku = sku.trim().toUpperCase();
    const existingSku = db.prepare('SELECT id FROM products WHERE sku = ?').get(cleanSku);
    if (existingSku) {
      res.status(409).json({ error: `A product with SKU "${cleanSku}" already exists. Please use a unique SKU.` });
      return;
    }

    let validCatId = Number(category_id);
    const catExists = db.prepare('SELECT id FROM categories WHERE id = ?').get(validCatId);
    if (!catExists) {
      const firstCat = db.prepare('SELECT id FROM categories ORDER BY id ASC LIMIT 1').get() as any;
      if (firstCat) validCatId = firstCat.id;
    }

    // Begin database transaction for atomic multi-table write
    db.exec('BEGIN TRANSACTION');
    let productId: number;
    try {
      const result = db.prepare(`
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
      `).run(
        name.trim(),
        cleanSlug,
        cleanSku,
        validCatId,
        subcategory || null,
        short_description || null,
        description || name,
        Number(regular_price),
        (discounted_price !== undefined && discounted_price !== null && discounted_price !== '') ? Number(discounted_price) : null,
        Number(stock_quantity || 0),
        brand || 'VK Technology',
        specifications ? JSON.stringify(specifications) : '{}',
        features ? JSON.stringify(features) : '[]',
        compatibility || null,
        package_contents ? JSON.stringify(package_contents) : '[]',
        Number(shipping_weight_grams || 250),
        Number(estimated_dispatch_days || 1),
        warranty_info || '6 Months Warranty',
        is_featured ? 1 : 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1
      );

      productId = Number(result.lastInsertRowid);

      // Insert product images
      if (Array.isArray(images) && images.length > 0) {
        const imgInsert = db.prepare(`
          INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
          VALUES (?, ?, ?, ?, ?)
        `);
        images.forEach((img: string | { url?: string; image_url?: string }, idx: number) => {
          const url = typeof img === 'string' ? img : (img.url || img.image_url);
          if (url) {
            imgInsert.run(productId, url, name, idx, idx === 0 ? 1 : 0);
          }
        });
      }

      // Record audit log
      recordAuditLog(
        req.user?.email || 'admin@vktechnology.shop',
        'CREATE_PRODUCT',
        'Product',
        productId,
        { name, sku: cleanSku, regular_price, category_id: validCatId }
      );

      db.exec('COMMIT');
    } catch (txErr) {
      try { db.exec('ROLLBACK'); } catch {}
      throw txErr;
    }

    // Fetch the full newly created product record
    const savedProduct = fetchFullProduct(productId);

    // Sync to MongoDB Atlas with validation
    await syncProductToMongo(savedProduct);

    // Broadcast real-time product creation to all connected accounts and devices
    try {
      eventBroadcaster.broadcast('PRODUCT_CREATED', savedProduct);
    } catch {}

    res.status(201).json({
      message: 'Product created successfully.',
      product: savedProduct,
      productId,
      updatedAt: savedProduct?.updated_at || new Date().toISOString(),
      version: savedProduct?.version || 1
    });
  } catch (error: any) {
    console.error('Create product error:', error);
    res.status(500).json({ error: error.message || 'Failed to create product.' });
  }
});

// Admin: Update product
productsRouter.put('/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const isNumericId = /^\d+$/.test(String(rawId));
    let existingProduct = db.prepare(isNumericId ? 'SELECT * FROM products WHERE id = ?' : 'SELECT * FROM products WHERE slug = ?').get(rawId) as any;
    const productId = existingProduct ? existingProduct.id : (isNumericId ? Number(rawId) : rawId);
    const {
      name,
      slug,
      sku,
      category_id,
      subcategory,
      short_description,
      description,
      regular_price,
      discounted_price,
      stock_quantity,
      brand,
      specifications,
      features,
      compatibility,
      package_contents,
      shipping_weight_grams,
      estimated_dispatch_days,
      warranty_info,
      is_featured,
      is_active,
      images,
      primary_image
    } = req.body;

    if (!existingProduct && !name) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    let cleanSlug = slug;
    if (!cleanSlug && existingProduct?.slug) cleanSlug = existingProduct.slug;
    if (!cleanSlug && name) {
      cleanSlug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }
    if (!cleanSlug) cleanSlug = `product-${productId}`;

    let cleanSku = sku ? sku.trim().toUpperCase() : (existingProduct?.sku || `VK-${productId}`);

    let validCatId = Number(category_id || (existingProduct?.category_id || 1));
    const catExists = db.prepare('SELECT id FROM categories WHERE id = ?').get(validCatId);
    if (!catExists) {
      const firstCat = db.prepare('SELECT id FROM categories ORDER BY id ASC LIMIT 1').get() as any;
      if (firstCat) validCatId = firstCat.id;
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
    db.exec('BEGIN TRANSACTION');
    try {
      if (!existingProduct) {
        db.prepare(`
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
        `).run(
          productId,
          finalName,
          cleanSlug,
          cleanSku,
          finalCatId,
          finalSubcat,
          finalShortDesc,
          finalDesc,
          finalRegPrice,
          finalDiscPrice,
          finalStock,
          finalBrand,
          finalSpecs,
          finalFeatures,
          finalCompat,
          finalContents,
          finalWeight,
          finalDispatch,
          finalWarranty,
          finalFeatured,
          finalActive
        );
      } else {
        db.prepare(`
          UPDATE products SET
            name = ?, slug = ?, sku = ?, category_id = ?, subcategory = ?, short_description = ?, description = ?,
            regular_price = ?, discounted_price = ?, stock_quantity = ?, brand = ?, specifications_json = ?,
            features_json = ?, compatibility = ?, package_contents_json = ?, shipping_weight_grams = ?,
            estimated_dispatch_days = ?, warranty_info = ?, is_featured = ?, is_active = ?,
            version = version + 1, updated_at = datetime('now')
          WHERE id = ?
        `).run(
          finalName,
          cleanSlug,
          cleanSku,
          finalCatId,
          finalSubcat,
          finalShortDesc,
          finalDesc,
          finalRegPrice,
          finalDiscPrice,
          finalStock,
          finalBrand,
          finalSpecs,
          finalFeatures,
          finalCompat,
          finalContents,
          finalWeight,
          finalDispatch,
          finalWarranty,
          finalFeatured,
          finalActive,
          productId
        );
      }

      // Update images if supplied
      const allImages = Array.isArray(images) && images.length > 0 ? images : (primary_image ? [primary_image] : []);
      if (allImages.length > 0) {
        db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
        const imgInsert = db.prepare(`
          INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
          VALUES (?, ?, ?, ?, ?)
        `);
        allImages.forEach((img: any, idx: number) => {
          const url = typeof img === 'string' ? img : (img.image_url || img.url);
          if (url) {
            imgInsert.run(productId, url, finalName, idx, idx === 0 ? 1 : 0);
          }
        });
      }

      // Record audit log
      recordAuditLog(
        req.user?.email || 'admin@vktechnology.shop',
        'UPDATE_PRODUCT',
        'Product',
        productId,
        { name: finalName, price: finalRegPrice, stock: finalStock, active: finalActive }
      );

      db.exec('COMMIT');
    } catch (txErr) {
      try { db.exec('ROLLBACK'); } catch {}
      throw txErr;
    }

    // Fetch the updated product record with all populated fields
    const updatedProduct = fetchFullProduct(productId);

    // Sync to MongoDB Atlas with validation
    await syncProductToMongo(updatedProduct);

    // Broadcast real-time product update to all connected accounts and devices
    try {
      eventBroadcaster.broadcast('PRODUCT_UPDATED', updatedProduct);
    } catch {}

    res.json({
      message: 'Product updated successfully.',
      product: updatedProduct,
      updatedAt: updatedProduct?.updated_at || new Date().toISOString(),
      version: updatedProduct?.version || 1
    });
  } catch (error: any) {
    console.error('Update product error:', error);
    res.status(500).json({ error: error.message || 'Failed to update product.' });
  }
});

// Admin: Quick update stock
productsRouter.patch('/:id/stock', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { stock_quantity } = req.body;
    const rawId = req.params.id;
    const isNumericId = /^\d+$/.test(String(rawId));
    let existingProduct = db.prepare(isNumericId ? 'SELECT * FROM products WHERE id = ?' : 'SELECT * FROM products WHERE slug = ?').get(rawId) as any;
    const productId = existingProduct ? existingProduct.id : (isNumericId ? Number(rawId) : rawId);

    if (stock_quantity === undefined || isNaN(Number(stock_quantity)) || Number(stock_quantity) < 0) {
      res.status(400).json({ error: 'Valid stock quantity is required.' });
      return;
    }

    db.prepare(`
      UPDATE products 
      SET stock_quantity = ?, version = version + 1, updated_at = datetime('now') 
      WHERE id = ?
    `).run(Number(stock_quantity), productId);

    recordAuditLog(
      req.user?.email || 'admin@vktechnology.shop',
      'UPDATE_STOCK',
      'Product',
      productId,
      { new_stock: stock_quantity }
    );

    const updatedProduct = fetchFullProduct(productId);

    // Sync to MongoDB Atlas
    await syncStockToMongo(Number(productId), Number(stock_quantity));

    try {
      eventBroadcaster.broadcast('STOCK_CHANGED', {
        product: updatedProduct,
        id: Number(productId),
        stock_quantity: Number(stock_quantity)
      });
    } catch {}

    res.json({
      message: 'Stock updated successfully.',
      product: updatedProduct,
      updatedAt: updatedProduct?.updated_at || new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update stock.' });
  }
});

// Admin: Quick toggle publish / unpublish
productsRouter.patch('/:id/status', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { is_active } = req.body;
    const rawId = req.params.id;
    const isNumericId = /^\d+$/.test(String(rawId));
    let existingProduct = db.prepare(isNumericId ? 'SELECT * FROM products WHERE id = ?' : 'SELECT * FROM products WHERE slug = ?').get(rawId) as any;
    const productId = existingProduct ? existingProduct.id : (isNumericId ? Number(rawId) : rawId);

    db.prepare(`
      UPDATE products 
      SET is_active = ?, version = version + 1, updated_at = datetime('now') 
      WHERE id = ?
    `).run(is_active ? 1 : 0, productId);

    recordAuditLog(
      req.user?.email || 'admin@vktechnology.shop',
      is_active ? 'PUBLISH_PRODUCT' : 'UNPUBLISH_PRODUCT',
      'Product',
      productId,
      { is_active: !!is_active }
    );

    const updatedProduct = fetchFullProduct(productId);

    // Sync to MongoDB Atlas
    await syncStatusToMongo(Number(productId), !!is_active);

    try {
      eventBroadcaster.broadcast('PRODUCT_UPDATED', {
        product: updatedProduct,
        id: Number(productId),
        is_active: !!is_active
      });
    } catch {}

    res.json({
      message: `Product ${is_active ? 'published' : 'unpublished'} successfully.`,
      product: updatedProduct,
      updatedAt: updatedProduct?.updated_at || new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// Admin: Soft-Archive Products (Move to Recycle Bin)
const bulkArchiveProductsHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let { ids, all } = req.body || {};

    let targetIds: number[] = [];
    if (all === true) {
      const allRows = db.prepare('SELECT id FROM products WHERE deleted_at IS NULL').all() as Array<{ id: number }>;
      targetIds = allRows.map(r => r.id);
    } else if (Array.isArray(ids)) {
      targetIds = ids.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
    }

    if (targetIds.length === 0) {
      res.status(400).json({ error: 'No active products selected for archiving.' });
      return;
    }

    db.exec('BEGIN TRANSACTION');
    try {
      const stmt = db.prepare(`
        UPDATE products 
        SET deleted_at = datetime('now'), is_active = 0, version = version + 1, updated_at = datetime('now') 
        WHERE id = ?
      `);

      for (const prodId of targetIds) {
        stmt.run(prodId);
      }

      recordAuditLog(
        req.user?.email || 'admin@vktechnology.shop',
        'BULK_ARCHIVE_PRODUCTS',
        'Products',
        targetIds.join(','),
        { archivedCount: targetIds.length, targetIds }
      );

      db.exec('COMMIT');
    } catch (txErr) {
      try { db.exec('ROLLBACK'); } catch {}
      throw txErr;
    }

    // Sync to MongoDB Atlas
    await syncArchiveProductToMongo(targetIds, true, false);

    // Broadcast live event for synchronization across all clients
    try {
      eventBroadcaster.broadcast('PRODUCT_DELETED', { 
        count: targetIds.length, 
        archivedIds: targetIds,
        archived: true
      });
    } catch {}

    res.json({
      message: `Successfully archived ${targetIds.length} products to the Recycle Bin. Products remain safely preserved.`,
      archivedCount: targetIds.length,
      deletedCount: 0,
      totalProcessed: targetIds.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Bulk archive products error:', error);
    res.status(500).json({ error: error.message || 'Failed to archive products.' });
  }
};

// Aliases for bulk archiving (guarantees safe non-destructive soft-archive across all calls)
productsRouter.post('/admin/bulk-archive', authenticateToken, requireAdmin, bulkArchiveProductsHandler);
productsRouter.post('/bulk-archive', authenticateToken, requireAdmin, bulkArchiveProductsHandler);
productsRouter.post('/admin/bulk-delete', authenticateToken, requireAdmin, bulkArchiveProductsHandler);
productsRouter.post('/bulk-delete', authenticateToken, requireAdmin, bulkArchiveProductsHandler);
productsRouter.delete('/admin/all', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  req.body = { all: true };
  bulkArchiveProductsHandler(req, res);
});
productsRouter.delete('/all', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  req.body = { all: true };
  bulkArchiveProductsHandler(req, res);
});

// Admin: Bulk Toggle Status (Publish / Unpublish)
const bulkStatusProductsHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ids, is_active } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'No product IDs provided.' });
      return;
    }
    const targetIds = ids.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
    const newStatus = is_active ? 1 : 0;

    db.exec('BEGIN TRANSACTION');
    try {
      const stmt = db.prepare(`
        UPDATE products 
        SET is_active = ?, version = version + 1, updated_at = datetime('now') 
        WHERE id = ?
      `);
      for (const id of targetIds) {
        stmt.run(newStatus, id);
      }

      recordAuditLog(
        req.user?.email || 'admin@vktechnology.shop',
        'BULK_UPDATE_PRODUCT_STATUS',
        'Products',
        targetIds.join(','),
        { is_active: newStatus, count: targetIds.length }
      );

      db.exec('COMMIT');
    } catch (txErr) {
      try { db.exec('ROLLBACK'); } catch {}
      throw txErr;
    }

    // Sync to MongoDB Atlas
    await syncStatusToMongo(targetIds, !!is_active);

    try {
      eventBroadcaster.broadcast('PRODUCT_UPDATED', {
        ids: targetIds,
        is_active: !!is_active
      });
    } catch {}

    res.json({
      message: `Successfully ${is_active ? 'published' : 'unpublished'} ${targetIds.length} products.`,
      count: targetIds.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Bulk status update error:', error);
    res.status(500).json({ error: error.message || 'Failed to update product statuses.' });
  }
};

productsRouter.post('/admin/bulk-status', authenticateToken, requireAdmin, bulkStatusProductsHandler);
productsRouter.post('/bulk-status', authenticateToken, requireAdmin, bulkStatusProductsHandler);

// Admin: Soft-Archive Single Product (Move to Recycle Bin)
const archiveProductHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const isNumericId = /^\d+$/.test(String(rawId));
    let existing = db.prepare(isNumericId ? 'SELECT id, name, sku FROM products WHERE id = ?' : 'SELECT id, name, sku FROM products WHERE slug = ?').get(rawId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const productId = existing.id;

    db.prepare(`
      UPDATE products 
      SET deleted_at = datetime('now'), is_active = 0, version = version + 1, updated_at = datetime('now') 
      WHERE id = ?
    `).run(productId);

    recordAuditLog(
      req.user?.email || 'admin@vktechnology.shop',
      'ARCHIVE_PRODUCT',
      'Product',
      productId,
      { name: existing.name, sku: existing.sku }
    );

    // Sync to MongoDB Atlas
    await syncArchiveProductToMongo(Number(productId), true, false);

    try {
      eventBroadcaster.broadcast('PRODUCT_DELETED', { id: Number(productId), archived: true });
    } catch {}

    res.json({
      message: `Product "${existing.name}" has been safely archived to the Recycle Bin.`,
      productId: Number(productId),
      archived: true,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Archive product error:', error);
    res.status(500).json({ error: error.message || 'Failed to archive product.' });
  }
};

productsRouter.delete('/:id', authenticateToken, requireAdmin, archiveProductHandler);
productsRouter.delete('/admin/:id', authenticateToken, requireAdmin, archiveProductHandler);
productsRouter.post('/:id/archive', authenticateToken, requireAdmin, archiveProductHandler);
productsRouter.post('/admin/:id/archive', authenticateToken, requireAdmin, archiveProductHandler);

// Admin: Restore Single Product from Recycle Bin
const restoreProductHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const isNumericId = /^\d+$/.test(String(rawId));
    let existing = db.prepare(isNumericId ? 'SELECT id, name, sku FROM products WHERE id = ?' : 'SELECT id, name, sku FROM products WHERE slug = ?').get(rawId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const productId = existing.id;

    db.prepare(`
      UPDATE products 
      SET deleted_at = NULL, is_active = 1, version = version + 1, updated_at = datetime('now') 
      WHERE id = ?
    `).run(productId);

    recordAuditLog(
      req.user?.email || 'admin@vktechnology.shop',
      'RESTORE_PRODUCT',
      'Product',
      productId,
      { name: existing.name, sku: existing.sku }
    );

    const fullProduct = fetchFullProduct(productId);

    // Sync to MongoDB Atlas
    await syncArchiveProductToMongo(Number(productId), false, true);

    try {
      eventBroadcaster.broadcast('PRODUCT_UPDATED', fullProduct);
    } catch {}

    res.json({
      message: `Product "${existing.name}" restored successfully.`,
      product: fullProduct,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Restore product error:', error);
    res.status(500).json({ error: error.message || 'Failed to restore product.' });
  }
};

productsRouter.post('/:id/restore', authenticateToken, requireAdmin, restoreProductHandler);
productsRouter.post('/admin/:id/restore', authenticateToken, requireAdmin, restoreProductHandler);

// Admin: Bulk Restore Products from Recycle Bin
const bulkRestoreProductsHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let { ids, all } = req.body || {};

    let targetIds: number[] = [];
    if (all === true) {
      const allRows = db.prepare('SELECT id FROM products WHERE deleted_at IS NOT NULL').all() as Array<{ id: number }>;
      targetIds = allRows.map(r => r.id);
    } else if (Array.isArray(ids)) {
      targetIds = ids.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
    }

    if (targetIds.length === 0) {
      res.status(400).json({ error: 'No archived products selected for restoration.' });
      return;
    }

    db.exec('BEGIN TRANSACTION');
    try {
      const stmt = db.prepare(`
        UPDATE products 
        SET deleted_at = NULL, is_active = 1, version = version + 1, updated_at = datetime('now') 
        WHERE id = ?
      `);

      for (const prodId of targetIds) {
        stmt.run(prodId);
      }

      recordAuditLog(
        req.user?.email || 'admin@vktechnology.shop',
        'BULK_RESTORE_PRODUCTS',
        'Products',
        targetIds.join(','),
        { restoredCount: targetIds.length, restoredIds: targetIds }
      );

      db.exec('COMMIT');
    } catch (txErr) {
      try { db.exec('ROLLBACK'); } catch {}
      throw txErr;
    }

    // Sync to MongoDB Atlas
    await syncArchiveProductToMongo(targetIds, false, true);

    try {
      eventBroadcaster.broadcast('PRODUCT_UPDATED', { restoredIds: targetIds });
    } catch {}

    res.json({
      message: `Successfully restored ${targetIds.length} products to the active catalog.`,
      restoredCount: targetIds.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Bulk restore products error:', error);
    res.status(500).json({ error: error.message || 'Failed to bulk restore products.' });
  }
};

productsRouter.post('/admin/bulk-restore', authenticateToken, requireAdmin, bulkRestoreProductsHandler);
productsRouter.post('/bulk-restore', authenticateToken, requireAdmin, bulkRestoreProductsHandler);

// Admin: Dedicated Recycle Bin Endpoint
productsRouter.get('/admin/recycle-bin', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  req.query.status = 'recycle_bin';
  handleAdminProductsList(req, res);
});

// Super Admin ONLY: Strictly Protected Permanent Deletion
productsRouter.post('/admin/permanent-delete', authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ids, id, confirmPhrase } = req.body || {};

    // 1. Mandatory confirmation phrase check
    if (confirmPhrase !== 'DELETE PERMANENTLY') {
      res.status(400).json({
        error: 'Confirmation phrase mismatch. You must explicitly type "DELETE PERMANENTLY" to permanently delete products.'
      });
      return;
    }

    let targetIds: number[] = [];
    if (id !== undefined && id !== null) {
      targetIds = [Number(id)];
    } else if (Array.isArray(ids)) {
      targetIds = ids.map(x => Number(x)).filter(x => !isNaN(x) && x > 0);
    }

    if (targetIds.length === 0) {
      res.status(400).json({ error: 'No valid product IDs provided for permanent deletion.' });
      return;
    }

    // 2. Safety Rule: Check if products are referenced in past customer orders
    const blockedByOrders: Array<{ id: number; name: string; sku: string; orderCount: number }> = [];
    const deletableIds: number[] = [];

    for (const prodId of targetIds) {
      const orderRef = db.prepare('SELECT COUNT(*) as count FROM order_items WHERE product_id = ?').get(prodId) as any;
      const orderCount = Number(orderRef?.count || 0);

      if (orderCount > 0) {
        const prod = db.prepare('SELECT id, name, sku FROM products WHERE id = ?').get(prodId) as any;
        blockedByOrders.push({
          id: prodId,
          name: prod?.name || `Product #${prodId}`,
          sku: prod?.sku || 'UNKNOWN',
          orderCount
        });
      } else {
        deletableIds.push(prodId);
      }
    }

    if (deletableIds.length === 0) {
      res.status(400).json({
        error: `Cannot permanently delete product(s). All ${blockedByOrders.length} selected product(s) are referenced in existing customer orders. They must remain safely archived in the Recycle Bin to preserve order history.`,
        blockedByOrders
      });
      return;
    }

    // Atomic cascade deletion only for unreferenced products
    db.exec('BEGIN TRANSACTION');
    try {
      for (const prodId of deletableIds) {
        db.prepare('DELETE FROM product_images WHERE product_id = ?').run(prodId);
        db.prepare('DELETE FROM cart_items WHERE product_id = ?').run(prodId);
        db.prepare('DELETE FROM wishlists WHERE product_id = ?').run(prodId);
        db.prepare('DELETE FROM reviews WHERE product_id = ?').run(prodId);
        db.prepare('DELETE FROM products WHERE id = ?').run(prodId);
      }

      recordAuditLog(
        req.user?.email || 'admin@vktechnology.shop',
        'PERMANENT_DELETE_PRODUCTS',
        'Products',
        deletableIds.join(','),
        { deletedCount: deletableIds.length, deletableIds, blockedCount: blockedByOrders.length, blockedByOrders }
      );

      db.exec('COMMIT');
    } catch (txErr) {
      try { db.exec('ROLLBACK'); } catch {}
      throw txErr;
    }

    // Sync permanent deletion to MongoDB Atlas
    await syncPermanentDeleteToMongo(deletableIds);

    try {
      eventBroadcaster.broadcast('PRODUCT_PERMANENTLY_DELETED', { ids: deletableIds });
    } catch {}

    let message = `Permanently deleted ${deletableIds.length} product(s).`;
    if (blockedByOrders.length > 0) {
      message += ` Note: ${blockedByOrders.length} product(s) were protected and retained because they are referenced in customer orders.`;
    }

    res.json({
      message,
      deletedCount: deletableIds.length,
      deletedIds: deletableIds,
      blockedCount: blockedByOrders.length,
      blockedByOrders,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Permanent delete products error:', error);
    res.status(500).json({ error: error.message || 'Failed to permanently delete products.' });
  }
});

// Admin: Selective Recovery and Inspection for Missing Catalog Products
productsRouter.post('/admin/recover-missing', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { dryRun = true, execute = false } = req.body || {};

    const canonicalProducts = getCanonicalProductsList();
    const statusReport: any[] = [];
    let missingCount = 0;
    let archivedCount = 0;
    let activeCount = 0;

    for (const cp of canonicalProducts) {
      const existing = db.prepare('SELECT id, name, sku, is_active, deleted_at FROM products WHERE sku = ?').get(cp.sku) as any;
      if (!existing) {
        missingCount++;
        statusReport.push({ sku: cp.sku, name: cp.name, status: 'MISSING', action: 'CAN_REINSERT' });
      } else if (existing.deleted_at) {
        archivedCount++;
        statusReport.push({ sku: cp.sku, name: cp.name, id: existing.id, status: 'ARCHIVED', action: 'CAN_RESTORE' });
      } else {
        activeCount++;
        statusReport.push({ sku: cp.sku, name: cp.name, id: existing.id, status: 'ACTIVE', action: 'NONE_NEEDED' });
      }
    }

    if (dryRun && !execute) {
      res.json({
        mode: 'DRY_RUN',
        message: `Catalog Audit: ${canonicalProducts.length} canonical products checked. ${missingCount} missing, ${archivedCount} in Recycle Bin, ${activeCount} currently active.`,
        totalCanonical: canonicalProducts.length,
        missingCount,
        archivedCount,
        activeCount,
        details: statusReport
      });
      return;
    }

    // Execution Mode: Selective re-insertion & restoration (Owner approved)
    let restoredCount = 0;
    let insertedCount = 0;

    db.exec('BEGIN TRANSACTION');
    try {
      for (const cp of canonicalProducts) {
        const existing = db.prepare('SELECT id, deleted_at FROM products WHERE sku = ?').get(cp.sku) as any;
        if (!existing) {
          const insertStmt = db.prepare(`
            INSERT INTO products (
              name, slug, sku, category_id, subcategory, short_description, description,
              regular_price, discounted_price, stock_quantity, brand, specifications_json,
              features_json, compatibility, package_contents_json, shipping_weight_grams,
              estimated_dispatch_days, warranty_info, is_featured, is_active, version, created_at, updated_at
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, 1, 1, datetime('now'), datetime('now')
            )
          `).run(
            cp.name,
            cp.slug,
            cp.sku,
            cp.category_id,
            cp.subcategory || null,
            cp.short_description || null,
            cp.description,
            cp.regular_price,
            cp.discounted_price || null,
            cp.stock_quantity,
            cp.brand || 'VK Technology',
            JSON.stringify(cp.specifications || {}),
            JSON.stringify(cp.features || []),
            (cp as any).compatibility || null,
            JSON.stringify((cp as any).package_contents || []),
            cp.shipping_weight_grams || 250,
            cp.estimated_dispatch_days || 1,
            (cp as any).warranty_info || '6 Months Warranty',
            cp.is_featured ? 1 : 0
          );

          const newId = Number(insertStmt.lastInsertRowid);
          if (Array.isArray(cp.images) && cp.images.length > 0) {
            const imgInsert = db.prepare(`
              INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
              VALUES (?, ?, ?, ?, ?)
            `);
            cp.images.forEach((url: string, idx: number) => {
              imgInsert.run(newId, url, cp.name, idx, idx === 0 ? 1 : 0);
            });
          }
          insertedCount++;
        } else if (existing.deleted_at) {
          db.prepare(`
            UPDATE products 
            SET deleted_at = NULL, is_active = 1, version = version + 1, updated_at = datetime('now') 
            WHERE id = ?
          `).run(existing.id);
          restoredCount++;
        }
      }

      recordAuditLog(
        req.user?.email || 'admin@vktechnology.shop',
        'SELECTIVE_CATALOG_RECOVERY',
        'Products',
        'ALL',
        { restoredCount, insertedCount }
      );

      db.exec('COMMIT');
    } catch (txErr) {
      try { db.exec('ROLLBACK'); } catch {}
      throw txErr;
    }

    try {
      eventBroadcaster.broadcast('CATALOG_RECOVERED', { restoredCount, insertedCount });
    } catch {}

    res.json({
      mode: 'EXECUTION',
      message: `Selective Recovery Complete: Re-inserted ${insertedCount} missing products and restored ${restoredCount} archived products without overwriting any existing customer data or orders.`,
      insertedCount,
      restoredCount,
      totalActive: activeCount + restoredCount + insertedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Catalog recovery error:', error);
    res.status(500).json({ error: error.message || 'Catalog recovery failed.' });
  }
});
