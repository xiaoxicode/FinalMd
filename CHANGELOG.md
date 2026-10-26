# Changelog / 更新日志

本文件记录每个版本的变更。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## 1.0.1 — 2026-10-26

### 新增 Added

- **界面多语言支持（7 种）**：简体中文、English、日本語、한국어、Français、Deutsch、Español
  - 覆盖范围：工具栏提示、段落样式下拉、原生菜单、状态栏、所有弹窗、系统文件对话框、欢迎文档、图表类型与配色名称
  - 工具栏右侧新增语言下拉；菜单栏新增「语言 / Language」单选项，两个入口双向同步
  - 选择持久化到 `localStorage`；首次启动按系统语言自动匹配，不支持的语言回落到 English
- 新增 `npm run i18n` 校验脚本：检查 7 个语言文件的 key 集合、占位符、空值是否一致
- 冒烟测试新增 14 项多语言断言（合计 66 项）

### 修复 Fixed

- 工具栏重建时重复叠加点击监听器，导致切换语言后 H1~H6、加粗等按钮点击无响应
- 打包产物中的非 ASCII 文案被转义为 `\uXXXX`，改用 esbuild `--charset=utf8`

### 变更 Changed

- 版本号 `1.0.0` → `1.0.1`
- `NOTICE` 补充版本号、第三方组件及其许可证清单（Electron、TipTap、tiptap-markdown、electron-updater、esbuild 均为 MIT）
- 新增 `shared/i18n/` 目录，主进程与渲染层共用同一份词典

### English

- **UI localized into 7 languages**: Simplified Chinese, English, Japanese, Korean, French, German, Spanish
  - Covers toolbar tooltips, paragraph style dropdown, native menus, status bar, all dialogs, system file dialogs, welcome document, chart types and palette names
  - New language selector on the ribbon plus a "Language" radio menu; both stay in sync
  - The choice is persisted in `localStorage`; first launch follows the system language, unsupported languages fall back to English
- Added an `npm run i18n` consistency check (key sets, placeholders, empty values)
- 14 new smoke-test assertions for i18n (66 in total)
- Fixed duplicated toolbar click listeners that made H1–H6 buttons unresponsive after switching language
- Fixed non-ASCII strings being escaped to `\uXXXX` in the bundle (`--charset=utf8`)

---

## 1.0.0 — 2026-10-26

### 新增 Added

- 首个正式版本
- 所见即所得编辑：输入 `#`、`-`、`>` 等 Markdown 快捷语法即时渲染，不显示标记符号
- Word / WPS 风格功能区：段落样式下拉、¶ 与 H1~H6 快捷按钮、字体颜色、荧光笔、对齐、缩进、列表
- 六级标题（⌘1~⌘6，⌘0 回正文）
- 图片：本地选择、拖拽、⌘V 粘贴，自动内嵌 base64，超过 380KB 自动压缩
- 图表：自研 SVG 引擎，支持柱状图 / 折线图 / 面积图 / 条形图 / 饼图，双击图表可回来改数据
- 表格、链接、分割线、代码块、自动生成目录
- 查找替换、字数 / 字符 / 行数统计、缩放
- 保存为标准 `.md`，导出 HTML / PDF
- macOS 打包（Developer ID 公证分发）与 Mac App Store 备用配置
- 接入 electron-updater 自动更新（有未保存文档时先引导保存）

### English

- First stable release
- WYSIWYG editing: Markdown shortcuts render as you type, no markup symbols shown
- Word-style ribbon: paragraph styles, ¶ and H1–H6 buttons, font color, highlighter, alignment, indent, lists
- Six heading levels (⌘1–⌘6, ⌘0 for body text)
- Images from disk, drag & drop or ⌘V, embedded as base64, auto-compressed above 380KB
- Charts via a hand-written SVG engine (bar / line / area / horizontal bar / pie); double-click to edit data later
- Tables, links, horizontal rules, code blocks, auto-generated table of contents
- Find & replace, word / character / line count, zoom
- Saves standard `.md`, exports HTML and PDF
- macOS packaging (Developer ID notarization) with a Mac App Store configuration kept on standby
- electron-updater auto-update, asking to save unsaved work first
