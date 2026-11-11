import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9228;
const USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_snap_' + Date.now());

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
  const outFile = process.argv[2] || 'snap.png';
  const theme = process.argv[3] || 'dark';

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

    // Set localStorage and click the theme toggle button in the header so React state updates
    await cdp.send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('tamstore_theme', '${theme}');
        // Find theme button by Sun/Moon icon in header and click it if state differs
        const isCurrentlyDark = document.documentElement.classList.contains('dark');
        if (('${theme}' === 'dark' && !isCurrentlyDark) || ('${theme}' === 'light' && isCurrentlyDark)) {
          const btn = Array.from(document.querySelectorAll('header button')).find(b => b.querySelector('svg.lucide-sun, svg.lucide-moon'));
          if (btn) btn.click();
        }
      `,
    });

    await sleep(1200);

    const snap = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outFile, Buffer.from(snap.data, 'base64'));
    console.log(`Saved screenshot to ${outFile}`);

    // If DEV auditor is available, run it
    const auditRes = await cdp.send('Runtime.evaluate', {
      expression: 'typeof window.__auditContrast === "function" ? window.__auditContrast() : null',
      returnByValue: true,
    });
    if (auditRes.result && auditRes.result.value) {
      console.log('Contrast Audit Result:', JSON.stringify(auditRes.result.value, null, 2));
    }

    cdp.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
