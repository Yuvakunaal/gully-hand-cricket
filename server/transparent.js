const sharp = require('sharp');
const fs = require('fs');

async function processImage() {
  const input = '/Users/kunaal/.gemini/antigravity/brain/fc81eb8a-3f60-4963-afa0-1570fa0dbd6e/media__1776626056740.png';
  const output = '/Applications/Hand Cricket/client/public/favicon.png';
  
  if (!fs.existsSync(input)) {
    console.log("No input found");
    return;
  }
  
  try {
    const { data, info } = await sharp(input)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let modified = false;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      const a = data[i+3];
      
      // If it's pure white, hide it
      // Also apply some basic tolerance for the anti-aliased halo (e.g. above 230)
      if (r > 240 && g > 240 && b > 240) {
        data[i+3] = 0; // alpha to 0
        modified = true;
      } else if (r > 200 && g > 200 && b > 200 && r === g && g === b) {
        // Soft edge handling - fade it out slightly
        data[i+3] = Math.max(0, a - 150);
        modified = true;
      }
    }

    await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
    .png()
    .toFile(output);
    console.log("Image saved to", output);
  } catch (err) {
    console.error("Error processing:", err);
  }
}

processImage();
