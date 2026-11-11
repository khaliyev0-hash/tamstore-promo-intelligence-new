import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9240;
const USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_promo_perf_' + Date.now());
const ARTIFACTS_DIR = 'C:\\Users\\Khayal.Aliyev\\.gemini\\antigravity\\brain\\b5e8147e-8673-4cc7-80b0-3ed54e2c22f3\\screenshots';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }

  async send(method, params = {}) {
    await this.ready;
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

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
      await sleep(300);
    }
    const cdp = new CDPClient(wsUrl);
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1680,
      height: 1050,
      deviceScaleFactor: 1,
      mobile: false,
    });

    for (let i = 0; i < 30; i++) {
      const chk = await cdp.send('Runtime.evaluate', {
        expression: `typeof window.__setActiveTab === 'function'`,
        returnByValue: true,
      });
      if (chk.result?.value) break;
      await sleep(400);
    }
    await sleep(1500);

    // Navigate to Promo Performansı
    await cdp.send('Runtime.evaluate', {
      expression: `window.__setActiveTab('promo_perf');`,
    });
    await sleep(1500);

    // Open Tədarük filter and select Depo
    await cdp.send('Runtime.evaluate', {
      expression: `
        const btns = Array.from(document.querySelectorAll('button'));
        const tedarukBtn = btns.find(b => b.innerText.includes('Tədarük') || b.title?.includes('Tədarük'));
        if (tedarukBtn) tedarukBtn.click();
      `,
    });
    await sleep(500);

    // Click "🏢 Depo (40)"
    await cdp.send('Runtime.evaluate', {
      expression: `
        const labels = Array.from(document.querySelectorAll('label, button, div, span'));
        const depoOpt = labels.find(l => l.innerText?.includes('Depo (40)'));
        if (depoOpt) depoOpt.click();
      `,
    });
    await sleep(800);

    // Close dropdown
    await cdp.send('Runtime.evaluate', {
      expression: `
        const btns = Array.from(document.querySelectorAll('button'));
        const closeBtn = btns.find(b => b.innerText === 'Bağla');
        if (closeBtn) closeBtn.click();
      `,
    });
    await sleep(800);

    const snap = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const p = path.join(ARTIFACTS_DIR, 'promo_perf_depo_filtered.png');
    fs.writeFileSync(p, Buffer.from(snap.data, 'base64'));
    console.log(`Saved ${p}`);

    // Verify row count
    const evalRes = await cdp.send('Runtime.evaluate', {
      expression: `document.querySelectorAll('tbody tr').length`,
      returnByValue: true,
    });
    console.log('Visible rows in table after Depo filter:', evalRes.result?.value);

    cdp.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

run().catch(console.error);
