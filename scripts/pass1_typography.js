const fs = require('fs');
const FILE = 'app/(protected)/home/page.tsx';
let content = fs.readFileSync(FILE, 'utf8');

let fsCt = 0, fwCt = 0, lsCt = 0;

function fsToken(px) {
  const n = parseFloat(String(px));
  if (n <= 11.5) return 'var(--text-xs)';
  if (n <= 13.5) return 'var(--text-sm)';
  if (n <= 15.5) return 'var(--text-base)';
  if (n <= 19)   return 'var(--text-md)';
  if (n <= 24)   return 'var(--text-lg)';
  if (n <= 34)   return 'var(--text-xl)';
  return 'var(--text-2xl)';
}

function lsToken(raw) {
  const s = String(raw).trim();
  if (/^-/.test(s)) return 'var(--ls-tight)';
  const n = parseFloat(s);
  if (isNaN(n) || n === 0) return 'var(--ls-normal)';
  if (n <= 0.2)  return 'var(--ls-normal)';
  if (n <= 0.8)  return 'var(--ls-wide)';
  return 'var(--ls-wider)';
}

// ── STEP 1: Add letter-spacing tokens to :root after --text-3xl ──────────────
const LS_BLOCK = [
  '',
  '          --ls-tight:  -0.02em;',
  '          --ls-normal: 0em;',
  '          --ls-wide:   0.05em;',
  '          --ls-wider:  0.1em;',
].join('\n');
content = content.replace(/(--text-3xl:\s*56px;)/, `$1${LS_BLOCK}`);

// ── STEP 2: CSS font-size:Xpx → token ────────────────────────────────────────
content = content.replace(/font-size:(\d+\.?\d*)px/g, (m, px) => {
  fsCt++;
  return `font-size:${fsToken(px)}`;
});

// ── STEP 3: JSX fontSize:X (bare number literal) ─────────────────────────────
content = content.replace(/fontSize:(\d+\.?\d*)(?=[,}\s])/g, (m, px) => {
  fsCt++;
  return `fontSize:'${fsToken(px)}'`;
});

// ── STEP 4: JSX fontSize:"Xpx" or fontSize:'Xpx' ─────────────────────────────
content = content.replace(/fontSize:["'](\d+\.?\d*)px["']/g, (m, px) => {
  fsCt++;
  return `fontSize:'${fsToken(px)}'`;
});

// ── STEP 4b: SVG fontSize="X" attribute ──────────────────────────────────────
content = content.replace(/fontSize="(\d+\.?\d*)"/g, (m, px) => {
  fsCt++;
  const inner = fsToken(px).replace(/^var\((.+)\)$/, '$1');
  return `fontSize="var(${inner})"`;
});

// ── STEP 5: CSS font-weight:(650|750|800|900) ─────────────────────────────────
content = content.replace(/font-weight:(900|800|750|650)/g, (m, w) => {
  fwCt++;
  return `font-weight:${w === '650' ? '600' : '700'}`;
});

// ── STEP 6: JSX fontWeight:(650|750|800|900) bare number ─────────────────────
content = content.replace(/fontWeight:(900|800|750|650)(?=[,}\s])/g, (m, w) => {
  fwCt++;
  return `fontWeight:${w === '650' ? '600' : '700'}`;
});

// ── STEP 7: SVG fontWeight="800|900" attribute ────────────────────────────────
content = content.replace(/fontWeight="(900|800)"/g, () => { fwCt++; return 'fontWeight="700"'; });

// ── STEP 8: CSS letter-spacing:Xpx ───────────────────────────────────────────
content = content.replace(/letter-spacing:(-?\.?\d+\.?\d*px)/g, (m, val) => {
  lsCt++;
  return `letter-spacing:${lsToken(val)}`;
});

// ── STEP 9: JSX letterSpacing:"Xpx" or 'Xpx' (handles -.2px form) ────────────
content = content.replace(/letterSpacing:["'](-?\.?\d+\.?\d*px)["']/g, (m, val) => {
  lsCt++;
  return `letterSpacing:'${lsToken(val)}'`;
});

// ── STEP 10: JSX letterSpacing:X (bare number literal) ───────────────────────
content = content.replace(/letterSpacing:(-?\.?\d+\.?\d*)(?=[,}\s])/g, (m, val) => {
  lsCt++;
  return `letterSpacing:'${lsToken(val)}'`;
});

fs.writeFileSync(FILE, content, 'utf8');
console.log('Font-size replacements : ' + fsCt);
console.log('Font-weight replacements: ' + fwCt);
console.log('Letter-spacing replacements: ' + lsCt);
console.log('Total: ' + (fsCt + fwCt + lsCt));
