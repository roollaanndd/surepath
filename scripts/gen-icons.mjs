import sharp from 'sharp';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

// Modified SVG: white background, light emerald shield body, dark emerald stroke/checkmark
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <!-- White background -->
  <rect width="64" height="64" fill="#ffffff"/>
  <!-- Shield body: light emerald fill, dark emerald stroke -->
  <path d="M32 4L54 13V30C54 44 44 54 32 60C20 54 10 44 10 30V13L32 4Z"
    fill="#f0fdf4" stroke="#16a34a" stroke-width="2" stroke-linejoin="round"/>
  <!-- Shield inner highlight -->
  <path d="M32 10L49 17.5V30C49 41 41 49.5 32 54C23 49.5 15 41 15 30V17.5L32 10Z"
    fill="#16a34a" fill-opacity="0.15"/>
  <!-- Checkmark -->
  <path d="M22 31L28 37L42 24"
    stroke="#16a34a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const svgBuffer = Buffer.from(iconSvg);

async function generateIcon(outputPath, size) {
  await sharp(svgBuffer, { density: Math.ceil((size / 64) * 72) })
    .resize(size, size)
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(outputPath);
  console.log(`Generated: ${outputPath} (${size}x${size})`);
}

async function main() {
  const icons = [
    { file: 'pwa-192x192.png', size: 192 },
    { file: 'pwa-512x512.png', size: 512 },
    { file: 'pwa-maskable-512.png', size: 512 },
    { file: 'apple-touch-icon.png', size: 180 },
  ];

  for (const { file, size } of icons) {
    await generateIcon(path.join(publicDir, file), size);
  }

  console.log('All PWA icons generated successfully.');
}

main().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
