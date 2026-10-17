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
import { trussTopForPanelTop } from './led-truss.js';
import { footprintSpanZ } from './room-footprint.js';
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

const PRESET_KEYS = {
  first: 'ersteReihe',
  mid: 'mitte',
  back: 'letzteReihe',
  tech: 'techPult',
};

/** Benachbarte Torbögen teilen sich im Vergleichsmodus die Turmposition. */
const COMPARE_GAP_M = 0.5;

const DEFAULT_FOV = 58;
/** Erste Reihe: Bühnenkante und 2,5 m hohe Wand passen nur mit Weitwinkel ins Bild. */
const MAX_PRESET_FOV = 85;
const FRAME_MARGIN_RAD = THREE.MathUtils.degToRad(3);
const CAMERA_WALL_CLEARANCE_M = 0.3;

export class LedVisualizerApp {
  constructor(canvas) {
    this.canvas = canvas;
    this.roomDims = defaultRoomDims();
    this.layout = resolveRoomLayout({ roomHeightM: this.roomDims.roomHeightM });
    this.walls = [];
    this.selectedWallId = null;
    this.compareMode = false;
    this.pitchToggle = false;
    this.altPitchMm = 1.9;
    this.planView = false;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setClearColor(0x08080c, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x08080c);

    this.camera = new THREE.PerspectiveCamera(DEFAULT_FOV, 1, 0.05, 120);
    this.planCamera = new THREE.OrthographicCamera(-10, 10, 6, -6, 0.1, 80);
    this.orbit = new OrbitControls(this.camera, canvas);
    this.orbit.enableDamping = true;
    // Sitzende schauen zur Wandmitte hinauf ⇒ Kamera darf unter dem Blickziel stehen.
    this.orbit.maxPolarAngle = Math.PI * 0.72;
    this.orbit.minDistance = 0.5;
    this.orbit.maxDistance = 20;
    this.activePreset = null;
    this.orbit.addEventListener('start', () => {
      this.activePreset = null;
    });

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
    this.resize();
    this.setViewPreset('first');

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => {
      this._keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      this._keys[e.code] = false;
    });
    this._animate();
  }

  /** LED-Flächen im Blick: im Vergleichsmodus alle Wände, sonst die gewählte. */
  getLedBounds(target = new THREE.Box3()) {
    target.makeEmpty();
    const selected = this.getSelectedWall() ?? this.walls[0];
    const walls = this.compareMode ? this.walls : selected ? [selected] : [];
    for (const w of walls) {
      w.group.updateMatrixWorld(true);
      target.expandByObject(w.mesh);
    }
    return target;
  }

  /** Blickziel: Mitte der LED-Fläche(n), ohne Wand die Bühnenvorderkante. */
  getLedTarget(target = new THREE.Vector3()) {
    const box = this.getLedBounds();
    if (!box.isEmpty()) return box.getCenter(target);
    const L = this.layout;
    return target.set(L.ledPlaneX, L.ledWall.defaultMountHeightM + 1.25, L.ledWall.centerZ);
  }

  _syncOrbitTarget() {
    this.getLedTarget(this.orbit.target);
  }

  _applyLedWallTransform(wall) {
    const L = this.layout;
    wall.group.position.x = L.ledWall.trussX;
    wall.group.rotation.y = Math.PI / 2;
    wall.setTrussBaseY(L.ledWall.baseY);
    wall.setMountHeight(this.clampMountHeight(wall.config.mountHeightM, wall.config.heightM));
    wall.setOffsetXM(wall.config.offsetXM);
  }

  /** Unterkante mind. 10 cm über der Bühne, Traversenoberkante mind. 20 cm unter der Decke. */
  clampMountHeight(m, heightM) {
    const L = this.layout;
    const min = L.stage.heightM + 0.1;
    let max = m;
    while (max > min && trussTopForPanelTop(max + heightM) > L.roomHeightM - 0.2) max -= 0.05;
    return THREE.MathUtils.clamp(m, min, Math.max(min, max));
  }

  setMountHeight(wall, m) {
    wall.setMountHeight(this.clampMountHeight(m, wall.config.heightM));
    this._syncOrbitTarget();
    return wall.config.mountHeightM;
  }

  _setupLights() {
    const L = this.layout;
    const H = L.roomHeightM;
    const stage = L.stage;

    this.scene.add(new THREE.AmbientLight(0x9aa2b4, 0.55));
    this.scene.add(new THREE.HemisphereLight(0x8a92a8, 0x2c2c32, 0.65));

    const house = new THREE.DirectionalLight(0xfff1e2, 1.15);
    house.position.set(L.centerX + 3, 16, L.centerZ);
    house.target.position.set(L.centerX, 0, L.centerZ);
    house.castShadow = true;
    house.shadow.mapSize.set(2048, 2048);
    const sc = house.shadow.camera;
    sc.left = -13;
    sc.right = 13;
    sc.top = 9;
    sc.bottom = -9;
    sc.near = 2;
    sc.far = 40;
    house.shadow.bias = -0.0004;
    house.shadow.normalBias = 0.02;
    this.scene.add(house, house.target);

    const fill = new THREE.DirectionalLight(0xc6cede, 0.4);
    fill.position.set(L.maxX + 4, 6, -2);
    this.scene.add(fill);

    // Beide Seitenwände gleich grau (Foto 3), ohne Schatten.
    for (const side of [-1, 1]) {
      const wash = new THREE.DirectionalLight(0xc9d0de, 0.32);
      wash.position.set(L.centerX, 4, L.centerZ + side * 10);
      wash.target.position.set(L.centerX, 1.5, L.centerZ);
      this.scene.add(wash, wash.target);
    }

    const spot = (color, intensity, from, to, angle = 0.5) => {
      const s = new THREE.SpotLight(color, intensity, 0, angle, 0.65, 2);
      s.position.set(...from);
      s.target.position.set(...to);
      this.scene.add(s, s.target);
    };
    const washX = L.ceilingTruss.xs[0];
    const stageMidX = stage.xMin + stage.depthX / 2;
    spot(0xfff0e0, 26, [washX, H - 1.1, -2.2], [stageMidX, 1.2, -1.6]);
    spot(0xfff0e0, 26, [washX, H - 1.1, 2.2], [stageMidX, 1.2, 1.6]);
    spot(0x3d6bff, 14, [stage.xMax - 0.5, 0.4, 0], [L.curtainX, 2.6, 0], 0.45);
    spot(0xff7a30, 9, [stage.xMax - 0.6, 0.4, -3.0], [L.curtainX, 2.8, -3.2], 0.45);
    spot(0xff7a30, 9, [stage.xMax - 0.6, 0.4, 3.0], [L.curtainX, 2.8, 3.2], 0.45);

    for (const x of [7.6, 11.6]) {
      const p = new THREE.PointLight(0xf4f7ff, 9, 0, 2);
      p.position.set(x, H - 0.4, 0);
      this.scene.add(p);
    }
  }

  rebuildRoom() {
    if (this.roomGroup) {
      this.scene.remove(this.roomGroup);
    }
    this.layout = resolveRoomLayout({ roomHeightM: this.roomDims.roomHeightM });
    this.roomGroup = buildRoom(this.layout);
    this.scene.add(this.roomGroup);
    for (const w of this.walls) {
      this._applyLedWallTransform(w);
    }
    this._syncOrbitTarget();
    this.setPlanView(this.planView);
    this.chairTemplatePromise.then((tpl) => attachAudienceChairs(this.roomGroup, tpl));
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
    if (this.activePreset) this._frameStageAndWall();
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
    const centerZ = this.layout.ledWall.centerZ;
    if (this.compareMode && this.walls.length >= 2) {
      let totalZ = 0;
      for (const w of this.walls) totalZ += w.config.widthM;
      totalZ += COMPARE_GAP_M * (this.walls.length - 1);
      let z = centerZ - totalZ / 2;
      for (const w of this.walls) {
        w.setOffsetXM(z + w.config.widthM / 2);
        z += w.config.widthM + COMPARE_GAP_M;
      }
    } else if (this.walls.length === 1) {
      this.walls[0].setOffsetXM(centerZ);
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
    return Math.max(0.5, this.camera.position.x - this.layout.ledPlaneX);
  }

  getMaxViewDistanceM() {
    return this.layout.maxX - 0.4 - this.layout.ledPlaneX;
  }

  setViewDistanceM(dist) {
    this.setPlanView(false);
    this.activePreset = null;
    const d = THREE.MathUtils.clamp(dist, 1, this.getMaxViewDistanceM());
    this.camera.position.x = this.layout.ledPlaneX + d;
    this._keepCameraInRoom();
    this._frameStageAndWall();
  }

  setViewPreset(preset) {
    const key = PRESET_KEYS[preset] ?? preset;
    const vp = this.layout.viewpoints[key];
    if (!vp) return;
    this.setPlanView(false);
    this.activePreset = key;
    this.camera.position.set(vp.x, vp.eyeY, vp.z);
    this._frameStageAndWall();
  }

  /**
   * Blickrichtung und Bildwinkel so wählen, dass Bühnenvorderkante und ganze LED-Wand
   * im Bild sind. Reicht auch der maximale Bildwinkel nicht, bleibt die Bühne sichtbar.
   */
  _frameStageAndWall() {
    const L = this.layout;
    const cam = this.camera;
    const eye = cam.position;
    const box = this.getLedBounds();
    const led = this.getLedTarget(new THREE.Vector3());
    const ledTop = box.isEmpty() ? led.y + 1.25 : box.max.y;
    const halfWidth = box.isEmpty() ? 2 : (box.max.z - box.min.z) / 2;
    const dLed = Math.max(0.5, Math.hypot(led.x - eye.x, led.z - eye.z));
    const dStage = Math.max(0.5, eye.x - L.stage.xMax);
    const up = Math.atan2(ledTop - eye.y, dLed);
    const down = Math.atan2(L.stage.heightM - eye.y, dStage);
    const vNeed = up - down + 2 * FRAME_MARGIN_RAD;
    const hNeed = 2 * Math.atan2(halfWidth, dLed) + 2 * FRAME_MARGIN_RAD;
    const vForH = 2 * Math.atan(Math.tan(hNeed / 2) / cam.aspect);
    const fovDeg = THREE.MathUtils.clamp(
      THREE.MathUtils.radToDeg(Math.max(vNeed, vForH)),
      DEFAULT_FOV,
      MAX_PRESET_FOV
    );
    const fov = THREE.MathUtils.degToRad(fovDeg);
    const aim = vNeed > fov ? down - FRAME_MARGIN_RAD + fov / 2 : (up + down) / 2;
    cam.fov = fovDeg;
    cam.updateProjectionMatrix();
    this.orbit.target.set(led.x, eye.y + Math.tan(aim) * dLed, led.z);
    cam.lookAt(this.orbit.target);
    this.orbit.update();
  }

  /** Kamera bleibt im Saal, sonst verdeckt die Außenseite einer Wand die Sicht. */
  _keepCameraInRoom() {
    const L = this.layout;
    const p = this.camera.position;
    const c = CAMERA_WALL_CLEARANCE_M;
    p.x = THREE.MathUtils.clamp(p.x, L.minX + c, L.maxX - c);
    const span = footprintSpanZ(p.x, L.footprint);
    if (span) p.z = THREE.MathUtils.clamp(p.z, span.zMin + c, span.zMax - c);
    p.y = THREE.MathUtils.clamp(p.y, 0.35, L.roomHeightM - 0.25);
  }

  /** Orthografische Draufsicht wie der Lageplan (Bühne links, Decke ausgeblendet). */
  setPlanView(on) {
    this.planView = on;
    for (const o of this.roomGroup?.userData.ceilingObjects ?? []) o.visible = !on;
    this.orbit.enabled = !on && !this.fpMode;
    if (on) this._framePlanCamera();
  }

  _framePlanCamera() {
    const { minX, maxX, minZ, maxZ } = this.layout.bounds;
    const aspect = this.camera.aspect || 1;
    const margin = 0.8;
    let halfW = (maxX - minX) / 2 + margin;
    let halfH = halfW / aspect;
    const needH = (maxZ - minZ) / 2 + margin + 1.2;
    if (halfH < needH) {
      halfH = needH;
      halfW = halfH * aspect;
    }
    const cam = this.planCamera;
    cam.left = -halfW;
    cam.right = halfW;
    cam.top = halfH;
    cam.bottom = -halfH;
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2 + 0.12 * halfH;
    cam.position.set(cx, 40, cz);
    cam.up.set(0, 0, -1);
    cam.lookAt(cx, 0, cz);
    cam.updateProjectionMatrix();
  }

  get activeCamera() {
    return this.planView ? this.planCamera : this.camera;
  }

  enableFirstPerson(on) {
    this.setPlanView(false);
    this.activePreset = null;
    this.fpMode = on;
    this.orbit.enabled = !on;
    if (on) {
      this.camera.fov = DEFAULT_FOV;
      this.camera.updateProjectionMatrix();
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
    const y = Math.max(1.1, Math.min(this.layout.roomHeightM - 0.3, this.camera.position.y));
    this.camera.position.y = y;
  }

  resize() {
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.planView) this._framePlanCamera();
    else if (this.activePreset) this._frameStageAndWall();
    this.renderer.setSize(w, h, false);
  }

  _updateWallFlatBlend() {
    const center = new THREE.Vector3();
    for (const w of this.walls) {
      if (this.planView) {
        w.setFlatBlend(1);
        continue;
      }
      const dist = this.camera.position.distanceTo(w.getCenterWorld(center));
      w.setFlatBlend(THREE.MathUtils.smoothstep(dist, 2.5, 7.5));
    }
  }

  renderFrame() {
    if (!this.fpMode && !this.planView) this.orbit.update();
    if (!this.planView) this._keepCameraInRoom();
    this._updateWallFlatBlend();
    this.renderer.render(this.scene, this.activeCamera);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    if (this.fpMode) this._updateFp(0.016);
    this.renderFrame();
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
