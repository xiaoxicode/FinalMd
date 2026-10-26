import { createEditor, toMarkdown, fromMarkdown, fileToDataUrl, stats } from './editor.js';
import {
  buildRibbon, updateToolbarState, openModal, closeModal, toast, confirmDialog,
  initFindBar, openColorPopover, openHighlightPopover, indentParagraph, outdentParagraph,
  buildTocHtml, isModalOpen,
} from './ui.js';
import { initChartDialog, openChartDialog, decodeChartConfig, encodeChartConfig, refreshChartDialog } from './chart-dialog.js';
import { renderChartSVG, svgToPngDataUrl, sampleConfig } from './charts.js';
import { t, setLang, getLang, applyDomI18n, onLangChange, htmlLangOf } from './i18n.js';

const $ = (s) => document.querySelector(s);
const api = window.api;
const APP_VERSION = (api.appVersion && api.appVersion()) || '1.0.1';

let editor = null;
let currentPath = null;
let dirty = false;
let zoom = 1;
let findBar = null;

const docName = () => (currentPath ? currentPath.split(/[\\/]/).pop() : t('doc.untitledFile'));

/* ---------------- 状态 ---------------- */

function setDirty(v) {
  dirty = !!v;
  api.setDirty(dirty);
  api.setTitle(docName());
  $('#docTitle').textContent = docName().replace(/\.(md|markdown|mdown|txt)$/i, '');
  $('#docPath').textContent = currentPath || '';
  const st = $('#saveState');
  st.textContent = dirty ? t('save.unsaved') : t('save.saved');
  st.classList.toggle('dirty', dirty);
  $('#statPath').textContent = currentPath || t('stat.notSaved');
}

