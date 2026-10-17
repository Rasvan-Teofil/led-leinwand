import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/OrbitControls.js';
import { PointerLockControls } from '../vendor/three/PointerLockControls.js';
import {
  attachAudienceChairs,
  buildRoom,
  defaultRoomDims,
  ensureChairTemplate,
  resolveRoomLayout,
} from './room.js';
import { LedWallMesh, createWallConfig } from './led-wall.js';
import {
  viewingDistanceRuleOfThumb,
  aspectRatioString,
  formatM,
} from './calculations.js';
import {
  JINYUAN_OFFER_ID,
  JINYUAN_QUOTE,
  jinyuanOfferStats,
  jinyuanWallConfig,
} from './jinyuan-offer.js';

export class LedVisualizerApp {
  constructor(canvas) {
    this.canvas = canvas;
    this.roomDims = defaultRoomDims();
    this.layout = resolveRoomLayout({
      hallWidthM: this.roomDims.hallWidthM,
      hallDepthM: this.roomDims.hallDepthM,
      roomHeightM: this.roomDims.roomHeightM,
      scale: this.roomDims.scale ?? 1,
    });
    this.walls = [];
    this.selectedWallId = null;
    this.compareMode = false;
    this.pitchToggle = false;
    this.altPitchMm = 1.9;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setClearColor(0x1a1a22, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a22);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    this._applyViewPreset('ersteReihe');

    this.orbit = new OrbitControls(this.camera, canvas);
    this._syncOrbitTarget();
    this.orbit.enableDamping = true;
    this.orbit.maxPolarAngle = Math.PI * 0.49;

    this.fpControls = null;
    this.fpMode = false;
    this._keys = {};
    this._fpVelocity = new THREE.Vector3();
    this._fpDirection = new THREE.Vector3();

    this._setupLights();
    this.roomGroup = null;
    this.chairTemplatePromise = ensureChairTemplate();
    this.rebuildRoom();

    const w1 = createWallConfig({
      ...jinyuanWallConfig({
        mountHeightM: this.layout.ledWall.defaultMountHeightM,
      }),
    });
    this.addWall(w1);
    this.selectedWallId = w1.id;

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => {
      this._keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      this._keys[e.code] = false;
    });
    this.resize();
    this._animate();
  }

  _syncOrbitTarget() {
    const L = this.layout;
    const x = L.ledPlaneX ?? L.wallX;
    this.orbit.target.set(x + 2, 2.2, 0);
  }

  _applyLedWallTransform(wall) {
    const L = this.layout;
    wall.group.position.x = L.ledWall.anchorX;
    wall.group.rotation.y = Math.PI / 2;
    wall.setMountHeight(wall.config.mountHeightM);
    wall.setOffsetXM(wall.config.offsetXM);
  }

  _setupLights() {
    const amb = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(amb);
    const dir = new THREE.DirectionalLight(0xfff5e8, 0.85);
    dir.position.set(4, 12, 8);
    dir.castShadow = true;
    this.scene.add(dir);
    const fill = new THREE.DirectionalLight(0xc8d8ff, 0.25);
    fill.position.set(-6, 4, -2);
    this.scene.add(fill);
  }

  rebuildRoom() {
    if (this.roomGroup) {
      this.scene.remove(this.roomGroup);
    }
    this.layout = resolveRoomLayout({
      hallWidthM: this.roomDims.hallWidthM / (this.roomDims.scale ?? 1),
      hallDepthM: this.roomDims.hallDepthM / (this.roomDims.scale ?? 1),
      roomHeightM: this.roomDims.roomHeightM,
      scale: this.roomDims.scale ?? 1,
    });
    this.roomGroup = buildRoom(this.roomDims);
    this.scene.add(this.roomGroup);
    this._syncOrbitTarget();
    for (const w of this.walls) {
      this._applyLedWallTransform(w);
    }
    this.chairTemplatePromise.then((tpl) =>
      attachAudienceChairs(this.roomGroup, tpl)
    );
  }

  setRoomDims(dims) {
    Object.assign(this.roomDims, dims);
    this.rebuildRoom();
  }

  addWall(config) {
    const wall = new LedWallMesh(config, this.scene);
    this.scene.add(wall.group);
    this._applyLedWallTransform(wall);
    this.walls.push(wall);
    this._layoutWalls();
    return wall;
  }

  removeWall(id) {
    const idx = this.walls.findIndex((w) => w.config.id === id);
    if (idx === -1) return;
    const w = this.walls[idx];
    this.scene.remove(w.group);
    w.dispose();
    this.walls.splice(idx, 1);
    if (this.selectedWallId === id) {
      this.selectedWallId = this.walls[0]?.config.id ?? null;
    }
    this._layoutWalls();
  }

  getSelectedWall() {
    return this.walls.find((w) => w.config.id === this.selectedWallId);
  }

  updateSelectedWall(partial) {
    const w = this.getSelectedWall();
    if (!w) return;
    w.updateConfig(partial);
    this._applyLedWallTransform(w);
    this._layoutWalls();
  }

  setCompareMode(on) {
    this.compareMode = on;
    if (on && this.walls.length < 2) {
      const base = this.getSelectedWall()?.config ?? createWallConfig();
      const second = createWallConfig({
        label: 'Vergleich',
        widthM: base.widthM,
        heightM: base.heightM,
        pitchMm: 1.9,
        cols: base.cols,
        rows: base.rows,
        mountHeightM: base.mountHeightM,
        offsetXM: 0,
        content: base.content,
      });
      this.addWall(second);
    }
    if (!on && this.walls.length > 1) {
      const keep = this.getSelectedWall() ?? this.walls[0];
      for (const w of [...this.walls]) {
        if (w.config.id !== keep.config.id) this.removeWall(w.config.id);
      }
    }
    this._layoutWalls();
  }

  applyPitchToggle(active) {
    this.pitchToggle = active;
    const w = this.getSelectedWall();
    if (!w) return;
    if (active) {
      if (!w._savedPitch) w._savedPitch = w.config.pitchMm;
      w.setPitchMm(this.altPitchMm);
    } else if (w._savedPitch) {
      w.setPitchMm(w._savedPitch);
      w._savedPitch = null;
    }
  }

  setAltPitch(mm) {
    this.altPitchMm = mm;
    if (this.pitchToggle) this.applyPitchToggle(true);
  }

  _layoutWalls() {
    if (this.walls.length === 0) return;
    if (this.compareMode && this.walls.length >= 2) {
      const gap = 0.35;
      let totalZ = 0;
      for (const w of this.walls) totalZ += w.config.widthM;
      totalZ += gap * (this.walls.length - 1);
      let z = -totalZ / 2;
      for (const w of this.walls) {
        w.setOffsetXM(z + w.config.widthM / 2);
        z += w.config.widthM + gap;
      }
    } else if (this.walls.length === 1) {
      this.walls[0].setOffsetXM(0);
    }
  }

  applyGridFromInputs(cols, rows, cabW, cabH) {
    this.updateSelectedWall({
      cols,
      rows,
      cabinetWM: cabW,
      cabinetHM: cabH,
      widthM: cols * cabW,
      heightM: rows * cabH,
    });
  }

  getViewDistanceM() {
    const planeX = this.layout.ledPlaneX ?? this.layout.wallX;
    return Math.max(0.5, this.camera.position.x - planeX);
  }

  setViewDistanceM(dist) {
    const planeX = this.layout.ledPlaneX ?? this.layout.wallX;
    const z = this.camera.position.z;
    this.camera.position.set(planeX + dist, 1.65, z);
    this._syncOrbitTarget();
    this.orbit.update();
  }

  setViewPreset(preset) {
    this._applyViewPreset(preset);
    this._syncOrbitTarget();
    this.orbit.update();
  }

  _applyViewPreset(preset) {
    const map = {
      first: 'ersteReihe',
      mid: 'mitte',
      back: 'letzteReihe',
      tech: 'techPult',
    };
    const key = map[preset] ?? preset;
    const vp = this.layout.viewpoints[key];
    if (!vp) return;
    this.camera.position.set(vp.x, 1.65, vp.z);
  }

  enableFirstPerson(on) {
    this.fpMode = on;
    this.orbit.enabled = !on;
    if (on) {
      if (!this.fpControls) {
        this.fpControls = new PointerLockControls(this.camera, this.canvas);
      }
      this.canvas.requestPointerLock?.();
    } else {
      document.exitPointerLock?.();
    }
  }

  _updateFp(delta) {
    if (!this.fpMode || !this.fpControls?.isLocked) return;
    const speed = 4 * delta;
    this._fpVelocity.x -= this._fpVelocity.x * 8 * delta;
    this._fpVelocity.z -= this._fpVelocity.z * 8 * delta;
    this._fpDirection.set(0, 0, 0);
    if (this._keys.KeyW) this._fpDirection.z -= 1;
    if (this._keys.KeyS) this._fpDirection.z += 1;
    if (this._keys.KeyA) this._fpDirection.x -= 1;
    if (this._keys.KeyD) this._fpDirection.x += 1;
    if (this._fpDirection.lengthSq() > 0) {
      this._fpDirection.normalize();
      const move = this._fpDirection.clone().applyQuaternion(this.camera.quaternion);
      move.y = 0;
      move.normalize();
      this._fpVelocity.add(move.multiplyScalar(speed));
    }
    this.fpControls.moveRight(this._fpVelocity.x);
    this.fpControls.moveForward(this._fpVelocity.z);
    const y = Math.max(
      1.45,
      Math.min(this.roomDims.roomHeightM - 0.3, this.camera.position.y)
    );
    this.camera.position.y = y;
  }

  resize() {
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _updateWallFlatBlend() {
    const planeX = this.layout.ledPlaneX ?? this.layout.wallX;
    for (const w of this.walls) {
      const wp = new THREE.Vector3(
        planeX + 0.2,
        w.config.mountHeightM + w.config.heightM / 2,
        w.group.position.z
      );
      const dist = this.camera.position.distanceTo(wp);
      const blend = THREE.MathUtils.smoothstep(dist, 2.5, 7.5);
      w.setFlatBlend(blend);
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const delta = 0.016;
    if (!this.fpMode) this.orbit.update();
    else this._updateFp(delta);
    this._updateWallFlatBlend();
    this.renderer.render(this.scene, this.camera);
  }

  buildStatsHtml() {
    const w = this.getSelectedWall();
    if (!w) return '';
    const s = w.getStats();
    const v = viewingDistanceRuleOfThumb(s.pitchMm);
    const ar = aspectRatioString(s.res.widthPx, s.res.heightPx);
    let texNote = '';
    if (s.clamped.scaled) {
      texNote = `<p class="warn">Hinweis: Textur auf max. ${s.clamped.widthPx}×${s.clamped.heightPx} skaliert (Performance).</p>`;
    }
    let offerBlock = '';
    if (s.offerId === JINYUAN_OFFER_ID) {
      const o = jinyuanOfferStats(s.widthM, s.heightM, s.pitchMm);
      const q = JINYUAN_QUOTE;
      offerBlock = `
        <p><strong>Angebot:</strong> ${q.label} (${q.invoiceNo})</p>
        <p><strong>Fläche:</strong> ${q.areaM2} m² · Pitch ${q.pitchMm} mm · ${o.cabinetSummary}</p>
        <p><strong>Cabinet-Raster:</strong> ${o.layoutSummary} · Tiefe ${(q.cabinetDepthM * 1000).toFixed(0)} mm</p>
        <p><strong>Helligkeit:</strong> ${q.brightnessCdM2} cd/m² · Winkel H${q.viewingAngleH}°/V${q.viewingAngleV}°</p>
        <p><strong>Leistung:</strong> Ø ${o.powerAvgW} W / max. ${o.powerMaxW} W (${q.powerAvgWm2}/${q.powerMaxWm2} W/m²)</p>
        <p><strong>Refresh:</strong> ${q.refreshHz} Hz · ${q.processor} (max. ${q.processorMaxPixels.toLocaleString('de-DE')} px) — ${o.cmsOk ? 'OK' : 'über Limit'} (${o.totalPx.toLocaleString('de-DE')} px)</p>
        <p><strong>Preis:</strong> US$ ${q.priceUsd.toLocaleString('en-US')} ${q.terms}</p>
      `;
    }
    return `
      <div class="stats">
        ${offerBlock}
        <p><strong>Auflösung:</strong> ${s.res.widthPx} × ${s.res.heightPx} px (${s.res.totalPx.toLocaleString('de-DE')} Pixel gesamt)</p>
        <p><strong>Seitenverhältnis:</strong> ${ar}</p>
        <p><strong>Module:</strong> ${s.cabinets.cols} Spalten × ${s.cabinets.rows} Reihen (${s.cabinets.count} Cabinets sichtbar)</p>
        <p><strong>Mindestabstand:</strong> ${v.labelMin}</p>
        <p><strong>Komfortabler Abstand:</strong> ${v.labelComfort}</p>
        <p><strong>Ihr Abstand (Kamera):</strong> ${formatM(this.getViewDistanceM())}</p>
        ${texNote}
      </div>
    `;
  }
}
