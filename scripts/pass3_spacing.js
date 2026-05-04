const fs = require('fs');
const FILE = 'app/(protected)/home/page.tsx';
let content = fs.readFileSync(FILE, 'utf8');

let spacingCt = 0;

// Space token scale (8px grid):
// --space-1:  4px
// --space-2:  8px
// --space-3:  12px
// --space-4:  16px
// --space-5:  20px
// --space-6:  24px
// --space-8:  32px
// --space-10: 40px
// --space-12: 48px
// --space-16: 64px

// Map pixel value → token (return null if no good match)
function spaceToken(px) {
  const n = parseInt(px, 10);
  const map = { 4:'--space-1', 8:'--space-2', 12:'--space-3', 16:'--space-4',
                20:'--space-5', 24:'--space-6', 32:'--space-8', 40:'--space-10',
                48:'--space-12', 64:'--space-16' };
  return map[n] ? `var(${map[n]})` : null;
}

// ── STEP 1: Protect :root block ───────────────────────────────────────────────
const rootRegex = /(:root\s*\{)([\s\S]*?)(\})/;
const rootMatch = content.match(rootRegex);
if (!rootMatch) { console.error('Could not find :root block'); process.exit(1); }

const rootBlock = rootMatch[0];
const rootStart = content.indexOf(rootBlock);
const beforeRoot = content.slice(0, rootStart);
const afterRoot  = content.slice(rootStart + rootBlock.length);
let rest = beforeRoot + '___ROOT_PLACEHOLDER___' + afterRoot;

// ── STEP 2: CSS shorthand-safe replacements ───────────────────────────────────
// Only replace when the pixel value appears as a standalone spacing value in
// CSS properties: padding, margin, gap, top, right, bottom, left, width, height
// where it's a simple Xpx value (not part of a compound like "4px 8px").
// We target: padding:Xpx, gap:Xpx, margin:Xpx, margin-top/right/bottom/left, etc.

const CSS_PROPS = 'padding|margin|gap|top|right|bottom|left|padding-top|padding-right|padding-bottom|padding-left|margin-top|margin-right|margin-bottom|margin-left|row-gap|column-gap';
const cssPropRe = new RegExp(`(?<=(${CSS_PROPS}):)(\\d+)px(?=[;,}\\s])`, 'g');

rest = rest.replace(cssPropRe, (m, _prop, px) => {
  const t = spaceToken(px);
  if (t) { spacingCt++; return t; }
  return m;
});

// ── STEP 3: JSX style object — single-value spacing properties ────────────────
// Matches: gap:8, padding:16, marginTop:12, etc. (bare numbers in JSX style objects)
// Targets only known spacing prop names (camelCase for JSX)
const JSX_PROPS = 'gap|padding|margin|top|right|bottom|left|paddingTop|paddingRight|paddingBottom|paddingLeft|marginTop|marginRight|marginBottom|marginLeft|rowGap|columnGap';
const jsxPropRe = new RegExp(`(?<=(${JSX_PROPS}):)(\\d+)(?=[,}\\s])`, 'g');

rest = rest.replace(jsxPropRe, (m, _prop, px) => {
  const t = spaceToken(px);
  if (t) { spacingCt++; return `'${t}'`; }
  return m;
});

// ── STEP 4: JSX style object — string "Xpx" spacing values ───────────────────
const jsxStrRe = new RegExp(`(?<=(${JSX_PROPS}):["'])(\\d+)px(?=["'])`, 'g');

rest = rest.replace(jsxStrRe, (m, _prop, px) => {
  const t = spaceToken(px);
  if (t) { spacingCt++; return t; }
  return m;
});

// ── STEP 5: Restore :root ─────────────────────────────────────────────────────
content = rest.replace('___ROOT_PLACEHOLDER___', rootBlock);

fs.writeFileSync(FILE, content, 'utf8');
console.log('Spacing replacements: ' + spacingCt);