function updateStats() {
  const s = stats(editor);
  const text = editor.getText();
  const cn = (text.match(/[一-龥]/g) || []).length;
  const en = (text.replace(/[一-龥]/g, ' ').match(/[A-Za-z0-9_'’-]+/g) || []).length;
  $('#statWords').textContent = t('stat.words', { n: cn + en });
  $('#statChars').textContent = t('stat.chars', { n: text.replace(/\s/g, '').length });
  $('#statLines').textContent = t('stat.lines', { n: s.lines });
}

function refreshUI() {
  updateToolbarState(editor);
  updateStats();
}

/* ---------------- 图片 ---------------- */

async function compressIfNeeded(dataUrl, maxW = 1600) {
  if (!/^data:image\/(png|jpeg|jpg|webp|bmp)/i.test(dataUrl)) return dataUrl; // SVG 等保持原样
  if (dataUrl.length < 380 * 1024) return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.width <= maxW) return resolve(dataUrl);
      const scale = maxW / img.width;
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function insertImageFiles(files) {
  let n = 0;
  for (const f of files) {
    const raw = await fileToDataUrl(f);
    const src = await compressIfNeeded(raw);
    editor.chain().focus().setImage({ src, alt: (f.name || '').replace(/\.[^.]+$/, '') }).run();
    n++;
  }
  if (n) toast(t('image.embeddedMany', { n }));
}

function insertImageUrl(url, alt) {
  if (!url) return;
  editor.chain().focus().setImage({ src: url, alt: alt || '' }).run();
}

/* ---------------- 文件操作 ---------------- */

async function newDoc() {
  if (dirty) {
    const r = await confirmDialog({
      title: t('dlg.new.title'),
      text: t('dlg.unsaved.text'),
      buttons: [
        { id: 'save', label: t('common.save'), primary: true },
        { id: 'discard', label: t('common.dontSave'), danger: true },
        { id: 'cancel', label: t('common.cancel') },
      ],
    });
    if (r === 'cancel') return;
    if (r === 'save' && !(await save())) return;
  }
  currentPath = null;
  fromMarkdown(editor, '');
  setDirty(false);
}

async function openDoc() {
  if (dirty) {
    const r = await confirmDialog({
      title: t('dlg.open.title'),
      text: t('dlg.unsaved.text'),
      buttons: [
        { id: 'save', label: t('common.save'), primary: true },
        { id: 'discard', label: t('common.dontSave'), danger: true },
        { id: 'cancel', label: t('common.cancel') },
      ],
    });
    if (r === 'cancel') return;
    if (r === 'save' && !(await save())) return;
  }
  const res = await api.openMarkdown();
  if (!res) return;
  currentPath = res.filePath;
  fromMarkdown(editor, res.content);
  setDirty(false);
  refreshUI();
  toast(t('toast.opened', { name: docName() }));
}

async function save(asNew = false) {
  const md = toMarkdown(editor);
  const res = await api.saveMarkdown({
    filePath: asNew ? null : currentPath,
    content: md,
    suggestedName: docName(),
  });
  if (!res) return false;
  currentPath = res.filePath;
  setDirty(false);
  toast(t('toast.saved'));
  return true;
}

async function exportHtml() {
  const body = editor.getHTML();
  const css = `
    body{font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;
      max-width:820px;margin:40px auto;padding:0 24px;line-height:1.8;color:#24292f;}
    h1,h2,h3,h4{line-height:1.35;color:#101418;}
    h1{font-size:1.9em;border-bottom:1px solid #eee;padding-bottom:.25em;}
    h2{font-size:1.5em;}h3{font-size:1.25em;}
    code{background:#f2f3f5;border:1px solid #e6e8ea;border-radius:4px;padding:.08em .35em;font-size:.88em;color:#c0341d;}
    pre{background:#f7f8fa;border:1px solid #e6e8ea;border-radius:6px;padding:14px 16px;overflow:auto;}
    pre code{background:none;border:none;color:inherit;}
    blockquote{border-left:3px solid #2f6feb;margin:.8em 0;padding:.1em 0 .1em 1em;color:#4b5563;background:#f8f9fb;}
    table{border-collapse:collapse;width:100%;margin:.9em 0;}
    th,td{border:1px solid #ddd;padding:7px 10px;} th{background:#f5f6f8;}
    img{max-width:100%;height:auto;display:block;margin:.8em auto;}
    hr{border:none;border-top:1px solid #ddd;margin:1.6em 0;}
    a{color:#2f6feb;}
    mark{background:#fff3a3;}
  `;
  const html = `<!DOCTYPE html><html lang="${htmlLangOf(getLang())}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${docName().replace(/\.(md|markdown|mdown|txt)$/i, '')}</title>
<style>${css}</style></head><body>\n${body}\n</body></html>`;
  const res = await api.exportFile({
    defaultPath: docName().replace(/\.(md|markdown|mdown|txt)$/i, '') + '.html',
    filters: [{ name: t('filter.web'), extensions: ['html'] }],
    content: html,
  });
  if (res) toast(t('toast.exportedHtml'));
}

async function exportPdf() {
  const res = await api.printToPdf();
  if (res) toast(t('toast.exportedPdf'));
}

/* ---------------- 插入 ---------------- */

function applyLink(url, text) {
  if (!url) return;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  if (!editor.state.selection.empty) {
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  } else {
    const label = text || url;
    editor.chain().focus().insertContent(`<a href="${esc(url)}">${esc(label)}</a>`).run();
  }
}

function insertTable() {
  openModal('maskTable');
}

function insertToc() {
  const html = buildTocHtml(editor);
  if (!html) {
    toast(t('toc.noHeadings'));
    return;
  }
  editor.chain().focus().insertContent(html).run();
  toast(t('toc.inserted'));
}

/* ---------------- 命令分发 ---------------- */

function dispatch(cmd) {
  if (!editor) return;
  const chain = () => editor.chain().focus();

  if (cmd.startsWith('style:')) {
    const v = cmd.slice(6);
    if (v === 'p') chain().setParagraph().run();
    else if (v === 'quote') chain().toggleBlockquote().run();
    else chain().toggleHeading({ level: Number(v.slice(1)) }).run();
    return;
  }
  if (cmd.startsWith('align:')) {
    chain().setTextAlign(cmd.slice(6)).run();
    return;
  }

  switch (cmd) {
    case 'new': newDoc(); break;
    case 'open': openDoc(); break;
    case 'save': save(false); break;
    case 'undo': chain().undo().run(); break;
    case 'redo': chain().redo().run(); break;
    case 'bold': chain().toggleBold().run(); break;
    case 'italic': chain().toggleItalic().run(); break;
    case 'underline': chain().toggleUnderline().run(); break;
    case 'strike': chain().toggleStrike().run(); break;
    case 'code': chain().toggleCode().run(); break;
    case 'codeBlock': chain().toggleCodeBlock().run(); break;
    case 'bulletList': chain().toggleBulletList().run(); break;
    case 'orderedList': chain().toggleOrderedList().run(); break;
    case 'blockquote': chain().toggleBlockquote().run(); break;
    case 'hr': chain().setHorizontalRule().run(); break;
    case 'clearFormat': chain().unsetAllMarks().run(); break;
    case 'indent': indentParagraph(editor); break;
    case 'outdent': outdentParagraph(editor); break;
    case 'color': {
      const btn = document.querySelector('[data-cmd="color"]');
      if (btn) openColorPopover(btn, editor);
      break;
    }
    case 'highlight': {
      const btn = document.querySelector('[data-cmd="highlight"]');
      if (btn) openHighlightPopover(btn, editor);
      break;
    }
    case 'link': {
      const url = editor.getAttributes('link').href;
      $('#linkUrl').value = url || 'https://';
      $('#linkText').value = '';
      openModal('maskLink');
      break;
    }
    case 'table': insertTable(); break;
    case 'image': openModal('maskImage'); break;
    case 'chart': openChartDialog(null, ({ src, alt, title }) => {
      editor.chain().focus().setImage({ src, alt, title }).run();
      toast(t('chart.inserted'));
    }); break;
    case 'toc': insertToc(); break;
    case 'find': findBar?.open(); break;
    default: break;
  }
  refreshUI();
}

/* ---------------- 缩放 ---------------- */

function setZoom(v) {
  zoom = Math.min(2, Math.max(0.6, Math.round(v * 10) / 10));
  document.documentElement.style.setProperty('--zoom', String(zoom));
  $('#statZoom').textContent = Math.round(zoom * 100) + '%';
}

/* ---------------- 初始化 ---------------- */

// 欢迎文档随界面语言变化；仅在新建空白文档时使用
const welcomeText = () => t('welcome');

function bindModals() {
  document.querySelectorAll('[data-close]').forEach((el) => {
    el.onclick = () => closeModal(el.dataset.close);
  });
  document.querySelectorAll('.modal-mask').forEach((mask) => {
    mask.onmousedown = (e) => {
      if (e.target === mask) mask.classList.remove('open');
    };
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-mask.open').forEach((m) => m.classList.remove('open'));
    }
  });

  $('#pickImageBtn').onclick = async () => {
    const files = await api.openImage();
    if (!files || !files.length) return;
    const alt = $('#imageAlt').value.trim();
    for (const f of files) {
      editor.chain().focus().setImage({ src: f.dataUrl, alt: alt || f.name }).run();
    }
    closeModal('maskImage');
    toast(t('image.insertedMany', { n: files.length }));
  };

  $('#imageInsert').onclick = () => {
    const url = $('#imageUrl').value.trim();
    const alt = $('#imageAlt').value.trim();
    if (url) {
      insertImageUrl(url, alt);
      closeModal('maskImage');
      toast(t('image.inserted'));
    } else {
      $('#pickImageBtn').click();
    }
  };

  $('#linkInsert').onclick = () => {
    applyLink($('#linkUrl').value.trim(), $('#linkText').value.trim());
    closeModal('maskLink');
  };

  $('#tableInsert').onclick = () => {
    const rows = Math.max(1, Math.min(50, Number($('#tableRows').value) || 3));
    const cols = Math.max(1, Math.min(20, Number($('#tableCols').value) || 3));
    const withHeaderRow = $('#tableHeader').checked;
    closeModal('maskTable');
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow }).run();
  };
}

