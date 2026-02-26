#!/usr/bin/env node
/**
 * generate-pwa-icons.mjs
 * Generates all required PWA icon sizes from a base SVG.
 * Uses built-in Node canvas-free approach: renders SVG → PNG at each size.
 *
 * Usage: node scripts/generate-pwa-icons.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(ROOT, 'public', 'icons');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// TW Stock branded icon SVG with dark background
function createBrandedSvg(size) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#0f0f1a"/>
  <rect x="24" y="24" width="464" height="464" rx="48" fill="none" stroke="#00d4aa" stroke-width="4" opacity="0.3"/>
  <!-- Chart bars -->
  <rect x="96" y="320" width="48" height="80" rx="6" fill="#00d4aa" opacity="0.6"/>
  <rect x="176" y="260" width="48" height="140" rx="6" fill="#00d4aa" opacity="0.7"/>
  <rect x="256" y="200" width="48" height="200" rx="6" fill="#00d4aa" opacity="0.8"/>
  <rect x="336" y="160" width="48" height="240" rx="6" fill="#00d4aa" opacity="0.9"/>
  <!-- Trend line -->
  <polyline points="120,300 200,240 280,180 360,140" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
  <circle cx="360" cy="140" r="8" fill="#ffffff"/>
  <!-- Text -->
  <text x="256" y="460" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="56" font-weight="900" fill="#ffffff" letter-spacing="4">TWStock</text>
  <!-- Arrow up -->
  <polygon points="400,120 420,150 410,150 410,180 390,180 390,150 380,150" fill="#22c55e" opacity="0.8"/>
</svg>`;
}

async function main() {
    // Create icons directory
    if (!fs.existsSync(ICONS_DIR)) {
        fs.mkdirSync(ICONS_DIR, { recursive: true });
        console.log('📁 Created public/icons/');
    }

    // Try to use sharp if available
    let useSharp = false;
    let sharp;
    try {
        sharp = (await import('sharp')).default;
        useSharp = true;
        console.log('✅ Using sharp for high-quality PNG conversion');
    } catch {
        console.log('⚠️  sharp not available, saving SVG icons as fallback');
    }

    for (const size of SIZES) {
        const svgContent = createBrandedSvg(size);
        const outPath = path.join(ICONS_DIR, `icon-${size}.png`);

        if (useSharp) {
            try {
                await sharp(Buffer.from(svgContent)).resize(size, size).png().toFile(outPath);
                console.log(`  ✅ icon-${size}.png (${size}x${size})`);
            } catch (err) {
                // Fallback: save as SVG
                const svgPath = path.join(ICONS_DIR, `icon-${size}.svg`);
                fs.writeFileSync(svgPath, svgContent);
                console.log(`  ⚠️  icon-${size}.svg (sharp failed, saved SVG)`);
            }
        } else {
            // Save SVG versions (browsers can use svg icons too)
            const svgPath = path.join(ICONS_DIR, `icon-${size}.svg`);
            fs.writeFileSync(svgPath, svgContent);
            console.log(`  📦 icon-${size}.svg (${size}x${size})`);
        }
    }

    // Also create a screenshots placeholder
    const screenshotsDir = path.join(ROOT, 'public', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
        console.log('📁 Created public/screenshots/');
    }

    // Create stocks shortcut icon
    const stocksIconSvg = createBrandedSvg(96);
    const stocksIconPath = path.join(ICONS_DIR, 'stocks.svg');
    fs.writeFileSync(stocksIconPath, stocksIconSvg);

    const portfolioIconPath = path.join(ICONS_DIR, 'portfolio.svg');
    fs.writeFileSync(portfolioIconPath, stocksIconSvg);

    console.log('\n🎉 PWA icons generated successfully!');
    if (!useSharp) {
        console.log('💡 For PNG icons, install sharp: npm install -D sharp');
        console.log('   Then re-run: node scripts/generate-pwa-icons.mjs');
    }
}

main().catch(console.error);
