/** 打开真实界面并截图，用于视觉检查 */
const path = require('path');
const fs = require('fs');
const { app, BrowserWindow } = require('electron');

const OUT = path.join(__dirname, '..', 'screenshots');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const win = new BrowserWindow({
    width: 1280,
    height: 880,
    backgroundColor: '#f0f0f0',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  await wait(1800);

  const shot = async (name) => {
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(OUT, name), img.toPNG());
    console.log('saved', name);
  };

  // 1. 主界面（欢迎文档）
  await win.show();
  await wait(600);
  await shot('01-main.png');

  // 2. 图表编辑器
  await win.webContents.executeJavaScript(`document.querySelector('[data-cmd="chart"]').click()`);
  await wait(900);
  await shot('02-chart-dialog.png');

  // 3. 插入图表后的文档
  await win.webContents.executeJavaScript(`document.querySelector('#chartInsert').click()`);
  await wait(2500);
  const diag = await win.webContents.executeJavaScript(`
    (() => {
      const img = document.querySelector('#editor img');
      if (!img) return 'no img';
      const r = img.getBoundingClientRect();
      return JSON.stringify({
        natural: img.naturalWidth + 'x' + img.naturalHeight,
        rect: Math.round(r.width) + 'x' + Math.round(r.height),
        complete: img.complete,
        srcLen: img.src.length,
        scrollY: document.querySelector('#workspace').scrollTop,
      });
    })()
  `);
  console.log('IMG 诊断:', diag);
  await win.webContents.executeJavaScript(`document.querySelector('#workspace').scrollTop = 0`);
  await wait(800);
  await shot('03-chart-in-doc.png');

  // 4. 富文本格式演示
  await win.webContents.executeJavaScript(`
    (() => {
      const mw = window.__mw;
      mw.setMarkdown('# 产品季度复盘\\n\\n本季度**核心指标**全面达成，其中~~延期项~~已全部闭环。\\n\\n## 关键结论\\n\\n- 营收同比增长 26%\\n- 新客户数创历史新高\\n  - 华东区贡献最大\\n\\n> 下季度重点：提升留存率与客单价。\\n\\n| 指标 | 目标 | 实际 |\\n| --- | --- | --- |\\n| 营收 | 500 | 546 |\\n| 新增客户 | 120 | 138 |\\n');
      const e = mw.editor;
      e.commands.setTextSelection({ from: 8, to: 12 });
      e.chain().focus().setColor('#d64545').run();
      e.commands.setTextSelection({ from: 30, to: 38 });
      e.chain().focus().setHighlight({ color: '#fff3a3' }).run();
      e.commands.setTextSelection(1);
    })()
  `);
  await wait(900);
  await shot('04-formatting.png');

  // 5. 多语言：英文 / 日语 / 德语 各截一张，确认工具栏、状态栏、欢迎文档都跟着切换
  const langs = [
    ['05-lang-en.png', 'en'],
    ['06-lang-ja.png', 'ja'],
    ['07-lang-de.png', 'de'],
  ];
  for (const [file, code] of langs) {
    await win.webContents.executeJavaScript(`
      (() => {
        const mw = window.__mw;
        mw.i18n.setLang('${code}');
        mw.setMarkdown(mw.i18n.t('welcome'));
      })()
    `);
    await wait(900);
    await shot(file);
  }

  console.log('done');
  app.quit();
});
