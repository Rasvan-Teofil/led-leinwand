import * as THREE from 'three';
import { resolveRoomLayout } from './room-layout.js';

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
    color: 0x5a5a62,
    roughness: 0.88,
    metalness: 0.04,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xe6e2d8,
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0xf2f0ea,
    roughness: 0.95,
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
  addStage(group, layout);
  addTruss(group, layout);
  addSeating(group, layout);
  addRugAndChairs(group, layout);
  addTechDesk(group, layout);

  return group;
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

  const left = wallPlane(hallDepthM, h, wallMat);
  left.rotation.y = Math.PI / 2;
  left.position.set(-halfW, h / 2, 0);
  group.add(left);

  const right = wallPlane(hallDepthM, h, wallMat);
  right.rotation.y = -Math.PI / 2;
  right.position.set(halfW, h / 2, 0);
  group.add(right);

  // Vereinfachte „Nischen“ (Seitenräume nur als Wandvorsprünge)
  const bumpMat = new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.9 });
  const bumpN = new THREE.Mesh(new THREE.BoxGeometry(2.2, h, 1.4), bumpMat);
  bumpN.position.set(halfW - 1.1, h / 2, halfD - 2.2);
  group.add(bumpN);
  const bumpS = new THREE.Mesh(new THREE.BoxGeometry(2.8, h, 1.6), bumpMat);
  bumpS.position.set(-halfW + 3.5, h / 2, halfD - 1.8);
  group.add(bumpS);
}

function wallPlane(w, h, mat) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

function addStage(group, layout) {
  const { stage } = layout;
  const mat = new THREE.MeshStandardMaterial({ color: 0x9a5c28, roughness: 0.72 });
  const depth = stage.xMax - stage.xMin;
  const length = stage.zMax - stage.zMin;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(depth, 0.35, length), mat);
  mesh.position.set(
    (stage.xMin + stage.xMax) / 2,
    0.175,
    (stage.zMin + stage.zMax) / 2
  );
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addTruss(group, layout) {
  const { truss } = layout;
  const mat = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    metalness: 0.55,
    roughness: 0.35,
  });
  const t = 0.12;
  const h = truss.heightM;
  const cx = (truss.xMin + truss.xMax) / 2;
  const cz = (truss.zMin + truss.zMax) / 2;
  const dx = truss.xMax - truss.xMin;
  const dz = truss.zMax - truss.zMin;

  const pieces = [
    [dx, h, t, cx, h / 2, truss.zMin],
    [dx, h, t, cx, h / 2, truss.zMax],
    [t, h, dz, truss.xMin, h / 2, cz],
    [t, h, dz, truss.xMax, h / 2, cz],
  ];
  for (const [w, hh, d, x, y, z] of pieces) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat);
    m.position.set(x, y, z);
    group.add(m);
  }
}

function addSeating(group, layout) {
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85 });
  const { seatW, seatD, seatH, wallX, stage } = layout;
  const s = layout.scale;
  const baseX = stage.xMax + layout.aisleFromStageM * s;

  // Mitte: 5 Reihen × 4 Stühle, gerade zur Bühne
  for (let row = 0; row < 5; row++) {
    const x = baseX + row * (seatD + 0.35);
    for (let c = 0; c < 4; c++) {
      const z = -1.05 + c * (seatW + 0.12);
      addSeat(group, seatMat, x, z, 0, seatW, seatD, seatH);
    }
  }

  // Oben: 3 Reihen, leicht angewinkelt
  for (let row = 0; row < 3; row++) {
    const x = baseX + 0.4 + row * (seatD + 0.38);
    const angle = 0.22;
    for (let c = 0; c < 3; c++) {
      const z = stage.zMin + 1.2 + c * (seatW + 0.15);
      addSeat(group, seatMat, x, z, -angle, seatW, seatD, seatH);
    }
  }

  // Unten: 3 Reihen, angewinkelt
  for (let row = 0; row < 3; row++) {
    const x = baseX + 0.4 + row * (seatD + 0.38);
    const angle = -0.22;
    for (let c = 0; c < 3; c++) {
      const z = stage.zMax - 1.2 - c * (seatW + 0.15);
      addSeat(group, seatMat, x, z, angle, seatW, seatD, seatH);
    }
  }
}

function addSeat(group, mat, x, z, rotY, w, d, h) {
  const seat = new THREE.Mesh(new THREE.BoxGeometry(d, h, w), mat);
  seat.position.set(x + d / 2, h / 2, z);
  seat.rotation.y = rotY;
  group.add(seat);
}

function addRugAndChairs(group, layout) {
  const { wallX, halfW, scale: s } = layout;
  const rugX = wallX + 11.5 * s;
  const rugZ = 0;
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(layout.rugSizeX * s, layout.rugSizeZ * s),
    new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.95 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(rugX, 0.02, rugZ);
  group.add(rug);

  const chairMat = new THREE.MeshStandardMaterial({ color: 0x3a5a7a, roughness: 0.8 });
  for (const [ox, oz, rot] of [
    [-0.7, -0.5, 0.5],
    [0.8, 0.6, -2.2],
  ]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.7, 0.75), chairMat);
    c.position.set(rugX + ox * s, 0.35, rugZ + oz * s);
    c.rotation.y = rot;
    group.add(c);
  }
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
