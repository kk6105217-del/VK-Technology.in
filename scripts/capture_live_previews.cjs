const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 5000;
const OUT_DIR = 'C:\\Users\\kk610\\.gemini\\antigravity\\brain\\2fa85069-a1bf-40b7-84f3-aae77c1153f1';
const CHROME_BIN = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(url, maxWaitMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (e) {}
    await wait(300);
  }
  throw new Error(`Server did not respond at ${url} within ${maxWaitMs}ms`);
}

async function cdpRequest(ws, method, params = {}) {
  const id = Math.floor(Math.random() * 1000000);
  return new Promise((resolve, reject) => {
    const handler = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      } catch (err) {
        reject(err);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function capture() {
  console.log('[1/5] Starting VK Technology Backend on port ' + PORT + '...');
  const serverProc = spawn('node', ['dist/index.js'], {
    cwd: path.resolve(__dirname, '../server'),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
    stdio: 'inherit'
  });

  serverProc.on('error', (err) => console.error('Server process error:', err));

  try {
    await waitForServer(`http://127.0.0.1:${PORT}/api/projects`);
    console.log('[2/5] Server is live and healthy!');

    const debugPort = 9333;
    const tempProfile = path.join(process.env.TEMP || 'C:\\Temp', `chrome_prev_${Date.now()}`);
    console.log('[3/5] Launching Chrome Headless with Remote Debugging...');
    const chromeProc = spawn(CHROME_BIN, [
      '--headless=new',
      '--disable-gpu',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${tempProfile}`,
      '--window-size=1440,950',
      'about:blank'
    ], { stdio: 'ignore' });

    await wait(1500);

    const listRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    const pages = await listRes.json();
    const wsUrl = pages[0].webSocketDebuggerUrl;
    console.log('[4/5] Connected to Chrome DevTools Protocol:', wsUrl);

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve) => ws.addEventListener('open', resolve));

    await cdpRequest(ws, 'Page.enable');
    await cdpRequest(ws, 'Runtime.enable');

    // Helper to navigate, wait and screenshot
    async function takeScreenshot(urlPath, filename, evaluateBefore = null, waitExtra = 1500) {
      console.log(` -> Navigating to ${urlPath}...`);
      await cdpRequest(ws, 'Page.navigate', { url: `http://localhost:${PORT}${urlPath}` });
      await wait(waitExtra);

      if (evaluateBefore) {
        await cdpRequest(ws, 'Runtime.evaluate', { expression: evaluateBefore });
        await wait(500);
      }

      console.log(` -> Capturing screenshot for ${filename}...`);
      const { data } = await cdpRequest(ws, 'Page.captureScreenshot', { format: 'png' });
      const filePath = path.join(OUT_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
      console.log(` -> Saved ${filename} (${fs.statSync(filePath).size} bytes)`);
    }

    // 1. Storefront Home
    await takeScreenshot('/', 'preview_storefront_live.png', null, 3500);

    // 2. Products Catalog
    await takeScreenshot('/products', 'preview_products_live.png', null, 2500);

    // 3. DIY Projects Gallery
    await takeScreenshot('/projects', 'preview_projects_live.png', null, 2500);

    // 4. Companion Apps
    await takeScreenshot('/apps', 'preview_apps_live.png', null, 2500);

    // Set Admin auth state in localStorage
    const adminAuthScript = `
      (function() {
        const u = { id: 1, email: 'karthik.suroju@gmail.com', role: 'SUPER_ADMIN', full_name: 'S. J. V. Karthik (VK Technology)', phone: '+91 8555997052' };
        localStorage.setItem('vk_auth_token', 'vk_admin_session_super');
        localStorage.setItem('vk_user', JSON.stringify(u));
        localStorage.setItem('vk_current_user', JSON.stringify(u));
        localStorage.setItem('vk_admin_user', JSON.stringify(u));
      })();
    `;

    // 5. Admin Analytics Dashboard
    await cdpRequest(ws, 'Runtime.evaluate', { expression: adminAuthScript });
    await takeScreenshot('/admin/analytics', 'preview_admin_analytics_live.png', null, 3000);

    // 6. Admin Products Management
    await takeScreenshot('/admin/products', 'preview_admin_products_live.png', null, 2500);

    console.log('[5/5] All previews captured successfully!');

    ws.close();
    chromeProc.kill();
  } finally {
    serverProc.kill();
  }
}

capture().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
