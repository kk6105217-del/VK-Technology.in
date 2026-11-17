"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeNoSqlInput = sanitizeNoSqlInput;
exports.validateBody = validateBody;
/**
 * Sanitizes input to protect against NoSQL operator injection attacks ($where, $gt, $regex, etc.)
 */
function sanitizeNoSqlInput(req, res, next) {
    const sanitize = (obj) => {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }
        const clean = {};
        for (const [key, value] of Object.entries(obj)) {
            // Strip dangerous keys starting with $ or containing dots
            if (key.startsWith('$') || key.includes('.')) {
                console.warn(`[Security Alert] Blocked potential NoSQL injection key: "${key}"`);
                continue;
            }
            clean[key] = sanitize(value);
        }
        return clean;
    };
    if (req.body)
        req.body = sanitize(req.body);
    if (req.params)
        req.params = sanitize(req.params);
    // Express req.query getter
    if (req.query) {
        for (const key of Object.keys(req.query)) {
            if (key.startsWith('$') || key.includes('.')) {
                delete req.query[key];
            }
        }
    }
    next();
}
/**
 * Validates request body schema using a validator function or basic checks
 */
function validateBody(requiredFields) {
    return (req, res, next) => {
        const missing = requiredFields.filter((field) => {
            const val = req.body?.[field];
            return val === undefined || val === null || val === '';
        });
        if (missing.length > 0) {
            res.status(400).json({
                error: `Validation error: Missing required fields: ${missing.join(', ')}`,
                missingFields: missing,
            });
            return;
        }
        next();
    };
}
