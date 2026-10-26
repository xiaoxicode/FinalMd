import { ICONS, TEXT_ICONS, headingIcon, PARAGRAPH_ICON } from './icons.js';

const $ = (sel) => document.querySelector(sel);
const FULL_SPACE = '　　'; // 两个全角空格 = 首行缩进

const TEXT_COLORS = [
  '#1f2328', '#d64545', '#e07b39', '#c9a227', '#2ba36b', '#2f6feb',
  '#7c5cff', '#c2478f', '#6b7280', '#0f766e', '#a16207', '#0369a1',
];

const HL_COLORS = ['#fff3a3', '#ffd8a8', '#ffc9c9', '#c8f0d2', '#cfe3ff', '#e6d8ff', '#e8eaed', '#ffd6f0'];

/* ---------------- 通用 UI 工具 ---------------- */

let toastTimer = null;
export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
}

export function openModal(id) {
  const mask = document.getElementById(id);
  if (mask) mask.classList.add('open');
}
export function closeModal(id) {
  const mask = document.getElementById(id);
  if (mask) mask.classList.remove('open');
}
export function isModalOpen(id) {
  const mask = document.getElementById(id);
  return !!mask && mask.classList.contains('open');
}

/** 通用确认框，返回被点击按钮的 id */
export function confirmDialog({ title = '确认', text = '', buttons = [] }) {
  return new Promise((resolve) => {
    $('#confirmTitle').textContent = title;
    $('#confirmText').innerHTML = text;
    const foot = $('#confirmFoot');
    foot.innerHTML = '';
    buttons.forEach((b) => {
      const el = document.createElement('button');
      el.className = 'btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : '');
      el.textContent = b.label;
      el.onclick = () => {
        closeModal('maskConfirm');
        resolve(b.id);
      };
      foot.appendChild(el);
    });
    openModal('maskConfirm');
  });
}

/* ---------------- 工具栏 ---------------- */

const GROUPS = [
  {
    row: 1,
    items: [
      { cmd: 'new', icon: ICONS.new, title: '新建 (⌘N)' },
      { cmd: 'open', icon: ICONS.open, title: '打开 (⌘O)' },
      { cmd: 'save', icon: ICONS.save, title: '保存为 Markdown (⌘S)' },
    ],
  },
  {
    row: 1,
    items: [
      { cmd: 'undo', icon: ICONS.undo, title: '撤销 (⌘Z)' },
      { cmd: 'redo', icon: ICONS.redo, title: '重做 (⌘⇧Z)' },
    ],
  },
  { row: 1, styleSelect: true },
  {
    row: 1,
    headingButtons: true,
  },
  {
    row: 1,
    items: [
      { cmd: 'bold', icon: ICONS.bold, title: '加粗 (⌘B)' },
      { cmd: 'italic', icon: ICONS.italic, title: '斜体 (⌘I)' },
      { cmd: 'underline', icon: ICONS.underline, title: '下划线 (⌘U)' },
      { cmd: 'strike', icon: ICONS.strike, title: '删除线' },
      { cmd: 'color', icon: TEXT_ICONS.color, title: '字体颜色', cls: 'color-btn' },
      { cmd: 'highlight', icon: TEXT_ICONS.highlight, title: '突出显示', cls: 'color-btn' },
      { cmd: 'clearFormat', icon: TEXT_ICONS.clear, title: '清除格式' },
    ],
  },
  {
    row: 2,
    items: [
      { cmd: 'bulletList', icon: ICONS.bulletList, title: '项目符号列表' },
      { cmd: 'orderedList', icon: ICONS.orderedList, title: '编号列表' },
    ],
  },
  {
    row: 2,
    items: [
      { cmd: 'outdent', icon: ICONS.outdent, title: '减少缩进' },
      { cmd: 'indent', icon: ICONS.indent, title: '增加缩进' },
    ],
  },
  {
    row: 2,
    items: [
      { cmd: 'align:left', icon: ICONS.alignLeft, title: '左对齐' },
      { cmd: 'align:center', icon: ICONS.alignCenter, title: '居中' },
      { cmd: 'align:right', icon: ICONS.alignRight, title: '右对齐' },
      { cmd: 'align:justify', icon: ICONS.alignJustify, title: '两端对齐' },
    ],
  },
  {
    row: 2,
    items: [
      { cmd: 'blockquote', icon: ICONS.quote, title: '引用' },
      { cmd: 'code', icon: ICONS.code, title: '行内代码' },
      { cmd: 'codeBlock', icon: ICONS.codeBlock, title: '代码块' },
      { cmd: 'hr', icon: ICONS.hr, title: '分割线' },
    ],
  },
  {
    row: 2,
    items: [
      { cmd: 'link', icon: ICONS.link, title: '插入链接 (⌘K)' },
      { cmd: 'table', icon: ICONS.table, title: '插入表格' },
      { cmd: 'image', icon: ICONS.image, title: '插入图片 (⌘⇧I)' },
      { cmd: 'chart', icon: ICONS.chart, title: '插入图表 (⌘⇧C)' },
      { cmd: 'toc', icon: ICONS.toc, title: '插入目录' },
      { cmd: 'find', icon: ICONS.find, title: '查找替换 (⌘F)' },
    ],
  },
];

