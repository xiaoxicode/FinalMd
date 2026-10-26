import { CHART_TYPES, THEMES, renderChartSVG, svgToPngDataUrl, sampleConfig } from './charts.js';
import { openModal, closeModal } from './ui.js';

const $ = (sel) => document.querySelector(sel);

let cfg = sampleConfig();
let onInsertCb = null;
let editingNode = null; // 若来自已有图表，记录待替换的位置信息

export const CHART_TAG = 'mwchart:';

export function encodeChartConfig(config) {
  const json = JSON.stringify(config);
  return CHART_TAG + btoa(unescape(encodeURIComponent(json)));
}

export function decodeChartConfig(title) {
  if (!title || !title.startsWith(CHART_TAG)) return null;
  try {
    const json = decodeURIComponent(escape(atob(title.slice(CHART_TAG.length))));
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.categories)) return null;
    // 补齐字段，兼容旧数据
    return {
      type: parsed.type || 'bar',
      title: parsed.title || '',
      xLabel: parsed.xLabel || '',
      yLabel: parsed.yLabel || '',
      categories: parsed.categories,
      series: (parsed.series || []).map((s) => ({ name: s.name || '', values: s.values || [] })),
      theme: parsed.theme || 0,
      showValue: parsed.showValue !== false,
    };
  } catch {
    return null;
  }
}

function renderTypes() {
  const box = $('#chartTypes');
  box.innerHTML = CHART_TYPES.map(
    (t) =>
      `<div class="chart-type${t.id === cfg.type ? ' active' : ''}" data-type="${t.id}">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg>
         ${t.label}
       </div>`,
  ).join('');
  box.querySelectorAll('[data-type]').forEach((el) => {
    el.onclick = () => {
      cfg.type = el.dataset.type;
      renderTypes();
      renderPreview();
    };
  });
}

function renderThemes() {
  const box = $('#chartThemes');
  box.innerHTML = THEMES.map(
    (t, i) =>
      `<div class="theme-pick${i === cfg.theme ? ' active' : ''}" data-theme="${i}" title="${t.name}">
         ${t.colors.slice(0, 4).map((c) => `<i style="background:${c}"></i>`).join('')}
       </div>`,
  ).join('');
  box.querySelectorAll('[data-theme]').forEach((el) => {
    el.onclick = () => {
      cfg.theme = Number(el.dataset.theme);
      renderThemes();
      renderPreview();
    };
  });
}

function renderGrid() {
  const grid = $('#chartGrid');
  const head =
    '<tr><th>分类</th>' +
    cfg.series
      .map(
        (s, i) =>
          `<th><div style="display:flex;align-items:center;gap:2px">
             <input value="${escapeAttr(s.name)}" data-series-name="${i}" placeholder="系列${i + 1}"/>
             ${cfg.series.length > 1 ? `<button data-del-series="${i}" title="删除系列">✕</button>` : ''}
           </div></th>`,
      )
      .join('') +
    '<th style="width:34px"></th></tr>';

  const rows = cfg.categories
    .map(
      (c, ri) =>
        '<tr>' +
        `<td><input value="${escapeAttr(c)}" data-cat="${ri}" placeholder="分类名"/></td>` +
        cfg.series
          .map(
            (s, si) =>
              `<td><input value="${escapeAttr(s.values[ri] ?? '')}" data-cell="${ri}-${si}" placeholder="0"/></td>`,
          )
          .join('') +
        `<td class="del"><button data-del-row="${ri}" title="删除该行">✕</button></td>` +
        '</tr>',
    )
    .join('');

  grid.innerHTML = `<thead>${head}</thead><tbody>${rows}</tbody>`;

  grid.querySelectorAll('[data-cat]').forEach((el) => {
    el.oninput = () => {
      cfg.categories[Number(el.dataset.cat)] = el.value;
      renderPreview();
    };
  });
  grid.querySelectorAll('[data-series-name]').forEach((el) => {
    el.oninput = () => {
      cfg.series[Number(el.dataset.seriesName)].name = el.value;
      renderPreview();
    };
  });
  grid.querySelectorAll('[data-cell]').forEach((el) => {
    el.oninput = () => {
      const [ri, si] = el.dataset.cell.split('-').map(Number);
      cfg.series[si].values[ri] = el.value === '' ? '' : Number(el.value) || 0;
      renderPreview();
    };
  });
  grid.querySelectorAll('[data-del-series]').forEach((el) => {
    el.onclick = () => {
      cfg.series.splice(Number(el.dataset.delSeries), 1);
      renderGrid();
      renderPreview();
    };
  });
  grid.querySelectorAll('[data-del-row]').forEach((el) => {
    el.onclick = () => {
      const ri = Number(el.dataset.delRow);
      cfg.categories.splice(ri, 1);
      cfg.series.forEach((s) => s.values.splice(ri, 1));
      renderGrid();
      renderPreview();
    };
  });
}

function renderPreview() {
  $('#chartPreview').innerHTML = renderChartSVG(cfg);
}

function escapeAttr(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function openChartDialog(initial, onInsert) {
  cfg = initial || sampleConfig();
  onInsertCb = onInsert;
  editingNode = initial ? true : null;

  $('#chartTitle').value = cfg.title || '';
  $('#chartXLabel').value = cfg.xLabel || '';
  $('#chartYLabel').value = cfg.yLabel || '';
  $('#chartShowValue').value = cfg.showValue ? '1' : '0';

  renderTypes();
  renderThemes();
  renderGrid();
  renderPreview();
  openModal('maskChart');
}

export function initChartDialog() {
  $('#chartTitle').oninput = (e) => {
    cfg.title = e.target.value;
    renderPreview();
  };
  $('#chartXLabel').oninput = (e) => {
    cfg.xLabel = e.target.value;
    renderPreview();
  };
  $('#chartYLabel').oninput = (e) => {
    cfg.yLabel = e.target.value;
    renderPreview();
  };
  $('#chartShowValue').onchange = (e) => {
    cfg.showValue = e.target.value === '1';
    renderPreview();
  };
  $('#addSeries').onclick = () => {
    cfg.series.push({ name: `系列${cfg.series.length + 1}`, values: cfg.categories.map(() => 0) });
    renderGrid();
    renderPreview();
  };
  $('#addCategory').onclick = () => {
    cfg.categories.push(`分类${cfg.categories.length + 1}`);
    cfg.series.forEach((s) => s.values.push(0));
    renderGrid();
    renderPreview();
  };
  $('#resetChart').onclick = () => {
    cfg = sampleConfig();
    $('#chartTitle').value = cfg.title;
    $('#chartXLabel').value = cfg.xLabel;
    $('#chartYLabel').value = cfg.yLabel;
    renderTypes();
    renderThemes();
    renderGrid();
    renderPreview();
  };

  $('#chartInsert').onclick = async () => {
    const svg = renderChartSVG(cfg);
    $('#chartInsert').disabled = true;
    $('#chartInsert').textContent = '生成中…';
    try {
      const dataUrl = await svgToPngDataUrl(svg, 2);
      onInsertCb?.({
        src: dataUrl,
        alt: cfg.title || '图表',
        title: encodeChartConfig(cfg),
      });
      closeModal('maskChart');
    } catch (err) {
      console.error(err);
      alert('图表生成失败：' + (err.message || err));
    } finally {
      $('#chartInsert').disabled = false;
      $('#chartInsert').textContent = '插入图表';
    }
  };
}

export function currentConfig() {
  return cfg;
}
