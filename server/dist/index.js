"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const config_js_1 = require("./config.js");
const database_js_1 = require("./database.js");
const auth_js_1 = require("./routes/auth.js");
const categories_js_1 = require("./routes/categories.js");
const products_js_1 = require("./routes/products.js");
const orders_js_1 = require("./routes/orders.js");
const cart_js_1 = require("./routes/cart.js");
const wishlist_js_1 = require("./routes/wishlist.js");
const coupons_js_1 = require("./routes/coupons.js");
const reviews_js_1 = require("./routes/reviews.js");
const banners_js_1 = require("./routes/banners.js");
const settings_js_1 = require("./routes/settings.js");
const upload_js_1 = require("./routes/upload.js");
const contact_js_1 = require("./routes/contact.js");
const upi_js_1 = require("./routes/upi.js");
const events_js_1 = require("./services/events.js");
const openapi_js_1 = require("./openapi.js");
const app = (0, express_1.default)();
// Initialize database & seed defaults safely
try {
    (0, database_js_1.initDatabase)();
}
catch (err) {
    console.warn('Database initialization warning:', err);
}
// CORS configuration
app.use((0, cors_1.default)({
    origin: true, // Allow frontend dev and prod
    credentials: true
}));
// Body parser
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Static uploads directory (safe for serverless read-only filesystems)
const uploadsDir = (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
    ? path_1.default.join(os_1.default.tmpdir(), 'uploads')
    : path_1.default.resolve(process.cwd(), 'uploads');
try {
    if (!fs_1.default.existsSync(uploadsDir)) {
        fs_1.default.mkdirSync(uploadsDir, { recursive: true });
    }
}
catch (err) {
    console.warn('Could not create uploads directory:', err);
}
app.use('/uploads', express_1.default.static(uploadsDir));
app.get('/upi-qr-code.jpg', (req, res) => {
    const file = path_1.default.join(uploadsDir, 'upi-qr-code.jpg');
    if (fs_1.default.existsSync(file))
        return res.sendFile(file);
    res.status(404).send('Not Found');
});
// API Routes - Dual-path mounting (supports both direct /api/* and Vercel stripped rewrite /*)
const routeBindings = [
    ['/auth', auth_js_1.authRouter],
    ['/categories', categories_js_1.categoriesRouter],
    ['/products', products_js_1.productsRouter],
    ['/orders', orders_js_1.ordersRouter],
    ['/cart', cart_js_1.cartRouter],
    ['/wishlist', wishlist_js_1.wishlistRouter],
    ['/coupons', coupons_js_1.couponsRouter],
    ['/reviews', reviews_js_1.reviewsRouter],
    ['/banners', banners_js_1.bannersRouter],
    ['/settings', settings_js_1.settingsRouter],
    ['/upload', upload_js_1.uploadRouter],
    ['/contact', contact_js_1.contactRouter],
    ['/upi', upi_js_1.upiRouter],
];
routeBindings.forEach(([prefix, router]) => {
    app.use(`/api${prefix}`, router);
    app.use(prefix, router);
});
// Explicit administration endpoints binding for global product synchronization
app.use('/api/admin/products', products_js_1.productsRouter);
// Health check endpoint on both /api/health and /health
const healthHandler = (_req, res) => {
    res.json({
        status: 'ok',
        store: config_js_1.config.storeName,
        adminEmail: config_js_1.config.adminEmail,
        location: config_js_1.config.ownerLocation,
        currency: config_js_1.config.currency,
        timestamp: new Date().toISOString(),
        clientDistFound: clientDist || null,
        cwd: process.cwd(),
        dirname: __dirname,
        existsPublic: fs_1.default.existsSync(path_1.default.resolve(__dirname, 'public'))
    });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);
// Server-Sent Events (SSE) for Real-Time Live Catalog Sync
const eventsHandler = (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
    }
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    events_js_1.eventBroadcaster.addClient(clientId, res);
    req.on('close', () => {
        events_js_1.eventBroadcaster.removeClient(clientId);
    });
};
app.get('/api/events', eventsHandler);
app.get('/events', eventsHandler);
// OpenAPI specification endpoint
app.get(['/api/openapi.json', '/openapi.json', '/api/docs.json'], (_req, res) => {
    res.json(openapi_js_1.openApiSpec);
});
// Production: Serve React client build if present
const possibleDistPaths = [
    path_1.default.resolve(__dirname, 'public'),
    path_1.default.resolve(process.cwd(), 'server/dist/public'),
    path_1.default.resolve(process.cwd(), 'client/dist'),
    path_1.default.resolve(process.cwd(), '../client/dist'),
    path_1.default.resolve(__dirname, '../../client/dist'),
    path_1.default.resolve(__dirname, '../client/dist'),
    path_1.default.resolve('/var/task/server/dist/public'),
    path_1.default.resolve('/var/task/client/dist')
];
const clientDist = possibleDistPaths.find(p => fs_1.default.existsSync(p));
if (clientDist) {
    app.use(express_1.default.static(clientDist));
    app.use('/assets', express_1.default.static(path_1.default.join(clientDist, 'assets')));
}
function getSpaHtml() {
    if (clientDist) {
        const indexPath = path_1.default.join(clientDist, 'index.html');
        if (fs_1.default.existsSync(indexPath)) {
            try {
                return fs_1.default.readFileSync(indexPath, 'utf-8');
            }
            catch { }
        }
        const assetsDir = path_1.default.join(clientDist, 'assets');
        if (fs_1.default.existsSync(assetsDir)) {
            try {
                const files = fs_1.default.readdirSync(assetsDir);
                const js = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
                const css = files.find(f => f.startsWith('index-') && f.endsWith('.css'));
                if (js) {
                    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/logo.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VK Technology – DIY Electronics, Robotics, IoT & Engineering Project Kits</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
    <script type="module" crossorigin src="/assets/${js}"></script>
    ${css ? `<link rel="stylesheet" crossorigin href="/assets/${css}">` : ''}
  </head>
  <body class="bg-gray-100 text-gray-900 font-sans antialiased selection:bg-amber-400 selection:text-gray-950">
    <div id="root"></div>
  </body>
</html>`;
                }
            }
            catch { }
        }
    }
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/logo.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VK Technology – DIY Electronics, Robotics, IoT & Engineering Project Kits</title>
    <script type="module" crossorigin src="/assets/index-CBMXmavX.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-CttJrRZp.css">
  </head>
  <body class="bg-gray-100 text-gray-900 font-sans antialiased selection:bg-amber-400 selection:text-gray-950">
    <div id="root"></div>
  </body>
</html>`;
}
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') ||
        req.path.startsWith('/uploads') ||
        req.path.startsWith('/events') ||
        req.path.startsWith('/health') ||
        req.path.startsWith('/upi')) {
        return next();
    }
    if (clientDist) {
        const indexHtml = path_1.default.join(clientDist, 'index.html');
        if (fs_1.default.existsSync(indexHtml)) {
            return res.sendFile(indexHtml);
        }
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(getSpaHtml());
});
// Proxy / communication endpoint with internal Python backend service
app.get('/api/internal/backend-health', async (req, res) => {
    try {
        const targetUrl = new URL('health', config_js_1.config.backendServiceUrl.endsWith('/') ? config_js_1.config.backendServiceUrl : `${config_js_1.config.backendServiceUrl}/`);
        const resp = await fetch(targetUrl.toString());
        const data = await resp.json();
        res.json({ service: 'server-express', backendStatus: data });
    }
    catch (err) {
        res.status(502).json({ error: 'Failed to communicate with internal backend service', details: err.message });
    }
});
// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
});
if (!process.env.VERCEL &&
    !process.env.AWS_LAMBDA_FUNCTION_NAME &&
    !process.env.VERCEL_ENV &&
    process.env.NODE_ENV !== 'test' &&
    !process.env.VITEST) {
    app.listen(config_js_1.config.port, () => {
        console.log(`====================================================`);
        console.log(`🚀 VK Technology Backend API running on port ${config_js_1.config.port}`);
        console.log(`📍 Location: ${config_js_1.config.ownerLocation}`);
        console.log(`👤 Owner Admin: ${config_js_1.config.adminEmail}`);
        console.log(`💳 Currency: ${config_js_1.config.currencySymbol} (${config_js_1.config.currency})`);
        console.log(`====================================================`);
    });
}
exports.default = app;
