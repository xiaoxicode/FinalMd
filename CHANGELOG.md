# Changelog / 更新日志

本文件记录每个版本的变更。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## 未发布 Unreleased

### 变更 Changed

- **统一项目名称**：中文名定为「**墨写**」，英文名定为「**FinalMd**」，原「墨写 Markdown」全面收窄为「墨写」
  - macOS 包名 `墨写 Markdown.app` → `墨写.app`（`CFBundleName` / `CFBundleDisplayName`）
  - Windows 快捷方式与 NSIS 安装名称 `墨写 Markdown` → `墨写`
  - 中文界面的标题（`app.title`）与欢迎文档标题 `欢迎使用「墨写 Markdown」` → `欢迎使用「墨写」`
  - npm 包名 `markdown-writer` → `finalmd`，`package-lock.json` 同步（顺带修正其落后的 version 与 license 字段）
  - README / NOTICE 补注中英文名的对应关系
  - 保留 `appId` 为 `cn.moxie.markdown` 不变，避免自动更新与系统关联失效

  > **升级提示**：macOS 上 Electron 按包名决定用户数据目录，改名后路径从
  > `~/Library/Application Support/墨写 Markdown` 变为 `~/Library/Application Support/墨写`，
  > 语言偏好等设置不会自动跟随；文档文件不受影响。

### English

- **Unified project naming**: Chinese name **墨写**, English name **FinalMd**; the former "墨写 Markdown" is shortened to "墨写" throughout
  - macOS bundle `墨写 Markdown.app` → `墨写.app` (`CFBundleName` / `CFBundleDisplayName`)
  - Windows start-menu / NSIS shortcut name `墨写 Markdown` → `墨写`
  - Chinese UI `app.title` and welcome heading now read 欢迎使用「墨写」
  - npm package renamed `markdown-writer` → `finalmd`; `package-lock.json` resynced (its stale version and license fields were fixed along the way)
  - README / NOTICE now spell out the Chinese–English name pairing
  - `appId` stays `cn.moxie.markdown` on purpose, so auto-update and file associations keep working

  > **Upgrade note**: on macOS Electron derives the user-data directory from the bundle name, so it moves from
  > `~/Library/Application Support/墨写 Markdown` to `~/Library/Application Support/墨写` and preferences such as
  > the selected language do not carry over automatically. Document files are unaffected.

### 新增 Added

- **Windows / Linux 打包支持**：补齐 `electron-builder` 的 `win` / `linux` / `nsis` 配置
  - Windows 产出 NSIS 安装包 + 免安装 portable，Linux 产出 AppImage + deb（均为 x64）
  - 新增 `assets/icon.ico`（16–256 多尺寸）与 `assets/icon.png`（512×512）
  - 新增 GitHub Actions 三平台自动发版：推送 `v*` tag 即在原生 runner 上构建并上传 Release（macOS 上 CI 构建为未签名包）
  - 新增 `npm run dist:win` / `npm run dist:linux` 本地构建命令
  - Windows / Linux 产物命名 `FinalMd-版本-{win|linux}-x64.*`，避免与 macOS 产物混淆

### 修复 Fixed

- **应用图标被上下裁剪**：`scripts/make-icon.js` 用 `capturePage` 截图时窗口被屏幕可视高度裁掉（1024 只剩约 817px），改用离屏渲染完整截图；重制 `icon.icns` / `icon.iconset`，四个圆角恢复完整

### 移除 Removed

- **移除工具栏语言切换下拉**：工具栏第二行右侧的语言选择器实际无法正常使用，予以剔除
  - 多语言能力本身完整保留，7 种语言仍可通过菜单栏「语言 / Language」单选项切换，选择依旧持久化到 `localStorage`
  - 同步清理死代码：`styles.css` 中的 `.lang-group` / `.lang-select` 样式、`buildRibbon()` 的 `onLangPick` 参数
  - 冒烟测试移除 2 项针对该下拉的断言（断言总数 66 → 64），其余多语言断言保持通过
  - README 中/英文版的「语言切换方式」描述已同步更新

### English

- **Added Windows / Linux packaging**: completed `electron-builder` `win` / `linux` / `nsis` config
  - Windows: NSIS installer + portable; Linux: AppImage + deb (x64)
  - New `assets/icon.ico` (16–256, multi-size) and `assets/icon.png` (512×512)
  - New GitHub Actions cross-platform release workflow: pushing a `v*` tag builds on native runners and uploads to the Release (macOS CI builds are unsigned)
  - New local build scripts `npm run dist:win` / `npm run dist:linux`
  - Windows / Linux artifacts are named `FinalMd-<version>-{win|linux}-x64.*`

- **Fixed a vertically cropped app icon**: `capturePage` in `scripts/make-icon.js` was clipped to the visible screen height (~817px of 1024); switched to offscreen rendering for a full capture and rebuilt `icon.icns` / `icon.iconset` with all four rounded corners intact

- **Removed the language switcher from the ribbon**: the dropdown on the right of the second ribbon row did not work in practice
  - i18n itself is untouched — all 7 languages remain switchable from the "Language" radio menu, still persisted in `localStorage`
  - Cleaned up the related dead code: `.lang-group` / `.lang-select` styles and `buildRibbon()`'s `onLangPick` parameter
  - Dropped the 2 smoke-test assertions covering the removed dropdown (66 → 64 assertions); the rest of the i18n checks still pass
  - Updated the language-switching wording in both the Chinese and English README

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
