// 渲染层 i18n 适配：语言持久化、监听器、DOM 属性扫描。
import core from '../../shared/i18n/index.js';

const {
  LANGS, CODES, t: translate, matchLang, normalizeLang, htmlLangOf, labelOf,
} = core;

export { LANGS, CODES, htmlLangOf, labelOf };

const STORAGE_KEY = 'finalmd.lang';
let current = null;
const listeners = [];

function readSaved() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && CODES.includes(v) ? v : null;
  } catch {
    return null;
  }
}

/** 优先级：用户上次的选择 → 系统语言 → en */
export function detectLang() {
  const saved = readSaved();
  if (saved) return saved;
  const nav = navigator.language || (navigator.languages && navigator.languages[0]) || '';
  return matchLang(nav) || 'en';
}

export function getLang() {
  if (!current) current = detectLang();
  return current;
}

export function t(key, vars) {
  return translate(getLang(), key, vars);
}

export function onLangChange(cb) {
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i >= 0) listeners.splice(i, 1);
  };
}

/**
 * 切换语言：持久化 + 刷新 DOM 静态文案 + 通知订阅者。
 * 返回是否真的发生了变化。
 */
export function setLang(code) {
  const next = normalizeLang(code);
  const changed = next !== getLang();
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* 隐私模式下 localStorage 可能不可用，忽略即可 */
  }
  applyDomI18n();
  if (changed) listeners.forEach((cb) => cb(next));
  return changed;
}

/** 语言代码变化后，同步 <html lang> 与窗口标题 */
function syncDocumentMeta() {
  document.documentElement.setAttribute('lang', htmlLangOf(getLang()));
  document.title = t('app.title');
}

/**
 * 扫描 DOM 上的 i18n 属性并写入当前语言的文案。
 * data-i18n → textContent / data-i18n-html → innerHTML
 * data-i18n-title → title / data-i18n-ph → placeholder / data-i18n-aria → aria-label
 */
export function applyDomI18n(root = document) {
  syncDocumentMeta();
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  root.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
}

/** 工具：把本地化文案拼上快捷键提示，统一成「加粗 (⌘B)」的样子 */
export function withAccel(key, accel) {
  const label = t(key);
  return accel ? `${label} (${accel})` : label;
}
