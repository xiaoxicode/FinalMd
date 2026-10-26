const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openMarkdown: () => ipcRenderer.invoke('dialog:open-markdown'),
  saveMarkdown: (payload) => ipcRenderer.invoke('dialog:save-markdown', payload),
  openImage: () => ipcRenderer.invoke('dialog:open-image'),
  exportFile: (payload) => ipcRenderer.invoke('dialog:export-file', payload),
  printToPdf: () => ipcRenderer.invoke('app:print-to-pdf'),
  showMessageBox: (opts) => ipcRenderer.invoke('dialog:message-box', opts),
  setDirty: (val) => ipcRenderer.send('app:set-dirty', val),
  setTitle: (title) => ipcRenderer.send('app:set-title', title),
  confirmClose: () => ipcRenderer.send('app:close-confirmed'),

  appVersion: () => ipcRenderer.sendSync('app:version'),

  // 把界面语言同步给主进程（原生菜单、系统对话框使用同一种语言）
  setLang: (code) => ipcRenderer.send('app:set-lang', code),

  updater: {
    check: (opts) => ipcRenderer.invoke('updater:check', opts),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
  },

  onUpdaterEvent: (handler) => {
    const fn = (_e, payload) => handler(payload);
    ipcRenderer.on('updater:event', fn);
    return () => ipcRenderer.removeListener('updater:event', fn);
  },

  onMenu: (handler) => {
    const channels = [
      'menu:new', 'menu:open', 'menu:save', 'menu:save-as',
      'menu:export-html', 'menu:export-pdf', 'menu:find',
      'menu:insert-image', 'menu:insert-chart', 'menu:insert-table',
      'menu:insert-link', 'menu:insert-hr', 'menu:insert-codeblock', 'menu:insert-toc',
      'menu:format', 'menu:heading', 'menu:zoom', 'menu:check-update', 'menu:lang',
    ];
    const listeners = channels.map((ch) => {
      const fn = (_e, arg) => handler(ch, arg);
      ipcRenderer.on(ch, fn);
      return { ch, fn };
    });
    return () => listeners.forEach(({ ch, fn }) => ipcRenderer.removeListener(ch, fn));
  },

  onConfirmBeforeClose: (handler) => {
    const fn = () => handler();
    ipcRenderer.on('app:confirm-before-close', fn);
    return () => ipcRenderer.removeListener('app:confirm-before-close', fn);
  },
});