function bindChartEditing() {
  const el = $('#editor');
  el.addEventListener('dblclick', (e) => {
    const img = e.target.closest?.('img');
    if (!img) return;
    const cfg = decodeChartConfig(img.getAttribute('title'));
    if (!cfg) return;
    let pos = null;
    try {
      pos = editor.view.posAtDOM(img, 0);
    } catch {
      pos = null;
    }
    openChartDialog(cfg, ({ src, alt, title }) => {
      if (pos != null) {
        editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).setImage({ src, alt, title }).run();
      } else {
        editor.chain().focus().setImage({ src, alt, title }).run();
      }
      toast(t('chart.updated'));
    });
  });
}

function bindDragHighlight() {
  const ws = $('#workspace');
  ['dragenter', 'dragover'].forEach((ev) =>
    ws.addEventListener(ev, (e) => {
      if (Array.from(e.dataTransfer?.types || []).includes('Files')) {
        e.preventDefault();
        $('#editor').classList.add('drop-target');
      }
    }),
  );
  ['dragleave', 'drop'].forEach((ev) =>
    ws.addEventListener(ev, () => $('#editor').classList.remove('drop-target')),
  );
}

/* ---------------- 自动更新 ---------------- */

let updating = false; // 是否正在下载，避免重复触发

async function checkForUpdates(manual) {
  if (!api.updater) return;
  if (manual) toast(t('upd.checking'));
  await api.updater.check({ manual });
}

