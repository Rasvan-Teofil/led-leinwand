import * as THREE from 'three';
export const TRUSS_SECTION_M = 0.29;
export const TRUSS_TUBE_R = 0.026;
export const TRUSS_SEGMENT_M = 2;

const HALF = TRUSS_SECTION_M / 2;

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

/**
 * Sammelt Instanz-Matrizen für F34-4-Punkt-Boxtruss (4 Hauptrohre + Zickzack-Gitter).
 * axis: 'x' | 'y' | 'z' — Laufrichtung des Truss-Elements.
 */
export class BoxTrussBuilder {
  constructor(materials = createTrussMaterials()) {
    this.materials = materials;
    this.chordMats = [];
    this.braceMats = [];
    this.plateMats = [];
    this.chordGeo = new THREE.CylinderGeometry(TRUSS_TUBE_R, TRUSS_TUBE_R, 1, 10);
    this.braceGeo = new THREE.CylinderGeometry(TRUSS_TUBE_R * 0.55, TRUSS_TUBE_R * 0.55, 1, 6);
    this.plateGeo = new THREE.BoxGeometry(TRUSS_SECTION_M + 0.03, 0.035, TRUSS_SECTION_M + 0.03);
  }

  /** Gerade Truss-Linie von start → end (Weltkoordinaten). */
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
    const up = dir.clone();

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
        const p0 = segStart.clone().add(c);
        const p1 = segEnd.clone().add(c);
        this._addChord(p0, p1);
      }

      this._addFaceBraces(segStart, segEnd, corners);
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
    const mid = new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5);
    const len = p0.distanceTo(p1);
    const dir = new THREE.Vector3().subVectors(p1, p0).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, len, 1));
    this.chordMats.push(m);
  }

  _addFaceBraces(segStart, segEnd, corners) {
    const pairs = [
      [0, 1],
      [2, 3],
      [0, 2],
      [1, 3],
    ];
    for (const [i, j] of pairs) {
      this._addBrace(segStart.clone().add(corners[i]), segEnd.clone().add(corners[j]));
      this._addBrace(segStart.clone().add(corners[j]), segEnd.clone().add(corners[i]));
    }
  }

  _addBrace(p0, p1) {
    const mid = new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5);
    const len = p0.distanceTo(p1);
    if (len < 0.08) return;
    const dir = new THREE.Vector3().subVectors(p1, p0).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, len, 1));
    this.braceMats.push(m);
  }

  _addCoupler(center, quat) {
    const m = new THREE.Matrix4().compose(
      center,
      quat,
      new THREE.Vector3(1, 1, 1)
    );
    this.plateMats.push(m);
  }

  _addBasePlate(pos, quat) {
    const plate = new THREE.BoxGeometry(TRUSS_SECTION_M + 0.08, 0.025, TRUSS_SECTION_M + 0.08);
    const mesh = new THREE.Mesh(plate, this.materials.plate);
    mesh.position.copy(pos);
    mesh.setRotationFromQuaternion(quat);
    mesh.userData.isTrussBase = true;
    if (!this.baseMeshes) this.baseMeshes = [];
    this.baseMeshes.push(mesh);
  }

  /** Bühnen-Portal (Lageplan-Rahmen), Front (+X) optional offen. */
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

    if (this.chordMats.length) {
      const mesh = new THREE.InstancedMesh(this.chordGeo, this.materials.chord, this.chordMats.length);
      this.chordMats.forEach((mat, i) => mesh.setMatrixAt(i, mat));
      mesh.instanceMatrix.needsUpdate = true;
      g.add(mesh);
    }
    if (this.braceMats.length) {
      const mesh = new THREE.InstancedMesh(this.braceGeo, this.materials.brace, this.braceMats.length);
      this.braceMats.forEach((mat, i) => mesh.setMatrixAt(i, mat));
      mesh.instanceMatrix.needsUpdate = true;
      g.add(mesh);
    }
    if (this.plateMats.length) {
      const mesh = new THREE.InstancedMesh(this.plateGeo, this.materials.plate, this.plateMats.length);
      this.plateMats.forEach((mat, i) => mesh.setMatrixAt(i, mat));
      mesh.instanceMatrix.needsUpdate = true;
      g.add(mesh);
    }
    for (const m of this.baseMeshes ?? []) g.add(m);

    return g;
  }
}

/** Einfache Gitter-Decke aus Truss-Läufen. */
export function buildCeilingTrussGrid(layout, roomHeightM) {
  const b = new BoxTrussBuilder();
  const y = roomHeightM - 0.38;
  const { stage, maxX, ledPlaneX } = layout;
  const x0 = stage.xMin - 1;
  const x1 = maxX - 1.5;
  const z0 = stage.zMin - 2.5;
  const z1 = stage.zMax + 2.5;

  const zLines = 5;
  for (let i = 0; i < zLines; i++) {
    const z = z0 + (i / (zLines - 1)) * (z1 - z0);
    b.addRun([x0, y, z], [x1, y, z]);
  }
  const xLines = 7;
  for (let i = 0; i < xLines; i++) {
    const x = x0 + (i / (xLines - 1)) * (x1 - x0);
    b.addRun([x, y, z0], [x, y, z1]);
  }
  const overStageY = y - 0.15;
  b.addRun([ledPlaneX + 0.5, overStageY, z0], [ledPlaneX + 0.5, overStageY, z1]);
  return b.toGroup();
}

export function buildStageSurroundTruss(layout) {
  const b = new BoxTrussBuilder();
  const { truss } = layout;
  const y = truss.heightM;
  b.addPortalFrame({
    xMin: truss.xMin,
    xMax: truss.xMax,
    zMin: truss.zMin,
    zMax: truss.zMax,
    y,
    openXMax: truss.openFront,
  });
  return b.toGroup();
}
