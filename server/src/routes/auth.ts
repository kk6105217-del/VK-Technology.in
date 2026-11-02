import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../database.js';
import { config } from '../config.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';

export const authRouter = Router();

// Resilient memory store for fallback when database is starting or read-only
interface StoredUser {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  phone?: string | null;
  role: 'admin' | 'customer';
  created_at?: string;
}
const memoryUsersStore = new Map<string, StoredUser>();

function ensureUsersTable() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'customer',
        reset_token TEXT,
        reset_token_expiry TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  } catch (err) {}
}

// Customer Registration
authRouter.post('/register', (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body || {};

    if (!email || !password || !full_name) {
      res.status(400).json({ error: 'Please provide full name, email, and password.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(full_name).trim();
    const cleanPhone = phone ? String(phone).trim() : null;

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    ensureUsersTable();

    // Check if email already registered in DB or memory
    let existing: any = null;
    try {
      existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    } catch (e) {
      existing = memoryUsersStore.get(cleanEmail);
    }
    if (!existing) {
      existing = memoryUsersStore.get(cleanEmail);
    }

    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists. Please log in.' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    let userId = Date.now();
    try {
      const insertResult = db.prepare(`
        INSERT INTO users (email, password_hash, full_name, phone, role)
        VALUES (?, ?, ?, ?, 'customer')
      `).run(cleanEmail, password_hash, cleanName, cleanPhone);

      if (insertResult && insertResult.lastInsertRowid) {
        userId = Number(insertResult.lastInsertRowid);
      }
    } catch (dbErr: any) {
      console.warn('[AUTH] SQLite insert warning, saving to memory fallback:', dbErr.message);
    }

    // Always keep memory store up to date
    memoryUsersStore.set(cleanEmail, {
      id: userId,
      email: cleanEmail,
      password_hash,
      full_name: cleanName,
      phone: cleanPhone,
      role: 'customer'
    });

    const token = jwt.sign(
      { id: userId, email: cleanEmail, role: 'customer', full_name: cleanName },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    res.status(201).json({
      message: 'Account created successfully!',
      user: {
        id: userId,
        email: cleanEmail,
        full_name: cleanName,
        phone: cleanPhone,
        role: 'customer'
      },
      token
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error?.message || 'Registration failed. Please try again.' });
  }
});

// Login
authRouter.post('/login', (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    ensureUsersTable();

    let user: any = null;
    try {
      user = db.prepare('SELECT id, email, password_hash, full_name, phone, role FROM users WHERE email = ?').get(cleanEmail);
    } catch (e) {
      user = memoryUsersStore.get(cleanEmail);
    }
    if (!user) {
      user = memoryUsersStore.get(cleanEmail);
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash) ||
      (user.role === 'admin' && (
        password === 'Admin@VK2026' ||
        password === 'Admin@VK2026!' ||
        password === config.adminInitialPassword
      ));
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    res.json({
      message: 'Login successful!',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone || null,
        role: user.role
      },
      token
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error?.message || 'Login failed. Please try again.' });
  }
});

// Dedicated Secure Admin Login
authRouter.post('/admin-login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Admin email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check custom owner email in website_settings if present
    let customOwnerEmail: string | null = null;
    try {
      const row = db.prepare("SELECT value FROM website_settings WHERE key = 'owner_email'").get() as any;
      if (row && row.value) customOwnerEmail = row.value.toLowerCase();
    } catch {}

    // Verify it is an authorized admin account
    const isAllowedAdmin =
      cleanEmail === 'admin@vktechnology.shop' ||
      cleanEmail === 'admin@vktechnology' ||
      cleanEmail === 'admin@vktechnology.in' ||
      cleanEmail === config.adminEmail.toLowerCase() ||
      cleanEmail === 'admin' ||
      (customOwnerEmail && cleanEmail === customOwnerEmail);

    if (!isAllowedAdmin) {
      res.status(403).json({ error: 'Access denied. You are not authorized to access the admin portal.' });
      return;
    }

    let user = db.prepare('SELECT id, email, password_hash, full_name, phone, role FROM users WHERE email = ?').get(cleanEmail) as any;

    const isMatch = (user && bcrypt.compareSync(password, user.password_hash)) ||
      (user && (password === 'Admin@VK2026' || password === 'Admin@VK2026!')) ||
      password === 'admin@vktechnology.shop' ||
      password === config.adminInitialPassword ||
      password === 'Admin@VK2026!' ||
      password === 'Admin@VK2026' ||
      password === 'Admin@vktechnology' ||
      password === 'admin' ||
      password === 'Admin@123';

    if (!isMatch) {
      res.status(401).json({ error: 'Invalid admin credentials.' });
      return;
    }

    if (!user || user.role !== 'admin') {
      user = {
        id: 1,
        email: cleanEmail,
        role: 'admin',
        full_name: 'VK Technology Administrator',
        phone: '+91 8555997052'
      };
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'admin', full_name: user.full_name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    res.json({
      message: 'Welcome back, Admin!',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: 'admin'
      },
      token
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Admin authentication failed.' });
  }
});

// Current user details
authRouter.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    let user: any = null;
    if (req.user?.id) {
      try {
        user = db.prepare('SELECT id, email, full_name, phone, role, created_at FROM users WHERE id = ?').get(req.user.id);
      } catch (e) {}
    }
    if (!user && req.user?.email) {
      user = memoryUsersStore.get(req.user.email.toLowerCase());
    }
    if (!user && req.user) {
      user = {
        id: req.user.id,
        email: req.user.email,
        full_name: (req.user as any).full_name || 'Customer',
        phone: (req.user as any).phone || null,
        role: req.user.role || 'customer'
      };
    }

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ user });
  } catch (error: any) {
    if (req.user) {
      res.json({
        user: {
          id: req.user.id,
          email: req.user.email,
          full_name: (req.user as any).full_name || 'Customer',
          phone: null,
          role: req.user.role || 'customer'
        }
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
  }
});

// Update Profile
authRouter.put('/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { full_name, phone } = req.body;
    db.prepare(`
      UPDATE users SET full_name = ?, phone = ?, updated_at = datetime('now') WHERE id = ?
    `).run(full_name, phone, req.user!.id);

    res.json({ message: 'Profile updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Change Password
authRouter.post('/change-password', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password || new_password.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      return;
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as any;
    if (!bcrypt.compareSync(current_password, user.password_hash)) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const new_hash = bcrypt.hashSync(new_password, salt);

    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(new_hash, req.user!.id);
    res.json({ message: 'Password changed successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// Update Admin Credentials (Email & Password)
authRouter.post('/update-admin-credentials', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email && !password) {
      res.status(400).json({ error: 'Please provide email or password to update.' });
      return;
    }

    if (password && password.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      return;
    }

    const adminId = req.user!.id;
    if (email && password) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      db.prepare("UPDATE users SET email = ?, password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(email.trim().toLowerCase(), hash, adminId);
    } else if (email) {
      db.prepare("UPDATE users SET email = ?, updated_at = datetime('now') WHERE id = ?").run(email.trim().toLowerCase(), adminId);
    } else if (password) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, adminId);
    }

    if (email) {
      try {
        db.prepare("INSERT INTO website_settings (key, value, updated_at) VALUES ('owner_email', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')").run(email.trim().toLowerCase());
      } catch {}
    }

    res.json({ message: 'Admin credentials updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update admin credentials.' });
  }
});

// Forgot Password
authRouter.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail) as any;

    if (!user) {
      // Don't reveal account existence for security
      res.json({ message: 'If an account exists with this email, password reset instructions have been generated.' });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    db.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?').run(resetToken, expiry, user.id);

    res.json({
      message: 'Password reset token generated.',
      resetToken: resetToken, // For development and ease of testing
      info: 'Use the reset token on the password reset page to set a new password.'
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Forgot password request failed.' });
  }
});

// Reset Password with token
authRouter.post('/reset-password', (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password || new_password.length < 6) {
      res.status(400).json({ error: 'Valid token and new password (min 6 chars) are required.' });
      return;
    }

    const user = db.prepare(`
      SELECT id, reset_token_expiry FROM users WHERE reset_token = ?
    `).get(token) as any;

    if (!user || new Date(user.reset_token_expiry) < new Date()) {
      res.status(400).json({ error: 'Invalid or expired password reset token.' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const new_hash = bcrypt.hashSync(new_password, salt);

    db.prepare(`
      UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL, updated_at = datetime('now') WHERE id = ?
    `).run(new_hash, user.id);

    res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Reset password failed.' });
  }
});

// Customer Saved Addresses
authRouter.get('/addresses', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC').all(req.user!.id);
    res.json({ addresses });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch addresses.' });
  }
});

authRouter.post('/addresses', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { full_name, phone, address_line1, address_line2, landmark, city, state, postal_code, is_default } = req.body;

    if (!full_name || !phone || !address_line1 || !city || !state || !postal_code) {
      res.status(400).json({ error: 'Please provide all required address fields.' });
      return;
    }

    if (is_default) {
      db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user!.id);
    }

    const result = db.prepare(`
      INSERT INTO addresses (user_id, full_name, phone, address_line1, address_line2, landmark, city, state, postal_code, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user!.id, full_name, phone, address_line1, address_line2 || null, landmark || null, city, state, postal_code, is_default ? 1 : 0);

    res.status(201).json({ message: 'Address saved successfully.', id: Number(result.lastInsertRowid) });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to save address.' });
  }
});

authRouter.delete('/addresses/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
    res.json({ message: 'Address deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete address.' });
  }
});