async function askToDownload(info) {
  const notes = info.releaseNotes
    ? `<div style="max-height:150px;overflow:auto;margin-top:8px;color:var(--text-dim);font-size:12.5px;line-height:1.6">${escapeHtml(info.releaseNotes)}</div>`
    : '';
  const r = await confirmDialog({
    title: t('upd.available.title'),
    text: t('upd.available.text', { current: APP_VERSION, version: `<b>${info.version}</b>` }) + notes,
    buttons: [
      { id: 'yes', label: t('upd.download'), primary: true },
      { id: 'no', label: t('upd.later') },
    ],
  });
  if (r !== 'yes') return;

  updating = true;
  toast(t('upd.downloading'));
  const res = await api.updater.download();
  if (res && res.ok) {
    toast(t('upd.downloaded'));
  } else {
    updating = false;
    toast(t('upd.downloadFailed', { msg: (res && res.message) || t('upd.unknownError') }));
  }
}

async function askToInstall(info) {
  updating = false;
  if (dirty) {
    const r = await confirmDialog({
      title: t('upd.dirty.title'),
      text: t('upd.dirty.text'),
      buttons: [
        { id: 'save', label: t('upd.saveAndRestart'), primary: true },
        { id: 'cancel', label: t('common.cancel') },
      ],
    });
    if (r !== 'save') return;
    const ok = await save();
    if (!ok) return;
  } else {
    const r = await confirmDialog({
      title: t('upd.ready.title'),
      text: t('upd.ready.text', { version: `<b>${info.version}</b>` }),
      buttons: [
        { id: 'restart', label: t('upd.restart'), primary: true },
        { id: 'later', label: t('upd.manualLater') },
      ],
    });
    if (r !== 'restart') return;
  }
  await api.updater.install();
}

