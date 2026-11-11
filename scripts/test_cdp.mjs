import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;
const USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_cdp_profile_' + Date.now());

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

async function capture() {
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

    await sleep(2000);

    // Light mode screenshot
    const lightSnap = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scripts/light_test.png', Buffer.from(lightSnap.data, 'base64'));
    console.log('Saved scripts/light_test.png');

    // Switch to dark mode
    await cdp.send('Runtime.evaluate', {
      expression: `
        document.documentElement.classList.add('dark');
        localStorage.setItem('tamstore_theme', 'dark');
      `,
    });
    await sleep(1000);

    // Dark mode screenshot
    const darkSnap = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scripts/dark_test.png', Buffer.from(darkSnap.data, 'base64'));
    console.log('Saved scripts/dark_test.png');

    cdp.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});
