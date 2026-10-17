import * as THREE from 'three';

/** F34-Vierpunkt-Traverse: 290 mm Außenmaß, Hauptrohre Ø 50 mm, Diagonalen Ø 16 mm. */
export const TRUSS_SECTION_M = 0.29;
export const TRUSS_CHORD_R = 0.025;
export const TRUSS_BRACE_R = 0.008;
export const TRUSS_SEGMENT_M = 2;
export const TRUSS_PANEL_M = 0.5;
/** Abstand Traversenachse → Achse eines Hauptrohrs (Achsabstand der Rohre 240 mm). */
export const TRUSS_CHORD_OFFSET_M = TRUSS_SECTION_M / 2 - TRUSS_CHORD_R;
export const TRUSS_BASE_PLATE_T = 0.012;

const COUPLER_R = 0.034;
const COUPLER_LEN = 0.07;
const END_FRAME_INSET = COUPLER_LEN + 0.025;
const BASE_PLATE_SIZE = 0.4;

const Y_AXIS = new THREE.Vector3(0, 1, 0);

export function createTrussMaterials() {
  return {
    chord: new THREE.MeshStandardMaterial({ color: 0xd2d6dd, metalness: 0.45, roughness: 0.32 }),
    brace: new THREE.MeshStandardMaterial({ color: 0xc3c8d0, metalness: 0.45, roughness: 0.36 }),
    coupler: new THREE.MeshStandardMaterial({ color: 0x9aa0aa, metalness: 0.6, roughness: 0.3 }),
    plate: new THREE.MeshStandardMaterial({ color: 0x45484e, metalness: 0.5, roughness: 0.55 }),
  };
}

/** Instanzmatrix für einen Einheitszylinder (Höhe 1 entlang Y, Radius 1) zwischen p0 und p1. */
export function tubeMatrix(p0, p1, radius, target = new THREE.Matrix4()) {
  const dir = new THREE.Vector3().subVectors(p1, p0);
  const len = dir.length();
  const mid = new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dir.normalize());
  return target.compose(mid, q, new THREE.Vector3(radius, len, radius));
}

/** Achslagen der vier Hauptrohre, zyklisch sortiert: Nachbarn teilen sich eine Seitenfläche. */
export function sectionCorners(dir) {
  const q = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dir);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
  const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
  const o = TRUSS_CHORD_OFFSET_M;
  return [
    [-1, -1],
    [-1, 1],
    [1, 1],
    [1, -1],
  ].map(([r, f]) => new THREE.Vector3().addScaledVector(right, r * o).addScaledVector(fwd, f * o));
}

export class BoxTrussBuilder {
  constructor(materials = createTrussMaterials()) {
    this.materials = materials;
    this.tubes = { chord: [], brace: [], coupler: [] };
    this.plates = [];
    this.debug = { chordLines: [], diagonals: [], rungs: [] };
    this._runCount = 0;
  }

