import * as THREE from 'three';
import { buildCeilingTrussGrid, TRUSS_SECTION_M } from './box-truss.js';

const black = () => new THREE.MeshStandardMaterial({ color: 0x0f0f12, roughness: 0.85 });

function box(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  return m;
}

/** Schwarze Decke mit Unterzügen, Deckentraversen und Leuchten (Fotos 2 und 3). */
export function addCeilingStructure(group, layout, ceilingObjects) {
  const H = layout.roomHeightM;
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.9 });
  for (const b of layout.ceilingBeams) {
    const beam = box(0.35, 0.55, b.zMax - b.zMin, beamMat, b.x, H - 0.275, (b.zMin + b.zMax) / 2);
    ceilingObjects.push(beam);
    group.add(beam);
  }

  const panelMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf4f7ff,
    emissiveIntensity: 2.2,
  });
  for (const x of [7.6, 11.6]) {
    for (const z of [-1.5, 1.5]) {
      const panel = box(1.6, 0.05, 0.22, panelMat, x, H - 0.03, z);
      ceilingObjects.push(panel);
      group.add(panel);
    }
  }

  const truss = buildCeilingTrussGrid(layout);
  ceilingObjects.push(truss);
  group.add(truss);

  const c = layout.ceilingTruss;
  const underY = c.centerY - TRUSS_SECTION_M / 2;
  const housing = black();
  const ledFace = new THREE.MeshStandardMaterial({
    color: 0xfff4e0,
    emissive: 0xffe8c0,
    emissiveIntensity: 2.6,
  });
  const fixtures = new THREE.Group();
  for (const z of [-1.8, 1.8]) {
    fixtures.add(box(0.12, 0.09, 1.0, housing, c.xs[0], underY - 0.07, z));
    fixtures.add(box(0.01, 0.05, 0.92, ledFace, c.xs[0] + 0.066, underY - 0.07, z));
  }
  const spotGeo = new THREE.CylinderGeometry(0.09, 0.12, 0.3, 14);
  for (const x of c.xs) {
    for (const z of [-3.0, -0.9, 0.9, 3.0]) {
      const spot = new THREE.Mesh(spotGeo, housing);
      spot.position.set(x, underY - 0.2, z);
      spot.rotation.z = -0.7;
      fixtures.add(spot);
    }
  }
  ceilingObjects.push(fixtures);
  group.add(fixtures);
}

/** Vorhang, Bühnenschürze, LED-Kreuz und Instrumente (Foto 2). */
export function addStageDressing(group, layout) {
  const { stage, stageTruss } = layout;
  const cz = stage.centerZ;
  const skirtMat = black();
  group.add(box(0.03, stage.heightM, stage.lengthZ, skirtMat, stage.xMax + 0.015, stage.heightM / 2, cz));
  for (const z of [stage.zMin - 0.015, stage.zMax + 0.015]) {
    group.add(box(stage.depthX, stage.heightM, 0.03, skirtMat, stage.xMin + stage.depthX / 2, stage.heightM / 2, z));
  }

  const curtainTop = stageTruss.centerY - TRUSS_SECTION_M / 2 - 0.05;
  group.add(buildCurtain(stage.lengthZ - 0.1, curtainTop, layout.curtainX, cz));

  // Requisiten vor der LED-Wand (Bühnenmitte), nicht hinter dem Vorhang.
  addLedDotCross(group, stage.xMin + 2.0, stage.heightM, cz + 1.6);
  addDrumKit(group, stage.xMin + 1.55, stage.heightM, cz + 2.4);
  addKeyboard(group, stage.xMin + 1.85, stage.heightM, cz - 2.2);
}

/** Bühnenvorhang mit Falten; Fläche zeigt zum Publikum (+X). */
function buildCurtain(lengthM, heightM, x, z) {
  const geo = new THREE.PlaneGeometry(lengthM, heightM, Math.round(lengthM * 24), 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i);
    pos.setZ(i, 0.055 * Math.sin((u / 0.32) * Math.PI * 2));
  }
  geo.computeVertexNormals();
  geo.rotateY(Math.PI / 2);
  const curtain = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: 0x2c2c33, roughness: 0.96, side: THREE.DoubleSide })
  );
  curtain.position.set(x, heightM / 2, z);
  curtain.receiveShadow = true;
  curtain.name = 'stage-curtain';
  return curtain;
}

function addLedDotCross(group, x, y, z) {
  const frame = black();
  const cross = new THREE.Group();
  cross.name = 'led-dot-cross';
  const height = 2.4;
  const barY = 1.75;
  const arm = 0.6;
  cross.add(box(0.5, 0.03, 0.5, frame, 0, 0.015, 0));
  cross.add(box(0.06, height, 0.08, frame, 0, height / 2, 0));
  cross.add(box(0.06, 0.08, arm * 2 + 0.1, frame, 0, barY, 0));

  const bulbs = [];
  for (let yy = 0.15; yy <= height - 0.05; yy += 0.15) bulbs.push([yy, 0]);
  for (let zz = -arm; zz <= arm + 1e-6; zz += 0.15) {
    if (Math.abs(zz) > 0.05) bulbs.push([barY, zz]);
  }
  const bulbMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.03, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xfff3dc, emissive: 0xffd9a0, emissiveIntensity: 3 }),
    bulbs.length
  );
  const m = new THREE.Matrix4();
  bulbs.forEach(([by, bz], i) => bulbMesh.setMatrixAt(i, m.makeTranslation(0.05, by, bz)));
  cross.add(bulbMesh);
  cross.position.set(x, y, z);
  group.add(cross);
}

