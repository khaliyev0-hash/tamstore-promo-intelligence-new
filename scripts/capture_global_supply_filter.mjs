import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9235;
const USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_supply_filter_' + Date.now());
const ARTIFACTS_DIR = 'C:\\Users\\Khayal.Aliyev\\.gemini\\antigravity\\brain\\b5e8147e-8673-4cc7-80b0-3ed54e2c22f3\\screenshots';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

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
    if (!wsUrl) throw new Error('WebSocket URL not found');

    const cdp = new CDPClient(wsUrl);
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1680,
      height: 1050,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Wait for page to initialize
    for (let i = 0; i < 30; i++) {
      const chk = await cdp.send('Runtime.evaluate', {
        expression: `typeof window.__setActiveTab === 'function' && document.querySelectorAll('button').length > 5`,
        returnByValue: true,
      });
      if (chk.result?.value) break;
      await sleep(400);
    }
    await sleep(1500);

    // Ensure Light Mode first
    await cdp.send('Runtime.evaluate', {
      expression: `
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      `,
    });
    await sleep(600);

    // 1. Screenshot of the entire dashboard with the new filter bar in Light Mode
    const snap1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const p1 = path.join(ARTIFACTS_DIR, 'global_filter_bar_overview_light.png');
    fs.writeFileSync(p1, Buffer.from(snap1.data, 'base64'));
    console.log(`Saved ${p1}`);

    // 2. Click the new "Tədarük" dropdown button to open it in Light Mode
    await cdp.send('Runtime.evaluate', {
      expression: `
        const btns = Array.from(document.querySelectorAll('button'));
        const tedarukBtn = btns.find(b => b.innerText.includes('Tədarük') || b.title?.includes('Tədarük'));
        if (tedarukBtn) {
          tedarukBtn.click();
          true;
        } else {
          false;
        }
      `,
    });
    await sleep(600);

    const snap2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const p2 = path.join(ARTIFACTS_DIR, 'global_filter_bar_tedaruk_open_light.png');
    fs.writeFileSync(p2, Buffer.from(snap2.data, 'base64'));
    console.log(`Saved ${p2}`);

    // 3. Switch to Dark Mode and take screenshot
    await cdp.send('Runtime.evaluate', {
      expression: `
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      `,
    });
    await sleep(600);

    const snap3 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const p3 = path.join(ARTIFACTS_DIR, 'global_filter_bar_tedaruk_open_dark.png');
    fs.writeFileSync(p3, Buffer.from(snap3.data, 'base64'));
    console.log(`Saved ${p3}`);

    // 4. Click "Depo" option inside dropdown
    await cdp.send('Runtime.evaluate', {
      expression: `
        const labels = Array.from(document.querySelectorAll('label, button, div, span'));
        const depoOpt = labels.find(l => l.innerText?.includes('Depo (40)'));
        if (depoOpt) depoOpt.click();
      `,
    });
    await sleep(1000);

    const snap4 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const p4 = path.join(ARTIFACTS_DIR, 'global_filter_bar_depo_selected_dark.png');
    fs.writeFileSync(p4, Buffer.from(snap4.data, 'base64'));
    console.log(`Saved ${p4}`);

    cdp.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

run().catch(console.error);
