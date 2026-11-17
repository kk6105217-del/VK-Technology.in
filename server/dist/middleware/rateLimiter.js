"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityHeaders = exports.authRateLimiter = exports.apiRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const environment_js_1 = require("../config/environment.js");
// Global API Rate Limiter
exports.apiRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: environment_js_1.env.rateLimitWindowMs,
    max: environment_js_1.env.rateLimitMaxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests from this IP address. Please try again after 15 minutes.',
        retryAfterMinutes: 15,
    },
});
// Strict Rate Limiter for Authentication Endpoints (Brute Force Defense)
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: environment_js_1.env.authRateLimitMaxRequests, // 20 attempts
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many login attempts. For security reasons, your IP has been throttled. Please try again in 15 minutes.',
        retryAfterMinutes: 15,
    },
});
// Security Headers (Helmet) configured for modern single-page apps
exports.securityHeaders = (0, helmet_1.default)({
    contentSecurityPolicy: false, // Allows Vite inline bundles and external images
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
});