function makeButton(item) {
  const b = document.createElement('button');
  b.className = 'btn' + (item.cls ? ' ' + item.cls : '');
  b.title = item.title;
  b.dataset.cmd = item.cmd;
  b.innerHTML = item.icon;
  return b;
}

export function buildRibbon(onCommand) {
  const r1 = $('#ribbonRow1');
  const r2 = $('#ribbonRow2');
  r1.innerHTML = '';
  r2.innerHTML = '';

  GROUPS.forEach((g) => {
    const box = document.createElement('div');
    box.className = 'ribbon-group';
    if (g.styleSelect) {
      const sel = document.createElement('select');
      sel.className = 'style-select';
      sel.id = 'styleSelect';
      sel.innerHTML = [
        '<option value="p">正文</option>',
        '<option value="h1">标题 1</option>',
        '<option value="h2">标题 2</option>',
        '<option value="h3">标题 3</option>',
        '<option value="h4">标题 4</option>',
        '<option value="h5">标题 5</option>',
        '<option value="h6">标题 6</option>',
        '<option value="quote">引用</option>',
      ].join('');
      sel.onchange = () => onCommand('style:' + sel.value);
      box.appendChild(sel);
    } else if (g.headingButtons) {
      box.classList.add('heading-group');
      box.appendChild(
        makeButton({ cmd: 'style:p', icon: PARAGRAPH_ICON, title: '正文 (⌘0)', cls: 'hbtn' }),
      );
      for (let lv = 1; lv <= 6; lv++) {
        box.appendChild(
          makeButton({
            cmd: 'style:h' + lv,
            icon: headingIcon(lv),
            title: `标题 ${lv} (⌘${lv})`,
            cls: 'hbtn',
          }),
        );
      }
    } else {
      g.items.forEach((it) => box.appendChild(makeButton(it)));
    }
    (g.row === 1 ? r1 : r2).appendChild(box);
  });

  // 让工具栏点击不抢走编辑器焦点
  [r1, r2].forEach((row) => {
    row.addEventListener('mousedown', (e) => {
      if (e.target.closest('button') || e.target.closest('select')) e.preventDefault();
    });
    row.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cmd]');
      if (btn) onCommand(btn.dataset.cmd);
    });
  });
}

