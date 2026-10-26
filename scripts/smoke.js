/**
 * 冒烟测试：在真实 Electron 环境里加载渲染页面，验证
 * 1) 页面无 JS 报错  2) Markdown 序列化往返  3) 图片 Base64 内嵌往返  4) 图表生成
 */
const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain } = require('electron');

// 测试环境的 IPC（无对话框，直接读写指定路径）
ipcMain.handle('dialog:save-markdown', (_e, { filePath, content }) => {
  if (!/\.(md|markdown|mdown|txt)$/i.test(filePath)) filePath += '.md';
  fs.writeFileSync(filePath, content, 'utf8');
  return { filePath };
});

// 测试环境的自动更新 IPC（未打包，模拟开发模式的安全返回）
ipcMain.on('app:version', (e) => {
  e.returnValue = app.getVersion();
});
ipcMain.handle('updater:check', () => ({ ok: false, dev: true }));
ipcMain.handle('updater:download', () => ({ ok: false, dev: true }));
ipcMain.handle('updater:install', () => ({ ok: false, dev: true }));

const TEST = `
(async () => {
  const out = { steps: [] };
  const ok = (name, pass, detail) => out.steps.push({ name, pass, detail });
  const mw = window.__mw;
  if (!mw) return { fatal: 'window.__mw 未初始化（渲染层启动失败）' };
  const e = mw.editor;

  /* 1. Markdown 往返 */
  const md = [
    '# 一级标题',
    '',
    '这是**加粗**、*斜体*和 ~~删除线~~ 的文字，还有 \`行内代码\`。',
    '',
    '## 二级标题',
    '',
    '- 项目一',
    '- 项目二',
    '  - 子项目',
    '',
    '1. 第一步',
    '2. 第二步',
    '',
    '> 这是一段引用',
    '',
    '| 姓名 | 分数 |',
    '| --- | --- |',
    '| 张三 | 95 |',
    '| 李四 | 88 |',
    '',
    '\`\`\`js',
    'const a = 1;',
    '\`\`\`',
    '',
    '---',
    '',
    '[链接](https://example.com)',
  ].join('\\n');

  mw.setMarkdown(md);
  const out1 = mw.getMarkdown();
  out.markdownOut = out1;
  ok('标题序列化', /^#\\s*一级标题/m.test(out1), out1.split('\\n')[0]);
  ok('加粗序列化', /\\*\\*加粗\\*\\*/.test(out1), (out1.match(/\\*\\*加粗\\*\\*/) || [''])[0]);
  ok('删除线序列化', /~~删除线~~/.test(out1), (out1.match(/~~删除线~~/) || [''])[0]);
  ok('列表序列化', /^[-*]\\s*项目一/m.test(out1), (out1.match(/^[-*]\\s*项目一/m) || [''])[0]);
  ok('引用序列化', /^>\\s*这是一段引用/m.test(out1), (out1.match(/^>\\s*这是一段引用/m) || [''])[0]);
  ok('表格序列化', /\\|\\s*姓名\\s*\\|/.test(out1) && /\\|\\s*---\\s*\\|/.test(out1), (out1.match(/\\|.*姓名.*\\|/g) || []).join(' / '));
  ok('代码块序列化', /\`\`\`/.test(out1) && /const a = 1;/.test(out1), '');
  ok('分割线序列化', /(^|\\n)(---|\\*\\*\\*)/.test(out1), '');
  ok('链接序列化', /\\[链接\\]\\(https:\\/\\/example\\.com\\)/.test(out1), '');

  /* 2. 富文本格式（HTML 降级） */
  mw.setMarkdown('格式测试文本');
  e.commands.selectAll();
  e.chain().focus().toggleBold().run();
  e.chain().focus().setTextAlign('center').run();
  e.chain().focus().setColor('#d64545').run();
  e.chain().focus().setHighlight({ color: '#fff3a3' }).run();
  const out2 = mw.getMarkdown();
  out.richOut = out2;
  ok('加粗标记', /\\*\\*/.test(out2), out2.slice(0, 160));
  ok('颜色/高亮 HTML 保留', /color|mark|span/i.test(out2), out2.slice(0, 200));

  /* 3. 图片 Base64 内嵌往返 */
  const c = document.createElement('canvas');
  c.width = 8; c.height = 8;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 8, 8);
  const png = c.toDataURL('image/png');
  mw.setMarkdown('图片测试\\n\\n![](/x)\\n');
  e.chain().focus().setImage({ src: png, alt: '红块' }).run();
  const out3 = mw.getMarkdown();
  const m = out3.match(/!\\[[^\\]]*\\]\\(data:image\\/png;base64,[^)]+\\)/);
  out.imgMatch = m ? m[0].slice(0, 60) + '...' : null;
  ok('图片 Base64 输出', !!m, m ? 'data URI 长度 ' + m[0].length : out3.slice(0, 200));

  // 重新解析回来，确认图片节点仍在
  mw.setMarkdown(out3);
  let imgCount = 0;
  e.state.doc.descendants((n) => { if (n.type.name === 'image') imgCount++; });
  ok('图片解析回文档', imgCount > 0, '图片节点数 ' + imgCount);

  /* 4. 图表生成 */
  try {
    const cfg = mw.charts.sampleConfig();
    const svg = mw.charts.renderChartSVG(cfg);
    ok('图表 SVG 生成', svg.startsWith('<svg') && svg.length > 500, '长度 ' + svg.length);
    const chartPng = await mw.charts.svgToPngDataUrl(svg, 2);
    ok('图表转 PNG', chartPng.startsWith('data:image/png;base64,') && chartPng.length > 3000, 'PNG dataURL 长度 ' + chartPng.length);

    // 饼图
    const pieSvg = mw.charts.renderChartSVG({ ...cfg, type: 'pie' });
    const piePng = await mw.charts.svgToPngDataUrl(pieSvg, 2);
    ok('饼图转 PNG', piePng.startsWith('data:image/png;base64,'), '长度 ' + piePng.length);

    // 图表配置编解码（用于双击重新编辑）
    const enc = mw.charts.encodeChartConfig(cfg);
    const dec = mw.charts.decodeChartConfig(enc);
    ok('图表配置往返', dec && dec.categories.length === cfg.categories.length && dec.type === cfg.type, enc.slice(0, 40) + '...');
  } catch (err) {
    ok('图表生成', false, String(err && err.message || err));
  }

  /* 5. UI 元素 */
  ok('工具栏已渲染', document.querySelectorAll('.ribbon-group').length >= 6, '分组数 ' + document.querySelectorAll('.ribbon-group').length);
  ok('段落样式下拉', !!document.querySelector('#styleSelect'), '');
  ok('状态栏字数', /\\d+ 字/.test(document.querySelector('#statWords').textContent), document.querySelector('#statWords').textContent);

  /* 5b. 六级标题支持 */
  const sel = document.querySelector('#styleSelect');
  const optVals = Array.from(sel.options).map((o) => o.value);
  ok('下拉含 H1~H6', [1, 2, 3, 4, 5, 6].every((i) => optVals.includes('h' + i)), optVals.join(','));

  const hbtns = Array.from(document.querySelectorAll('.btn.hbtn')).map((b) => b.dataset.cmd);
  ok('工具栏有标题快捷按钮', hbtns.length === 7, hbtns.join(','));
  ok('含 H4/H5/H6 按钮', ['style:h4', 'style:h5', 'style:h6'].every((c) => hbtns.includes(c)), hbtns.slice(-3).join(','));

  // 解析 6 级 Markdown 标题
  mw.setMarkdown('# 一\\n\\n## 二\\n\\n### 三\\n\\n#### 四\\n\\n##### 五\\n\\n###### 六\\n');
  const lv = [];
  e.state.doc.descendants((n) => { if (n.type.name === 'heading') lv.push(n.attrs.level); });
  ok('解析出 H1~H6', lv.join(',') === '1,2,3,4,5,6', '实际级别 ' + lv.join(','));

  // 序列化回 Markdown
  const md6 = mw.getMarkdown();
  ok('序列化 ###### 六级', /^######\\s*六/m.test(md6), (md6.match(/^#{4,6}\\s*\\S*/m) || [''])[0]);
  ok('序列化 ##### 五级', /^#####\\s*五/m.test(md6), (md6.match(/^#####\\s*\\S*/m) || [''])[0]);
  ok('序列化 #### 四级', /^####\\s*四/m.test(md6), (md6.match(/^####\\s*\\S*/m) || [''])[0]);

  // 点击 H6 按钮切换当前段落
  mw.setMarkdown('待切换段落\\n');
  e.commands.setTextSelection(2);
  document.querySelector('[data-cmd="style:h6"]').click();
  await new Promise((r) => setTimeout(r, 120));
  ok('点击 H6 按钮生效', e.isActive('heading', { level: 6 }), '当前是否 H6: ' + e.isActive('heading', { level: 6 }));
  const selAfter = document.querySelector('#styleSelect').value;
  ok('下拉同步到 h6', selAfter === 'h6', '下拉值 ' + selAfter);
  const btnActive = document.querySelector('[data-cmd="style:h6"]').classList.contains('active');
  ok('H6 按钮高亮', btnActive, '');

  // 再点回正文
  document.querySelector('[data-cmd="style:p"]').click();
  await new Promise((r) => setTimeout(r, 120));
  ok('点击正文按钮生效', !e.isActive('heading'), '');

  /* 5c. 自动更新接线 */
  ok('更新 API 已暴露', !!(window.api.updater && typeof window.api.updater.check === 'function'), '');
  ok('更新事件订阅可用', typeof window.api.onUpdaterEvent === 'function', '');
  const ver = window.api.appVersion && window.api.appVersion();
  ok('可读取应用版本', !!ver && /^\\d+\\.\\d+/.test(String(ver)), '版本 ' + ver);
  const chk = await window.api.updater.check({ manual: true });
  ok('开发模式检查更新安全返回', !!chk && chk.dev === true, JSON.stringify(chk));
  ok('暴露更新测试入口', !!(mw.updater && typeof mw.updater.check === 'function'), '');
  const off = window.api.onUpdaterEvent(() => {});
  ok('更新事件可订阅并可退订', typeof off === 'function', '');
  if (typeof off === 'function') off();

  /* 6. 目录生成 */
  mw.setMarkdown('# 甲\\n\\n## 乙\\n\\n正文\\n');
  mw.dispatch('toc');
  const tocMd = mw.getMarkdown();
  ok('目录插入', /甲/.test(tocMd) && (tocMd.match(/甲/g) || []).length >= 2, '出现次数 ' + (tocMd.match(/甲/g) || []).length);

  /* 7. 图表对话框端到端 */
  mw.setMarkdown('图表测试段落\\n');
  mw.dispatch('chart');
  await new Promise((r) => setTimeout(r, 400));
  const maskOpen = document.querySelector('#maskChart').classList.contains('open');
  ok('图表对话框打开', maskOpen, '');
  const previewSvg = document.querySelector('#chartPreview svg');
  ok('图表预览渲染', !!previewSvg && previewSvg.children.length > 3, previewSvg ? 'SVG 子元素 ' + previewSvg.children.length : '无');
  const gridInputs = document.querySelectorAll('#chartGrid input');
  ok('数据网格可编辑', gridInputs.length >= 8, '输入框数 ' + gridInputs.length);

  const ti = document.querySelector('#chartTitle');
  ti.value = '营收图表';
  ti.dispatchEvent(new Event('input'));
  document.querySelector('#chartInsert').click();
  await new Promise((r) => setTimeout(r, 2500));
  const imgs = [];
  e.state.doc.descendants((n) => { if (n.type.name === 'image') imgs.push(n); });
  ok('图表已插入文档', imgs.length > 0, '图片节点 ' + imgs.length);
  const a = imgs[0] ? imgs[0].attrs : {};
  ok('图表带可编辑标记', String(a.title || '').startsWith('mwchart:'), String(a.title || '').slice(0, 24) + '…');
  ok('图表替代文字', a.alt === '营收图表', String(a.alt));
  ok('图表内嵌为 PNG', String(a.src || '').startsWith('data:image/png;base64,'), String(a.src || '').slice(0, 30) + '… 长度 ' + String(a.src || '').length);
  ok('对话框已关闭', !document.querySelector('#maskChart').classList.contains('open'), '');

  /* 8. 表格插入 */
  mw.setMarkdown('表格测试\\n');
  mw.dispatch('table');
  await new Promise((r) => setTimeout(r, 200));
  document.querySelector('#tableRows').value = '2';
  document.querySelector('#tableCols').value = '3';
  document.querySelector('#tableInsert').click();
  await new Promise((r) => setTimeout(r, 300));
  let tbl = 0;
  e.state.doc.descendants((n) => { if (n.type.name === 'table') tbl++; });
  ok('表格插入', tbl === 1, '表格数 ' + tbl);

  /* 9. 全部格式命令可执行 */
  mw.setMarkdown('命令测试文本');
  e.commands.selectAll();
  const cmds = ['bold', 'italic', 'underline', 'strike', 'code', 'codeBlock', 'bulletList', 'orderedList',
    'blockquote', 'hr', 'clearFormat', 'indent', 'outdent', 'style:h1', 'style:h2', 'style:p',
    'align:center', 'align:right', 'align:left', 'undo', 'redo'];
  const errs = [];
  for (const c of cmds) {
    try { mw.dispatch(c); } catch (err) { errs.push(c + ' → ' + (err && err.message || err)); }
  }
  ok('格式命令全部可用', errs.length === 0, errs.join(' | ') || cmds.length + ' 个命令');

  /* 10. 字数统计 */
  mw.setMarkdown('中文统计测试内容十个字\\n\\nHello world again.');
  await new Promise((r) => setTimeout(r, 300));
  const w = document.querySelector('#statWords').textContent;
  ok('字数统计非 0', /^([1-9]\\d*)\\s*字$/.test(w), w);

  /* 11. 保存到磁盘（真实 ⌘S 由主进程完成同样动作） */
  const c2 = document.createElement('canvas');
  c2.width = 8; c2.height = 8;
  c2.getContext('2d').fillStyle = '#3366cc';
  c2.getContext('2d').fillRect(0, 0, 8, 8);
  mw.setMarkdown('# 季度报告\\n\\n下图是营收情况：\\n');
  e.chain().focus().setImage({
    src: c2.toDataURL('image/png'),
    alt: '营收图',
    title: mw.charts.encodeChartConfig(mw.charts.sampleConfig()),
  }).run();
  const saveRes = await window.api.saveMarkdown({
    filePath: '__TEST_MD_PATH__',
    content: mw.getMarkdown(),
  });
  ok('保存 Markdown 到磁盘', !!saveRes && !!saveRes.filePath, saveRes ? saveRes.filePath : '返回 null');

  out.pass = out.steps.filter((s) => s.pass).length;
  out.total = out.steps.length;
  return out;
})()
`;

