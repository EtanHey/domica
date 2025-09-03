// Run this with Node.js to create icon files
// First install canvas: npm install canvas

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background - Domica blue
  ctx.fillStyle = '#1e40af';
  ctx.fillRect(0, 0, size, size);

  // Create rounded corners
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  const radius = size * 0.15;
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.fill();

  // Reset composite operation
  ctx.globalCompositeOperation = 'source-over';

  // Draw "D" letter
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('D', size / 2, size / 2);

  return canvas.toBuffer('image/png');
}

// Create all icon sizes
const sizes = [16, 48, 128];

sizes.forEach((size) => {
  const buffer = createIcon(size);
  const filename = `icon${size}.png`;
  fs.writeFileSync(path.join(__dirname, filename), buffer);
  console.log(`Created ${filename}`);
});

console.log('All icons created successfully!');
