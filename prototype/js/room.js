import * as THREE from 'three';
import { resolveRoomLayout } from './room-layout.js';
import { createChairInstances, preloadChairTemplate } from './chair-instances.js';
import {
  addCeilingTruss,
  addKleingruppenCabinet,
  addStageDressing,
  makeRugTexture,
} from './room-visual.js';

export function buildRoom(uiDims) {
  const layout = resolveRoomLayout({
    hallWidthM: uiDims.hallWidthM / (uiDims.scale ?? 1),
    hallDepthM: uiDims.hallDepthM / (uiDims.scale ?? 1),
    roomHeightM: uiDims.roomHeightM,
    scale: uiDims.scale ?? 1,
  });
  const group = new THREE.Group();
  group.userData.layout = layout;

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x6a6a70,
    roughness: 0.92,
    metalness: 0.02,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x9a9690,
    roughness: 0.94,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x0c0c10,
    roughness: 0.98,
  });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(layout.hallWidthM, layout.hallDepthM),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(layout.hallWidthM, layout.hallDepthM),
    ceilMat
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = layout.roomHeightM;
  group.add(ceil);

  addOuterWalls(group, layout, wallMat);
  addBackstage(group, layout);
  addStage(group, layout);
  addStageDressing(group, layout);
  addTruss(group, layout);
  addCeilingTruss(group, layout, layout.roomHeightM);
  addRugAndChairs(group, layout);
  addTechDesk(group, layout);
  addKleingruppenCabinet(group, layout);

  return group;
}

export async function attachAudienceChairs(roomGroup, chairTemplate) {
  if (roomGroup.userData.chairMesh) {
    roomGroup.remove(roomGroup.userData.chairMesh);
    roomGroup.userData.chairMesh.geometry.dispose();
  }
  const layout = roomGroup.userData.layout;
  const chairs = createChairInstances(layout, chairTemplate);
  if (chairs) {
    roomGroup.add(chairs);
    roomGroup.userData.chairMesh = chairs;
  }
}

export async function ensureChairTemplate() {
  return preloadChairTemplate();
}

function addOuterWalls(group, layout, wallMat) {
  const { hallWidthM, hallDepthM, roomHeightM, halfW, halfD } = layout;
  const h = roomHeightM;

  const back = wallPlane(hallWidthM, h, wallMat);
  back.position.set(0, h / 2, -halfD);
  group.add(back);

  const front = wallPlane(hallWidthM, h, wallMat);
  front.position.set(0, h / 2, halfD);
  front.rotation.y = Math.PI;
  group.add(front);

  const right = wallPlane(hallDepthM, h, wallMat);
  right.rotation.y = -Math.PI / 2;
  right.position.set(halfW, h / 2, 0);
  group.add(right);

  const bumpMat = new THREE.MeshStandardMaterial({ color: 0x8e8a84, roughness: 0.92 });
  const bumpN = new THREE.Mesh(new THREE.BoxGeometry(2.2, h, 1.4), bumpMat);
  bumpN.position.set(halfW - 1.1, h / 2, halfD - 2.2);
  group.add(bumpN);
  const bumpS = new THREE.Mesh(new THREE.BoxGeometry(2.8, h, 1.6), bumpMat);
  bumpS.position.set(halfW - 3.5, h / 2, halfD - 1.8);
  group.add(bumpS);
}

function wallPlane(w, h, mat) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

