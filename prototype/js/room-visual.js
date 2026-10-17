import * as THREE from 'three';
import { buildCeilingTrussGrid } from './box-truss.js';

export function addCeilingStructure(group, layout, roomHeightM) {
  group.add(buildCeilingTrussGrid(layout, roomHeightM));

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 0.96 });
  const { hallWidthM } = layout;
  for (let x = -hallWidthM / 2 + 1.5; x < hallWidthM / 2; x += 3.8) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, layout.hallDepthM * 0.92), beamMat);
    b.position.set(x, roomHeightM - 0.22, 0);
    group.add(b);
  }
}

export function addStageDressing(group, layout) {
  const { stage, roomHeightM } = layout;
  const cz = (stage.zMin + stage.zMax) / 2;
  const len = stage.zMax - stage.zMin;
  const depth = stage.xMax - stage.xMin;

  const skirt = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, stage.heightM + 0.015, len + 0.15),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.96 })
  );
  skirt.position.set(stage.xMax + 0.025, stage.heightM / 2, cz);
  group.add(skirt);

  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0x3a3a44,
    roughness: 0.98,
    side: THREE.DoubleSide,
  });
  const curtainH = roomHeightM - stage.heightM - 0.35;
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.98, curtainH), curtainMat);
  curtain.position.set(stage.xMin - 0.06, stage.heightM + curtainH / 2, cz);
  curtain.rotation.y = Math.PI / 2;
  group.add(curtain);

  addLedDotCross(group, stage.xMin + depth * 0.42, stage.heightM + 1.55, cz - 0.3);
  addDrumKit(group, stage.xMin + depth * 0.28, stage.heightM, cz - 2.0);
  addKeyboard(group, stage.xMin + depth * 0.55, stage.heightM, cz + 1.7);
}

export function addWallCross(group, layout) {
  const { maxX, roomHeightM } = layout;
  const x = maxX - 0.12;
  const z = 1.6;
  const y = roomHeightM * 0.42;
  const wood = new THREE.MeshStandardMaterial({ color: 0xb8885c, roughness: 0.78 });
  const v = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.0, 0.1), wood);
  const h = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.1, 0.1), wood);
  v.position.set(x, y, z);
  h.position.set(x, y + 0.38, z);
  group.add(v, h);
}

function addLedDotCross(group, x, y, z) {
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff6e8,
    emissive: 0xffe4b0,
    emissiveIntensity: 2.2,
  });
  const step = 0.14;
  for (let i = -5; i <= 5; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), bulbMat);
    b.position.set(x, y + i * step, z);
    group.add(b);
  }
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), bulbMat);
    b.position.set(x, y + 0.35, z + i * step);
    group.add(b);
  }
}

function addDrumKit(group, x, y, z) {
  const drumMat = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.7 });
  const cym = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.25 });
  const bass = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.45, 20), drumMat);
  bass.position.set(x, y + 0.35, z);
  group.add(bass);
  const snare = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 16), drumMat);
  snare.position.set(x + 0.35, y + 0.55, z + 0.25);
  group.add(snare);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.01, 20), cym);
  c.position.set(x + 0.1, y + 1.1, z - 0.2);
  group.add(c);
}

function addKeyboard(group, x, y, z) {
  const stand = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.9, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
  );
  stand.position.set(x, y + 0.45, z);
  group.add(stand);
  const keys = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.08, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
  );
  keys.position.set(x, y + 0.92, z);
  group.add(keys);
}
