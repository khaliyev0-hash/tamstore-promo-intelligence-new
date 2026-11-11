import fs from 'fs';

const cssPath = 'frontend/src/index.css';
let css = fs.readFileSync(cssPath, 'utf-8');

// Ensure CRLF or LF compatibility
css = css.replace(/\r\n/g, '\n');

// 1. Remove duplicate html, body, scrollbar from lines 196-235 if present
const duplicateOldHeader = `html {
  zoom: 80%;
  width: 100%;
  height: calc(100vh / 0.8);
  min-height: calc(100vh / 0.8);
  background-color: #f8fafc;
}

body, #root {
  width: 100%;
  height: 100%;
  min-height: 100%;
  margin: 0;
  padding: 0;
  background-color: #f8fafc;
}

@layer base {
  body {
    @apply bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white;
  }
}

/* Custom Light Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #f1f5f9;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}`;

css = css.replace(duplicateOldHeader, '');

// 2. Add bg-white/85 to dark overrides
css = css.replace(
  `html.dark .bg-white,\nhtml.dark .bg-white\\/90,\nhtml.dark .bg-white\\/95,\nhtml.dark .bg-white\\/80 {`,
  `html.dark .bg-white,\nhtml.dark .bg-white\\/95,\nhtml.dark .bg-white\\/90,\nhtml.dark .bg-white\\/85,\nhtml.dark .bg-white\\/80,\nhtml.dark .bg-white\\/75 {`
);

// 3. Ensure color-scheme is in html.dark
css = css.replace(
  `html.dark body {\n  background-color: #070b14;\n}\nhtml.dark html {\n  background-color: #070b14;\n}`,
  `html.dark body {\n  background-color: var(--surface);\n  color: var(--fg);\n}\nhtml.dark html {\n  background-color: var(--surface);\n  color-scheme: dark;\n}`
);

fs.writeFileSync(cssPath, css, 'utf-8');
console.log('Cleaned and updated index.css successfully');
