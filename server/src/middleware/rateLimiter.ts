import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from '../config/environment.js';

// Global API Rate Limiter
export const apiRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP address. Please try again after 15 minutes.',
    retryAfterMinutes: 15,
  },
});

// Strict Rate Limiter for Authentication Endpoints (Brute Force Defense)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.authRateLimitMaxRequests, // 20 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts. For security reasons, your IP has been throttled. Please try again in 15 minutes.',
    retryAfterMinutes: 15,
  },
});

// Security Headers (Helmet) configured for modern single-page apps
export const securityHeaders = helmet({
  contentSecurityPolicy: false, // Allows Vite inline bundles and external images
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});
