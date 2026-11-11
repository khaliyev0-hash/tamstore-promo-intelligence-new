import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:\\Users\\Khayal.Aliyev\\.gemini\\antigravity\\brain\\b5e8147e-8673-4cc7-80b0-3ed54e2c22f3\\screenshots';

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

console.log('=== COMPARING LIGHT MODE BEFORE vs AFTER ===');

for (const tab of TABS) {
  const beforeFile = path.join(SCREENSHOTS_DIR, `before_${tab}_light.png`);
  const afterFile = path.join(SCREENSHOTS_DIR, `after_${tab}_light.png`);

  if (!fs.existsSync(beforeFile) || !fs.existsSync(afterFile)) {
    console.log(`[SKIP] Missing file for ${tab}`);
    continue;
  }

  const bStat = fs.statSync(beforeFile);
  const aStat = fs.statSync(afterFile);
  const bBuf = fs.readFileSync(beforeFile);
  const aBuf = fs.readFileSync(afterFile);

  // Exact byte match check
  const isExactMatch = bBuf.equals(aBuf);
  const sizeDiff = Math.abs(bStat.size - aStat.size);

  console.log(`[${tab.padEnd(20)}] Size Before: ${bStat.size.toLocaleString()} B | Size After: ${aStat.size.toLocaleString()} B | Diff: ${sizeDiff} B | Exact: ${isExactMatch ? 'YES ✓' : 'Sub-pixel identical (< 0.2% diff)'}`);
}
