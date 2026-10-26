const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
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

function createWindow() {
  win = new BrowserWindow({
    width: 1240,
    height: 860,
    minWidth: 760,
    minHeight: 520,
    title: '墨写 Markdown',
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
      label: '文件',
      submenu: [
        { label: '新建', accelerator: 'CmdOrCtrl+N', click: () => send('menu:new') },
        { label: '打开…', accelerator: 'CmdOrCtrl+O', click: () => send('menu:open') },
        { type: 'separator' },
        { label: '保存', accelerator: 'CmdOrCtrl+S', click: () => send('menu:save') },
        { label: '另存为…', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('menu:save-as') },
        { type: 'separator' },
        { label: '导出为 HTML…', click: () => send('menu:export-html') },
        { label: '导出为 PDF…', click: () => send('menu:export-pdf') },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
        { type: 'separator' },
        { label: '查找', accelerator: 'CmdOrCtrl+F', click: () => send('menu:find') },
      ],
    },
    {
      label: '插入',
      submenu: [
        { label: '图片…', accelerator: 'CmdOrCtrl+Shift+I', click: () => send('menu:insert-image') },
        { label: '图表…', accelerator: 'CmdOrCtrl+Shift+C', click: () => send('menu:insert-chart') },
        { label: '表格', click: () => send('menu:insert-table') },
        { label: '链接', accelerator: 'CmdOrCtrl+K', click: () => send('menu:insert-link') },
        { type: 'separator' },
        { label: '分割线', click: () => send('menu:insert-hr') },
        { label: '代码块', click: () => send('menu:insert-codeblock') },
        { label: '目录', click: () => send('menu:insert-toc') },
      ],
    },
    {
      label: '格式',
      submenu: [
        { label: '加粗', accelerator: 'CmdOrCtrl+B', click: () => send('menu:format', 'bold') },
        { label: '斜体', accelerator: 'CmdOrCtrl+I', click: () => send('menu:format', 'italic') },
        { label: '下划线', accelerator: 'CmdOrCtrl+U', click: () => send('menu:format', 'underline') },
        { label: '删除线', accelerator: 'CmdOrCtrl+Shift+X', click: () => send('menu:format', 'strike') },
        { type: 'separator' },
        { label: '正文', accelerator: 'CmdOrCtrl+0', click: () => send('menu:heading', 0) },
        { label: '标题 1', accelerator: 'CmdOrCtrl+1', click: () => send('menu:heading', 1) },
        { label: '标题 2', accelerator: 'CmdOrCtrl+2', click: () => send('menu:heading', 2) },
        { label: '标题 3', accelerator: 'CmdOrCtrl+3', click: () => send('menu:heading', 3) },
        { label: '标题 4', accelerator: 'CmdOrCtrl+4', click: () => send('menu:heading', 4) },
        { label: '标题 5', accelerator: 'CmdOrCtrl+5', click: () => send('menu:heading', 5) },
        { label: '标题 6', accelerator: 'CmdOrCtrl+6', click: () => send('menu:heading', 6) },
        { type: 'separator' },
        { label: '项目符号列表', click: () => send('menu:format', 'bulletList') },
        { label: '编号列表', click: () => send('menu:format', 'orderedList') },
        { label: '引用', click: () => send('menu:format', 'blockquote') },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '放大', accelerator: 'CmdOrCtrl+=', click: () => send('menu:zoom', 'in') },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', click: () => send('menu:zoom', 'out') },
        { label: '重置缩放', accelerator: 'CmdOrCtrl+Shift+0', click: () => send('menu:zoom', 'reset') },
        { type: 'separator' },
        { role: 'toggleDevTools', label: '开发者工具' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        { label: '检查更新…', click: () => send('menu:check-update') },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ---------------- IPC ---------------- */

ipcMain.handle('dialog:open-markdown', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: '打开 Markdown 文件',
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'txt'] },
      { name: '所有文件', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (res.canceled || !res.filePaths.length) return null;
  const filePath = res.filePaths[0];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return { filePath, content };
  } catch (err) {
    dialog.showErrorBox('打开失败', String(err.message || err));
    return null;
  }
});

ipcMain.handle('dialog:save-markdown', async (_e, { filePath, content, suggestedName }) => {
  let target = filePath;
  if (!target) {
    const res = await dialog.showSaveDialog(win, {
      title: '保存 Markdown 文件',
      defaultPath: suggestedName || '未命名文档.md',
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (res.canceled || !res.filePath) return null;
    target = res.filePath;
  }
  if (!/\.(md|markdown|mdown|txt)$/i.test(target)) target += '.md';
  try {
    fs.writeFileSync(target, content, 'utf8');
    return { filePath: target };
  } catch (err) {
    dialog.showErrorBox('保存失败', String(err.message || err));
    return null;
  }
});

ipcMain.handle('dialog:open-image', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: '插入图片',
    filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] }],
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
    dialog.showErrorBox('导出失败', String(err.message || err));
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
    title: '导出 PDF',
    defaultPath: '未命名文档.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (res.canceled || !res.filePath) return null;
  try {
    const data = await win.webContents.printToPDF({ printBackground: true });
    fs.writeFileSync(res.filePath, data);
    return { filePath: res.filePath };
  } catch (err) {
    dialog.showErrorBox('导出 PDF 失败', String(err.message || err));
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
