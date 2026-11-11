const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const server = spawn('node', ['dist/index.js'], {
    cwd: path.resolve(__dirname, '../server'),
    env: { ...process.env, PORT: '5000' }
  });
  await wait(2000);

  const debugPort = 9444;
  const tempProfile = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_sel_' + Date.now());
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${tempProfile}`,
    '--window-size=1440,950',
    'about:blank'
  ]);
  await wait(1500);

  const list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));

  function send(method, params = {}) {
    const id = Math.floor(Math.random() * 1000000);
    return new Promise((res, rej) => {
      const h = (e) => {
        const m = JSON.parse(e.data);
        if (m.id === id) {
          ws.removeEventListener('message', h);
          if (m.error) rej(new Error(m.error.message));
          else res(m.result);
        }
      };
      ws.addEventListener('message', h);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://localhost:5000/apps' });
  await wait(800);

  const authExpr = `
    const u = { id: 1, email: 'karthik.suroju@gmail.com', role: 'SUPER_ADMIN', full_name: 'S. J. V. Karthik (VK Technology)' };
    localStorage.setItem('vk_auth_token', 'vk_admin_session_super');
    localStorage.setItem('vk_user', JSON.stringify(u));
    localStorage.setItem('vk_current_user', JSON.stringify(u));
    localStorage.setItem('vk_admin_user', JSON.stringify(u));
  `;
  await send('Runtime.evaluate', { expression: authExpr });

  await send('Page.navigate', { url: 'http://localhost:5000/admin/products' });
  await wait(2500);

  // Click the "Select All" button
  const clickExpr = `
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Select All'));
    if (btn) btn.click();
  `;
  await send('Runtime.evaluate', { expression: clickExpr });
  await wait(800);

  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = 'C:\\Users\\kk610\\.gemini\\antigravity\\brain\\2fa85069-a1bf-40b7-84f3-aae77c1153f1\\preview_admin_products_bulk_selected.png';
  fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
  console.log('Saved bulk selected preview successfully:', fs.statSync(outPath).size, 'bytes');

  ws.close();
  chrome.kill();
  server.kill();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
