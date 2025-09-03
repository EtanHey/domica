// Simple icon generator using data URLs
// Run with: node create-icons-simple.js

const fs = require('fs');
const path = require('path');

// SVG template for the icon
const createSvg = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#1e40af"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.6}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">D</text>
</svg>
`;

// Convert SVG to PNG using a simple approach
const svgToPng = async (svgString, size) => {
  // This creates a simple bitmap representation
  // For actual PNG conversion, you'd need a proper library
  // For now, we'll create placeholder files

  // Create a simple PNG header (this is a placeholder - won't create actual image)
  const png = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG signature
    // ... rest would be actual PNG data
  ]);

  return png;
};

// Create HTML file to generate icons manually
const createHtmlGenerator = () => {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Domica Extension Icon Generator</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      background: #f3f4f6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1e40af;
      margin-bottom: 20px;
    }
    .icons {
      display: flex;
      gap: 30px;
      margin-top: 30px;
      flex-wrap: wrap;
    }
    .icon-container {
      text-align: center;
    }
    .icon-container h3 {
      margin-bottom: 10px;
      color: #374151;
    }
    canvas {
      border: 1px solid #e5e7eb;
      cursor: pointer;
      transition: transform 0.2s;
    }
    canvas:hover {
      transform: scale(1.05);
    }
    .instructions {
      background: #f9fafb;
      padding: 20px;
      border-radius: 6px;
      margin-top: 30px;
    }
    .instructions h2 {
      color: #1f2937;
      font-size: 18px;
      margin-bottom: 10px;
    }
    .instructions ol {
      margin: 0;
      padding-left: 20px;
    }
    .instructions li {
      margin-bottom: 8px;
      color: #4b5563;
    }
    .download-all {
      background: #1e40af;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 20px;
      transition: background 0.2s;
    }
    .download-all:hover {
      background: #1e3a8a;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Domica Extension Icon Generator</h1>
    <p>Click on any icon to download it, or use the button below to download all icons.</p>
    
    <div class="icons">
      <div class="icon-container">
        <h3>icon16.png</h3>
        <canvas id="icon16" width="16" height="16"></canvas>
      </div>
      
      <div class="icon-container">
        <h3>icon48.png</h3>
        <canvas id="icon48" width="48" height="48"></canvas>
      </div>
      
      <div class="icon-container">
        <h3>icon128.png</h3>
        <canvas id="icon128" width="128" height="128"></canvas>
      </div>
    </div>
    
    <button class="download-all" onclick="downloadAll()">Download All Icons</button>
    
    <div class="instructions">
      <h2>Instructions:</h2>
      <ol>
        <li>Click on each icon to download it individually, or use "Download All Icons"</li>
        <li>Save the files to the <code>src/chrome-extension/</code> directory</li>
        <li>Make sure the files are named exactly: <code>icon16.png</code>, <code>icon48.png</code>, <code>icon128.png</code></li>
        <li>Then try loading the extension again in Chrome</li>
      </ol>
    </div>
  </div>

  <script>
    function drawIcon(canvasId, size) {
      const canvas = document.getElementById(canvasId);
      const ctx = canvas.getContext('2d');
      
      // Enable high DPI support
      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';
      ctx.scale(dpr, dpr);
      
      // Draw rounded rectangle background
      const radius = size * 0.15;
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(size - radius, 0);
      ctx.quadraticCurveTo(size, 0, size, radius);
      ctx.lineTo(size, size - radius);
      ctx.quadraticCurveTo(size, size, size - radius, size);
      ctx.lineTo(radius, size);
      ctx.quadraticCurveTo(0, size, 0, size - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      
      // Fill background
      ctx.fillStyle = '#1e40af';
      ctx.fill();
      
      // Draw "D" letter
      ctx.fillStyle = 'white';
      ctx.font = \`bold \${size * 0.6}px Arial, sans-serif\`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('D', size / 2, size / 2);
      
      // Add click handler
      canvas.onclick = () => downloadIcon(canvas, \`icon\${size}.png\`);
    }
    
    function downloadIcon(canvas, filename) {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
    
    function downloadAll() {
      const sizes = [16, 48, 128];
      sizes.forEach(size => {
        const canvas = document.getElementById(\`icon\${size}\`);
        downloadIcon(canvas, \`icon\${size}.png\`);
      });
    }
    
    // Generate all icons on load
    drawIcon('icon16', 16);
    drawIcon('icon48', 48);
    drawIcon('icon128', 128);
  </script>
</body>
</html>`;

  return html;
};

// Main execution
console.log('Creating icon generator HTML file...');

const htmlContent = createHtmlGenerator();
const htmlPath = path.join(__dirname, 'generate-icons.html');

fs.writeFileSync(htmlPath, htmlContent);

console.log(`
✅ Icon generator created successfully!

To create the icons:
1. Open the file: ${htmlPath}
2. Your browser will open with the icon generator
3. Click "Download All Icons" or click each icon individually
4. Save the files to the chrome-extension directory
5. Try loading the extension again

Alternative: If you have an image editor, create:
- icon16.png (16x16 pixels)
- icon48.png (48x48 pixels)  
- icon128.png (128x128 pixels)

With a blue background (#1e40af) and white "D" letter.
`);

// Try to open the HTML file automatically
const { exec } = require('child_process');
const platform = process.platform;

if (platform === 'darwin') {
  exec(`open "${htmlPath}"`);
} else if (platform === 'win32') {
  exec(`start "${htmlPath}"`);
} else {
  exec(`xdg-open "${htmlPath}"`);
}
