import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db, recordAuditLog } from '../database.js';
import { authenticateToken, requireSuperAdmin, AuthenticatedRequest } from '../middleware/auth.js';

export const staffRouter = Router();

// Super Admin: List all administrative staff accounts
staffRouter.get('/', authenticateToken, requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const staff = db.prepare(`
      SELECT id, full_name, email, phone, role, COALESCE(two_factor_enabled, 0) as two_factor_enabled, created_at, updated_at
      FROM users
      WHERE role IN ('SUPER_ADMIN', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'INVENTORY_MANAGER', 'admin')
      ORDER BY id ASC
    `).all();

    res.json({ staff });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch staff members.' });
  }
});

// Super Admin: Create new staff member
staffRouter.post('/', authenticateToken, requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { full_name, email, password, phone, role = 'PRODUCT_MANAGER' } = req.body;

    if (!full_name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const allowedRoles = ['SUPER_ADMIN', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'INVENTORY_MANAGER'];
    if (!allowedRoles.includes(role)) {
      res.status(400).json({ error: `Invalid role specified. Allowed: ${allowedRoles.join(', ')}` });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail) as any;
    if (existing) {
      res.status(400).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const salt = bcrypt.genSaltSync(12);
    const hash = bcrypt.hashSync(password, salt);

    const result = db.prepare(`
      INSERT INTO users (full_name, email, password_hash, phone, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(full_name.trim(), cleanEmail, hash, phone ? phone.trim() : null, role);

    const newId = Number(result.lastInsertRowid);

    recordAuditLog(
      req.user?.email || 'admin@vktechnology.shop',
      'CREATE_STAFF',
      'User',
      newId,
      { email: cleanEmail, role, name: full_name }
    );

    res.status(201).json({
      success: true,
      message: `Staff account created successfully for ${cleanEmail} as ${role}.`,
      staff: {
        id: newId,
        full_name,
        email: cleanEmail,
        phone,
        role
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create staff account.' });
  }
});

// Super Admin: Update staff role
staffRouter.patch('/:id/role', authenticateToken, requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const staffId = req.params.id;
    const { role } = req.body;

    const allowedRoles = ['SUPER_ADMIN', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'INVENTORY_MANAGER'];
    if (!allowedRoles.includes(role)) {
      res.status(400).json({ error: `Invalid role specified. Allowed: ${allowedRoles.join(', ')}` });
      return;
    }

    const user = db.prepare('SELECT id, email, full_name, role FROM users WHERE id = ?').get(staffId) as any;
    if (!user) {
      res.status(404).json({ error: 'Staff account not found.' });
      return;
    }

    if (user.email === 'karthik.suroju@gmail.com') {
      res.status(403).json({ error: 'Primary owner account role cannot be modified.' });
      return;
    }

    db.prepare(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`).run(role, staffId);

    recordAuditLog(
      req.user?.email || 'admin@vktechnology.shop',
      'UPDATE_STAFF_ROLE',
      'User',
      staffId,
      { email: user.email, oldRole: user.role, newRole: role }
    );

    res.json({
      success: true,
      message: `Role for ${user.email} updated to ${role}.`
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update staff role.' });
  }
});

// Super Admin: Delete staff account
staffRouter.delete('/:id', authenticateToken, requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const staffId = req.params.id;
    const user = db.prepare('SELECT id, email, full_name, role FROM users WHERE id = ?').get(staffId) as any;
    if (!user) {
      res.status(404).json({ error: 'Staff account not found.' });
      return;
    }

    if (user.email === 'karthik.suroju@gmail.com' || user.email === 'admin@vktechnology.shop') {
      res.status(403).json({ error: 'Core administrator accounts cannot be deleted.' });
      return;
    }

    if (Number(user.id) === Number(req.user?.id)) {
      res.status(403).json({ error: 'You cannot delete your own active administrator account.' });
      return;
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(staffId);

    recordAuditLog(
      req.user?.email || 'admin@vktechnology.shop',
      'DELETE_STAFF',
      'User',
      staffId,
      { email: user.email, name: user.full_name }
    );

    res.json({ success: true, message: `Staff member ${user.email} removed.` });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete staff account.' });
  }
});
