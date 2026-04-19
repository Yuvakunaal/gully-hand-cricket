const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const HANDS_DIR = path.join(__dirname, 'client/public/assets/hands');
const THRESHOLD = 230; // pixels with R,G,B all above this become transparent

async function removeWhiteBg(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // If pixel is near-white, make it transparent
    if (r > THRESHOLD && g > THRESHOLD && b > THRESHOLD) {
      data[i + 3] = 0; // set alpha to 0
    }
    // Also handle light gray checkerboard patterns (from "transparent" renders)
    if (r > 200 && g > 200 && b > 200 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15) {
      data[i + 3] = 0;
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(filePath + '.tmp');

  fs.renameSync(filePath + '.tmp', filePath);
  console.log(`✅ Processed: ${filePath}`);
}

async function main() {
  const colors = ['blue', 'red'];
  for (const color of colors) {
    for (let i = 0; i <= 6; i++) {
      const filePath = path.join(HANDS_DIR, color, `${i}.png`);
      if (fs.existsSync(filePath)) {
        await removeWhiteBg(filePath);
      }
    }
  }
  console.log('\n🎉 All hand images processed!');
}

main().catch(console.error);
