import { createEditor, toMarkdown, fromMarkdown, fileToDataUrl, stats } from './editor.js';
import {
  buildRibbon, updateToolbarState, openModal, closeModal, toast, confirmDialog,
  initFindBar, openColorPopover, openHighlightPopover, indentParagraph, outdentParagraph,
  buildTocHtml, isModalOpen,
} from './ui.js';
import { initChartDialog, openChartDialog, decodeChartConfig, encodeChartConfig } from './chart-dialog.js';
import { renderChartSVG, svgToPngDataUrl, sampleConfig } from './charts.js';

const $ = (s) => document.querySelector(s);
const api = window.api;
const APP_VERSION = (api.appVersion && api.appVersion()) || '1.0.0';

let editor = null;
let currentPath = null;
let dirty = false;
let zoom = 1;
let findBar = null;

const docName = () => (currentPath ? currentPath.split(/[\\/]/).pop() : '未命名文档.md');

/* ---------------- 状态 ---------------- */

function setDirty(v) {
  dirty = !!v;
  api.setDirty(dirty);
  api.setTitle(docName());
  $('#docTitle').textContent = docName().replace(/\.(md|markdown|mdown|txt)$/i, '');
  $('#docPath').textContent = currentPath || '';
  const st = $('#saveState');
  st.textContent = dirty ? '未保存' : '已保存';
  st.classList.toggle('dirty', dirty);
  $('#statPath').textContent = currentPath || '尚未保存到磁盘';
}