function bindUpdater() {
  if (!api.onUpdaterEvent) return;
  api.onUpdaterEvent((payload) => {
    const { type, data } = payload || {};
    switch (type) {
      case 'available':
        askToDownload(data || {});
        break;
      case 'not-available':
        toast(t('upd.latest'));
        break;
      case 'progress':
        if (updating) toast(t('upd.progress', { percent: data.percent || 0 }));
        break;
      case 'downloaded':
        askToInstall(data || {});
        break;
      case 'error':
        toast(data && data.message ? data.message : t('upd.checkFailed'));
        break;
      default:
        break;
    }
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
}

/* ---------------- 语言切换 ---------------- */

let bootedLang = null;

/** 语言变化后重绘所有依赖语言的动态 UI（工具栏提示、状态栏、图表对话框、菜单） */
function handleLangChange(code) {
  applyDomI18n();
  buildRibbon(dispatch, pickLang);
  refreshChartDialog();
  if (editor) refreshUI();
  if (api.setLang) api.setLang(code);
}

/** 用户在工具栏语言下拉里选了某个语言 */
function pickLang(code) {
  const changed = setLang(code);
  if (!changed) return;
  handleLangChange(code);
}

function boot() {
  bootedLang = getLang();
  applyDomI18n();
  buildRibbon(dispatch, pickLang);
  initChartDialog();
  bindModals();
  // 把启动时的语言同步给主进程，让原生菜单与系统对话框用同一种语言
  if (api.setLang) api.setLang(bootedLang);

  editor = createEditor({
    element: $('#editor'),
    onUpdate: () => {
      setDirty(true);
      refreshUI();
    },
    onSelectionUpdate: refreshUI,
    onDropImage: insertImageFiles,
  });

  findBar = initFindBar(editor);
  bindChartEditing();
  bindDragHighlight();

  fromMarkdown(editor, welcomeText());
  setDirty(false);
  setZoom(1);
  refreshUI();
  editor.commands.focus();

  api.onMenu((channel, arg) => {
    switch (channel) {
      case 'menu:new': newDoc(); break;
      case 'menu:open': openDoc(); break;
      case 'menu:save': save(false); break;
      case 'menu:save-as': save(true); break;
      case 'menu:export-html': exportHtml(); break;
      case 'menu:export-pdf': exportPdf(); break;
      case 'menu:find': findBar?.open(); break;
      case 'menu:insert-image': dispatch('image'); break;
      case 'menu:insert-chart':
        openChartDialog(null, ({ src, alt, title }) => {
          editor.chain().focus().setImage({ src, alt, title }).run();
          toast(t('chart.inserted'));
        });
        break;
      case 'menu:insert-table': insertTable(); break;
      case 'menu:insert-link': dispatch('link'); break;
      case 'menu:insert-hr': dispatch('hr'); break;
      case 'menu:insert-codeblock': dispatch('codeBlock'); break;
      case 'menu:insert-toc': insertToc(); break;
      case 'menu:format': dispatch(arg); break;
      case 'menu:heading': dispatch(arg === 0 ? 'style:p' : 'style:h' + arg); break;
      case 'menu:zoom':
        setZoom(arg === 'in' ? zoom + 0.1 : arg === 'out' ? zoom - 0.1 : 1);
        break;
      case 'menu:check-update': checkForUpdates(true); break;
      case 'menu:lang': pickLang(arg); break;
      default: break;
    }
  });

  bindUpdater();

  api.onConfirmBeforeClose(async () => {
    const r = await confirmDialog({
      title: t('dlg.close.title'),
      text: t('dlg.close.text', { name: docName() }),
      buttons: [
        { id: 'save', label: t('common.save'), primary: true },
        { id: 'discard', label: t('common.dontSave'), danger: true },
        { id: 'cancel', label: t('common.cancel') },
      ],
    });
    if (r === 'save') {
      const ok = await save();
      if (ok) api.confirmClose();
    } else if (r === 'discard') {
      api.confirmClose();
    }
  });

  // 暴露给冒烟测试
  window.__mw = {
    editor,
    getMarkdown: () => toMarkdown(editor),
    setMarkdown: (md) => fromMarkdown(editor, md),
    dispatch,
    isDirty: () => dirty,
    path: () => currentPath,
    version: () => APP_VERSION,
    updater: { check: checkForUpdates },
    charts: { renderChartSVG, svgToPngDataUrl, sampleConfig, encodeChartConfig, decodeChartConfig },
    i18n: {
      getLang,
      setLang: pickLang,
      t,
      applyDomI18n,
      // 测试用：切换语言后读一次工具栏提示，验证 7 种语言都能正确渲染
      sample: (code) => {
        const prev = getLang();
        pickLang(code);
        const title = document.querySelector('[data-cmd="bold"]').title;
        pickLang(prev);
        return title;
      },
    },
  };
}

boot();
