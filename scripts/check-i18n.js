#!/usr/bin/env node
/**
 * i18n 一致性校验：
 * 1) 七个语言文件的 key 集合必须与基准语言（zh）完全一致
 * 2) 同一 key 的占位符（{name}）集合必须一致，否则运行时替换会漏掉
 * 3) 不允许空字符串
 * 用法：node scripts/check-i18n.js
 */
const path = require('path');
const { LANGS, dict, t, matchLang, normalizeLang, CODES } = require('../shared/i18n/index.js');

const BASE = 'zh';
const baseKeys = Object.keys(dict[BASE]);
const baseSet = new Set(baseKeys);

const placeholders = (s) => (String(s).match(/\{(\w+)\}/g) || []).sort().join(',');

let failed = 0;
const fail = (msg) => {
  console.log('❌ ' + msg);
  failed++;
};

console.log(`基准语言：${BASE}（${baseKeys.length} 个 key）`);

for (const { code, label } of LANGS) {
  if (code === BASE) continue;
  const d = dict[code];
  if (!d) {
    fail(`${code} 词典缺失`);
    continue;
  }
  const keys = Object.keys(d);
  const missing = baseKeys.filter((k) => !(k in d));
  const extra = keys.filter((k) => !baseSet.has(k));
  if (missing.length) fail(`${code}(${label}) 缺少 ${missing.length} 个 key：${missing.slice(0, 6).join(', ')}`);
  if (extra.length) fail(`${code}(${label}) 多出 ${extra.length} 个 key：${extra.slice(0, 6).join(', ')}`);

  let phBad = 0;
  let empty = 0;
  for (const k of baseKeys) {
    if (!(k in d)) continue;
    if (String(d[k]).trim() === '') {
      empty++;
      if (empty <= 3) fail(`${code} 的 "${k}" 为空`);
    }
    if (placeholders(d[k]) !== placeholders(dict[BASE][k])) {
      phBad++;
      if (phBad <= 3) {
        fail(`${code} 的 "${k}" 占位符不一致：基准 {${placeholders(dict[BASE][k])}} vs 本地 {${placeholders(d[k])}}`);
      }
    }
  }
  if (!missing.length && !extra.length && !phBad && !empty) {
    console.log(`✅ ${code} ${label}：${keys.length} 个 key，占位符与空值检查通过`);
  }
}

/* t() 与语言匹配的基本行为 */
const cases = [
  [t('ja', 'tb.bold'), '太字'],
  [t('ko', 'tb.bold'), '굵게'],
  [t('fr', 'tb.bold'), 'Gras'],
  [t('de', 'tb.bold'), 'Fett'],
  [t('es', 'tb.bold'), 'Negrita'],
  [t('zh', 'tb.bold'), '加粗'],
  [t('en', 'tb.bold'), 'Bold'],
  [t('zh', 'stat.words', { n: 12 }), '12 字'],
  [t('en', 'stat.words', { n: 12 }), '12 words'],
  [t('fr', 'upd.progress', { percent: 40 }), 'Téléchargement… 40 %'],
];
for (const [got, want] of cases) {
  if (got !== want) fail(`t() 结果不符：期望 "${want}"，实际 "${got}"`);
}

const matchCases = [
  ['zh-Hans-CN', 'zh'],
  ['zh-TW', 'zh'],
  ['en-US', 'en'],
  ['ja-JP', 'ja'],
  ['ko-KR', 'ko'],
  ['fr-FR', 'fr'],
  ['de-AT', 'de'],
  ['es-419', 'es'],
  ['pt-BR', null],
];
for (const [tag, want] of matchCases) {
  const got = matchLang(tag);
  if (got !== want) fail(`matchLang("${tag}") 期望 ${want}，实际 ${got}`);
}
if (normalizeLang('xx') !== 'en') fail('非法语言代码未回落到 en');
if (CODES.length !== 7) fail(`语言数量应为 7，实际 ${CODES.length}`);

console.log('');
if (failed) {
  console.log(`共 ${failed} 项问题`);
  process.exit(1);
}
console.log('i18n 校验全部通过（7 种语言）');
