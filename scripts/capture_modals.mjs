import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9226;
const USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_modals_profile_' + Date.now());
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
  const mode = process.argv[2] || 'before';
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

    for (const theme of ['light', 'dark']) {
      await cdp.send('Runtime.evaluate', {
        expression: `
          if (typeof window.__setTheme === 'function') {
            window.__setTheme('${theme}');
          } else {
            if ('${theme}' === 'dark') {
              document.documentElement.classList.add('dark');
              localStorage.setItem('tamstore_theme', 'dark');
            } else {
              document.documentElement.classList.remove('dark');
              localStorage.setItem('tamstore_theme', 'light');
            }
          }
        `,
      });
      await sleep(1000);

      // 1. Password modal (click locked promo_distribution item in sidebar)
      await cdp.send('Runtime.evaluate', {
        expression: `
          const lockedBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg[class*="lucide-boxes"]'));
          if (lockedBtn) lockedBtn.click();
        `,
      });
      await sleep(500);
      let snap = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(ARTIFACTS_DIR, `${mode}_modal_password_${theme}.png`), Buffer.from(snap.data, 'base64'));

      // Close modal (Escape)
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape' });
      await sleep(300);

      // 2. Command Palette (click search button or Ctrl+K)
      await cdp.send('Runtime.evaluate', {
        expression: `
          const searchBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Ctrl K'));
          if (searchBtn) searchBtn.click();
        `,
      });
      await sleep(500);
      snap = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(ARTIFACTS_DIR, `${mode}_modal_command_${theme}.png`), Buffer.from(snap.data, 'base64'));

      // Close modal (Escape)
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape' });
      await sleep(300);

      // 3. Upload Modal (click upload button in Header or settings)
      await cdp.send('Runtime.evaluate', {
        expression: `
          const uploadBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Excel'));
          if (uploadBtn) uploadBtn.click();
        `,
      });
      await sleep(500);
      snap = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(ARTIFACTS_DIR, `${mode}_modal_upload_${theme}.png`), Buffer.from(snap.data, 'base64'));

      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape' });
      await sleep(300);
    }

    cdp.close();
    console.log(`Finished ${mode} modal screenshots`);
  } finally {
    chrome.kill('SIGKILL');
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
