/**
 * 自动更新：electron-updater
 * 仅在打包后的应用里生效（开发环境 electron-updater 无法工作）。
 * 流程：检查 → 发现新版本 → 询问用户 → 下载 → 下载完成 → 询问是否重启安装
 */
const { app, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

let emit = () => {};
let downloadResolve = null;
let updateInfo = null;
let downloaded = false;
let manual = false;

function log(...a) {
  console.log('[updater]', ...a);
}

function initUpdater(options) {
  emit = options.emit || emit;

  // 用户确认后再下载；安装时机也交给用户决定，避免在有未保存文档时被打断
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.logger = {
    info: (m) => log(m),
    warn: (m) => log('warn:', m),
    error: (m) => log('error:', m),
    debug: () => {},
  };

  autoUpdater.on('checking-for-update', () => emit('checking'));

  autoUpdater.on('update-available', (info) => {
    updateInfo = info;
    log('发现新版本', info.version);
    emit('available', { version: info.version, releaseNotes: String(info.releaseNotes || '') });
  });

  autoUpdater.on('update-not-available', (info) => {
    log('已是最新版本', info && info.version);
    emit('not-available', { version: info && info.version });
  });

  autoUpdater.on('download-progress', (p) => {
    emit('progress', { percent: Math.round(p.percent || 0) });
  });

  autoUpdater.on('update-downloaded', (info) => {
    downloaded = true;
    log('下载完成', info.version);
    emit('downloaded', { version: info.version });
  });

  autoUpdater.on('error', (err) => {
    const msg = String((err && err.message) || err || '未知错误');
    log('错误', msg);
    // 未打包 / 未配置 publish 时最常见的提示，转成友好文案
    const friendly = /Skip checkForUpdates|not packed/i.test(msg)
      ? '当前是开发模式，自动更新仅在打包后的应用中可用'
      : msg;
    emit('error', { message: friendly });
    if (downloadResolve) {
      downloadResolve({ ok: false, message: friendly });
      downloadResolve = null;
    }
  });

  ipcMain.handle('updater:check', async (_e, opts) => {
    manual = !!(opts && opts.manual);
    if (!app.isPackaged) {
      emit('error', { message: '当前是开发模式，自动更新仅在打包后的应用中可用' });
      return { ok: false, dev: true };
    }
    try {
      const res = await autoUpdater.checkForUpdates();
      return { ok: true, version: res && res.updateInfo && res.updateInfo.version };
    } catch (err) {
      return { ok: false, message: String((err && err.message) || err) };
    }
  });

  ipcMain.handle('updater:download', async () => {
    if (downloaded) return { ok: true, already: true };
    try {
      const p = new Promise((resolve) => {
        downloadResolve = resolve;
        autoUpdater.once('update-downloaded', () => {
          if (downloadResolve) {
            downloadResolve({ ok: true });
            downloadResolve = null;
          }
        });
      });
      await autoUpdater.downloadUpdate();
      return await p;
    } catch (err) {
      return { ok: false, message: String((err && err.message) || err) };
    }
  });

  ipcMain.handle('updater:install', () => {
    if (!downloaded) return { ok: false, message: '更新包尚未下载完成' };
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
    return { ok: true };
  });

  // 启动后延迟静默检查，避免拖慢首屏
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => log('启动检查失败', err && err.message));
    }, 5000);
  }
}

module.exports = { initUpdater, autoUpdater };
