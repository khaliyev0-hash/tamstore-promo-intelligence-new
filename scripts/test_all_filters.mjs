import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9247',
  '--user-data-dir=C:\\Temp\\chk3_' + Date.now(),
  '--disable-gpu',
  'http://localhost:5173'
]);

const ARTIFACTS_DIR = 'C:\\Users\\Khayal.Aliyev\\.gemini\\antigravity\\brain\\b5e8147e-8673-4cc7-80b0-3ed54e2c22f3\\screenshots';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
for (let i = 0; i < 30; i++) {
  try {
    const res = await fetch('http://localhost:9247/json/list');
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page');
    if (page && page.webSocketDebuggerUrl) {
      const ws = new WebSocket(page.webSocketDebuggerUrl);
      ws.onopen = async () => {
        const send = (method, params = {}) => new Promise((resolve) => {
          const id = Math.floor(Math.random() * 100000);
          const h = (evt) => {
            const d = JSON.parse(evt.data);
            if (d.id === id) { ws.removeEventListener('message', h); resolve(d.result); }
          };
          ws.addEventListener('message', h);
          ws.send(JSON.stringify({ id, method, params }));
        });
        await sleep(2000);
        await send('Page.enable');
        await send('Emulation.setDeviceMetricsOverride', { width: 1680, height: 1050, deviceScaleFactor: 1, mobile: false });

        // Go to Promo Performansi
        await send('Runtime.evaluate', { expression: 'window.__setActiveTab("promo_perf")' });
        await sleep(1500);

        // 1. All SKUs
        const allSkus = await send('Runtime.evaluate', { expression: 'document.body.innerText.match(/Tapılan Məhsullar: (\\d+) SKU/)?.[1]', returnByValue: true });
        console.log('[1] Initial total SKUs:', allSkus.result?.value);

        // 2. Select Depo
        await send('Runtime.evaluate', { expression: 'Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Tədarük"))?.click()' });
        await sleep(400);
        await send('Runtime.evaluate', { expression: 'Array.from(document.querySelectorAll("div.cursor-pointer")).find(el => el.innerText.includes("Depo (40)"))?.click()' });
        await sleep(600);
        const depoSkus = await send('Runtime.evaluate', { expression: 'document.body.innerText.match(/Tapılan Məhsullar: (\\d+) SKU/)?.[1]', returnByValue: true });
        console.log('[2] SKUs for Depo (40):', depoSkus.result?.value);

        // 3. Add Firma (Multi-select: Depo + Firma)
        await send('Runtime.evaluate', { expression: 'Array.from(document.querySelectorAll("div.cursor-pointer")).find(el => el.innerText.includes("Firma (41)"))?.click()' });
        await sleep(600);
        const depoFirmaSkus = await send('Runtime.evaluate', { expression: 'document.body.innerText.match(/Tapılan Məhsullar: (\\d+) SKU/)?.[1]', returnByValue: true });
        console.log('[3] SKUs for Depo (40) + Firma (41):', depoFirmaSkus.result?.value);

        // 4. Remove Depo (Leave Firma only)
        await send('Runtime.evaluate', { expression: 'Array.from(document.querySelectorAll("div.cursor-pointer")).find(el => el.innerText.includes("Depo (40)"))?.click()' });
        await sleep(600);
        const firmaSkus = await send('Runtime.evaluate', { expression: 'document.body.innerText.match(/Tapılan Məhsullar: (\\d+) SKU/)?.[1]', returnByValue: true });
        console.log('[4] SKUs for Firma (41) only:', firmaSkus.result?.value);

        // 5. Switch to Sifarişsiz only
        await send('Runtime.evaluate', { expression: 'Array.from(document.querySelectorAll("div.cursor-pointer")).find(el => el.innerText.includes("Firma (41)"))?.click()' });
        await sleep(400);
        await send('Runtime.evaluate', { expression: 'Array.from(document.querySelectorAll("div.cursor-pointer")).find(el => el.innerText.includes("Sifarişsiz (42)"))?.click()' });
        await sleep(600);
        const sifSkus = await send('Runtime.evaluate', { expression: 'document.body.innerText.match(/Tapılan Məhsullar: (\\d+) SKU/)?.[1]', returnByValue: true });
        console.log('[5] SKUs for Sifarişsiz (42) only:', sifSkus.result?.value);

        // Close dropdown
        await send('Runtime.evaluate', { expression: 'Array.from(document.querySelectorAll("button")).find(b => b.innerText === "Bağla")?.click()' });
        await sleep(500);

        // Capture screenshot of filtered view
        const snap = await send('Page.captureScreenshot', { format: 'png' });
        const p = path.join(ARTIFACTS_DIR, 'global_filter_bar_sifarissiz_filtered.png');
        fs.writeFileSync(p, Buffer.from(snap.data, 'base64'));
        console.log(`Saved screenshot ${p}`);

        // 6. Test Reset button
        await send('Runtime.evaluate', { expression: 'Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Sıfırla"))?.click()' });
        await sleep(600);
        const resetSkus = await send('Runtime.evaluate', { expression: 'document.body.innerText.match(/Tapılan Məhsullar: (\\d+) SKU/)?.[1]', returnByValue: true });
        console.log('[6] SKUs after Reset button clicked:', resetSkus.result?.value);

        chrome.kill('SIGKILL');
        process.exit(0);
      };
      break;
    }
  } catch(e) {}
  await sleep(300);
}
