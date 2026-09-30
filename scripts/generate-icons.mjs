// Renders the app icons from one SVG. Run after changing the logo: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { writeFile } from 'fs/promises';

const box = (stroke) => `
  <path d="M13 21l11-6 11 6v11l-11 6-11-6z" fill="none" stroke="${stroke}" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M13 21l11 6 11-6M24 27v11" fill="none" stroke="${stroke}" stroke-width="2.6" stroke-linejoin="round"/>`;

// Rounded tile (favicon, apple) and full-bleed square (maskable: the OS applies its own mask).
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="0" y="0" width="48" height="48" rx="11" fill="#0f766e"/>${box('#ffffff')}</svg>`;
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -8 64 64"><rect x="-8" y="-8" width="64" height="64" fill="#0f766e"/>${box('#ffffff')}</svg>`;

await writeFile('src/app/icon.svg', rounded);
await sharp(Buffer.from(rounded)).resize(192, 192).png().toFile('public/icons/icon-192.png');
await sharp(Buffer.from(rounded)).resize(512, 512).png().toFile('public/icons/icon-512.png');
await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile('public/icons/maskable-512.png');
// iOS ignores transparency and rounds corners itself: use the full-bleed variant.
await sharp(Buffer.from(maskable)).resize(180, 180).png().toFile('src/app/apple-icon.png');
console.log('icons written');