export function updateToolbarState(editor) {
  ['bold', 'italic', 'underline', 'strike', 'bulletList', 'orderedList', 'blockquote', 'code', 'codeBlock'].forEach(
    (cmd) => {
      const el = document.querySelector(`[data-cmd="${cmd}"]`);
      if (el) el.classList.toggle('active', editor.isActive(cmd));
    },
  );
  ['left', 'center', 'right', 'justify'].forEach((a) => {
    const el = document.querySelector(`[data-cmd="align:${a}"]`);
    if (el) el.classList.toggle('active', editor.isActive({ textAlign: a }));
  });

  const sel = $('#styleSelect');
  if (sel) {
    let v = 'p';
    for (let i = 1; i <= 6; i++) if (editor.isActive('heading', { level: i })) v = 'h' + i;
    if (editor.isActive('blockquote')) v = 'quote';
    sel.value = v;
  }

  // 标题级别快捷按钮的选中态（H1~H6 与正文互斥）
  ['style:p', 'style:h1', 'style:h2', 'style:h3', 'style:h4', 'style:h5', 'style:h6'].forEach((cmd) => {
    const el = document.querySelector(`[data-cmd="${cmd}"]`);
    if (!el) return;
    const on = cmd === 'style:p' ? sel && sel.value === 'p' : sel && sel.value === cmd.slice(6);
    el.classList.toggle('active', !!on);
  });

  const undoBtn = document.querySelector('[data-cmd="undo"]');
  const redoBtn = document.querySelector('[data-cmd="redo"]');
  if (undoBtn) undoBtn.disabled = !editor.can().undo();
  if (redoBtn) redoBtn.disabled = !editor.can().redo();
}

/* ---------------- 颜色 / 高亮 弹出面板 ---------------- */

let popover = null;

function closePopover() {
  if (popover) {
    popover.remove();
    popover = null;
  }
}

function showPopover(anchor, inner, wire) {
  closePopover();
  const el = document.createElement('div');
  el.className = 'popover open';
  el.innerHTML = inner;
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  el.style.position = 'fixed';
  el.style.left = Math.min(r.left, window.innerWidth - el.offsetWidth - 12) + 'px';
  el.style.top = r.bottom + 6 + 'px';
  wire(el);
  popover = el;
  setTimeout(() => {
    document.addEventListener('mousedown', outsideHandler);
  }, 0);
}

function outsideHandler(e) {
  if (popover && !popover.contains(e.target)) {
    closePopover();
    document.removeEventListener('mousedown', outsideHandler);
  }
}

export function openColorPopover(anchor, editor) {
  const swatches = TEXT_COLORS.map(
    (c) => `<div class="swatch-item" data-color="${c}" style="background:${c}"></div>`,
  ).join('');
  showPopover(
    anchor,
    `<div class="swatches">${swatches}</div>
     <div class="row"><span>自定义</span><input type="color" id="customColor" value="#2f6feb" style="width:36px;height:24px;border:1px solid var(--border);border-radius:4px;background:none;padding:0"></div>
     <div class="row"><button data-act="clear">恢复默认颜色</button></div>`,
    (el) => {
      el.querySelectorAll('[data-color]').forEach((s) => {
        s.onclick = () => {
          editor.chain().focus().setColor(s.dataset.color).run();
          closePopover();
        };
      });
      el.querySelector('#customColor').oninput = (ev) => {
        editor.chain().focus().setColor(ev.target.value).run();
      };
      el.querySelector('[data-act="clear"]').onclick = () => {
        editor.chain().focus().unsetColor().run();
        closePopover();
      };
    },
  );
}

export function openHighlightPopover(anchor, editor) {
  const swatches = HL_COLORS.map(
    (c) => `<div class="swatch-item" data-color="${c}" style="background:${c}"></div>`,
  ).join('');
  showPopover(
    anchor,
    `<div class="swatches">${swatches}</div>
     <div class="row"><button data-act="clear">取消突出显示</button></div>`,
    (el) => {
      el.querySelectorAll('[data-color]').forEach((s) => {
        s.onclick = () => {
          editor.chain().focus().setHighlight({ color: s.dataset.color }).run();
          closePopover();
        };
      });
      el.querySelector('[data-act="clear"]').onclick = () => {
        editor.chain().focus().unsetHighlight().run();
        closePopover();
      };
    },
  );
}

/* ---------------- 查找 / 替换 ---------------- */

