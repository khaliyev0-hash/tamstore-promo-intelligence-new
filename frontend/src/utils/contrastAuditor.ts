// WCAG Contrast Auditor (DEV-only helper)

interface ContrastFailure {
  selector: string;
  text: string;
  color: string;
  backgroundColor: string;
  ratio: number;
  expected: number;
  fontSize: string;
  fontWeight: string;
  type: 'body' | 'secondary' | 'large';
}

function parseColor(str: string): [number, number, number, number] | null {
  if (!str) return null;
  const rgbMatch = str.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgbMatch) {
    return [
      parseFloat(rgbMatch[1]),
      parseFloat(rgbMatch[2]),
      parseFloat(rgbMatch[3]),
      rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
    ];
  }
  return null;
}

function luminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrastRatio(lum1: number, lum2: number): number {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

function blend(fg: [number, number, number, number], bg: [number, number, number, number]): [number, number, number, number] {
  const alpha = fg[3];
  const invAlpha = 1 - alpha;
  return [
    Math.round(fg[0] * alpha + bg[0] * invAlpha),
    Math.round(fg[1] * alpha + bg[1] * invAlpha),
    Math.round(fg[2] * alpha + bg[2] * invAlpha),
    1,
  ];
}

function getEffectiveBackgroundColor(el: HTMLElement | null): [number, number, number, number] | 'gradient' {
  let curr: HTMLElement | null = el;
  let currentColor: [number, number, number, number] = [0, 0, 0, 0];

  const isDark = document.documentElement.classList.contains('dark');
  const baseCanvas: [number, number, number, number] = isDark ? [7, 11, 20, 1] : [248, 250, 252, 1];

  while (curr && curr !== document.documentElement) {
    const style = window.getComputedStyle(curr);
    const bgImg = style.backgroundImage;
    if (bgImg && bgImg !== 'none' && bgImg.includes('gradient')) {
      // If element has text-transparent with bg-clip: text, that is gradient text, not background
      const isClipText = style.webkitBackgroundClip === 'text' || style.backgroundClip === 'text';
      if (!isClipText) {
        return 'gradient';
      }
    }

    const parsed = parseColor(style.backgroundColor);
    if (parsed && parsed[3] > 0) {
      if (currentColor[3] === 0) {
        currentColor = parsed;
      } else {
        currentColor = blend(currentColor, parsed);
      }
      if (currentColor[3] >= 0.99) {
        return currentColor;
      }
    }
    curr = curr.parentElement;
  }

  return currentColor[3] > 0 ? blend(currentColor, baseCanvas) : baseCanvas;
}

function getUniqueSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  let path: string[] = [];
  let curr: HTMLElement | null = el;
  while (curr && curr.nodeType === Node.ELEMENT_NODE && curr !== document.body) {
    let selector = curr.nodeName.toLowerCase();
    if (curr.className && typeof curr.className === 'string') {
      const classes = curr.className
        .trim()
        .split(/\s+/)
        .filter((c) => !c.includes(':') && !c.includes('/') && !c.includes('['))
        .slice(0, 2);
      if (classes.length) selector += '.' + classes.join('.');
    }
    path.unshift(selector);
    curr = curr.parentElement;
    if (path.length >= 3) break;
  }
  return path.join(' > ');
}

export function auditContrast(): { totalChecked: number; passed: number; failures: ContrastFailure[]; gradients: number } {
  const elements = Array.from(document.querySelectorAll<HTMLElement>('*'));
  const failures: ContrastFailure[] = [];
  let totalChecked = 0;
  let passed = 0;
  let gradients = 0;

  for (const el of elements) {
    // Check if visible and has direct text
    if (!el.offsetParent && el.tagName !== 'BODY') continue;
    const hasDirectText = Array.from(el.childNodes).some(
      (n) => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim().length > 0
    );
    if (!hasDirectText) continue;

    const text = (el.innerText || el.textContent || '').trim().slice(0, 40);
    if (!text) continue;

    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) < 0.1) continue;

    // Skip transparent text / clip-text gradients
    if (style.webkitBackgroundClip === 'text' || style.color === 'transparent' || style.color === 'rgba(0, 0, 0, 0)') {
      continue;
    }

    const fgColor = parseColor(style.color);
    if (!fgColor) continue;

    const bg = getEffectiveBackgroundColor(el);
    if (bg === 'gradient') {
      gradients++;
      continue;
    }

    totalChecked++;

    const fgLum = luminance(fgColor[0], fgColor[1], fgColor[2]);
    const bgLum = luminance(bg[0], bg[1], bg[2]);
    const ratio = Math.round(contrastRatio(fgLum, bgLum) * 100) / 100;

    const fontSize = parseFloat(style.fontSize);
    const isBold = parseInt(style.fontWeight, 10) >= 600 || style.fontWeight === 'bold';
    const isLarge = fontSize >= 18 || (fontSize >= 14 && isBold);

    // WCAG AA requirement: 4.5:1 for normal text, 3:1 for large text
    const minRatio = isLarge ? 3.0 : 4.5;

    if (ratio < minRatio) {
      failures.push({
        selector: getUniqueSelector(el),
        text,
        color: style.color,
        backgroundColor: `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`,
        ratio,
        expected: minRatio,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        type: isLarge ? 'large' : 'body',
      });
    } else {
      passed++;
    }
  }

  console.group(`[Contrast Audit] Checked ${totalChecked} text elements`);
  console.log(`✓ Passed: ${passed} | ✗ Failures: ${failures.length} | Gradients (manual check): ${gradients}`);
  if (failures.length > 0) {
    console.table(failures);
  }
  console.groupEnd();

  return { totalChecked, passed, failures, gradients };
}

export function setupContrastAuditor() {
  if (typeof window !== 'undefined') {
    (window as any).__auditContrast = auditContrast;
  }
}
