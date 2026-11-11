import { Router, Request, Response } from 'express';
import { db, recordAuditLog } from '../database.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

export const projectsRouter = Router();

// GET / - Public active projects list
projectsRouter.get('/', (req: Request, res: Response) => {
  try {
    const { category, difficulty, search } = req.query;
    let sql = `SELECT * FROM projects WHERE is_active = 1`;
    const params: any[] = [];

    if (category) {
      sql += ` AND category = ?`;
      params.push(String(category));
    }
    if (difficulty) {
      sql += ` AND difficulty = ?`;
      params.push(String(difficulty));
    }
    if (search) {
      sql += ` AND (title LIKE ? OR short_description LIKE ? OR description LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ` ORDER BY is_featured DESC, id ASC`;
    const projects = db.prepare(sql).all(...params) as any[];

    // Attach component count to each project
    const getCount = db.prepare(`SELECT COUNT(*) as count FROM project_components WHERE project_id = ?`);
    const enriched = projects.map(p => ({
      ...p,
      component_count: (getCount.get(p.id) as any)?.count || 0
    }));

    res.json({ projects: enriched });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch DIY projects', details: err.message });
  }
});

// GET /admin/all - Administrative projects list
projectsRouter.get('/admin/all', authenticateToken, requireRole(['SUPER_ADMIN', 'PRODUCT_MANAGER']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const projects = db.prepare(`SELECT * FROM projects ORDER BY id DESC`).all() as any[];
    const getComponents = db.prepare(`SELECT * FROM project_components WHERE project_id = ?`);
    const enriched = projects.map(p => ({
      ...p,
      components: getComponents.all(p.id)
    }));
    res.json({ projects: enriched });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch admin projects', details: err.message });
  }
});

// GET /:slug - Public single project with components
projectsRouter.get('/:slug', (req: Request, res: Response) => {
  try {
    const project = db.prepare(`SELECT * FROM projects WHERE slug = ? OR id = ?`).get(req.params.slug, req.params.slug) as any;
    if (!project) {
      return res.status(404).json({ error: 'DIY Project not found' });
    }

    // Increment view count
    try {
      db.prepare(`UPDATE projects SET view_count = view_count + 1 WHERE id = ?`).run(project.id);
    } catch (e) {}

    const components = db.prepare(`
      SELECT pc.*, p.slug as product_slug, p.discounted_price, p.regular_price, p.stock_quantity
      FROM project_components pc
      LEFT JOIN products p ON pc.product_id = p.id
      WHERE pc.project_id = ?
    `).all(project.id);

    res.json({ project, components });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch project details', details: err.message });
  }
});

// POST /admin - Create new project
projectsRouter.post('/admin', authenticateToken, requireRole(['SUPER_ADMIN', 'PRODUCT_MANAGER']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      title, slug, short_description, description, category,
      difficulty = 'Beginner', estimated_time = '2-3 Hours',
      image_url, circuit_diagram_url, code_url, youtube_url,
      is_featured = 0, is_active = 1, components = []
    } = req.body;

    if (!title || !description || !category || !image_url) {
      return res.status(400).json({ error: 'Title, description, category, and image URL are required.' });
    }

    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const insert = db.prepare(`
      INSERT INTO projects (
        slug, title, short_description, description, category,
        difficulty, estimated_time, image_url, circuit_diagram_url,
        code_url, youtube_url, is_featured, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      finalSlug, title, short_description || null, description, category,
      difficulty, estimated_time, image_url, circuit_diagram_url || null,
      code_url || null, youtube_url || null, is_featured ? 1 : 0, is_active ? 1 : 0
    );

    const projectId = Number(result.lastInsertRowid);

    if (Array.isArray(components) && components.length > 0) {
      const insertComp = db.prepare(`
        INSERT INTO project_components (project_id, product_id, name, quantity, notes)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const comp of components) {
        insertComp.run(projectId, comp.product_id || null, comp.name, comp.quantity || 1, comp.notes || null);
      }
    }

    recordAuditLog(req.user?.email || 'admin', 'create_project', 'project', projectId, { title, slug: finalSlug });
    const created = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(projectId);
    res.status(201).json({ message: 'Project created successfully', project: created });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create project', details: err.message });
  }
});

// PUT /admin/:id - Update project
projectsRouter.put('/admin/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'PRODUCT_MANAGER']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const {
      title = existing.title,
      slug = existing.slug,
      short_description = existing.short_description,
      description = existing.description,
      category = existing.category,
      difficulty = existing.difficulty,
      estimated_time = existing.estimated_time,
      image_url = existing.image_url,
      circuit_diagram_url = existing.circuit_diagram_url,
      code_url = existing.code_url,
      youtube_url = existing.youtube_url,
      is_featured = existing.is_featured,
      is_active = existing.is_active,
      components
    } = req.body;

    db.prepare(`
      UPDATE projects SET
        title = ?, slug = ?, short_description = ?, description = ?,
        category = ?, difficulty = ?, estimated_time = ?, image_url = ?,
        circuit_diagram_url = ?, code_url = ?, youtube_url = ?,
        is_featured = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title, slug, short_description, description, category,
      difficulty, estimated_time, image_url, circuit_diagram_url,
      code_url, youtube_url, is_featured ? 1 : 0, is_active ? 1 : 0, id
    );

    if (Array.isArray(components)) {
      db.prepare(`DELETE FROM project_components WHERE project_id = ?`).run(id);
      const insertComp = db.prepare(`
        INSERT INTO project_components (project_id, product_id, name, quantity, notes)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const comp of components) {
        insertComp.run(id, comp.product_id || null, comp.name, comp.quantity || 1, comp.notes || null);
      }
    }

    recordAuditLog(req.user?.email || 'admin', 'update_project', 'project', id, { title });
    const updated = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id);
    res.json({ message: 'Project updated successfully', project: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update project', details: err.message });
  }
});

// DELETE /admin/:id - Delete project
projectsRouter.delete('/admin/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'PRODUCT_MANAGER']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare(`SELECT title FROM projects WHERE id = ?`).get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    db.prepare(`DELETE FROM projects WHERE id = ?`).run(id);
    recordAuditLog(req.user?.email || 'admin', 'delete_project', 'project', id, { title: existing.title });
    res.json({ message: 'Project deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete project', details: err.message });
  }
});
