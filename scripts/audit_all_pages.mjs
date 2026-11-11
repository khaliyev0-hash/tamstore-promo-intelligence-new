import { spawn } from 'child_process';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9229;
const USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_audit_profile_' + Date.now());

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
      width: 1600,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: 'light' }],
    });

    await sleep(2000);

    // Switch to dark mode via DEV hook or fallback
    await cdp.send('Runtime.evaluate', {
      expression: `
        if (typeof window.__setTheme === 'function') {
          window.__setTheme('dark');
        } else {
          localStorage.setItem('tamstore_theme', 'dark');
          document.documentElement.classList.add('dark');
        }
      `,
    });
    await sleep(1200);

    const results = {};

    for (const tab of TABS) {
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
      await sleep(1000);

      const auditRes = await cdp.send('Runtime.evaluate', {
        expression: 'typeof window.__auditContrast === "function" ? window.__auditContrast() : null',
        returnByValue: true,
      });

      const res = auditRes.result?.value || { totalChecked: 0, passed: 0, failures: [] };
      results[tab] = {
        totalChecked: res.totalChecked,
        passed: res.passed,
        failuresCount: res.failures.length,
        failures: res.failures.slice(0, 5), // sample top 5
      };
      console.log(`[Audit] ${tab}: ${res.passed}/${res.totalChecked} passed, ${res.failures.length} failures`);
    }

    console.log('\n=== FULL AUDIT SUMMARY ===');
    console.log(JSON.stringify(results, null, 2));

    cdp.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
