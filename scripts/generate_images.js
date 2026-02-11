const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '../public/images/forest');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Function to generate random forest-like SVG
function generateSVG(index) {
    const rotation = Math.floor(Math.random() * 360);
    const hiddenRotation = 90; // The text is rotated 90deg relative to image

    // Simple noise pattern (rectangles)
    let rects = '';
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const w = Math.random() * 10 + 2;
        const h = Math.random() * 20 + 5;
        const opacity = Math.random() * 0.3 + 0.1;
        rects += `<rect x="${x}%" y="${y}%" width="${w}%" height="${h}%" fill="#0f380f" fill-opacity="${opacity}" transform="rotate(${Math.random() * 20 - 10} ${x} ${y})" />`;
    }

    // The hidden text "ROTATE"
    // To make it hard to see, we use a color very close to background and maybe some noise over it.
    // Actually, in the view I used HTML text. But the prompt asked for "images... containing... letters". 
    // So the letters should be IN the image.
    // I will put the text in the SVG.

    const svgContent = `
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#1a2f1a" />
    ${rects}
    <text x="50%" y="50%" font-family="monospace" font-size="24" fill="#2e5c2e" opacity="0.4" 
          text-anchor="middle" dominant-baseline="middle" 
          transform="rotate(${hiddenRotation}, 100, 100)">ROTATE</text>
    <!-- Add more noise on top -->
    <rect x="0" y="0" width="100%" height="100%" fill="url(#noise)" opacity="0.2"/>
    <defs>
        <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
        </filter>
    </defs>
</svg>`;

    fs.writeFileSync(path.join(outputDir, `forest_${index}.svg`), svgContent);
    console.log(`Generated forest_${index}.svg`);
}

for (let i = 0; i < 25; i++) {
    generateSVG(i);
}
console.log('All 25 images generated.');