function addBackstage(group, layout) {
  const { backstage, roomHeightM, stage } = layout;
  const h = roomHeightM;
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x3d3d42, roughness: 0.9 });
  const w = backstage.xMax - backstage.xMin;
  const d = backstage.zMax - backstage.zMin;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), floorMat);
  floor.position.set(
    (backstage.xMin + backstage.xMax) / 2,
    0.04,
    (backstage.zMin + backstage.zMax) / 2
  );
  group.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xc8c4bc, roughness: 0.92 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.15, h, d), wallMat);
  wall.position.set(backstage.xMin, h / 2, (backstage.zMin + backstage.zMax) / 2);
  group.add(wall);

  const benchMat = new THREE.MeshStandardMaterial({ color: 0xd4b84a, roughness: 0.75 });
  for (let i = 0; i < 3; i++) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.55), benchMat);
    bench.position.set(
      backstage.xMin + 1.2,
      0.225,
      stage.zMin + 1.5 + i * 2.2
    );
    group.add(bench);
  }
  const label = makeLabel('Backstage / Bank');
  label.position.set(backstage.xMin + 1.5, 2.2, 0);
  group.add(label);
}

function makeLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 38);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.2, 0.55, 1);
  return sprite;
}

function addStage(group, layout) {
  const { stage } = layout;
  const mat = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.82 });
  const depth = stage.xMax - stage.xMin;
  const length = stage.zMax - stage.zMin;
  const h = stage.heightM;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(depth, h, length), mat);
  mesh.position.set(
    (stage.xMin + stage.xMax) / 2,
    h / 2,
    (stage.zMin + stage.zMax) / 2
  );
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  group.add(mesh);

  for (let i = 1; i < 4; i++) {
    const zx = stage.xMin + (depth / 4) * i;
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, h + 0.002, length),
      new THREE.MeshStandardMaterial({ color: 0x1a1008 })
    );
    line.position.set(zx, h / 2, (stage.zMin + stage.zMax) / 2);
    group.add(line);
  }
}

function addTruss(group, layout) {
  const { truss } = layout;
  const mat = new THREE.MeshStandardMaterial({
    color: 0x6a6a72,
    metalness: 0.65,
    roughness: 0.38,
  });
  const t = 0.14;
  const h = truss.heightM;
  const cx = (truss.xMin + truss.xMax) / 2;
  const cz = (truss.zMin + truss.zMax) / 2;
  const dx = truss.xMax - truss.xMin;
  const dz = truss.zMax - truss.zMin;

  const pieces = [
    [dx, h, t, cx, h / 2, truss.zMin],
    [dx, h, t, cx, h / 2, truss.zMax],
    [t, h, dz, truss.xMin, h / 2, cz],
  ];
  if (!truss.openFront) {
    pieces.push([t, h, dz, truss.xMax, h / 2, cz]);
  }
  for (const [w, hh, d, x, y, z] of pieces) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat);
    m.position.set(x, y, z);
    group.add(m);
  }
}

function addRugAndChairs(group, layout) {
  const { ledPlaneX, halfW, scale: s } = layout;
  const rugX = ledPlaneX + 11.5 * s;
  const rugZ = 0;
  const rugTex = makeRugTexture();
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(layout.rugSizeX * s, layout.rugSizeZ * s),
    new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.95 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(rugX, 0.02, rugZ);
  group.add(rug);
}

function addTechDesk(group, layout) {
  const { halfW, techDeskLengthZ, techDeskDepthM, techDeskHeightM, scale: s } =
    layout;
  const mat = new THREE.MeshStandardMaterial({ color: 0xc4a574, roughness: 0.7 });
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(techDeskDepthM * s, techDeskHeightM, techDeskLengthZ * s),
    mat
  );
  desk.position.set(
    halfW - techDeskDepthM * s / 2 - 0.25,
    techDeskHeightM / 2,
    -0.5 * s
  );
  group.add(desk);

  const monitorMat = new THREE.MeshStandardMaterial({ color: 0x111122 });
  for (let i = 0; i < 4; i++) {
    const mon = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.55), monitorMat);
    mon.position.set(
      halfW - techDeskDepthM * s - 0.15,
      techDeskHeightM + 0.2,
      -2.8 * s + i * 1.4 * s
    );
    group.add(mon);
  }
}

export function getLayoutFromGroup(roomGroup) {
  return roomGroup?.userData?.layout ?? resolveRoomLayout();
}

export { defaultRoomDims, resolveRoomLayout } from './room-layout.js';
