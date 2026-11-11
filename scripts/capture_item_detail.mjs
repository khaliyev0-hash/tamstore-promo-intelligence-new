import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9230;
const USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_item_detail_' + Date.now());

async function run() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA}`,
    '--disable-gpu',
    'http://localhost:5173',
  ]);

  try {
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`http://localhost:${PORT}/json/list`);
        const targets = await res.json();
        const page = targets.find((t) => t.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      } catch (_) {}
      await new Promise((r) => setTimeout(r, 300));
    }
    if (!wsUrl) throw new Error('WebSocket URL not found');
    const ws = new WebSocket(wsUrl);
    await new Promise((r) => (ws.onopen = r));

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (evt) => {
          const d = JSON.parse(evt.data);
          if (d.id === id) {
            ws.removeEventListener('message', handler);
            resolve(d.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1600,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Wait for page to initialize
    for (let i = 0; i < 30; i++) {
      const chk = await send('Runtime.evaluate', {
        expression: `typeof window.__setActiveTab === 'function'`,
        returnByValue: true,
      });
      if (chk.result?.value) break;
      await new Promise((r) => setTimeout(r, 300));
    }

    // Navigate to promo_perf
    await send('Runtime.evaluate', {
      expression: `window.__setActiveTab('promo_perf');`,
    });
    await new Promise((r) => setTimeout(r, 2000));

    // Click first product row
    await send('Runtime.evaluate', {
      expression: `
        const tr = document.querySelector('tbody tr');
        if (tr) tr.click();
      `,
    });

    // Wait for modal content to load
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const checkLoaded = await send('Runtime.evaluate', {
        expression: `!document.body.innerText.includes('Yüklənir...') && document.querySelector('table thead') !== null`,
        returnByValue: true,
      });
      if (checkLoaded.result && checkLoaded.result.value) break;
    }
    await new Promise((r) => setTimeout(r, 1000));

    const snap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('item_detail_test.png', Buffer.from(snap.data, 'base64'));
    console.log('Saved item_detail_test.png');

    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

run().catch(console.error);
