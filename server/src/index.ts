import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { initDatabase } from './database.js';
import { authRouter } from './routes/auth.js';
import { categoriesRouter } from './routes/categories.js';
import { productsRouter } from './routes/products.js';
import { ordersRouter } from './routes/orders.js';
import { cartRouter } from './routes/cart.js';
import { wishlistRouter } from './routes/wishlist.js';
import { couponsRouter } from './routes/coupons.js';
import { reviewsRouter } from './routes/reviews.js';
import { bannersRouter } from './routes/banners.js';
import { settingsRouter } from './routes/settings.js';
import { uploadRouter } from './routes/upload.js';
import { contactRouter } from './routes/contact.js';
import { upiRouter } from './routes/upi.js';
import { eventBroadcaster } from './services/events.js';
import { openApiSpec } from './openapi.js';

const app = express();

// Initialize database & seed defaults safely
try {
  initDatabase();
} catch (err) {
  console.warn('Database initialization warning:', err);
}

// CORS configuration
app.use(cors({
  origin: true, // Allow frontend dev and prod
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads directory (safe for serverless read-only filesystems)
const uploadsDir = (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
  ? path.join(os.tmpdir(), 'uploads')
  : path.resolve(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn('Could not create uploads directory:', err);
}
app.use('/uploads', express.static(uploadsDir));
app.get('/upi-qr-code.jpg', (req, res) => {
  const file = path.join(uploadsDir, 'upi-qr-code.jpg');
  if (fs.existsSync(file)) return res.sendFile(file);
  res.status(404).send('Not Found');
});

// API Routes - Dual-path mounting (supports both direct /api/* and Vercel stripped rewrite /*)
const routeBindings = [
  ['/auth', authRouter],
  ['/categories', categoriesRouter],
  ['/products', productsRouter],
  ['/orders', ordersRouter],
  ['/cart', cartRouter],
  ['/wishlist', wishlistRouter],
  ['/coupons', couponsRouter],
  ['/reviews', reviewsRouter],
  ['/banners', bannersRouter],
  ['/settings', settingsRouter],
  ['/upload', uploadRouter],
  ['/contact', contactRouter],
  ['/upi', upiRouter],
] as const;

routeBindings.forEach(([prefix, router]) => {
  app.use(`/api${prefix}`, router);
  app.use(prefix, router);
});

// Explicit administration endpoints binding for global product synchronization
app.use('/api/admin/products', productsRouter);

// Health check endpoint on both /api/health and /health
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    store: config.storeName,
    adminEmail: config.adminEmail,
    location: config.ownerLocation,
    currency: config.currency,
    timestamp: new Date().toISOString(),
    clientDistFound: clientDist || null,
    cwd: process.cwd(),
    dirname: __dirname,
    existsPublic: fs.existsSync(path.resolve(__dirname, 'public'))
  });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Server-Sent Events (SSE) for Real-Time Live Catalog Sync
const eventsHandler = (req: express.Request, res: express.Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  eventBroadcaster.addClient(clientId, res);

  req.on('close', () => {
    eventBroadcaster.removeClient(clientId);
  });
};
app.get('/api/events', eventsHandler);
app.get('/events', eventsHandler);

// OpenAPI specification endpoint
app.get(['/api/openapi.json', '/openapi.json', '/api/docs.json'], (_req, res) => {
  res.json(openApiSpec);
});

// Production: Serve React client build if present
const possibleDistPaths = [
  path.resolve(__dirname, 'public'),
  path.resolve(process.cwd(), 'server/dist/public'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve('/var/task/server/dist/public'),
  path.resolve('/var/task/client/dist')
];
const clientDist = possibleDistPaths.find(p => fs.existsSync(p));
if (clientDist) {
  app.use(express.static(clientDist));
  app.use('/assets', express.static(path.join(clientDist, 'assets')));
}

function getSpaHtml(): string {
  if (clientDist) {
    const indexPath = path.join(clientDist, 'index.html');
    if (fs.existsSync(indexPath)) {
      try {
        return fs.readFileSync(indexPath, 'utf-8');
      } catch {}
    }

    const assetsDir = path.join(clientDist, 'assets');
    if (fs.existsSync(assetsDir)) {
      try {
        const files = fs.readdirSync(assetsDir);
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
      } catch {}
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
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/uploads') ||
    req.path.startsWith('/events') ||
    req.path.startsWith('/health') ||
    req.path.startsWith('/upi')
  ) {
    return next();
  }

  if (clientDist) {
    const indexHtml = path.join(clientDist, 'index.html');
    if (fs.existsSync(indexHtml)) {
      return res.sendFile(indexHtml);
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(getSpaHtml());
});

// Proxy / communication endpoint with internal Python backend service
app.get('/api/internal/backend-health', async (req, res) => {
  try {
    const targetUrl = new URL('health', config.backendServiceUrl.endsWith('/') ? config.backendServiceUrl : `${config.backendServiceUrl}/`);
    const resp = await fetch(targetUrl.toString());
    const data = await resp.json();
    res.json({ service: 'server-express', backendStatus: data });
  } catch (err: any) {
    res.status(502).json({ error: 'Failed to communicate with internal backend service', details: err.message });
  }
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

if (
  !process.env.VERCEL &&
  !process.env.AWS_LAMBDA_FUNCTION_NAME &&
  !process.env.VERCEL_ENV &&
  process.env.NODE_ENV !== 'test' &&
  !process.env.VITEST
) {
  app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`🚀 VK Technology Backend API running on port ${config.port}`);
    console.log(`📍 Location: ${config.ownerLocation}`);
    console.log(`👤 Owner Admin: ${config.adminEmail}`);
    console.log(`💳 Currency: ${config.currencySymbol} (${config.currency})`);
    console.log(`====================================================`);
  });
}

export default app;
