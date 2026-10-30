"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoriesRouter = void 0;
const express_1 = require("express");
const database_js_1 = require("../database.js");
const auth_js_1 = require("../middleware/auth.js");
const events_js_1 = require("../services/events.js");
const cache_js_1 = require("../utils/cache.js");
exports.categoriesRouter = (0, express_1.Router)();
// Public: Get all active categories with dynamic product counts
exports.categoriesRouter.get('/', (req, res) => {
    try {
        const syncStatus = events_js_1.eventBroadcaster.getCatalogSyncStatus();
        (0, cache_js_1.setDynamicCacheControl)(res, syncStatus.catalogVersion, syncStatus.lastUpdated);
        const categories = database_js_1.db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) AS product_count
      FROM categories c
      WHERE c.is_active = 1
      ORDER BY c.sort_order ASC, c.name ASC
    `).all();
        res.json({ categories });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories.' });
    }
});
// Admin: Get all categories including inactive
exports.categoriesRouter.get('/all', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        (0, cache_js_1.setPrivateCacheControl)(res);
        const categories = database_js_1.db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
      FROM categories c
      ORDER BY c.sort_order ASC, c.name ASC
    `).all();
        res.json({ categories });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories.' });
    }
});
// Public: Get single category by slug
exports.categoriesRouter.get('/:slug', (req, res) => {
    try {
        const syncStatus = events_js_1.eventBroadcaster.getCatalogSyncStatus();
        (0, cache_js_1.setDynamicCacheControl)(res, syncStatus.catalogVersion, syncStatus.lastUpdated);
        const category = database_js_1.db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) AS product_count
      FROM categories c
      WHERE c.slug = ?
    `).get(req.params.slug);
        if (!category) {
            res.status(404).json({ error: 'Category not found.' });
            return;
        }
        res.json({ category });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch category details.' });
    }
});
// Admin: Add new category
exports.categoriesRouter.post('/', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        const { name, slug, description, icon, image_url, sort_order, is_active } = req.body;
        if (!name || !slug) {
            res.status(400).json({ error: 'Category name and slug are required.' });
            return;
        }
        const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
        const result = database_js_1.db.prepare(`
      INSERT INTO categories (name, slug, description, icon, image_url, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name.trim(), cleanSlug, description || null, icon || 'Cpu', image_url || null, sort_order || 0, is_active ?? 1);
        const newId = Number(result.lastInsertRowid);
        const newCategory = database_js_1.db.prepare('SELECT * FROM categories WHERE id = ?').get(newId);
        (0, database_js_1.recordAuditLog)(req.user?.email || 'admin@vktechnology.shop', 'CREATE_CATEGORY', 'Category', newId, { name, slug: cleanSlug });
        try {
            events_js_1.eventBroadcaster.broadcast('CATEGORY_UPDATED', { category: newCategory });
        }
        catch { }
        res.status(201).json({
            message: 'Category created successfully.',
            category: newCategory,
            id: newId
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to create category.' });
    }
});
// Admin: Update category
exports.categoriesRouter.put('/:id', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        const { name, slug, description, icon, image_url, sort_order, is_active } = req.body;
        const catId = req.params.id;
        const existing = database_js_1.db.prepare('SELECT id FROM categories WHERE id = ?').get(catId);
        if (!existing) {
            database_js_1.db.prepare(`
        INSERT INTO categories (id, name, slug, description, icon, image_url, sort_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(catId, name, slug, description || null, icon || 'Cpu', image_url || null, sort_order || 0, is_active !== undefined ? (is_active ? 1 : 0) : 1);
        }
        else {
            database_js_1.db.prepare(`
        UPDATE categories SET
          name = ?, slug = ?, description = ?, icon = ?, image_url = ?, sort_order = ?, is_active = ?
        WHERE id = ?
      `).run(name, slug, description || null, icon || 'Cpu', image_url || null, sort_order || 0, is_active !== undefined ? (is_active ? 1 : 0) : 1, catId);
        }
        const updatedCategory = database_js_1.db.prepare('SELECT * FROM categories WHERE id = ?').get(catId);
        (0, database_js_1.recordAuditLog)(req.user?.email || 'admin@vktechnology.shop', 'UPDATE_CATEGORY', 'Category', catId, { name, slug });
        try {
            events_js_1.eventBroadcaster.broadcast('CATEGORY_UPDATED', { category: updatedCategory });
        }
        catch { }
        res.json({
            message: 'Category updated successfully.',
            category: updatedCategory
        });
    }
    catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: error.message || 'Failed to update category.' });
    }
});
// Admin: Delete category
exports.categoriesRouter.delete('/:id', auth_js_1.authenticateToken, auth_js_1.requireAdmin, (req, res) => {
    try {
        const catId = req.params.id;
        // Safely reassign any products in this category to an alternative category so FOREIGN KEY constraints never fail
        try {
            const fallbackCat = database_js_1.db.prepare('SELECT id FROM categories WHERE id != ? ORDER BY id ASC LIMIT 1').get(catId);
            const fallbackId = fallbackCat?.id || 1;
            database_js_1.db.prepare('UPDATE products SET category_id = ? WHERE category_id = ?').run(fallbackId, catId);
        }
        catch (reassignErr) {
            console.warn('Reassigning products during category delete:', reassignErr);
        }
        database_js_1.db.prepare('DELETE FROM categories WHERE id = ?').run(catId);
        (0, database_js_1.recordAuditLog)(req.user?.email || 'admin@vktechnology.shop', 'DELETE_CATEGORY', 'Category', catId);
        try {
            events_js_1.eventBroadcaster.broadcast('CATEGORY_UPDATED', { id: Number(catId), deleted: true });
        }
        catch { }
        res.json({ message: 'Category deleted successfully.' });
    }
    catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete category.' });
    }
});
