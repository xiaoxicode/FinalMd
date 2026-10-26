// 图表引擎：配置 -> SVG -> PNG(dataURL)，不依赖任何图表库
import { t } from './i18n.js';

export const CHART_TYPES = [
  { id: 'bar', labelKey: 'chart.type.bar', icon: '<rect x="3" y="12" width="4" height="8"/><rect x="9" y="7" width="4" height="13"/><rect x="15" y="3" width="4" height="17"/>' },
  { id: 'line', labelKey: 'chart.type.line', icon: '<path d="M3 17l6-7 5 4 7-10"/><circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none"/><circle cx="14" cy="14" r="1.2" fill="currentColor" stroke="none"/>' },
  { id: 'area', labelKey: 'chart.type.area', icon: '<path d="M3 17l6-7 5 4 7-10v13H3z" fill="currentColor" opacity=".28"/><path d="M3 17l6-7 5 4 7-10"/>' },
  { id: 'hbar', labelKey: 'chart.type.hbar', icon: '<rect x="3" y="3" width="14" height="4"/><rect x="3" y="10" width="18" height="4"/><rect x="3" y="17" width="10" height="4"/>' },
  { id: 'pie', labelKey: 'chart.type.pie', icon: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M12 3a9 9 0 0 1 9 9" opacity=".5"/>' },
];

/** 图表类型的本地化名称 */
export function chartTypeLabel(id) {
  const hit = CHART_TYPES.find((c) => c.id === id);
  return hit ? t(hit.labelKey) : id;
}

export const THEMES = [
  { key: 'business', colors: ['#2f6feb', '#5aa0ff', '#8fc0ff', '#1f4fa8', '#7d5fff', '#c2dcff'] },
  { key: 'sunrise', colors: ['#e8543f', '#ff8a6b', '#f2a03d', '#b8331f', '#ffc46b', '#ffd9cc'] },
  { key: 'fresh', colors: ['#2ba36b', '#5ec98f', '#96e0b7', '#177a4c', '#8fd14f', '#ccf2df'] },
  { key: 'elegant', colors: ['#7c5cff', '#a78bfa', '#c4b5fd', '#5b3fd6', '#ec4899', '#e5ddff'] },
  { key: 'gray', colors: ['#4b5563', '#6b7280', '#9ca3af', '#1f2937', '#374151', '#d1d5db'] },
];

/** 配色方案的本地化名称 */
export function themeLabel(theme) {
  return t('theme.' + (theme && theme.key ? theme.key : 'business'));
}

const FONT = "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif";
const W = 760;
const H = 420;

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function fmt(n) {
  const v = Number(n);
  if (!isFinite(v)) return '0';
  if (Math.abs(v) >= 10000) return v.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
  return String(Math.round(v * 100) / 100);
}

function niceMax(v) {
  if (!isFinite(v) || v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const n = v / base;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return m * base;
}

function ticks(max) {
  const top = niceMax(max);
  return [0, 0.25, 0.5, 0.75, 1].map((r) => r * top);
}

const svgOpen = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">` +
  `<rect width="${W}" height="${H}" fill="#ffffff"/>`;

function title(cfg, y) {
  return cfg.title ? `<text x="${W / 2}" y="${y}" text-anchor="middle" font-size="17" font-weight="700" fill="#1f2328">${esc(cfg.title)}</text>` : '';
}

function legend(series, colors, y) {
  if (series.length <= 1) return '';
  const items = series.map((s, i) => {
    const label = esc(s.name || t('chart.series', { n: i + 1 }));
    return { label, color: colors[i % colors.length] };
  });
  // 简易横向布局：按估算宽度换行
  const est = (t) => t.length * 11 + 34;
  let line = [];
  let width = 0;
  const lines = [];
  for (const it of items) {
    if (width + est(it.label) > W - 120 && line.length) {
      lines.push(line);
      line = [];
      width = 0;
    }
    line.push(it);
    width += est(it.label) + 14;
  }
  if (line.length) lines.push(line);

  return lines
    .map((ln, li) => {
      const totalW = ln.reduce((a, it) => a + est(it.label) + 14, 0) - 14;
      let x = (W - totalW) / 2;
      return ln
        .map((it) => {
          const out =
            `<rect x="${x}" y="${y + li * 20 - 9}" width="11" height="11" rx="2" fill="${it.color}"/>` +
            `<text x="${x + 16}" y="${y + li * 20}" font-size="12" fill="#4b5563">${it.label}</text>`;
          x += est(it.label) + 14;
          return out;
        })
        .join('');
    })
    .join('');
}

/* ---------- 直角坐标系类图表 ---------- */

function axisChart(cfg, kind) {
  const cats = cfg.categories.filter((c) => c !== undefined && c !== null);
  const series = cfg.series.length ? cfg.series : [{ name: t('chart.series', { n: 1 }), values: [] }];
  const colors = THEMES[cfg.theme || 0].colors;
  const n = Math.max(cats.length, 1);

  let max = 0;
  let min = 0;
  series.forEach((s) =>
    (s.values || []).forEach((v) => {
      const num = Number(v) || 0;
      if (num > max) max = num;
      if (num < min) min = num;
    }),
  );
  if (max === 0 && min === 0) max = 1;
  const top = niceMax(Math.max(max, -min));
  const tk = [0, 0.25, 0.5, 0.75, 1].map((r) => (min < 0 ? min + r * (top - min) : r * top));

  const PT = cfg.title ? 62 : 30;
  const PB = (cfg.xLabel ? 74 : 60) + (series.length > 1 ? 22 : 0);
  const PL = cfg.yLabel ? 78 : 62;
  const PR = 34;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const yOf = (v) => PT + plotH - ((v - (min < 0 ? min : 0)) / (top - (min < 0 ? min : 0))) * plotH;
  const zeroY = yOf(0);

  let out = svgOpen() + title(cfg, 30);

  // 网格 + Y 轴刻度
  tk.forEach((t) => {
    const y = yOf(t);
    out += `<line x1="${PL}" y1="${y}" x2="${PL + plotW}" y2="${y}" stroke="#eceef1" stroke-width="1"/>`;
    out += `<text x="${PL - 10}" y="${y + 4}" text-anchor="end" font-size="11.5" fill="#6b7280">${fmt(t)}</text>`;
  });
  out += `<line x1="${PL}" y1="${PT}" x2="${PL}" y2="${PT + plotH}" stroke="#d5d8dc" stroke-width="1"/>`;
  out += `<line x1="${PL}" y1="${zeroY}" x2="${PL + plotW}" y2="${zeroY}" stroke="#c8ccd1" stroke-width="1"/>`;

  const step = plotW / n;
  const showVal = cfg.showValue !== false;

  // X 轴分类标签
  cats.forEach((c, i) => {
    if (kind === 'hbar') {
      const y = PT + step * i + step / 2;
      out += `<text x="${PL - 10}" y="${y + 4}" text-anchor="end" font-size="11.5" fill="#4b5563">${esc(c)}</text>`;
    } else {
      const x = PL + step * i + step / 2;
      out += `<text x="${x}" y="${PT + plotH + 20}" text-anchor="middle" font-size="11.5" fill="#4b5563">${esc(c)}</text>`;
    }
  });

  if (kind === 'hbar') return hbarChart(cfg);

  if (kind === 'bar') {
    const groupW = step * 0.66;
    const barW = groupW / series.length;
    cats.forEach((c, i) => {
      series.forEach((s, si) => {
        const v = Number((s.values || [])[i]) || 0;
        const h = Math.abs(yOf(v) - zeroY);
        const x = PL + step * i + step / 2 - groupW / 2 + barW * si;
        const y = v >= 0 ? zeroY - h : zeroY;
        out += `<rect x="${x}" y="${y}" width="${barW - 2}" height="${Math.max(h, 1)}" rx="2" fill="${colors[si % colors.length]}"/>`;
        if (showVal) {
          out += `<text x="${x + (barW - 2) / 2}" y="${v >= 0 ? y - 6 : y + h + 14}" text-anchor="middle" font-size="11" fill="#4b5563">${fmt(v)}</text>`;
        }
      });
    });
  } else {
    // line / area
    series.forEach((s, si) => {
      const color = colors[si % colors.length];
      const pts = cats.map((c, i) => {
        const v = Number((s.values || [])[i]) || 0;
        return [PL + step * i + step / 2, yOf(v)];
      });
      if (!pts.length) return;
      const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
      if (kind === 'area') {
        const areaD = `${d} L${pts[pts.length - 1][0].toFixed(1)} ${zeroY} L${pts[0][0].toFixed(1)} ${zeroY} Z`;
        out += `<path d="${areaD}" fill="${color}" opacity=".18"/>`;
      }
      out += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
      pts.forEach((p, i) => {
        out += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.4" fill="#fff" stroke="${color}" stroke-width="2"/>`;
        if (showVal) {
          const v = Number((s.values || [])[i]) || 0;
          out += `<text x="${p[0].toFixed(1)}" y="${(p[1] - 11).toFixed(1)}" text-anchor="middle" font-size="11" fill="#4b5563">${fmt(v)}</text>`;
        }
      });
    });
  }

  if (cfg.xLabel) {
    out += `<text x="${PL + plotW / 2}" y="${H - 30}" text-anchor="middle" font-size="12" fill="#6b7280">${esc(cfg.xLabel)}</text>`;
  }
  if (cfg.yLabel) {
    out += `<text x="16" y="${PT + plotH / 2}" text-anchor="middle" font-size="12" fill="#6b7280" transform="rotate(-90 16 ${PT + plotH / 2})">${esc(cfg.yLabel)}</text>`;
  }
  if (series.length > 1) out += legend(series, colors, H - (cfg.xLabel ? 12 : 8));

  return out + '</svg>';
}

/* ---------- 条形图（横向） ---------- */

function hbarChart(cfg) {
  const cats = cfg.categories;
  const series = cfg.series.length ? cfg.series : [{ name: t('chart.series', { n: 1 }), values: [] }];
  const colors = THEMES[cfg.theme || 0].colors;
  const n = Math.max(cats.length, 1);

  let max = 0;
  series.forEach((s) => (s.values || []).forEach((v) => {
    const num = Number(v) || 0;
    if (num > max) max = num;
  }));
  const top = niceMax(max || 1);
  const showVal = cfg.showValue !== false;

  const PT = cfg.title ? 62 : 30;
  const PB = 52 + (series.length > 1 ? 22 : 0);
  const longest = cats.reduce((a, c) => Math.max(a, String(c ?? '').length), 0);
  const PL = Math.min(140, 26 + longest * 13);
  const PR = 56;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const xOf = (v) => PL + (v / top) * plotW;

  let out = svgOpen() + title(cfg, 30);

  // 竖向网格 + X 轴刻度
  [0, 0.25, 0.5, 0.75, 1].forEach((r) => {
    const x = PL + r * plotW;
    out += `<line x1="${x.toFixed(1)}" y1="${PT}" x2="${x.toFixed(1)}" y2="${PT + plotH}" stroke="#eceef1" stroke-width="1"/>`;
    out += `<text x="${x.toFixed(1)}" y="${PT + plotH + 20}" text-anchor="middle" font-size="11.5" fill="#6b7280">${fmt(r * top)}</text>`;
  });
  out += `<line x1="${PL}" y1="${PT}" x2="${PL}" y2="${PT + plotH}" stroke="#c8ccd1" stroke-width="1"/>`;

  const step = plotH / n;
  const groupH = step * 0.68;
  const barH = groupH / series.length;

  cats.forEach((c, i) => {
    const y0 = PT + step * i + step / 2 - groupH / 2;
    out += `<text x="${PL - 10}" y="${PT + step * i + step / 2 + 4}" text-anchor="end" font-size="11.5" fill="#4b5563">${esc(c)}</text>`;
    series.forEach((s, si) => {
      const v = Number((s.values || [])[i]) || 0;
      const bw = Math.max((Math.abs(v) / top) * plotW, 1);
      const y = y0 + barH * si;
      out += `<rect x="${PL}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${(barH - 2).toFixed(1)}" rx="2" fill="${colors[si % colors.length]}"/>`;
      if (showVal) {
        out += `<text x="${(PL + bw + 6).toFixed(1)}" y="${(y + barH / 2 + 1).toFixed(1)}" font-size="11" fill="#4b5563">${fmt(v)}</text>`;
      }
    });
  });

  if (cfg.xLabel) {
    out += `<text x="${PL + plotW / 2}" y="${H - 26}" text-anchor="middle" font-size="12" fill="#6b7280">${esc(cfg.xLabel)}</text>`;
  }
  if (series.length > 1) out += legend(series, colors, H - 8);

  return out + '</svg>';
}

/* ---------- 饼图 ---------- */

function pieChart(cfg) {
  const colors = THEMES[cfg.theme || 0].colors;
  const s = cfg.series[0] || { values: [] };
  const cats = cfg.categories;
  const vals = cats.map((c, i) => Math.max(Number((s.values || [])[i]) || 0, 0));
  const total = vals.reduce((a, b) => a + b, 0);

  const PT = cfg.title ? 66 : 34;
  const legendH = cats.length > 6 ? 74 : 52;
  const cy = PT + (H - PT - legendH) / 2;
  const cx = W / 2;
  const r = Math.min((H - PT - legendH) / 2 - 14, 132);

  let out = svgOpen() + title(cfg, 32);

  if (!total) {
    out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f1f3f5"/><text x="${cx}" y="${cy}" text-anchor="middle" font-size="13" fill="#9ca3af">暂无数据</text></svg>`;
    return out;
  }

  let angle = -Math.PI / 2;
  const showVal = cfg.showValue !== false;
  vals.forEach((v, i) => {
    if (!v) return;
    const a2 = angle + (v / total) * Math.PI * 2;
    const large = a2 - angle > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    out += `<path d="M${cx} ${cy} L${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${colors[i % colors.length]}" stroke="#fff" stroke-width="2"/>`;
    if (showVal) {
      const mid = (angle + a2) / 2;
      const lr = r * 0.62;
      const lx = cx + lr * Math.cos(mid);
      const ly = cy + lr * Math.sin(mid);
      const pct = ((v / total) * 100).toFixed(1);
      out += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="12" font-weight="600" fill="#fff">${pct}%</text>`;
    }
    angle = a2;
  });

  // 图例（底部两行自适应）
  const perRow = Math.ceil(cats.length / (cats.length > 6 ? 3 : 2));
  let lx = 0;
  let ly = H - legendH + 14;
  cats.forEach((c, i) => {
    if (i > 0 && i % perRow === 0) {
      ly += 20;
      lx = 0;
    }
    const x = 30 + (lx % perRow) * ((W - 60) / perRow);
    const pct = ((vals[i] / total) * 100).toFixed(1);
    const text = `${esc(c)} ${fmt(vals[i])} (${pct}%)`;
    out += `<rect x="${x}" y="${ly - 9}" width="11" height="11" rx="2" fill="${colors[i % colors.length]}"/>`;
    out += `<text x="${x + 16}" y="${ly}" font-size="11.5" fill="#4b5563">${text}</text>`;
    lx += 1;
  });

  return out + '</svg>';
}

export function renderChartSVG(cfg) {
  if (!cfg.categories.some((c) => String(c).trim())) {
    return svgOpen() + '<text x="' + W / 2 + '" y="' + H / 2 + '" text-anchor="middle" font-size="14" fill="#9ca3af">请填写图表数据</text></svg>';
  }
  switch (cfg.type) {
    case 'pie':
      return pieChart(cfg);
    case 'line':
    case 'area':
    case 'hbar':
    case 'bar':
    default:
      return axisChart(cfg, cfg.type || 'bar');
  }
}

/** SVG 字符串 -> PNG dataURL（2 倍分辨率，保证 Markdown 内嵌后清晰且通用） */
export function svgToPngDataUrl(svg, scale = 2) {
  return new Promise((resolve, reject) => {
    try {
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = W * scale;
        canvas.height = H * scale;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e || new Error('SVG 渲染失败'));
      };
      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}

export function sampleConfig() {
  return {
    type: 'bar',
    title: t('sample.title'),
    xLabel: t('sample.xLabel'),
    yLabel: t('sample.yLabel'),
    categories: [t('sample.cat1'), t('sample.cat2'), t('sample.cat3'), t('sample.cat4')],
    series: [
      { name: t('sample.series1'), values: [120, 158, 176, 210] },
      { name: t('sample.series2'), values: [148, 182, 205, 246] },
    ],
    theme: 0,
    showValue: true,
  };
}
