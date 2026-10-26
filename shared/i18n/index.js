// 主进程与渲染层共用的 i18n 核心。
// 用 CommonJS 导出：主进程直接 require，渲染层由 esbuild 打包进 bundle。
const zh = require('./zh.js');
const en = require('./en.js');
const ja = require('./ja.js');
const ko = require('./ko.js');
const fr = require('./fr.js');
const de = require('./de.js');
const es = require('./es.js');

/** 支持的语言（顺序即语言选择器的显示顺序） */
const LANGS = [
  { code: 'zh', label: '简体中文', htmlLang: 'zh-CN' },
  { code: 'en', label: 'English', htmlLang: 'en' },
  { code: 'ja', label: '日本語', htmlLang: 'ja' },
  { code: 'ko', label: '한국어', htmlLang: 'ko' },
  { code: 'fr', label: 'Français', htmlLang: 'fr' },
  { code: 'de', label: 'Deutsch', htmlLang: 'de' },
  { code: 'es', label: 'Español', htmlLang: 'es' },
];

const dict = { zh, en, ja, ko, fr, de, es };
const CODES = LANGS.map((l) => l.code);
const FALLBACK = 'en';

/** 把系统语言标签（zh-Hans-CN / ja-JP / es-419 …）归一到受支持的语言代码 */
function matchLang(tag) {
  if (!tag) return null;
  const low = String(tag).toLowerCase();
  const hit = CODES.find((c) => low === c || low.startsWith(c + '-'));
  return hit || null;
}

/** 校验语言代码，非法则回落到 fallback */
function normalizeLang(code) {
  return CODES.includes(code) ? code : FALLBACK;
}

/**
 * 取翻译。缺失时依次回落到 en、zh，最后回落到 key 本身。
 * vars 中的值会替换文案里的 {name} 占位符。
 */
function t(lang, key, vars) {
  const l = normalizeLang(lang);
  let s = dict[l] && dict[l][key];
  if (s === undefined) s = dict[FALLBACK][key];
  if (s === undefined) s = dict.zh[key];
  if (s === undefined) return key;
  if (!vars) return s;
  return String(s).replace(/\{(\w+)\}/g, (m, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m,
  );
}

function htmlLangOf(code) {
  const hit = LANGS.find((l) => l.code === normalizeLang(code));
  return hit ? hit.htmlLang : 'en';
}

function labelOf(code) {
  const hit = LANGS.find((l) => l.code === normalizeLang(code));
  return hit ? hit.label : code;
}

module.exports = { LANGS, dict, CODES, FALLBACK, matchLang, normalizeLang, t, htmlLangOf, labelOf };