export function initFindBar(editor) {
  const bar = $('#findbar');
  const input = $('#findInput');
  const replace = $('#replaceInput');
  const count = $('#findCount');

  const close = () => {
    bar.classList.remove('open');
    editor.commands.focus();
  };

  const search = () => {
    const term = input.value;
    if (!term) {
      count.textContent = '';
      return;
    }
    const text = editor.getText();
    let n = 0;
    let i = 0;
    while ((i = text.indexOf(term, i)) !== -1) {
      n++;
      i += term.length;
    }
    count.textContent = n ? `共 ${n} 处` : '无匹配';
  };

  const go = (dir) => {
    const term = input.value;
    if (!term) return;
    const { doc, selection } = editor.state;
    const from = dir > 0 ? selection.to : selection.from;
    let found = null;
    const ranges = [];
    doc.descendants((node, pos) => {
      if (!node.isText) return;
      const t = node.text;
      let idx = 0;
      while ((idx = t.indexOf(term, idx)) !== -1) {
        ranges.push({ from: pos + idx, to: pos + idx + term.length });
        idx += term.length;
      }
    });
    if (!ranges.length) {
      count.textContent = '无匹配';
      return;
    }
    if (dir > 0) found = ranges.find((r) => r.from >= from) || ranges[0];
    else found = [...ranges].reverse().find((r) => r.from < from) || ranges[ranges.length - 1];
    editor.chain().focus().setTextSelection(found).scrollIntoView().run();
    count.textContent = `共 ${ranges.length} 处`;
  };

  const doReplace = (all) => {
    const term = input.value;
    if (!term) return;
    const rep = replace.value;
    if (all) {
      const md = editor.storage.markdown.getMarkdown();
      const next = md.split(term).join(rep);
      editor.commands.setContent(next);
      toast('已全部替换');
    } else {
      const { selection } = editor.state;
      const selText = editor.state.doc.textBetween(selection.from, selection.to);
      if (selText === term) {
        editor.chain().focus().insertContent(rep).run();
        go(1);
      } else {
        go(1);
      }
    }
    search();
  };

  input.oninput = search;
  input.onkeydown = (e) => {
    if (e.key === 'Enter') go(e.shiftKey ? -1 : 1);
    if (e.key === 'Escape') close();
  };
  $('#findNext').onclick = () => go(1);
  $('#findPrev').onclick = () => go(-1);
  $('#replaceOne').onclick = () => doReplace(false);
  $('#replaceAll').onclick = () => doReplace(true);
  $('#findClose').onclick = close;

  return {
    open() {
      bar.classList.add('open');
      const selText = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
      );
      if (selText) input.value = selText;
      input.focus();
      input.select();
      search();
    },
    close,
  };
}

/* ---------------- 段落级操作 ---------------- */

export function indentParagraph(editor) {
  const { $from } = editor.state.selection;
  const depth = $from.depth === 0 ? 1 : $from.depth;
  const start = $from.start(depth);
  editor.chain().focus().insertContentAt(start, FULL_SPACE).setTextSelection(start + FULL_SPACE.length).run();
}

export function outdentParagraph(editor) {
  const { state } = editor;
  const { $from } = state.selection;
  const depth = $from.depth === 0 ? 1 : $from.depth;
  const start = $from.start(depth);
  const head = state.doc.textBetween(start, Math.min(start + 2, state.doc.content.size), '\n');
  if (head === FULL_SPACE || /^\s\s/.test(head)) {
    editor.chain().focus().deleteRange({ from: start, to: start + 2 }).run();
  }
}

/** 由文档标题生成目录列表 */
export function buildTocHtml(editor) {
  const items = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'heading') {
      items.push({ level: node.attrs.level, text: node.textContent });
    }
  });
  if (!items.length) return null;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const li = items
    .map((i) => `<li style="margin-left:${(i.level - 1) * 18}px">${esc(i.text) || '（无标题文本）'}</li>`)
    .join('');
  return `<ul>${li}</ul>`;
}

export { FULL_SPACE };
