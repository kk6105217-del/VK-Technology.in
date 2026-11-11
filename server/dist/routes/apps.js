"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appsRouter = void 0;
const express_1 = require("express");
const database_js_1 = require("../database.js");
const auth_js_1 = require("../middleware/auth.js");
exports.appsRouter = (0, express_1.Router)();
// GET / - Public list of active apps
exports.appsRouter.get('/', (req, res) => {
    try {
        const apps = database_js_1.db.prepare(`
      SELECT * FROM apps WHERE is_active = 1 ORDER BY sort_order ASC, id ASC
    `).all();
        const parsed = apps.map(a => ({
            ...a,
            features: a.features_json ? JSON.parse(a.features_json) : []
        }));
        res.json({ apps: parsed });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch VK Technology apps', details: err.message });
    }
});
// GET /admin/all - Administrative list
exports.appsRouter.get('/admin/all', auth_js_1.authenticateToken, (0, auth_js_1.requireRole)(['SUPER_ADMIN', 'PRODUCT_MANAGER']), (req, res) => {
    try {
        const apps = database_js_1.db.prepare(`SELECT * FROM apps ORDER BY sort_order ASC, id ASC`).all();
        const parsed = apps.map(a => ({
            ...a,
            features: a.features_json ? JSON.parse(a.features_json) : []
        }));
        res.json({ apps: parsed });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch admin apps', details: err.message });
    }
});
// GET /:slug - Public single app details
exports.appsRouter.get('/:slug', (req, res) => {
    try {
        const app = database_js_1.db.prepare(`SELECT * FROM apps WHERE slug = ? OR id = ?`).get(req.params.slug, req.params.slug);
        if (!app) {
            return res.status(404).json({ error: 'App not found' });
        }
        res.json({
            app: {
                ...app,
                features: app.features_json ? JSON.parse(app.features_json) : []
            }
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch app details', details: err.message });
    }
});
// POST /admin - Create new app
exports.appsRouter.post('/admin', auth_js_1.authenticateToken, (0, auth_js_1.requireRole)(['SUPER_ADMIN', 'PRODUCT_MANAGER']), (req, res) => {
    try {
        const { name, slug, short_description, description, platform = 'Android & Web', status = 'Coming Soon', version = '1.0.0', icon = 'AppWindow', image_url, download_url, play_store_url, web_url, features, sort_order = 0, is_active = 1 } = req.body;
        if (!name || !description || !image_url) {
            return res.status(400).json({ error: 'Name, description, and image URL are required.' });
        }
        const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const featuresJson = Array.isArray(features) ? JSON.stringify(features) : (req.body.features_json || null);
        const insert = database_js_1.db.prepare(`
      INSERT INTO apps (
        slug, name, short_description, description, platform,
        status, version, icon, image_url, download_url,
        play_store_url, web_url, features_json, sort_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = insert.run(finalSlug, name, short_description || null, description, platform, status, version, icon, image_url, download_url || null, play_store_url || null, web_url || null, featuresJson, sort_order, is_active ? 1 : 0);
        const appId = Number(result.lastInsertRowid);
        (0, database_js_1.recordAuditLog)(req.user?.email || 'admin', 'create_app', 'app', appId, { name, slug: finalSlug });
        const created = database_js_1.db.prepare(`SELECT * FROM apps WHERE id = ?`).get(appId);
        res.status(201).json({ message: 'App created successfully', app: created });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create app', details: err.message });
    }
});
// PUT /admin/:id - Update app
exports.appsRouter.put('/admin/:id', auth_js_1.authenticateToken, (0, auth_js_1.requireRole)(['SUPER_ADMIN', 'PRODUCT_MANAGER']), (req, res) => {
    try {
        const { id } = req.params;
        const existing = database_js_1.db.prepare(`SELECT * FROM apps WHERE id = ?`).get(id);
        if (!existing) {
            return res.status(404).json({ error: 'App not found' });
        }
        const { name = existing.name, slug = existing.slug, short_description = existing.short_description, description = existing.description, platform = existing.platform, status = existing.status, version = existing.version, icon = existing.icon, image_url = existing.image_url, download_url = existing.download_url, play_store_url = existing.play_store_url, web_url = existing.web_url, features, sort_order = existing.sort_order, is_active = existing.is_active } = req.body;
        const featuresJson = Array.isArray(features) ? JSON.stringify(features) : (req.body.features_json ?? existing.features_json);
        database_js_1.db.prepare(`
      UPDATE apps SET
        name = ?, slug = ?, short_description = ?, description = ?,
        platform = ?, status = ?, version = ?, icon = ?,
        image_url = ?, download_url = ?, play_store_url = ?,
        web_url = ?, features_json = ?, sort_order = ?,
        is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name, slug, short_description, description, platform, status, version, icon, image_url, download_url, play_store_url, web_url, featuresJson, sort_order, is_active ? 1 : 0, id);
        (0, database_js_1.recordAuditLog)(req.user?.email || 'admin', 'update_app', 'app', id, { name });
        const updated = database_js_1.db.prepare(`SELECT * FROM apps WHERE id = ?`).get(id);
        res.json({ message: 'App updated successfully', app: updated });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update app', details: err.message });
    }
});
// DELETE /admin/:id - Delete app
exports.appsRouter.delete('/admin/:id', auth_js_1.authenticateToken, (0, auth_js_1.requireRole)(['SUPER_ADMIN', 'PRODUCT_MANAGER']), (req, res) => {
    try {
        const { id } = req.params;
        const existing = database_js_1.db.prepare(`SELECT name FROM apps WHERE id = ?`).get(id);
        if (!existing) {
            return res.status(404).json({ error: 'App not found' });
        }
        database_js_1.db.prepare(`DELETE FROM apps WHERE id = ?`).run(id);
        (0, database_js_1.recordAuditLog)(req.user?.email || 'admin', 'delete_app', 'app', id, { name: existing.name });
        res.json({ message: 'App deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete app', details: err.message });
    }
});
