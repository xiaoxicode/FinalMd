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

  // offscreen 渲染：普通窗口会被屏幕可视高度裁剪（1024 只剩 ~817），
  // 离屏窗口不受屏幕尺寸限制，capturePage 才能拿到完整 1024x1024。
  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    useContentSize: true,
    show: false,
    offscreen: true,
    webPreferences: { offscreen: true },
    backgroundColor: '#00000000',
  });
  await win.loadFile(htmlPath);
  await new Promise((r) => setTimeout(r, 1200));
  const img = await win.webContents.capturePage();
  const png1024 = path.join(ASSETS, 'icon_1024.png');
  // capturePage 可能按显示器缩放系数返回 2048x2048，统一归一到 1024x1024
  let png = img;
  if (img.getSize().width !== 1024) {
    png = await img.resize({ width: 1024, height: 1024 });
  }
  fs.writeFileSync(png1024, png.toPNG());
  console.log('PNG1024_OK', png1024, fs.statSync(png1024).size);
  app.quit();
});
