"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDynamicCacheControl = setDynamicCacheControl;
exports.setPrivateCacheControl = setPrivateCacheControl;
/**
 * Sets strict no-cache headers for dynamic catalog data to prevent stale responses
 * across CDNs, Vercel Edge Cache, proxies, and browser caches.
 */
function setDynamicCacheControl(res, catalogVersion, catalogTimestamp) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    if (catalogVersion !== undefined) {
        res.setHeader('X-Catalog-Version', String(catalogVersion));
    }
    if (catalogTimestamp) {
        res.setHeader('X-Catalog-Timestamp', catalogTimestamp);
    }
}
/**
 * Sets private no-cache headers for admin and sensitive endpoints.
 */
function setPrivateCacheControl(res) {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
}
