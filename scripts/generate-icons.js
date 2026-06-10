// This script uses sharp to generate all icon sizes
// Run: npm install sharp --save-dev
// Then: node scripts/generate-icons.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(process.cwd(), 'public/icons/icon.svg');
const outputDir = path.join(process.cwd(), 'public/icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    await sharp(inputSvg)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated: icon-${size}x${size}.png`);
  }
  
  // Generate apple-touch-icon (180x180)
  await sharp(inputSvg)
    .resize(180, 180)
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));
  console.log('Generated: apple-touch-icon.png');
  
  // Generate favicon.ico (multiple sizes)
  const faviconSizes = [16, 32, 48];
  const faviconBuffers = [];
  
  for (const size of faviconSizes) {
    const buffer = await sharp(inputSvg)
      .resize(size, size)
      .toBuffer();
    faviconBuffers.push({ buffer, size });
  }
  
  // Note: For .ico files you'd need extra libraries
  // Just using PNG favicon is simpler and works in modern browsers
  await sharp(inputSvg)
    .resize(32, 32)
    .toFile(path.join(process.cwd(), 'public/favicon.png'));
  console.log('Generated: favicon.png');
  
  // Also create favicon.ico manually or just use the PNG
  // Most modern browsers support PNG favicons
  fs.copyFileSync(
    path.join(process.cwd(), 'public/favicon.png'),
    path.join(process.cwd(), 'public/favicon.ico')
  );
}

generateIcons().catch(console.error);