function addDrumKit(group, x, y, z) {
  const shell = new THREE.MeshStandardMaterial({ color: 0x23232a, roughness: 0.5, metalness: 0.2 });
  const head = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.7 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a23a, metalness: 0.8, roughness: 0.3 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0x9a9ea6, metalness: 0.8, roughness: 0.3 });
  const kit = new THREE.Group();
  kit.name = 'drum-kit';
  const drum = (r, len, px, py, pz, axis = 'y') => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24), shell));
    const face = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 24), head);
    face.rotation.x = -Math.PI / 2;
    face.position.y = len / 2 + 0.001;
    g.add(face);
    if (axis === 'x') g.rotation.z = -Math.PI / 2;
    g.position.set(px, py, pz);
    kit.add(g);
  };
  const stand = (h, px, pz) => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, h, 6), chrome);
    s.position.set(px, h / 2, pz);
    kit.add(s);
  };
  const cymbal = (r, h, px, pz) => {
    stand(h, px, pz);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.2, 0.012, 24), brass);
    c.position.set(px, h, pz);
    kit.add(c);
  };
  drum(0.28, 0.42, 0.25, 0.29, 0, 'x');
  drum(0.18, 0.15, 0.55, 0.62, -0.35);
  drum(0.15, 0.22, 0.3, 0.86, -0.18);
  drum(0.16, 0.24, 0.3, 0.86, 0.2);
  drum(0.22, 0.4, 0.55, 0.42, 0.45);
  cymbal(0.18, 0.95, 0.6, -0.65);
  cymbal(0.24, 1.45, 0.45, -0.45);
  cymbal(0.26, 1.5, 0.4, 0.6);
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 16), shell);
  stool.position.set(-0.25, 0.55, 0);
  kit.add(stool);
  stand(0.52, -0.25, 0);
  kit.position.set(x, y, z);
  group.add(kit);
}

function addKeyboard(group, x, y, z) {
  const metal = new THREE.MeshStandardMaterial({ color: 0x1b1b1f, metalness: 0.6, roughness: 0.4 });
  const red = new THREE.MeshStandardMaterial({ color: 0xb3212b, roughness: 0.45 });
  const keys = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.5 });
  const kb = new THREE.Group();
  kb.name = 'keyboard';
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.05, 6), metal);
    leg.position.set(0, 0.45, s * 0.35);
    leg.rotation.x = s * 0.55;
    kb.add(leg);
    const leg2 = leg.clone();
    leg2.rotation.x = -s * 0.55;
    kb.add(leg2);
  }
  kb.add(box(0.34, 0.1, 1.15, red, 0, 0.93, 0));
  kb.add(box(0.15, 0.012, 1.05, keys, -0.07, 0.985, 0));
  const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.5, 6), metal);
  mic.position.set(0.35, 0.75, 0.55);
  kb.add(mic);
  kb.add(box(0.3, 0.02, 0.3, metal, 0.35, 0.01, 0.55));
  kb.position.set(x, y, z);
  group.add(kb);
}

/** Holzkreuz an der rechten Wand (Nische neben der Bühne, Foto 3). */
export function addWallCross(group, layout) {
  const { x, z } = layout.furniture.wallCross;
  const wood = new THREE.MeshStandardMaterial({ color: 0xa8774c, roughness: 0.72 });
  const cross = new THREE.Group();
  cross.name = 'wooden-cross';
  cross.add(box(0.44, 0.06, 0.44, wood, 0, 0.03, 0));
  cross.add(box(0.13, 2.75, 0.13, wood, 0, 0.06 + 1.375, 0));
  cross.add(box(1.35, 0.13, 0.13, wood, 0, 1.98, 0));
  cross.position.set(x, 0, z);
  group.add(cross);
  group.add(box(0.45, 0.42, 0.36, wood, x + 0.75, 0.21, z + 0.04));
}

/** Theken an der Nischenwand: Connect Point (langer schwarzer Tisch) und Info. */
export function addFurniture(group, layout) {
  const { connectPoint: cp, info } = layout.furniture;
  const mat = black();
  const tableDepth = 0.7;
  const tz = cp.zWall + 0.05 + tableDepth / 2;
  const len = cp.xMax - cp.xMin;
  const cx = (cp.xMin + cp.xMax) / 2;
  group.add(box(len, 0.04, tableDepth, mat, cx, 0.74, tz));
  for (const dx of [-len / 2 + 0.06, len / 2 - 0.06]) {
    for (const dz of [-tableDepth / 2 + 0.06, tableDepth / 2 - 0.06]) {
      group.add(box(0.04, 0.72, 0.04, mat, cx + dx, 0.36, tz + dz));
    }
  }
  const infoDepth = 0.6;
  group.add(
    box(info.xMax - info.xMin, 1.0, infoDepth, mat, (info.xMin + info.xMax) / 2, 0.5, info.zWall + 0.05 + infoDepth / 2)
  );
}
