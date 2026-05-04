const fs = require('fs');
const FILE = 'app/(protected)/home/page.tsx';
let content = fs.readFileSync(FILE, 'utf8');

let textCt = 0, goldCt = 0, cyanCt = 0, emeraldCt = 0;

function goldToken(op) {
  const n = parseFloat(op);
  if (n <= 0.07) return 'var(--gold-dim)';
  if (n <= 0.11) return 'var(--gold-bg)';
  if (n <= 0.14) return 'var(--gold-subtle)';
  if (n <= 0.22) return 'var(--gold-border)';
  if (n <= 0.35) return 'var(--gold-glow)';
  if (n <= 0.55) return 'var(--gold-muted)';
  return 'var(--gold-text)';
}

function cyanToken(op) {
  const n = parseFloat(op);
  if (n <= 0.07) return 'var(--cyan-dim)';
  if (n <= 0.11) return 'var(--cyan-bg)';
  if (n <= 0.14) return 'var(--cyan-subtle)';
  if (n <= 0.22) return 'var(--cyan-border)';
  if (n <= 0.35) return 'var(--cyan-glow)';
  if (n <= 0.55) return 'var(--cyan-muted)';
  return 'var(--cyan-text)';
}

function textTier(op) {
  const n = parseFloat(op);
  if (n >= 0.75) return 'var(--text-primary)';
  if (n >= 0.55) return 'var(--text-secondary)';
  if (n >= 0.35) return 'var(--text-tertiary)';
  if (n >= 0.14) return 'var(--text-disabled)';
  return null;
}

// ── STEP 1: Extract :root block, update tokens, add new ones ──────────────────
const rootRegex = /(:root\s*\{)([\s\S]*?)(\})/;
const rootMatch = content.match(rootRegex);
if (!rootMatch) { console.error('Could not find :root block'); process.exit(1); }

let rootBlock = rootMatch[0];
const rootStart = content.indexOf(rootBlock);
const beforeRoot = content.slice(0, rootStart);
const afterRoot  = content.slice(rootStart + rootBlock.length);

// Update text tokens from hex to rgba opacity scale
rootBlock = rootBlock
  .replace('--text-primary:   #f5f5f7;',  '--text-primary:   rgba(255,255,255,0.95);')
  .replace('--text-secondary: #a1a1aa;', '--text-secondary: rgba(255,255,255,0.65);')
  .replace('--text-tertiary:  #6b6b75;', '--text-tertiary:  rgba(255,255,255,0.45);')
  .replace('--text-disabled:  #404048;', '--text-disabled:  rgba(255,255,255,0.28);');

// Add gold opacity tokens after --gold-glow
const goldAdditions = [
  '',
  '          --gold-dim:    rgba(245,158,11,0.06);',
  '          --gold-bg:     rgba(245,158,11,0.10);',
  '          --gold-border: rgba(245,158,11,0.20);',
  '          --gold-muted:  rgba(245,158,11,0.45);',
  '          --gold-text:   rgba(245,158,11,0.70);',
].join('\n');
rootBlock = rootBlock.replace(
  '--gold-glow:    rgba(245,158,11,0.25);',
  '--gold-glow:    rgba(245,158,11,0.25);' + goldAdditions
);

// Add cyan opacity tokens after --cyan-glow
const cyanAdditions = [
  '',
  '          --cyan-dim:    rgba(6,182,212,0.06);',
  '          --cyan-bg:     rgba(6,182,212,0.10);',
  '          --cyan-border: rgba(6,182,212,0.20);',
  '          --cyan-muted:  rgba(6,182,212,0.45);',
  '          --cyan-text:   rgba(6,182,212,0.70);',
].join('\n');
rootBlock = rootBlock.replace(
  '--cyan-glow:    rgba(6,182,212,0.25);',
  '--cyan-glow:    rgba(6,182,212,0.25);' + cyanAdditions
);

// ── STEP 2: Work on content outside :root to avoid circular references ─────────
let rest = beforeRoot + '___ROOT_PLACEHOLDER___' + afterRoot;

// 2a. CSS: color:rgba(255,255,255,X) — text colors only
rest = rest.replace(/(?<=color:)rgba\(255,255,255,(0\.\d+)\)/g, (m, op) => {
  const t = textTier(op);
  if (t) { textCt++; return t; }
  return m;
});

// 2b. JSX: color:"rgba(255,255,255,X)" or color:'rgba(255,255,255,X)'
rest = rest.replace(/(?<=color:["'])rgba\(255,255,255,(0\.\d+)\)(?=["'])/g, (m, op) => {
  const t = textTier(op);
  if (t) { textCt++; return t; }
  return m;
});

// 2c. All rgba(245,158,11,X) → gold tokens
rest = rest.replace(/rgba\(245,158,11,(0?\.?\d+)\)/g, (m, op) => {
  goldCt++;
  return goldToken(op);
});

// 2d. All rgba(6,182,212,X) → cyan tokens
rest = rest.replace(/rgba\(6,182,212,(0?\.?\d+)\)/g, (m, op) => {
  cyanCt++;
  return cyanToken(op);
});

// 2e. rgba(16,185,129,X) → success tokens (low opacity only)
rest = rest.replace(/rgba\(16,185,129,(0\.\d+)\)/g, (m, op) => {
  const n = parseFloat(op);
  if (n <= 0.18) { emeraldCt++; return 'var(--success-subtle)'; }
  return m;
});

// ── STEP 3: Restore :root block ────────────────────────────────────────────────
content = rest.replace('___ROOT_PLACEHOLDER___', rootBlock);

fs.writeFileSync(FILE, content, 'utf8');
console.log('Text-color replacements : ' + textCt);
console.log('Gold token replacements : ' + goldCt);
console.log('Cyan token replacements : ' + cyanCt);
console.log('Emerald replacements    : ' + emeraldCt);
console.log('Total                   : ' + (textCt + goldCt + cyanCt + emeraldCt));
