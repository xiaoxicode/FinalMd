const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const {
  LANGS, CODES, t: translate, matchLang, normalizeLang,
} = require('./shared/i18n/index.js');
// 打包产物里只有 updater.dist.js（esbuild 已把 electron-updater 及其依赖打进去）；
// 开发时没有这个文件，直接走源码。
let initUpdater = null;
try {
  initUpdater = require('./updater.dist.js').initUpdater;
} catch {
  initUpdater = require('./updater.js').initUpdater;
}

let win = null;
let isDirty = false;
let forceClose = false;
// 主进程侧的语言状态：决定原生菜单与系统对话框的语言，由渲染层通过 IPC 同步
let currentLang = matchLang(app.getLocale()) || 'en';

const tr = (key, vars) => translate(currentLang, key, vars);

function createWindow() {
  win = new BrowserWindow({
    width: 1240,
    height: 860,
    minWidth: 760,
    minHeight: 520,
    title: tr('app.title'),
    backgroundColor: '#f2f2f2',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.once('ready-to-show', () => win.show());

  win.on('close', (e) => {
    // 有未保存改动时，交给渲染进程弹自定义对话框确认
    if (isDirty && !forceClose) {
      e.preventDefault();
      win.webContents.send('app:confirm-before-close');
    }
  });

  win.on('closed', () => {
    win = null;
  });

  buildMenu();
}

function send(channel, ...args) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
}

function buildMenu() {
  const template = [
    {
      label: tr('menu.file'),
      submenu: [
        { label: tr('menu.file.new'), accelerator: 'CmdOrCtrl+N', click: () => send('menu:new') },
        { label: tr('menu.file.open'), accelerator: 'CmdOrCtrl+O', click: () => send('menu:open') },
        { type: 'separator' },
        { label: tr('menu.file.save'), accelerator: 'CmdOrCtrl+S', click: () => send('menu:save') },
        { label: tr('menu.file.saveAs'), accelerator: 'CmdOrCtrl+Shift+S', click: () => send('menu:save-as') },
        { type: 'separator' },
        { label: tr('menu.file.exportHtml'), click: () => send('menu:export-html') },
        { label: tr('menu.file.exportPdf'), click: () => send('menu:export-pdf') },
        { type: 'separator' },
        { role: 'close', label: tr('menu.file.close') },
      ],
    },
    {
      label: tr('menu.edit'),
      submenu: [
        { role: 'undo', label: tr('menu.edit.undo') },
        { role: 'redo', label: tr('menu.edit.redo') },
        { type: 'separator' },
        { role: 'cut', label: tr('menu.edit.cut') },
        { role: 'copy', label: tr('menu.edit.copy') },
        { role: 'paste', label: tr('menu.edit.paste') },
        { role: 'selectAll', label: tr('menu.edit.selectAll') },
        { type: 'separator' },
        { label: tr('menu.edit.find'), accelerator: 'CmdOrCtrl+F', click: () => send('menu:find') },
      ],
    },
    {
      label: tr('menu.insert'),
      submenu: [
        { label: tr('menu.insert.image'), accelerator: 'CmdOrCtrl+Shift+I', click: () => send('menu:insert-image') },
        { label: tr('menu.insert.chart'), accelerator: 'CmdOrCtrl+Shift+C', click: () => send('menu:insert-chart') },
        { label: tr('menu.insert.table'), click: () => send('menu:insert-table') },
        { label: tr('menu.insert.link'), accelerator: 'CmdOrCtrl+K', click: () => send('menu:insert-link') },
        { type: 'separator' },
        { label: tr('menu.insert.hr'), click: () => send('menu:insert-hr') },
        { label: tr('menu.insert.codeblock'), click: () => send('menu:insert-codeblock') },
        { label: tr('menu.insert.toc'), click: () => send('menu:insert-toc') },
      ],
    },
    {
      label: tr('menu.format'),
      submenu: [
        { label: tr('menu.format.bold'), accelerator: 'CmdOrCtrl+B', click: () => send('menu:format', 'bold') },
        { label: tr('menu.format.italic'), accelerator: 'CmdOrCtrl+I', click: () => send('menu:format', 'italic') },
        { label: tr('menu.format.underline'), accelerator: 'CmdOrCtrl+U', click: () => send('menu:format', 'underline') },
        { label: tr('menu.format.strike'), accelerator: 'CmdOrCtrl+Shift+X', click: () => send('menu:format', 'strike') },
        { type: 'separator' },
        { label: tr('menu.format.body'), accelerator: 'CmdOrCtrl+0', click: () => send('menu:heading', 0) },
        ...[1, 2, 3, 4, 5, 6].map((n) => ({
          label: tr('menu.format.heading', { n }),
          accelerator: `CmdOrCtrl+${n}`,
          click: () => send('menu:heading', n),
        })),
        { type: 'separator' },
        { label: tr('tb.bulletList'), click: () => send('menu:format', 'bulletList') },
        { label: tr('tb.orderedList'), click: () => send('menu:format', 'orderedList') },
        { label: tr('tb.quote'), click: () => send('menu:format', 'blockquote') },
      ],
    },
    {
      label: tr('menu.view'),
      submenu: [
        { label: tr('menu.view.zoomIn'), accelerator: 'CmdOrCtrl+=', click: () => send('menu:zoom', 'in') },
        { label: tr('menu.view.zoomOut'), accelerator: 'CmdOrCtrl+-', click: () => send('menu:zoom', 'out') },
        { label: tr('menu.view.zoomReset'), accelerator: 'CmdOrCtrl+Shift+0', click: () => send('menu:zoom', 'reset') },
        { type: 'separator' },
        { role: 'toggleDevTools', label: tr('menu.view.devtools') },
      ],
    },
    {
      label: tr('menu.language'),
      submenu: LANGS.map((l) => ({
        label: l.label,
        type: 'radio',
        checked: l.code === currentLang,
        click: () => {
          // 交给渲染层统一切换：它会刷新界面、持久化，并通过 app:set-lang 回传重建菜单
          send('menu:lang', l.code);
        },
      })),
    },
    {
      label: tr('menu.help'),
      submenu: [
        { label: tr('menu.help.checkUpdate'), click: () => send('menu:check-update') },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ---------------- IPC ---------------- */

ipcMain.handle('dialog:open-markdown', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: tr('dialog.openFile'),
    filters: [
      { name: tr('filter.markdown'), extensions: ['md', 'markdown', 'mdown', 'txt'] },
      { name: tr('filter.all'), extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (res.canceled || !res.filePaths.length) return null;
  const filePath = res.filePaths[0];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return { filePath, content };
  } catch (err) {
    dialog.showErrorBox(tr('err.openFailed'), String(err.message || err));
    return null;
  }
});

ipcMain.handle('dialog:save-markdown', async (_e, { filePath, content, suggestedName }) => {
  let target = filePath;
  if (!target) {
    const res = await dialog.showSaveDialog(win, {
      title: tr('dialog.saveFile'),
      defaultPath: suggestedName || tr('doc.untitledFile'),
      filters: [{ name: tr('filter.markdown'), extensions: ['md'] }],
    });
    if (res.canceled || !res.filePath) return null;
    target = res.filePath;
  }
  if (!/\.(md|markdown|mdown|txt)$/i.test(target)) target += '.md';
  try {
    fs.writeFileSync(target, content, 'utf8');
    return { filePath: target };
  } catch (err) {
    dialog.showErrorBox(tr('err.saveFailed'), String(err.message || err));
    return null;
  }
});

ipcMain.handle('dialog:open-image', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: tr('dialog.insertImage'),
    filters: [{ name: tr('filter.images'), extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] }],
    properties: ['openFile', 'multiSelections'],
  });
  if (res.canceled || !res.filePaths.length) return [];
  return res.filePaths.map((p) => {
    try {
      const buf = fs.readFileSync(p);
      const ext = path.extname(p).slice(1).toLowerCase();
      const mime = ext === 'jpg' ? 'jpeg' : ext === 'svg' ? 'svg+xml' : ext || 'png';
      return { name: path.basename(p), dataUrl: `data:image/${mime};base64,${buf.toString('base64')}` };
    } catch (err) {
      return null;
    }
  }).filter(Boolean);
});

ipcMain.handle('dialog:export-file', async (_e, { defaultPath, filters, content, encoding }) => {
  const res = await dialog.showSaveDialog(win, { defaultPath, filters });
  if (res.canceled || !res.filePath) return null;
  try {
    fs.writeFileSync(res.filePath, content, encoding || 'utf8');
    return { filePath: res.filePath };
  } catch (err) {
    dialog.showErrorBox(tr('err.exportFailed'), String(err.message || err));
    return null;
  }
});

ipcMain.handle('dialog:message-box', async (_e, opts) => {
  const res = await dialog.showMessageBox(win, opts);
  return res.response;
});

ipcMain.on('app:version', (e) => {
  e.returnValue = app.getVersion();
});

// 渲染层切换语言后同步过来：重建原生菜单，并让后续系统对话框使用同一语言
ipcMain.on('app:set-lang', (_e, code) => {
  const next = normalizeLang(code);
  if (next === currentLang) return;
  currentLang = next;
  buildMenu();
});

ipcMain.on('app:set-dirty', (_e, val) => {
  isDirty = !!val;
  if (win) win.setDocumentEdited(isDirty);
});

ipcMain.on('app:set-title', (_e, title) => {
  if (win) win.setTitle(title);
});

ipcMain.on('app:close-confirmed', () => {
  forceClose = true;
  if (win) win.close();
});

ipcMain.handle('app:print-to-pdf', async () => {
  if (!win) return null;
  const res = await dialog.showSaveDialog(win, {
    title: tr('dialog.exportPdf'),
    defaultPath: tr('dialog.pdfName'),
    filters: [{ name: tr('filter.pdf'), extensions: ['pdf'] }],
  });
  if (res.canceled || !res.filePath) return null;
  try {
    const data = await win.webContents.printToPDF({ printBackground: true });
    fs.writeFileSync(res.filePath, data);
    return { filePath: res.filePath };
  } catch (err) {
    dialog.showErrorBox(tr('err.pdfFailed'), String(err.message || err));
    return null;
  }
});

/* ---------------- 生命周期 ---------------- */

app.whenReady().then(() => {
  createWindow();
  initUpdater({
    emit: (type, data) => send('updater:event', { type, data }),
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
