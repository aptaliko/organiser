// Renders every app icon — web/PWA and the Android app — from one SVG, so they always match.
// Run after changing the logo: node scripts/generate-icons.mjs
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

// ---- Android (Capacitor shell) -------------------------------------------------------------
const RES = 'android/app/src/main/res';
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const circle = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#0f766e"/>${box('#ffffff')}</svg>`;
// Adaptive-icon foreground: 108dp canvas, only the centre 66dp is guaranteed visible.
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-22 -22 92 92">${box('#ffffff')}</svg>`;

for (const [density, scale] of Object.entries(DENSITIES)) {
  const dir = `${RES}/mipmap-${density}`;
  await sharp(Buffer.from(rounded)).resize(48 * scale, 48 * scale).png().toFile(`${dir}/ic_launcher.png`);
  await sharp(Buffer.from(circle)).resize(48 * scale, 48 * scale).png().toFile(`${dir}/ic_launcher_round.png`);
  await sharp(Buffer.from(foreground)).resize(108 * scale, 108 * scale).png().toFile(`${dir}/ic_launcher_foreground.png`);
}
await writeFile(
  `${RES}/values/ic_launcher_background.xml`,
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0F766E</color>\n</resources>\n`,
);

// Splash: the logo tile centred on the app background, for every size the template ships.
const SPLASHES = {
  drawable: [480, 320],
  'drawable-port-mdpi': [320, 480], 'drawable-port-hdpi': [480, 800], 'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600], 'drawable-port-xxxhdpi': [1280, 1920],
  'drawable-land-mdpi': [480, 320], 'drawable-land-hdpi': [800, 480], 'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960], 'drawable-land-xxxhdpi': [1920, 1280],
};
for (const [dir, [w, h]] of Object.entries(SPLASHES)) {
  const size = Math.round(Math.min(w, h) * 0.28);
  const logo = await sharp(Buffer.from(rounded)).resize(size, size).png().toBuffer();
  await sharp({ create: { width: w, height: h, channels: 4, background: '#f6f7f9' } })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(`${RES}/${dir}/splash.png`);
}
console.log('icons written');
