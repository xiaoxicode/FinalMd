/** 生成应用图标：SVG -> 1024 PNG -> .iconset -> .icns */
const path = require('path');
const fs = require('fs');
const { app, BrowserWindow } = require('electron');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4d8bf5"/>
      <stop offset="1" stop-color="#1c4fc4"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="228" fill="url(#bg)"/>
  <g fill="#ffffff" opacity="0.92">
    <rect x="150" y="770" width="724" height="22" rx="11"/>
    <rect x="150" y="826" width="560" height="22" rx="11"/>
  </g>
  <text x="512" y="672" font-size="600" font-weight="700" text-anchor="middle"
        fill="#ffffff" font-family="PingFang SC, Songti SC, Heiti SC, sans-serif">墨</text>
</svg>`;

app.whenReady().then(async () => {
  fs.mkdirSync(ASSETS, { recursive: true });
  const htmlPath = path.join(ASSETS, '_icon.html');
  fs.writeFileSync(htmlPath, `<!DOCTYPE html><html><body style="margin:0">${SVG}</body></html>`);

  const win = new BrowserWindow({ width: 1024, height: 1024, show: true, backgroundColor: '#00000000' });
  await win.loadFile(htmlPath);
  await new Promise((r) => setTimeout(r, 1200));
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 });
  const png1024 = path.join(ASSETS, 'icon_1024.png');
  fs.writeFileSync(png1024, img.toPNG());
  console.log('PNG1024_OK', png1024, fs.statSync(png1024).size);
  app.quit();
});