app.disableHardwareAcceleration?.();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
backgroundThrottling: false,
    },
  });

  const errors = [];
  win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    if (level >= 2) errors.push(`[${level}] ${message} @ ${sourceId}:${line}`);
  });
  win.webContents.on('did-fail-load', (_e, code, desc) => errors.push(`load failed: ${desc}`));

  await win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  await new Promise((r) => setTimeout(r, 2000));

  const testMdPath = path.join(__dirname, '..', 'test-output.md');
  const testScript = TEST.replace('__TEST_MD_PATH__', testMdPath.replace(/\\/g, '\\\\'));

  let result;
  try {
    result = await win.webContents.executeJavaScript(testScript, true);
  } catch (err) {
    result = { fatal: String(err && err.message || err) };
  }

  // 主进程读回保存的文件，模拟"重新打开"
  if (result && result.steps && fs.existsSync(path.join(__dirname, '..', 'test-output.md'))) {
    const saved = fs.readFileSync(path.join(__dirname, '..', 'test-output.md'), 'utf8');
    try {
      const rb = await win.webContents.executeJavaScript(
        `(async () => {
           const mw = window.__mw;
           mw.setMarkdown(${JSON.stringify(saved)});
           const imgs = [];
           mw.editor.state.doc.descendants((n) => { if (n.type.name === 'image') imgs.push(n); });
           return { imgs: imgs.length, editable: imgs.length > 0 && String(imgs[0].attrs.title || '').startsWith('mwchart:') };
         })()`,
        true,
      );
      result.steps.push({ name: '保存的文件读回解析', pass: saved.includes('# 季度报告') && saved.includes('data:image/png;base64') && saved.includes('mwchart:'), detail: '文件大小 ' + saved.length + ' 字节' });
      result.steps.push({ name: '读回后图表仍是图片节点', pass: rb.imgs > 0, detail: '图片节点 ' + rb.imgs });
      result.steps.push({ name: '读回后图表仍可双击编辑', pass: !!rb.editable, detail: '' });
      result.pass = result.steps.filter((s) => s.pass).length;
      result.total = result.steps.length;
    } catch (err) {
      result.steps.push({ name: '读回验证', pass: false, detail: String(err && err.message || err) });
    }
  }

  console.log('===== 冒烟测试结果 =====');
  if (result.fatal) {
    console.log('致命错误:', result.fatal);
  } else {
    result.steps.forEach((s) => {
      console.log(`${s.pass ? '✅' : '❌'} ${s.name}${s.detail ? '  →  ' + s.detail : ''}`);
    });
    console.log(`\n通过 ${result.pass}/${result.total}`);
    if (result.markdownOut) {
      console.log('\n----- Markdown 序列化输出 -----');
      console.log(result.markdownOut);
      console.log('----- 富文本输出 -----');
      console.log(result.richOut);
    }
  }
  if (errors.length) {
    console.log('\n----- 控制台错误 -----');
    errors.forEach((e) => console.log('⚠️ ' + e));
  } else {
    console.log('\n无控制台错误');
  }

  app.quit();
});
