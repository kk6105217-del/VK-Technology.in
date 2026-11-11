import { Router, Request, Response } from 'express';
import { db, recordAuditLog } from '../database.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

export const appsRouter = Router();

// GET / - Public list of active apps
appsRouter.get('/', (req: Request, res: Response) => {
  try {
    const apps = db.prepare(`
      SELECT * FROM apps WHERE is_active = 1 ORDER BY sort_order ASC, id ASC
    `).all() as any[];

    const parsed = apps.map(a => ({
      ...a,
      features: a.features_json ? JSON.parse(a.features_json) : []
    }));

    res.json({ apps: parsed });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch VK Technology apps', details: err.message });
  }
});

// GET /admin/all - Administrative list
appsRouter.get('/admin/all', authenticateToken, requireRole(['SUPER_ADMIN', 'PRODUCT_MANAGER']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const apps = db.prepare(`SELECT * FROM apps ORDER BY sort_order ASC, id ASC`).all() as any[];
    const parsed = apps.map(a => ({
      ...a,
      features: a.features_json ? JSON.parse(a.features_json) : []
    }));
    res.json({ apps: parsed });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch admin apps', details: err.message });
  }
});

// GET /:slug - Public single app details
appsRouter.get('/:slug', (req: Request, res: Response) => {
  try {
    const app = db.prepare(`SELECT * FROM apps WHERE slug = ? OR id = ?`).get(req.params.slug, req.params.slug) as any;
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    res.json({
      app: {
        ...app,
        features: app.features_json ? JSON.parse(app.features_json) : []
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch app details', details: err.message });
  }
});

// POST /admin - Create new app
appsRouter.post('/admin', authenticateToken, requireRole(['SUPER_ADMIN', 'PRODUCT_MANAGER']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name, slug, short_description, description,
      platform = 'Android & Web', status = 'Coming Soon', version = '1.0.0',
      icon = 'AppWindow', image_url, download_url, play_store_url, web_url,
      features, sort_order = 0, is_active = 1
    } = req.body;

    if (!name || !description || !image_url) {
      return res.status(400).json({ error: 'Name, description, and image URL are required.' });
    }

    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const featuresJson = Array.isArray(features) ? JSON.stringify(features) : (req.body.features_json || null);

    const insert = db.prepare(`
      INSERT INTO apps (
        slug, name, short_description, description, platform,
        status, version, icon, image_url, download_url,
        play_store_url, web_url, features_json, sort_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      finalSlug, name, short_description || null, description, platform,
      status, version, icon, image_url, download_url || null,
      play_store_url || null, web_url || null, featuresJson, sort_order, is_active ? 1 : 0
    );

    const appId = Number(result.lastInsertRowid);
    recordAuditLog(req.user?.email || 'admin', 'create_app', 'app', appId, { name, slug: finalSlug });
    const created = db.prepare(`SELECT * FROM apps WHERE id = ?`).get(appId);
    res.status(201).json({ message: 'App created successfully', app: created });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create app', details: err.message });
  }
});

// PUT /admin/:id - Update app
appsRouter.put('/admin/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'PRODUCT_MANAGER']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare(`SELECT * FROM apps WHERE id = ?`).get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'App not found' });
    }

    const {
      name = existing.name,
      slug = existing.slug,
      short_description = existing.short_description,
      description = existing.description,
      platform = existing.platform,
      status = existing.status,
      version = existing.version,
      icon = existing.icon,
      image_url = existing.image_url,
      download_url = existing.download_url,
      play_store_url = existing.play_store_url,
      web_url = existing.web_url,
      features,
      sort_order = existing.sort_order,
      is_active = existing.is_active
    } = req.body;

    const featuresJson = Array.isArray(features) ? JSON.stringify(features) : (req.body.features_json ?? existing.features_json);

    db.prepare(`
      UPDATE apps SET
        name = ?, slug = ?, short_description = ?, description = ?,
        platform = ?, status = ?, version = ?, icon = ?,
        image_url = ?, download_url = ?, play_store_url = ?,
        web_url = ?, features_json = ?, sort_order = ?,
        is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name, slug, short_description, description,
      platform, status, version, icon,
      image_url, download_url, play_store_url,
      web_url, featuresJson, sort_order,
      is_active ? 1 : 0, id
    );

    recordAuditLog(req.user?.email || 'admin', 'update_app', 'app', id, { name });
    const updated = db.prepare(`SELECT * FROM apps WHERE id = ?`).get(id);
    res.json({ message: 'App updated successfully', app: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update app', details: err.message });
  }
});

// DELETE /admin/:id - Delete app
appsRouter.delete('/admin/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'PRODUCT_MANAGER']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare(`SELECT name FROM apps WHERE id = ?`).get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'App not found' });
    }

    db.prepare(`DELETE FROM apps WHERE id = ?`).run(id);
    recordAuditLog(req.user?.email || 'admin', 'delete_app', 'app', id, { name: existing.name });
    res.json({ message: 'App deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete app', details: err.message });
  }
});
