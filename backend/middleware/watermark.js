const sharp = require('sharp');

const applyWatermark = async (inputBuffer, watermarkText = 'Rahul Sankhala Studio') => {
  try {
    const rotatedBuffer = await sharp(inputBuffer).rotate().toBuffer();
    const metadata = await sharp(rotatedBuffer).metadata();
    const width = metadata.width || 1200;
    const height = metadata.height || 800;

    // Responsive font size based on image width
    const fontSize = Math.max(20, Math.floor(width / 18));
    
    // Create SVG overlay with diagonal text
    const svgText = `
      <svg width="${width}" height="${height}">
        <style>
          .watermark {
            fill: rgba(212, 175, 55, 0.35); /* Translucent Gold (#D4AF37) */
            font-size: ${fontSize}px;
            font-family: 'Playfair Display', serif;
            font-weight: bold;
            text-anchor: middle;
          }
          .subtext {
            fill: rgba(255, 255, 255, 0.25); /* Translucent White */
            font-size: ${Math.floor(fontSize * 0.5)}px;
            font-family: sans-serif;
            text-anchor: middle;
          }
        </style>
        <g transform="rotate(-30, ${width / 2}, ${height / 2})">
          <text x="${width / 2}" y="${height / 2}" class="watermark">${watermarkText.toUpperCase()}</text>
          <text x="${width / 2}" y="${height / 2 + fontSize * 0.7}" class="subtext">SECURE PREVIEW - DO NOT COPY</text>
        </g>
      </svg>
    `;

    return await sharp(rotatedBuffer)
      .composite([{ input: Buffer.from(svgText), top: 0, left: 0 }])
      .toBuffer();
  } catch (err) {
    console.error('Error applying watermark with sharp:', err.message);
    return inputBuffer; // Return original if sharp fails
  }
};

module.exports = { applyWatermark };
