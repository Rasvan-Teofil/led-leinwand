import {
  PITCH_PRESETS_MM,
  CABINET_PRESETS,
  WALL_SIZE_PRESETS,
  OFFER_PRESETS,
  gridFromWallAndCabinet,
  snapWallToCabinetGrid,
} from './calculations.js';
import { createWallConfig } from './led-wall.js';
import {
  hasMixedColumnStack,
  jinyuanWallConfig,
  mixedStackGridHint,
} from './jinyuan-offer.js';

export function bindUi(app, panelRoot, viewportRoot) {
  const els = {
    wallSelect: panelRoot.querySelector('#wall-select'),
    addWall: panelRoot.querySelector('#add-wall'),
    removeWall: panelRoot.querySelector('#remove-wall'),
    wallPreset: panelRoot.querySelector('#wall-preset'),
    wallWidth: panelRoot.querySelector('#wall-width'),
    wallHeight: panelRoot.querySelector('#wall-height'),
    cols: panelRoot.querySelector('#cab-cols'),
    rows: panelRoot.querySelector('#cab-rows'),
    cabinetPreset: panelRoot.querySelector('#cabinet-preset'),
    pitchPreset: panelRoot.querySelector('#pitch-preset'),
    pitchCustom: panelRoot.querySelector('#pitch-custom'),
    mountHeight: panelRoot.querySelector('#mount-height'),
    contentType: panelRoot.querySelector('#content-type'),
    compareMode: panelRoot.querySelector('#compare-mode'),
    pitchToggle: panelRoot.querySelector('#pitch-toggle'),
    altPitch: panelRoot.querySelector('#alt-pitch'),
    gridHint: panelRoot.querySelector('#grid-size-hint'),
    stats: panelRoot.querySelector('#stats-panel'),
    viewDistance: viewportRoot.querySelector('#view-distance'),
    viewDistanceLabel: viewportRoot.querySelector('#view-distance-label'),
    presetFirst: viewportRoot.querySelector('#view-first'),
    presetMid: viewportRoot.querySelector('#view-mid'),
    presetBack: viewportRoot.querySelector('#view-back'),
    presetTech: viewportRoot.querySelector('#view-tech'),
    planView: viewportRoot.querySelector('#view-plan'),
    fpMode: viewportRoot.querySelector('#fp-mode'),
  };

  fillPitchPresets(els.pitchPreset);
  fillCabinetPresets(els.cabinetPreset);
  fillWallPresets(els.wallPreset);

  els.addWall.addEventListener('click', () => {
    const cfg = createWallConfig({ label: `Wand ${app.walls.length + 1}` });
    app.addWall(cfg);
    app.selectedWallId = cfg.id;
    refresh();
  });

  els.removeWall.addEventListener('click', () => {
    if (app.walls.length <= 1) return;
    app.removeWall(app.selectedWallId);
    refresh();
  });

  els.wallSelect.addEventListener('change', () => {
    app.selectedWallId = els.wallSelect.value;
    syncWallFields();
    refreshStats();
  });

  els.wallPreset.addEventListener('change', () => {
    const opt = els.wallPreset.options[els.wallPreset.selectedIndex];
    if (opt?.dataset?.offerId === 'jinyuan-p391') {
      app.updateSelectedWall(jinyuanWallConfig());
      refresh();
      return;
    }
    const idx = els.wallPreset.selectedIndex - OFFER_PRESETS.length - 1;
    if (idx < 0) return;
    const p = WALL_SIZE_PRESETS[idx];
    if (!p) return;
    const cab = CABINET_PRESETS[els.cabinetPreset.selectedIndex] ?? CABINET_PRESETS[0];
    const grid = gridFromWallAndCabinet(p.w, p.h, cab.w, cab.h);
    els.cols.value = grid.cols;
    els.rows.value = grid.rows;
    applyGrid(p.w, p.h);
  });

  function updateMixedStackHint(config) {
    const hint = mixedStackGridHint(config);
    if (!hint) return;
    els.wallWidth.value = config.widthM;
    els.wallHeight.value = hint.heightM;
    els.cols.value = config.cols;
    els.rows.value = config.columnStack.length;
    els.cabinetPreset.selectedIndex = 1;
    if (els.gridHint) {
      els.gridHint.textContent = `Effektive Wandgröße: ${hint.label}`;
      els.gridHint.classList.remove('warn');
    }
  }

  const applyWallSize = () => {
    if (hasMixedColumnStack(app.getSelectedWall()?.config)) return;
    const w = parseFloat(els.wallWidth.value);
    const h = parseFloat(els.wallHeight.value);
    const cab = CABINET_PRESETS[els.cabinetPreset.selectedIndex] ?? CABINET_PRESETS[0];
    const cols = Math.max(1, Math.round(w / cab.w));
    const rows = Math.max(1, Math.round(h / cab.h));
    els.cols.value = cols;
    els.rows.value = rows;
    applyGrid(w, h);
  };

  els.wallWidth.addEventListener('change', applyWallSize);
  els.wallHeight.addEventListener('change', applyWallSize);
  els.cols.addEventListener('change', () => applyGrid());
  els.rows.addEventListener('change', () => applyGrid());
  els.cabinetPreset.addEventListener('change', () => applyGrid());

  function applyGrid(targetW, targetH) {
    const selected = app.getSelectedWall();
    if (selected && hasMixedColumnStack(selected.config)) {
      updateMixedStackHint(selected.config);
      refresh();
      return;
    }
    const cab = CABINET_PRESETS[els.cabinetPreset.selectedIndex] ?? CABINET_PRESETS[0];
    const cols = parseInt(els.cols.value, 10);
    const rows = parseInt(els.rows.value, 10);
    const snap = snapWallToCabinetGrid(
      cols,
      rows,
      cab.w,
      cab.h,
      targetW ?? parseFloat(els.wallWidth.value),
      targetH ?? parseFloat(els.wallHeight.value)
    );
    app.applyGridFromInputs(snap.cols, snap.rows, cab.w, cab.h);
    els.wallWidth.value = snap.widthM;
    els.wallHeight.value = snap.heightM;
    if (els.gridHint) {
      els.gridHint.textContent = `Effektive Wandgröße: ${snap.effectiveLabel}`;
      els.gridHint.classList.toggle('warn', snap.mismatch);
      if (snap.mismatch && targetW != null) {
        els.gridHint.textContent += ` — Soll ${targetW}×${targetH} m weicht vom Raster ab.`;
      }
    }
    refresh();
  }

  els.pitchPreset.addEventListener('change', () => {
    const v = parseFloat(els.pitchPreset.value);
    if (!Number.isNaN(v)) {
      els.pitchCustom.value = v;
      app.updateSelectedWall({ pitchMm: v });
      refresh();
    }
  });

  els.pitchCustom.addEventListener('change', () => {
    const v = parseFloat(els.pitchCustom.value);
    if (v > 0) {
      app.updateSelectedWall({ pitchMm: v });
      refresh();
    }
  });

  els.mountHeight.addEventListener('change', () => {
    const w = app.getSelectedWall();
    const h = parseFloat(els.mountHeight.value);
    if (w && !Number.isNaN(h)) els.mountHeight.value = app.setMountHeight(w, h);
  });

  els.contentType.addEventListener('change', () => {
    app.updateSelectedWall({ content: els.contentType.value });
    refreshStats();
  });

  els.compareMode.addEventListener('change', () => {
    app.setCompareMode(els.compareMode.checked);
    refresh();
  });

  els.pitchToggle.addEventListener('change', () => {
    app.applyPitchToggle(els.pitchToggle.checked);
    refreshStats();
  });

  els.altPitch.addEventListener('change', () => {
    app.setAltPitch(parseFloat(els.altPitch.value));
    refreshStats();
  });

  els.viewDistance.min = 1;
  els.viewDistance.max = app.getMaxViewDistanceM().toFixed(1);
  els.viewDistance.value = app.getViewDistanceM();
  els.viewDistance.addEventListener('input', () => {
    const d = parseFloat(els.viewDistance.value);
    app.setViewDistanceM(d);
    els.viewDistanceLabel.textContent = `${d.toFixed(1)} m`;
    markActiveView(null);
  });

  const presetButtons = [
    [els.presetFirst, 'first'],
    [els.presetMid, 'mid'],
    [els.presetBack, 'back'],
    [els.presetTech, 'tech'],
  ];
  for (const [btn, preset] of presetButtons) {
    btn.addEventListener('click', () => {
      app.setViewPreset(preset);
      syncDistanceSlider();
      markActiveView(btn);
    });
  }

  els.planView.addEventListener('click', () => {
    app.setPlanView(true);
    markActiveView(els.planView);
  });

  els.fpMode.addEventListener('click', () => {
    app.enableFirstPerson(true);
    markActiveView(els.fpMode);
  });

  function markActiveView(active) {
    for (const btn of [...presetButtons.map(([b]) => b), els.planView, els.fpMode]) {
      btn.classList.toggle('active', btn === active);
    }
  }
  markActiveView(els.presetFirst);

  function syncDistanceSlider() {
    const d = app.getViewDistanceM();
    els.viewDistance.value = d;
    els.viewDistanceLabel.textContent = `${d.toFixed(1)} m`;
  }
  app.orbit.addEventListener('change', syncDistanceSlider);

  function syncWallFields() {
    const w = app.getSelectedWall();
    if (!w) return;
    const c = w.config;
    els.wallWidth.value = c.widthM;
    els.wallHeight.value = c.heightM;
    els.cols.value = c.cols;
    els.rows.value = c.columnStack?.length ?? c.rows;
    els.pitchCustom.value = c.pitchMm;
    els.mountHeight.value = c.mountHeightM;
    els.contentType.value = c.content;
  }

  function refreshWallSelect() {
    els.wallSelect.innerHTML = '';
    for (const w of app.walls) {
      const opt = document.createElement('option');
      opt.value = w.config.id;
      opt.textContent = `${w.config.label} (${w.config.pitchMm} mm)`;
      els.wallSelect.appendChild(opt);
    }
    els.wallSelect.value = app.selectedWallId;
    els.removeWall.disabled = app.walls.length <= 1;
  }

  function refreshStats() {
    els.stats.innerHTML = app.buildStatsHtml();
  }

  function refresh() {
    refreshWallSelect();
    syncWallFields();
    const w = app.getSelectedWall();
    if (w && hasMixedColumnStack(w.config)) {
      updateMixedStackHint(w.config);
    }
    refreshStats();
    syncDistanceSlider();
  }

  refreshWallSelect();
  syncWallFields();
  const initial = app.getSelectedWall();
  if (initial && hasMixedColumnStack(initial.config)) {
    updateMixedStackHint(initial.config);
    refreshStats();
  } else {
    applyGrid();
  }
  syncDistanceSlider();
}

function fillPitchPresets(select) {
  for (const p of PITCH_PRESETS_MM) {
    const o = document.createElement('option');
    o.value = p;
    o.textContent = `${p} mm`;
    select.appendChild(o);
  }
  select.value = '3.91';
}

function fillCabinetPresets(select) {
  for (const c of CABINET_PRESETS) {
    const o = document.createElement('option');
    o.value = c.w;
    o.textContent = c.label;
    select.appendChild(o);
  }
}

function fillWallPresets(select) {
  const empty = document.createElement('option');
  empty.textContent = '— Preset wählen —';
  select.appendChild(empty);
  for (const p of OFFER_PRESETS) {
    const o = document.createElement('option');
    o.textContent = p.label;
    o.dataset.offerId = p.id;
    select.appendChild(o);
  }
  for (const p of WALL_SIZE_PRESETS) {
    const o = document.createElement('option');
    o.textContent = p.label;
    select.appendChild(o);
  }
  select.selectedIndex = 1;
}