  /**
   * Gerade Traversenstrecke von start nach end (Achsmitte), aufgeteilt in gleich lange
   * Segmente ≤ 2 m. Je Segment: vier Hauptrohre, Endrahmen mit Querstreben, auf jeder
   * Seitenfläche ein durchgehendes Zickzack zwischen den beiden Hauptrohren, Konusverbinder.
   */
  addRun(start, end, { basePlate = false } = {}) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const len = a.distanceTo(b);
    if (len < 0.2) return;
    const dir = new THREE.Vector3().subVectors(b, a).normalize();
    const corners = sectionCorners(dir);
    const runId = this._runCount++;
    corners.forEach((c, chord) => {
      this.debug.chordLines.push({ runId, chord, a: a.clone().add(c), b: b.clone().add(c) });
    });
    const segments = Math.max(1, Math.ceil(len / TRUSS_SEGMENT_M - 1e-6));
    const segLen = len / segments;
    for (let s = 0; s < segments; s++) {
      this._addSegment(a, dir, corners, s * segLen, (s + 1) * segLen, runId);
    }
    if (basePlate) this.addBasePlate(a.x, a.y - TRUSS_BASE_PLATE_T, a.z);
  }

  _addSegment(origin, dir, corners, t0, t1, runId) {
    const at = (t, chord) => origin.clone().addScaledVector(dir, t).add(corners[chord]);
    for (let c = 0; c < 4; c++) {
      this._tube('chord', at(t0, c), at(t1, c), TRUSS_CHORD_R);
      this._tube('coupler', at(t0, c), at(t0 + COUPLER_LEN, c), COUPLER_R);
      this._tube('coupler', at(t1 - COUPLER_LEN, c), at(t1, c), COUPLER_R);
    }
    const f0 = t0 + END_FRAME_INSET;
    const f1 = t1 - END_FRAME_INSET;
    const panels = Math.max(2, Math.round((f1 - f0) / TRUSS_PANEL_M));
    const step = (f1 - f0) / panels;
    for (let face = 0; face < 4; face++) {
      const ca = face;
      const cb = (face + 1) % 4;
      for (const t of [f0, f1]) {
        const p0 = at(t, ca);
        const p1 = at(t, cb);
        this._tube('brace', p0, p1, TRUSS_BRACE_R);
        this.debug.rungs.push({ runId, face, p0, p1 });
      }
      for (let k = 0; k < panels; k++) {
        const from = (k + face) % 2 === 0 ? ca : cb;
        const to = from === ca ? cb : ca;
        const p0 = at(f0 + k * step, from);
        const p1 = at(f0 + (k + 1) * step, to);
        this._tube('brace', p0, p1, TRUSS_BRACE_R);
        this.debug.diagonals.push({ runId, face, k, chordA: from, chordB: to, p0, p1 });
      }
    }
  }

  /** Eckwürfel (Box Corner) mit Kantenlänge = Traversenquerschnitt, achsparallel. */
  addCornerBlock(x, y, z) {
    const c = new THREE.Vector3(x, y, z);
    const o = TRUSS_CHORD_OFFSET_M;
    const h = TRUSS_SECTION_M / 2;
    const v = (px, py, pz) => c.clone().add(new THREE.Vector3(px, py, pz));
    for (const [u, w] of [
      [-o, -o],
      [-o, o],
      [o, o],
      [o, -o],
    ]) {
      this._tube('chord', v(-h, u, w), v(h, u, w), TRUSS_CHORD_R);
      this._tube('chord', v(u, -h, w), v(u, h, w), TRUSS_CHORD_R);
      this._tube('chord', v(u, w, -h), v(u, w, h), TRUSS_CHORD_R);
    }
    for (const s of [-o, o]) {
      this._tube('brace', v(s, -o, -o), v(s, o, o), TRUSS_BRACE_R);
      this._tube('brace', v(-o, s, -o), v(o, s, o), TRUSS_BRACE_R);
      this._tube('brace', v(-o, -o, s), v(o, o, s), TRUSS_BRACE_R);
    }
  }

  addBasePlate(x, yBottom, z) {
    this.plates.push({
      center: new THREE.Vector3(x, yBottom + TRUSS_BASE_PLATE_T / 2, z),
      size: new THREE.Vector3(BASE_PLATE_SIZE, TRUSS_BASE_PLATE_T, BASE_PLATE_SIZE),
    });
  }

  /** Stehender Turm: Bodenplatte auf baseY, Eckwürfel mit Mittelpunkt auf topCenterY. */
  addTower(x, z, baseY, topCenterY) {
    const h = TRUSS_SECTION_M / 2;
    this.addRun([x, baseY + TRUSS_BASE_PLATE_T, z], [x, topCenterY - h, z], { basePlate: true });
    this.addCornerBlock(x, topCenterY, z);
  }

  _tube(kind, p0, p1, radius) {
    this.tubes[kind].push({ p0, p1, radius });
  }

  getDebugGeometry() {
    return this.debug;
  }

  toGroup() {
    const g = new THREE.Group();
    g.name = 'box-truss';
    const radial = { chord: 12, brace: 6, coupler: 12 };
    const m = new THREE.Matrix4();
    for (const kind of Object.keys(this.tubes)) {
      const list = this.tubes[kind];
      if (list.length === 0) continue;
      const geo = new THREE.CylinderGeometry(1, 1, 1, radial[kind], 1);
      const mesh = new THREE.InstancedMesh(geo, this.materials[kind], list.length);
      list.forEach((t, i) => mesh.setMatrixAt(i, tubeMatrix(t.p0, t.p1, t.radius, m)));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      mesh.name = `truss-${kind}`;
      g.add(mesh);
    }
    if (this.plates.length > 0) {
      const mesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        this.materials.plate,
        this.plates.length
      );
      const q = new THREE.Quaternion();
      this.plates.forEach((p, i) => mesh.setMatrixAt(i, m.compose(p.center, q, p.size)));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.receiveShadow = true;
      mesh.name = 'truss-base-plates';
      g.add(mesh);
    }
    return g;
  }
}

/** Vorne offenes Traversen-U um die Bühne (weiße Linie im Lageplan). */
export function buildStageSurroundTruss(layout) {
  const { stageTruss: t, stage } = layout;
  const h = TRUSS_SECTION_M / 2;
  const y = t.centerY;
  const b = new BoxTrussBuilder();
  b.addTower(t.xBack, -t.zHalf, 0, y);
  b.addTower(t.xBack, t.zHalf, 0, y);
  b.addTower(t.xFront, -t.zHalf, stage.heightM, y);
  b.addTower(t.xFront, t.zHalf, stage.heightM, y);
  b.addRun([t.xBack, y, -t.zHalf + h], [t.xBack, y, t.zHalf - h]);
  b.addRun([t.xBack + h, y, -t.zHalf], [t.xFront - h, y, -t.zHalf]);
  b.addRun([t.xBack + h, y, t.zHalf], [t.xFront - h, y, t.zHalf]);
  const group = b.toGroup();
  group.name = 'stage-truss';
  return group;
}

/** Zwei Querträger über den vorderen Reihen, verbunden durch zwei Längsträger (Foto 2). */
export function buildCeilingTrussGrid(layout) {
  const { ceilingTruss: c, roomHeightM } = layout;
  const h = TRUSS_SECTION_M / 2;
  const y = c.centerY;
  const b = new BoxTrussBuilder();
  for (const x of c.xs) b.addRun([x, y, -c.zHalf], [x, y, c.zHalf]);
  const [x0, x1] = c.xs;
  for (const z of c.longZ) b.addRun([x0 + h, y, z], [x1 - h, y, z]);
  const group = b.toGroup();
  group.name = 'ceiling-truss';

  const wireMat = new THREE.MeshStandardMaterial({ color: 0x5a5d63, metalness: 0.6, roughness: 0.4 });
  const wireGeo = new THREE.CylinderGeometry(0.004, 0.004, 1, 4);
  const top = roomHeightM;
  for (const x of c.xs) {
    for (const z of [-c.zHalf + 0.4, 0, c.zHalf - 0.4]) {
      const wire = new THREE.Mesh(wireGeo, wireMat);
      wire.scale.y = top - (y + h);
      wire.position.set(x, (top + y + h) / 2, z);
      group.add(wire);
    }
  }
  return group;
}
