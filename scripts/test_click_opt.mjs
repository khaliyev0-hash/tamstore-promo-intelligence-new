import { spawn } from 'child_process';

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9246',
  '--user-data-dir=C:\\Temp\\chk2_' + Date.now(),
  '--disable-gpu',
  'http://localhost:5173'
]);

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
for (let i = 0; i < 30; i++) {
  try {
    const res = await fetch('http://localhost:9246/json/list');
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
        // Open Tedaruk dropdown
        await send('Runtime.evaluate', { expression: 'Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Tədarük"))?.click()' });
        await sleep(500);

        // Find exact option elements
        const debug = await send('Runtime.evaluate', {
          expression: `
            const all = Array.from(document.querySelectorAll('*')).filter(el => el.innerText?.trim() === '🏢 Depo (40)');
            all.map(el => el.tagName + '.' + el.className);
          `,
          returnByValue: true
        });
        console.log('Matching elements:', debug.result?.value);

        // Find the clickable row: the div with cursor-pointer
        await send('Runtime.evaluate', {
          expression: `
            const row = Array.from(document.querySelectorAll('div.cursor-pointer')).find(el => el.innerText.includes('Depo (40)'));
            if (row) row.click();
          `
        });
        await sleep(800);

        // Check active filters state
        const state = await send('Runtime.evaluate', {
          expression: `
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.title?.includes('Tədarük'));
            btn ? btn.innerText.replace(/\\n/g, ' ') : null;
          `,
          returnByValue: true
        });
        console.log('Tedaruk button text after click:', state.result?.value);

        // Navigate to Promo Performansı
        await send('Runtime.evaluate', { expression: 'window.__setActiveTab("promo_perf")' });
        await sleep(1000);

        const skuText = await send('Runtime.evaluate', {
          expression: 'document.body.innerText.match(/Tapılan Məhsullar: (\\d+) SKU/)?.[1]',
          returnByValue: true
        });
        console.log('Filtered SKUs on promo_perf page:', skuText.result?.value);

        chrome.kill('SIGKILL');
        process.exit(0);
      };
      break;
    }
  } catch(e) {}
  await sleep(300);
}
