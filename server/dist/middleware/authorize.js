"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN_ROLES = void 0;
exports.requireAdminRole = requireAdminRole;
exports.requireSuperAdmin = requireSuperAdmin;
exports.ensureCustomerIsolation = ensureCustomerIsolation;
exports.ADMIN_ROLES = [
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
function requireAdminRole(allowedRoles = exports.ADMIN_ROLES) {
    return (req, res, next) => {
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
function requireSuperAdmin(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
    }
    const isOwner = req.user.role === 'SUPER_ADMIN' ||
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
}
;
/**
 * Customer Isolation Guard: Ensures customers can only access their own data, while Admins can view any customer's records.
 */
function ensureCustomerIsolation(getCustomerId) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required.' });
            return;
        }
        // Admins have supervisory oversight
        if (exports.ADMIN_ROLES.includes(req.user.role)) {
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
