import { spawn } from 'child_process';

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9245',
  '--user-data-dir=C:\\Temp\\chk_' + Date.now(),
  '--disable-gpu',
  'http://localhost:5173'
]);

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

for (let i = 0; i < 30; i++) {
  try {
    const res = await fetch('http://localhost:9245/json/list');
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
        await send('Runtime.evaluate', { expression: 'window.__setActiveTab("promo_perf")' });
        await sleep(1500);
        // Check total count before filter
        const before = await send('Runtime.evaluate', { expression: 'document.body.innerText.match(/Tapılan Məhsullar: (\\d+) SKU/)?.[1]', returnByValue: true });
        console.log('Total SKUs before filter:', before.result?.value);
        
        // Click Tedaruk dropdown
        await send('Runtime.evaluate', { expression: 'Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Tədarük"))?.click()' });
        await sleep(500);
        // Click Depo option
        await send('Runtime.evaluate', { expression: 'Array.from(document.querySelectorAll("div")).find(d => d.innerText?.includes("Depo (40)"))?.click()' });
        await sleep(1000);
        
        const afterDepo = await send('Runtime.evaluate', { expression: 'document.body.innerText.match(/Tapılan Məhsullar: (\\d+) SKU/)?.[1]', returnByValue: true });
        console.log('Total SKUs after Depo filter:', afterDepo.result?.value);

        // Click Firma option
        await send('Runtime.evaluate', { expression: 'Array.from(document.querySelectorAll("div")).find(d => d.innerText?.includes("Firma (41)"))?.click()' });
        await sleep(1000);
        const afterBoth = await send('Runtime.evaluate', { expression: 'document.body.innerText.match(/Tapılan Məhsullar: (\\d+) SKU/)?.[1]', returnByValue: true });
        console.log('Total SKUs after Depo + Firma filter:', afterBoth.result?.value);

        // Unclick Depo (leave only Firma)
        await send('Runtime.evaluate', { expression: 'Array.from(document.querySelectorAll("div")).find(d => d.innerText?.includes("Depo (40)"))?.click()' });
        await sleep(1000);
        const afterFirmaOnly = await send('Runtime.evaluate', { expression: 'document.body.innerText.match(/Tapılan Məhsullar: (\\d+) SKU/)?.[1]', returnByValue: true });
        console.log('Total SKUs after Firma only:', afterFirmaOnly.result?.value);

        chrome.kill('SIGKILL');
        process.exit(0);
      };
      break;
    }
  } catch(e) {}
  await sleep(300);
}
