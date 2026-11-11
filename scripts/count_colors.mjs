import fs from 'fs';
import path from 'path';

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(walk(full));
    } else if (/\.(tsx|ts|css|html)$/.test(item)) {
      files.push(full);
    }
  }
  return files;
}

const files = walk('frontend/src');
let counts = {
  bgWhite: 0,
  bgSlate: 0,
  textSlate: 0,
  borderSlate: 0,
  gradientClasses: 0,
  bgClipText: 0,
  hexColors: 0,
  rgbColors: 0,
  rechartsProps: 0,
  filesScanned: files.length,
};

const hexRegex = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const rgbRegex = /rgba?\([^)]+\)/g;
const rechartsPropRegex = /(stroke|fill|stopColor|tick|grid)=\{"?[#a-zA-Z0-9_\-\(\),\.\s]+\"?/g;

for (const f of files) {
  const content = fs.readFileSync(f, 'utf-8');
  counts.bgWhite += (content.match(/\bbg-white\b/g) || []).length;
  counts.bgSlate += (content.match(/\bbg-slate-[0-9]+(?:\/[0-9]+)?\b/g) || []).length;
  counts.textSlate += (content.match(/\btext-slate-[0-9]+(?:\/[0-9]+)?\b/g) || []).length;
  counts.borderSlate += (content.match(/\bborder-slate-[0-9]+(?:\/[0-9]+)?\b/g) || []).length;
  counts.gradientClasses += (content.match(/\b(from|via|to)-[a-z]+-[0-9]+(?:\/[0-9]+)?\b/g) || []).length;
  counts.bgClipText += (content.match(/\bbg-clip-text\b/g) || []).length;
  counts.hexColors += (content.match(hexRegex) || []).length;
  counts.rgbColors += (content.match(rgbRegex) || []).length;
  counts.rechartsProps += (content.match(rechartsPropRegex) || []).length;
}

console.log(JSON.stringify(counts, null, 2));
