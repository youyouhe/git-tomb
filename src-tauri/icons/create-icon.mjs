import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import PngToIco from 'png-to-ico';

async function createIcon() {
  const svgPath = path.join(import.meta.dirname, 'app-icon.svg');
  const icoPath = path.join(import.meta.dirname, 'icon.ico');

  // Generate PNGs at different sizes
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const size of sizes) {
    const png = await sharp(svgPath)
      .resize(size, size)
      .png()
      .toBuffer();

    pngBuffers.push(png);
    console.log(`Generated ${size}x${size} PNG`);
  }

  // Convert PNGs to ICO
  const icoBuffer = await PngToIco(pngBuffers);
  fs.writeFileSync(icoPath, icoBuffer);

  console.log('✓ icon.ico created successfully!');
}

createIcon().catch(console.error);
