import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9225;
const USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_before_profile_' + Date.now());
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

const TABS = [
  'dashboard',
  'promo_catalog',
  'promo_perf',
  'promo_uplift',
  'category_analysis',
  'area_analysis',
  'store_analytics',
  'store_daily_stock',
  'service_level',
  'product_analytics',
  'stockout_analysis',
  'lost_sales',
  'matrix',
  'reports',
  'settings',
];

async function run() {
  const mode = process.argv[2] || 'before'; // 'before' or 'after'
  console.log(`Starting capture: ${mode}`);

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
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

    if (!wsUrl) throw new Error('Could not find Chrome page WebSocket URL');

    const cdp = new CDPClient(wsUrl);
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1600,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    // Set system media feature to light so we test true class-based dark mode
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: 'light' }],
    });

    await sleep(2500);

    for (const theme of ['light', 'dark']) {
      // Set theme cleanly via DEV hook or fallback
      await cdp.send('Runtime.evaluate', {
        expression: `
          if (typeof window.__setTheme === 'function') {
            window.__setTheme('${theme}');
          } else {
            localStorage.setItem('tamstore_theme', '${theme}');
            if ('${theme}' === 'dark') document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
          }
        `,
      });
      await sleep(1200);

      const checkTheme = await cdp.send('Runtime.evaluate', {
        expression: `document.documentElement.classList.contains('dark')`,
        returnByValue: true,
      });
      console.log(`Theme set to ${theme}. document.documentElement has dark: ${checkTheme.result.value}`);

      for (const tab of TABS) {
        // Switch tab
        await cdp.send('Runtime.evaluate', {
          expression: `
            if (typeof window.__setActiveTab === 'function') {
              window.__setActiveTab('${tab}');
            } else {
              const btn = document.querySelector('button[data-tab-id="${tab}"]');
              if (btn) btn.click();
            }
          `,
        });
        await sleep(900);

        const snap = await cdp.send('Page.captureScreenshot', { format: 'png' });
        const filePath = path.join(ARTIFACTS_DIR, `${mode}_${tab}_${theme}.png`);
        fs.writeFileSync(filePath, Buffer.from(snap.data, 'base64'));
        console.log(`Captured ${mode}_${tab}_${theme}.png`);
      }
    }

    cdp.close();
    console.log(`Finished ${mode} screenshots in ${ARTIFACTS_DIR}`);
  } finally {
    chrome.kill('SIGKILL');
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
