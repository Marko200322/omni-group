#!/usr/bin/env node
/**
 * Converts SVG avatar portraits to PNG for HeyGen/D-ID talking_photo APIs.
 * Usage: node scripts/generate-avatar-portraits-png.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const portraitsDir = path.join(repoRoot, 'apps', 'omnigroup-web', 'public', 'avatars', 'portraits');

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('Install sharp first: npm install --no-save sharp');
    process.exit(1);
  }

  const svgs = fs.readdirSync(portraitsDir).filter((f) => f.endsWith('.svg'));
  if (!svgs.length) {
    console.log('No SVG portraits found.');
    return;
  }

  for (const file of svgs) {
    const svgPath = path.join(portraitsDir, file);
    const pngPath = path.join(portraitsDir, file.replace(/\.svg$/i, '.png'));
    const svg = fs.readFileSync(svgPath);
    await sharp(svg, { density: 300 })
      .resize(512, 512, { fit: 'cover' })
      .png()
      .toFile(pngPath);
    console.log('Wrote', path.relative(repoRoot, pngPath));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
