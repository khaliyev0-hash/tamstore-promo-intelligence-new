import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9245;
const USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_dash_filter_' + Date.now());
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

    if (!wsUrl) throw new Error('Could not connect to Chrome debugging port');

    const cdp = new CDPClient(wsUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1680,
      height: 1050,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Wait for page to initialize
    for (let i = 0; i < 40; i++) {
      const chk = await cdp.send('Runtime.evaluate', {
        expression: `typeof window.__setActiveTab === 'function' && document.querySelectorAll('button').length > 10`,
        returnByValue: true,
      });
      if (chk.result?.value) break;
      await sleep(400);
    }
    await sleep(2000);

    // Read KPI card values function
    const getKpiValues = async () => {
      const res = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          // Find the 5 main KPI cards
          const cards = Array.from(document.querySelectorAll('.rounded-2xl, .group')).filter(el => {
            const txt = el.innerText || '';
            return txt.includes('ÖNGÖRÜ') || txt.includes('REALLAŞAN') || txt.includes('NAİLİYYƏT') || txt.includes('PROQNOZ') || txt.includes('MÖVCUDLUQ');
          });

          // Or simply query all values in the KPI row
          const kpiEls = Array.from(document.querySelectorAll('div'))
            .filter(d => {
              const text = d.innerText?.trim() || '';
              return (text.endsWith(' u') || text.endsWith('%') || text.startsWith('₼')) && text.length < 20;
            })
            .map(d => d.innerText.trim());

          return {
            detectedKpiNumbers: [...new Set(kpiEls)].slice(0, 8)
          };
        })()`,
        returnByValue: true
      });
      return res.result?.value;
    };

    console.log('--- 1. INITIAL UNFILTERED KPIS ---');
    console.log(await getKpiValues());

    // 2. Click "Depo (40)"
    console.log('\n--- 2. CLICKING DEPO (40) ---');
    const clickDepo = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.innerText.includes('Depo (40)'));
        if (btn) {
          btn.click();
          return { clicked: true, text: btn.innerText.trim() };
        }
        return { clicked: false, availableBtns: btns.map(b => b.innerText.trim()).filter(t => t.length > 0 && t.length < 30) };
      })()`,
      returnByValue: true
    });
    console.log('Click Depo result:', clickDepo.result?.value);
    await sleep(2000);

    console.log('--- KPIS AFTER DEPO (40) FILTER ---');
    const depoKpis = await getKpiValues();
    console.log(depoKpis);

    // Save screenshot Light
    const shotDepo = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'dashboard_depo_active_light.png'), Buffer.from(shotDepo.data, 'base64'));
    console.log('Saved screenshot: dashboard_depo_active_light.png');

    // Switch to dark mode and take Dark screenshot
    await cdp.send('Runtime.evaluate', {
      expression: `
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      `
    });
    await sleep(600);
    const shotDepoDark = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'dashboard_depo_active_dark.png'), Buffer.from(shotDepoDark.data, 'base64'));
    console.log('Saved screenshot: dashboard_depo_active_dark.png');

    // 3. Click "Firma (41)"
    console.log('\n--- 3. CLICKING FIRMA (41) ---');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.innerText.includes('Firma (41)'));
        if (btn) btn.click();
      })()`
    });
    await sleep(2000);

    console.log('--- KPIS AFTER FIRMA (41) FILTER ---');
    const firmaKpis = await getKpiValues();
    console.log(firmaKpis);

    // 4. Click "Sifarişsiz (42)"
    console.log('\n--- 4. CLICKING SİFARİŞSİZ (42) ---');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.innerText.includes('Sifarişsiz (42)'));
        if (btn) btn.click();
      })()`
    });
    await sleep(2000);

    console.log('--- KPIS AFTER SİFARİŞSİZ (42) FILTER ---');
    const sifKpis = await getKpiValues();
    console.log(sifKpis);

    // 5. Click "Hamısı"
    console.log('\n--- 5. CLICKING HAMISI ---');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.innerText.includes('Hamısı'));
        if (btn) btn.click();
      })()`
    });
    await sleep(2000);

    console.log('--- KPIS AFTER RESETTING TO HAMISI ---');
    const hamisiKpis = await getKpiValues();
    console.log(hamisiKpis);

    cdp.close();
  } finally {
    chrome.kill();
    try {
      fs.rmSync(USER_DATA, { recursive: true, force: true });
    } catch (e) {}
  }
}

run().catch(console.error);
