// Run once: node scripts/gen-brand-assets.mjs
// Generates favicon PNGs, ICO, apple-touch-icon, and OG image from the VegaStar mark.
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const AMBER_TOP = '#FBBF24'
const AMBER_BOT = '#F59E0B'
const DARK_BG   = '#0a0a0a'

// VegaStar path, normalised to a 32x32 viewBox
const STAR_PATH = 'M 16 1 L 20 13 L 29 16 L 20 19 L 16 29 L 12 19 L 3 16 L 12 13 Z'

function starSvg(size, bgFill = null) {
  const sc = size / 32
  const gradY1 = sc       // top of star (y=1 scaled)
  const gradY2 = 29 * sc  // bottom of star (y=29 scaled)
  const bg = bgFill
    ? `<rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="${bgFill}"/>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="${size / 2}" y1="${gradY1}" x2="${size / 2}" y2="${gradY2}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${AMBER_TOP}"/>
      <stop offset="100%" stop-color="${AMBER_BOT}"/>
    </linearGradient>
  </defs>
  ${bg}
  <g transform="scale(${sc})">
    <path d="${STAR_PATH}" fill="url(#g)"/>
  </g>
</svg>`
}

function ogImageSvg() {
  // 1200x630, dark bg, star at 120px centered-left, wordmark + tagline
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="sg">
      <stop offset="0%" stop-color="${AMBER_TOP}"/>
      <stop offset="100%" stop-color="${AMBER_BOT}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${AMBER_TOP}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${AMBER_TOP}" stop-opacity="0"/>
    </radialGradient>
    <symbol id="star" viewBox="0 0 32 32">
      <path d="${STAR_PATH}" fill="url(#sg)"/>
    </symbol>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="${DARK_BG}"/>

  <!-- Subtle top + bottom borders -->
  <rect x="0" y="0" width="1200" height="1" fill="${AMBER_BOT}" opacity="0.15"/>
  <rect x="0" y="629" width="1200" height="1" fill="${AMBER_BOT}" opacity="0.15"/>

  <!-- Amber glow behind logo mark -->
  <ellipse cx="155" cy="315" rx="155" ry="155" fill="url(#glow)"/>

  <!-- Star mark 120×120, centered at (155, 315) -->
  <use href="#star" x="95" y="255" width="120" height="120"/>

  <!-- Wordmark -->
  <text
    x="242"
    y="342"
    font-family="Arial,Helvetica,sans-serif"
    font-size="80"
    font-weight="bold"
    letter-spacing="-2"
    fill="white"
  >Vega<tspan fill="${AMBER_TOP}" font-weight="normal">ply</tspan></text>

  <!-- Tagline -->
  <text
    x="244"
    y="390"
    font-family="Arial,Helvetica,sans-serif"
    font-size="25"
    font-weight="normal"
    fill="rgba(255,255,255,0.42)"
    letter-spacing="0.4"
  >AI-powered job search that actually works</text>
</svg>`
}

function buildIco(pngBuffer, w, h) {
  // ICO wrapping a single PNG image (supported in all modern browsers)
  const imageOffset = 6 + 16 // header + one dir entry
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: ICO
  header.writeUInt16LE(1, 4) // count: 1
  const dir = Buffer.alloc(16)
  dir.writeUInt8(w === 256 ? 0 : w, 0)
  dir.writeUInt8(h === 256 ? 0 : h, 1)
  dir.writeUInt8(0, 2) // colorCount
  dir.writeUInt8(0, 3) // reserved
  dir.writeUInt16LE(1, 4)  // planes
  dir.writeUInt16LE(32, 6) // bitCount
  dir.writeUInt32LE(pngBuffer.length, 8)
  dir.writeUInt32LE(imageOffset, 12)
  return Buffer.concat([header, dir, pngBuffer])
}

async function main() {
  // favicon-16x16.png
  await sharp(Buffer.from(starSvg(16))).png().toFile('public/favicon-16x16.png')
  console.log('✓ public/favicon-16x16.png')

  // favicon-32x32.png
  await sharp(Buffer.from(starSvg(32))).png().toFile('public/favicon-32x32.png')
  console.log('✓ public/favicon-32x32.png')

  // apple-touch-icon.png — 180x180 with dark background (iOS doesn't handle transparency well)
  await sharp(Buffer.from(starSvg(180, DARK_BG))).png().toFile('public/apple-touch-icon.png')
  console.log('✓ public/apple-touch-icon.png')

  // favicon.ico — 32x32 PNG wrapped in ICO format
  const png32 = await sharp(Buffer.from(starSvg(32))).png().toBuffer()
  writeFileSync('public/favicon.ico', buildIco(png32, 32, 32))
  console.log('✓ public/favicon.ico')

  // Also write to app/favicon.ico — Next.js serves app/ special files directly
  writeFileSync('app/favicon.ico', buildIco(png32, 32, 32))
  console.log('✓ app/favicon.ico')

  // og-image.png — 1200x630
  await sharp(Buffer.from(ogImageSvg())).png().toFile('public/og-image.png')
  console.log('✓ public/og-image.png')

  // vegaply-icon.svg — update standalone SVG source (referenced by legacy paths)
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <linearGradient id="g" x1="16" y1="1" x2="16" y2="29" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${AMBER_TOP}"/>
      <stop offset="100%" stop-color="${AMBER_BOT}"/>
    </linearGradient>
  </defs>
  <path d="${STAR_PATH}" fill="url(#g)"/>
</svg>`
  writeFileSync('public/vegaply-icon.svg', svgContent)
  console.log('✓ public/vegaply-icon.svg')

  console.log('\nAll brand assets generated.')
}

main().catch((err) => { console.error(err); process.exit(1) })
