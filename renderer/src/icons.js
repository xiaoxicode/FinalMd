// 线性风格图标集（24x24，继承 currentColor）
const wrap = (body) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  new: wrap(
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 11v6M9 14h6"/>',
  ),
  open: wrap('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 11h18"/>'),
  save: wrap(
    '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  ),
  bold: wrap('<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/>'),
  italic: wrap('<path d="M19 4h-9M14 20H5M15 4L9 20"/>'),
  underline: wrap('<path d="M6 4v6a6 6 0 0 0 12 0V4M4 21h16"/>'),
  strike: wrap('<path d="M4 12h16"/><path d="M16.5 7.5A4 4 0 0 0 13 5h-2a3 3 0 0 0-2.2 5"/><path d="M7.5 16.5A4 4 0 0 0 11 19h2a3 3 0 0 0 2.2-5"/>'),
  code: wrap('<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>'),
  codeBlock: wrap('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M10 9l-2 3 2 3M14 9l2 3-2 3"/>'),
  quote: wrap('<path d="M4 5v14" stroke-width="3"/><path d="M10 8h10M10 12h10M10 16h6"/>'),
  bulletList: wrap('<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r="1.2" fill="currentColor" stroke="none"/>'),
  orderedList: wrap('<path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 5h1v4M3.5 9H5.5M4 13h2l-2 3h2"/>'),
  alignLeft: wrap('<path d="M4 6h16M4 12h10M4 18h14"/>'),
  alignCenter: wrap('<path d="M4 6h16M7 12h10M5 18h14"/>'),
  alignRight: wrap('<path d="M4 6h16M10 12h10M6 18h14"/>'),
  alignJustify: wrap('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  outdent: wrap('<path d="M21 6H11M21 12h-6M11 18H21"/><path d="M3 9l4 3-4 3"/>'),
  indent: wrap('<path d="M11 6h10M11 12h4M11 18h10"/><path d="M7 9l-4 3 4 3"/>'),
  link: wrap('<path d="M10 13a5 5 0 0 0 7.5.5l2-2A5 5 0 0 0 12.5 4.5L11 6"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2A5 5 0 0 0 11.5 19.5L13 18"/>'),
  image: wrap('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="M21 15l-5-5L5 21"/>'),
  chart: wrap('<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" fill="currentColor" stroke="none"/><rect x="12" y="8" width="3" height="10" fill="currentColor" stroke="none"/><rect x="17" y="5" width="3" height="13" fill="currentColor" stroke="none"/>'),
  table: wrap('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>'),
  hr: wrap('<path d="M3 12h18"/><path d="M7 8h10M7 16h10" opacity=".35"/>'),
  undo: wrap('<path d="M3 8v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.5 2.8L3 13"/>'),
  redo: wrap('<path d="M21 8v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.5 2.8L21 13"/>'),
  find: wrap('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>'),
  toc: wrap('<path d="M4 6h16M4 12h12M4 18h8"/><circle cx="18" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="14" cy="18" r="1" fill="currentColor" stroke="none"/>'),
  exportHtml: wrap('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13l4 4 4-4M12 17V9"/>'),
  pdf: wrap('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 17v-4h1.5a1.5 1.5 0 0 1 0 3H8M14 17v-4h2a1.5 1.5 0 0 1 0 3h-2"/>'),
  close: wrap('<path d="M18 6L6 18M6 6l12 12"/>'),
  trash: wrap('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'),
  plus: wrap('<path d="M12 5v14M5 12h14"/>'),
};

// 标题级别按钮：H1~H6，字号随级别递减，直观对应 Word 的「标题 1~6」
export function headingIcon(level) {
  const size = [15, 14, 13, 12, 11.5, 11][level - 1] || 12;
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <text x="12" y="17" font-size="${size}" font-weight="700" text-anchor="middle"
          fill="currentColor" font-family="Helvetica, Arial, sans-serif">H${level}</text>
  </svg>`;
}

// 正文按钮：¶ 段落符号
export const PARAGRAPH_ICON =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
  '<path d="M11 5v14M7 5v14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
  '<path d="M11 5h4a4 4 0 0 1 0 8h-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';

// 字体颜色 / 高亮这类图标用字形表示，更贴近 Office 习惯
export const TEXT_ICONS = {
  color:
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><text x="12" y="16" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor" font-family="Georgia, serif">A</text><path d="M4.5 20.5h15" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  highlight:
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 14h16" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity=".35"/><path d="M7 17l6-11 3 2-6 11z" fill="currentColor" opacity=".9"/><path d="M3.5 20.5h17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  clear:
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><text x="12" y="17" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor" font-family="Georgia, serif">Tx</text><path d="M5 20.5h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".5"/></svg>',
};
