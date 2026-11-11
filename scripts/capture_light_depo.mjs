import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9252;
const USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_light_shot_' + Date.now());
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
      } catch (e) {}
      await sleep(300);
    }

    const cdp = new CDPClient(wsUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1680,
      height: 1050,
      deviceScaleFactor: 1,
      mobile: false,
    });

    for (let i = 0; i < 40; i++) {
      const chk = await cdp.send('Runtime.evaluate', {
        expression: `typeof window.__setActiveTab === 'function' && document.querySelectorAll('button').length > 10`,
        returnByValue: true,
      });
      if (chk.result?.value) break;
      await sleep(400);
    }
    await sleep(2000);

    // Force Light Mode
    await cdp.send('Runtime.evaluate', {
      expression: `
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      `
    });
    await sleep(500);

    // Click Depo (40)
    await cdp.send('Runtime.evaluate', {
      expression: `
        const b = Array.from(document.querySelectorAll('button')).find(el => el.innerText.includes('Depo (40)'));
        if (b) b.click();
      `
    });
    await sleep(1500);

    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'dashboard_depo_active_light.png'), Buffer.from(shot.data, 'base64'));
    console.log('Saved dashboard_depo_active_light.png');

    cdp.close();
  } finally {
    chrome.kill();
    try {
      fs.rmSync(USER_DATA, { recursive: true, force: true });
    } catch (e) {}
  }
}

run().catch(console.error);
