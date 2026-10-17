import * as THREE from 'three';

export const TRUSS_SECTION_M = 0.29;
export const TRUSS_TUBE_R = 0.026;
export const TRUSS_SEGMENT_M = 2;

const HALF = TRUSS_SECTION_M / 2;

/** @typedef {{ p0: THREE.Vector3, p1: THREE.Vector3 }} TrussSegment */

export function createTrussMaterials() {
  return {
    chord: new THREE.MeshStandardMaterial({
      color: 0xc4cad6,
      metalness: 0.9,
      roughness: 0.2,
    }),
    brace: new THREE.MeshStandardMaterial({
      color: 0xa8b0bc,
      metalness: 0.85,
      roughness: 0.26,
    }),
    plate: new THREE.MeshStandardMaterial({
      color: 0x9098a8,
      metalness: 0.92,
      roughness: 0.16,
    }),
  };
}

const FACE_CORNER_PAIRS = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
];

export class BoxTrussBuilder {
  constructor(materials = createTrussMaterials()) {
    this.materials = materials;
    this.plateMats = [];
    /** @type {TrussSegment[]} */
    this.chordSegments = [];
    /** @type {TrussSegment[]} */
    this.braceSegments = [];
    this.plateGeo = new THREE.BoxGeometry(TRUSS_SECTION_M + 0.03, 0.035, TRUSS_SECTION_M + 0.03);
    this.baseMeshes = [];
  }

  getDebugGeometry() {
    return {
      chords: this.chordSegments.map((s) => ({
        p0: s.p0.clone(),
        p1: s.p1.clone(),
      })),
      braces: this.braceSegments.map((s) => ({
        p0: s.p0.clone(),
        p1: s.p1.clone(),
      })),
    };
  }

