import {
  PITCH_PRESETS_MM,
  CABINET_PRESETS,
  WALL_SIZE_PRESETS,
  OFFER_PRESETS,
  gridFromWallAndCabinet,
  snapWallToCabinetGrid,
} from './calculations.js';
import { createWallConfig } from './led-wall.js';
import { jinyuanWallConfig } from './jinyuan-offer.js';

export function bindUi(app, root) {
  const els = {
    roomDepth: root.querySelector('#room-depth'),
    roomWidth: root.querySelector('#room-width'),
    roomHeight: root.querySelector('#room-height'),
    wallSelect: root.querySelector('#wall-select'),
    addWall: root.querySelector('#add-wall'),
    removeWall: root.querySelector('#remove-wall'),
    wallPreset: root.querySelector('#wall-preset'),
    wallWidth: root.querySelector('#wall-width'),
    wallHeight: root.querySelector('#wall-height'),
    cols: root.querySelector('#cab-cols'),
    rows: root.querySelector('#cab-rows'),
    cabinetPreset: root.querySelector('#cabinet-preset'),
    pitchPreset: root.querySelector('#pitch-preset'),
    pitchCustom: root.querySelector('#pitch-custom'),
    mountHeight: root.querySelector('#mount-height'),
    contentType: root.querySelector('#content-type'),
    compareMode: root.querySelector('#compare-mode'),
    pitchToggle: root.querySelector('#pitch-toggle'),
    altPitch: root.querySelector('#alt-pitch'),
    gridHint: root.querySelector('#grid-size-hint'),
    stats: root.querySelector('#stats-panel'),
    viewDistance: root.querySelector('#view-distance'),
    viewDistanceLabel: root.querySelector('#view-distance-label'),
    presetFirst: root.querySelector('#view-first'),
    presetMid: root.querySelector('#view-mid'),
    presetBack: root.querySelector('#view-back'),
    presetTech: root.querySelector('#view-tech'),
    fpMode: root.querySelector('#fp-mode'),
  };

  fillPitchPresets(els.pitchPreset);
  fillCabinetPresets(els.cabinetPreset);
  fillWallPresets(els.wallPreset);

  els.roomDepth.value = app.roomDims.hallDepthM;
  els.roomWidth.value = app.roomDims.hallWidthM;
  els.roomHeight.value = app.roomDims.roomHeightM;

  const onRoomChange = () => {
    app.setRoomDims({
      hallDepthM: parseFloat(els.roomDepth.value),
      hallWidthM: parseFloat(els.roomWidth.value),
      roomHeightM: parseFloat(els.roomHeight.value),
    });
    els.viewDistance.max = app.roomDims.hallWidthM - 2;
    refresh();
  };
  els.roomDepth.addEventListener('change', onRoomChange);
  els.roomWidth.addEventListener('change', onRoomChange);
  els.roomHeight.addEventListener('change', onRoomChange);

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

  const applyWallSize = () => {
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
    if (w) w.setMountHeight(h);
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

  els.viewDistance.max = app.roomDims.hallWidthM - 2;
  els.viewDistance.value = app.getViewDistanceM();
  els.viewDistance.addEventListener('input', () => {
    const d = parseFloat(els.viewDistance.value);
    app.setViewDistanceM(d);
    els.viewDistanceLabel.textContent = `${d.toFixed(1)} m`;
  });

  els.presetFirst.addEventListener('click', () => {
    app.setViewPreset('first');
    syncDistanceSlider();
  });
  els.presetMid.addEventListener('click', () => {
    app.setViewPreset('mid');
    syncDistanceSlider();
  });
  els.presetBack.addEventListener('click', () => {
    app.setViewPreset('back');
    syncDistanceSlider();
  });
  els.presetTech.addEventListener('click', () => {
    app.setViewPreset('tech');
    syncDistanceSlider();
  });

  els.fpMode.addEventListener('click', () => {
    app.enableFirstPerson(true);
  });

  function syncDistanceSlider() {
    const d = app.getViewDistanceM();
    els.viewDistance.value = d;
    els.viewDistanceLabel.textContent = `${d.toFixed(1)} m`;
  }

  function syncWallFields() {
    const w = app.getSelectedWall();
    if (!w) return;
    const c = w.config;
    els.wallWidth.value = c.widthM;
    els.wallHeight.value = c.heightM;
    els.cols.value = c.cols;
    els.rows.value = c.rows;
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
    refreshStats();
    syncDistanceSlider();
  }

  refreshWallSelect();
  syncWallFields();
  applyGrid();
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