function updateStats() {
  const s = stats(editor);
  const text = editor.getText();
  const cn = (text.match(/[一-龥]/g) || []).length;
  const en = (text.replace(/[一-龥]/g, ' ').match(/[A-Za-z0-9_'’-]+/g) || []).length;
  $('#statWords').textContent = `${cn + en} 字`;
  $('#statChars').textContent = `${text.replace(/\s/g, '').length} 字符`;
  $('#statLines').textContent = `${s.lines} 行`;
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
  if (n) toast(`已内嵌插入 ${n} 张图片`);
}

function insertImageUrl(url, alt) {
  if (!url) return;
  editor.chain().focus().setImage({ src: url, alt: alt || '' }).run();
}

/* ---------------- 文件操作 ---------------- */

async function newDoc() {
  if (dirty) {
    const r = await confirmDialog({
      title: '新建文档',
      text: '当前文档有未保存的修改，是否先保存？',
      buttons: [
        { id: 'save', label: '保存', primary: true },
        { id: 'discard', label: '不保存', danger: true },
        { id: 'cancel', label: '取消' },
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
      title: '打开文档',
      text: '当前文档有未保存的修改，是否先保存？',
      buttons: [
        { id: 'save', label: '保存', primary: true },
        { id: 'discard', label: '不保存', danger: true },
        { id: 'cancel', label: '取消' },
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
  toast('已打开 ' + docName());
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
  toast('已保存为 Markdown');
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
  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${docName().replace(/\.(md|markdown|mdown|txt)$/i, '')}</title>
<style>${css}</style></head><body>\n${body}\n</body></html>`;
  const res = await api.exportFile({
    defaultPath: docName().replace(/\.(md|markdown|mdown|txt)$/i, '') + '.html',
    filters: [{ name: '网页', extensions: ['html'] }],
    content: html,
  });
  if (res) toast('已导出 HTML');
}

async function exportPdf() {
  const res = await api.printToPdf();
  if (res) toast('已导出 PDF');
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
    toast('文档中没有标题，无法生成目录');
    return;
  }
  editor.chain().focus().insertContent(html).run();
  toast('已插入目录');
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
      toast('图表已插入');
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

const WELCOME = `# 欢迎使用「墨写 Markdown」

这是一个**所见即所得**的 Markdown 写作器：你看到的排版就是最终效果，不会显示任何 # 或 * 之类的标记符号，操作方式和 Word、WPS 一致。

## 快速上手

- 输入 \`#\` 加空格，立刻变成一级标题
- 输入 \`-\` 加空格，变成项目符号列表
- 输入 \`>\` 加空格，变成引用块
- 选中文字后点击工具栏按钮，即可加粗、改颜色、加突出显示

## 插入内容

点击工具栏上的按钮即可插入：

1. 图片 —— 支持本地文件、拖拽、直接粘贴，会内嵌进 Markdown
2. 图表 —— 柱状图、折线图、饼图等，插入后双击还能回来改数据
3. 表格、链接、代码块、分割线、目录

> 所有内容最终都会保存为 \`.md\` 文件，图片与图表以 Base64 内嵌，单个文件即可完整带走。

按 ⌘S 保存，试试看吧。
`;

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
    toast(`已插入 ${files.length} 张图片`);
  };

  $('#imageInsert').onclick = () => {
    const url = $('#imageUrl').value.trim();
    const alt = $('#imageAlt').value.trim();
    if (url) {
      insertImageUrl(url, alt);
      closeModal('maskImage');
      toast('已插入图片');
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
      toast('图表已更新');
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
  if (manual) toast('正在检查更新…');
  await api.updater.check({ manual });
}

async function askToDownload(info) {
  const notes = info.releaseNotes
    ? `<div style="max-height:150px;overflow:auto;margin-top:8px;color:var(--text-dim);font-size:12.5px;line-height:1.6">${escapeHtml(info.releaseNotes)}</div>`
    : '';
  const r = await confirmDialog({
    title: '发现新版本',
    text: `当前版本 v${APP_VERSION}，新版本 <b>v${info.version}</b> 已发布。是否立即下载更新？${notes}`,
    buttons: [
      { id: 'yes', label: '下载更新', primary: true },
      { id: 'no', label: '以后再说' },
    ],
  });
  if (r !== 'yes') return;

  updating = true;
  toast('开始下载更新…');
  const res = await api.updater.download();
  if (res && res.ok) {
    toast('更新已下载完成');
  } else {
    updating = false;
    toast('下载失败：' + ((res && res.message) || '未知错误'));
  }
}

async function askToInstall(info) {
  updating = false;
  if (dirty) {
    const r = await confirmDialog({
      title: '有未保存的修改',
      text: '安装更新需要重启应用。请先保存当前文档，再安装更新。<br/>要现在保存吗？',
      buttons: [
        { id: 'save', label: '保存并重启更新', primary: true },
        { id: 'cancel', label: '取消' },
      ],
    });
    if (r !== 'save') return;
    const ok = await save();
    if (!ok) return;
  } else {
    const r = await confirmDialog({
      title: '更新已就绪',
      text: `新版本 <b>v${info.version}</b> 已下载完成，重启应用即可生效。`,
      buttons: [
        { id: 'restart', label: '立即重启更新', primary: true },
        { id: 'later', label: '稍后手动重启' },
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
        toast('当前已是最新版本');
        break;
      case 'progress':
        if (updating) toast('正在下载更新… ' + (data.percent || 0) + '%');
        break;
      case 'downloaded':
        askToInstall(data || {});
        break;
      case 'error':
        toast(data && data.message ? data.message : '检查更新失败');
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

function boot() {
  buildRibbon(dispatch);
  initChartDialog();
  bindModals();

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

  fromMarkdown(editor, WELCOME);
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
          toast('图表已插入');
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
      default: break;
    }
  });

  bindUpdater();

  api.onConfirmBeforeClose(async () => {
    const r = await confirmDialog({
      title: '保存更改？',
      text: `是否保存对「${docName()}」的修改？<br/>不保存的话，这些改动将会丢失。`,
      buttons: [
        { id: 'save', label: '保存', primary: true },
        { id: 'discard', label: '不保存', danger: true },
        { id: 'cancel', label: '取消' },
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
  };
}

boot();