  addRun(start, end, { basePlate = false, basePlateAtStart = false } = {}) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    if (len < 0.05) return;
    dir.normalize();

    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);

    const corners = [
      new THREE.Vector3().addScaledVector(right, -HALF).addScaledVector(fwd, -HALF),
      new THREE.Vector3().addScaledVector(right, -HALF).addScaledVector(fwd, HALF),
      new THREE.Vector3().addScaledVector(right, HALF).addScaledVector(fwd, -HALF),
      new THREE.Vector3().addScaledVector(right, HALF).addScaledVector(fwd, HALF),
    ];

    let t = 0;
    let segIdx = 0;
    while (t < len - 0.001) {
      const segLen = Math.min(TRUSS_SEGMENT_M, len - t);
      const segStart = a.clone().addScaledVector(dir, t);
      const segEnd = a.clone().addScaledVector(dir, t + segLen);

      for (const c of corners) {
        this._addChord(segStart.clone().add(c), segEnd.clone().add(c));
      }

      this._addFaceBraces(segStart, segEnd, corners, segIdx);
      if (segIdx > 0 || t > 0) {
        const mid = segStart.clone().addScaledVector(dir, 0.02);
        this._addCoupler(mid, quat);
      }

      t += segLen;
      segIdx += 1;
    }

    if (basePlate) this._addBasePlate(b, quat);
    if (basePlateAtStart) this._addBasePlate(a, quat);
  }

  _addChord(p0, p1) {
    this.chordSegments.push({ p0: p0.clone(), p1: p1.clone() });
    const mid = new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5);
    const len = p0.distanceTo(p1);
    const dir = new THREE.Vector3().subVectors(p1, p0).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  }

  /** Zickzack auf jeder Fläche zwischen zwei benachbarten Hauptrohren. */
  _addFaceBraces(segStart, segEnd, corners, segIdx) {
    for (const [ia, ib] of FACE_CORNER_PAIRS) {
      const pA0 = segStart.clone().add(corners[ia]);
      const pA1 = segStart.clone().add(corners[ib]);
      const pB0 = segEnd.clone().add(corners[ia]);
      const pB1 = segEnd.clone().add(corners[ib]);
      if (segIdx % 2 === 0) {
        this._addBrace(pA0, pB1);
      } else {
        this._addBrace(pA1, pB0);
      }
    }
  }

  _addBrace(p0, p1) {
    const len = p0.distanceTo(p1);
    if (len < 0.05 || len > TRUSS_SEGMENT_M + TRUSS_SECTION_M + 0.15) return;
    this.braceSegments.push({ p0: p0.clone(), p1: p1.clone() });
    const mid = new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(p1, p0).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  }

  _addCoupler(center, quat) {
    const m = new THREE.Matrix4().compose(center, quat, new THREE.Vector3(1, 1, 1));
    this.plateMats.push(m);
  }

  _addBasePlate(pos, quat) {
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(TRUSS_SECTION_M + 0.08, 0.025, TRUSS_SECTION_M + 0.08),
      this.materials.plate
    );
    plate.position.copy(pos);
    plate.setRotationFromQuaternion(quat);
    this.baseMeshes.push(plate);
  }

  addPortalFrame({ xMin, xMax, zMin, zMax, y, openXMax = false }) {
    const legs = [
      [xMin, zMin],
      [xMin, zMax],
      [xMax, zMin],
      [xMax, zMax],
    ];
    for (const [x, z] of legs) {
      this.addRun([x, 0, z], [x, y, z], { basePlate: true });
    }
    this.addRun([xMin, y, zMin], [xMin, y, zMax]);
    this.addRun([xMin, y, zMin], [xMax, y, zMin]);
    this.addRun([xMin, y, zMax], [xMax, y, zMax]);
    if (!openXMax) {
      this.addRun([xMax, y, zMin], [xMax, y, zMax]);
    }
  }

  toGroup() {
    const g = new THREE.Group();
    g.name = 'box-truss-system';

    for (const { p0, p1 } of this.chordSegments) {
      const tube = tubeBetween(p0, p1, TRUSS_TUBE_R, this.materials.chord);
      if (tube) g.add(tube);
    }
    for (const { p0, p1 } of this.braceSegments) {
      const tube = tubeBetween(p0, p1, TRUSS_TUBE_R * 0.55, this.materials.brace);
      if (tube) g.add(tube);
    }
    for (const mat of this.plateMats) {
      const plate = new THREE.Mesh(this.plateGeo, this.materials.plate);
      plate.matrixAutoUpdate = false;
      plate.matrix.copy(mat);
      plate.matrix.decompose(plate.position, plate.quaternion, plate.scale);
      plate.matrixAutoUpdate = true;
      g.add(plate);
    }
    for (const m of this.baseMeshes) g.add(m);

    return g;
  }
}

function tubeBetween(p0, p1, radius, material) {
  const len = p0.distanceTo(p1);
  if (len < 0.01) return null;
  const mid = new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5);
  const dir = new THREE.Vector3().subVectors(p1, p0).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 10), material);
  mesh.position.copy(mid);
  mesh.quaternion.copy(q);
  return mesh;
}

/** Dezentes Deckenraster über Bühne und vorderes Publikum (Foto 2). */
export function buildCeilingTrussGrid(layout, roomHeightM) {
  const b = new BoxTrussBuilder();
  const y = roomHeightM - 0.42;
  const { stage, ledPlaneX } = layout;
  const z0 = stage.zMin - 1.2;
  const z1 = stage.zMax + 1.2;
  const xFront = ledPlaneX + 7.5;

  for (const z of [z0, 0, z1]) {
    b.addRun([stage.xMin - 0.5, y, z], [xFront, y, z]);
  }
  b.addRun([ledPlaneX + 1.5, y, z0], [ledPlaneX + 1.5, y, z1]);
  b.addRun([xFront, y, z0], [xFront, y, z1]);

  const group = b.toGroup();
  group.name = 'ceiling-truss-grid';
  return group;
}

export function buildStageSurroundTruss(layout) {
  const b = new BoxTrussBuilder();
  const { truss } = layout;
  b.addPortalFrame({
    xMin: truss.xMin,
    xMax: truss.xMax,
    zMin: truss.zMin,
    zMax: truss.zMax,
    y: truss.heightM,
    openXMax: truss.openFront,
  });
  return b.toGroup();
}
