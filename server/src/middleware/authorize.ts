import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';

export type UserRole =
  | 'customer'
  | 'CUSTOMER'
  | 'admin'
  | 'OWNER'
  | 'SUPER_ADMIN'
  | 'PRODUCT_MANAGER'
  | 'ORDER_MANAGER'
  | 'INVENTORY_MANAGER'
  | 'guest';

export const ADMIN_ROLES: string[] = [
  'admin',
  'OWNER',
  'SUPER_ADMIN',
  'PRODUCT_MANAGER',
  'ORDER_MANAGER',
  'INVENTORY_MANAGER',
];

/**
 * Enforces that only authorized admin staff can access the endpoint
 */
export function requireAdminRole(allowedRoles: string[] = ADMIN_ROLES) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }

    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Access denied. You lack the administrative permissions required for this resource.',
        requiredRole: allowedRoles,
        currentRole: req.user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Enforces Super Admin (Store Owner) only access
 */
export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const isOwner =
    req.user.role === 'SUPER_ADMIN' ||
    req.user.role === 'OWNER' ||
    req.user.email === 'admin@vktechnology.shop' ||
    req.user.email === 'karthik.suroju@gmail.com';

  if (!isOwner) {
    res.status(403).json({
      error: 'Restricted action. Only the verified store owner has Super Administrator authority.',
    });
    return;
  }

  next();
};

/**
 * Customer Isolation Guard: Ensures customers can only access their own data, while Admins can view any customer's records.
 */
export function ensureCustomerIsolation(getCustomerId: (req: AuthenticatedRequest) => number | string | undefined) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    // Admins have supervisory oversight
    if (ADMIN_ROLES.includes(req.user.role)) {
      return next();
    }

    const targetId = getCustomerId(req);
    if (!targetId || String(targetId) !== String(req.user.id)) {
      res.status(403).json({
        error: 'Unauthorized access. You cannot inspect or modify records belonging to other customer accounts.',
      });
      return;
    }

    next();
  };
}
