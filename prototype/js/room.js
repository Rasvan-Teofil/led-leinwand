import * as THREE from 'three';
import { resolveRoomLayout } from './room-layout.js';
import { createChairInstances, preloadChairTemplate } from './chair-instances.js';
import {
  buildFootprintFloor,
  buildFootprintWalls,
  buildCeilingSlab,
} from './room-footprint.js';
import { buildStageSurroundTruss } from './box-truss.js';
import { addCeilingStructure, addStageDressing, addWallCross } from './room-visual.js';

export function buildRoom(uiDims) {
  const layout = resolveRoomLayout({
    hallWidthM: uiDims.hallWidthM / (uiDims.scale ?? 1),
    hallDepthM: uiDims.hallDepthM / (uiDims.scale ?? 1),
    roomHeightM: uiDims.roomHeightM,
    scale: uiDims.scale ?? 1,
  });
  const group = new THREE.Group();
  group.userData.layout = layout;
  const footprint = layout.footprint;

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x6e6e74,
    roughness: 0.9,
    metalness: 0.03,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x8f8b86,
    roughness: 0.93,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0e,
    roughness: 0.98,
  });

  group.userData.planViewHidden = [];

  const floor = buildFootprintFloor(footprint, floorMat);
  group.add(floor);

  group.add(buildFootprintWalls(footprint, layout.roomHeightM, wallMat));

  const ceiling = buildCeilingSlab(footprint, layout.roomHeightM, ceilMat);
  group.userData.planViewHidden.push(ceiling);
  group.add(ceiling);

  addBackstage(group, layout);
  addStage(group, layout);
  addStageDressing(group, layout);
  const stageTruss = buildStageSurroundTruss(layout);
  group.userData.planViewHidden.push(stageTruss);
  group.add(stageTruss);
  addCeilingStructure(group, layout, layout.roomHeightM, group.userData.planViewHidden);
  addWallCross(group, layout);
  addTechDesk(group, layout);

  return group;
}

export async function attachAudienceChairs(roomGroup, chairTemplate) {
  if (roomGroup.userData.chairMesh) {
    const prev = roomGroup.userData.chairMesh;
    roomGroup.remove(prev);
    if (prev.isInstancedMesh) {
      prev.geometry?.dispose();
      prev.material?.dispose();
    }
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

function addBackstage(group, layout) {
  const { backstage, roomHeightM } = layout;
  const h = roomHeightM;
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.92 });
  const w = backstage.xMax - backstage.xMin;
  const d = backstage.zMax - backstage.zMin;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), floorMat);
  floor.position.set(
    (backstage.xMin + backstage.xMax) / 2,
    0.03,
    (backstage.zMin + backstage.zMax) / 2
  );
  group.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x5a5a60, roughness: 0.94 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, d), wallMat);
  wall.position.set(backstage.xMin, h / 2, (backstage.zMin + backstage.zMax) / 2);
  group.add(wall);
}

function addStage(group, layout) {
  const { stage } = layout;
  const topMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 0.8 });
  const depth = stage.xMax - stage.xMin;
  const length = stage.zMax - stage.zMin;
  const h = stage.heightM;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(depth, h, length), topMat);
  mesh.position.set((stage.xMin + stage.xMax) / 2, h / 2, (stage.zMin + stage.zMax) / 2);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  group.add(mesh);

  for (let i = 1; i < 4; i++) {
    const zx = stage.xMin + (depth / 4) * i;
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, h + 0.002, length),
      new THREE.MeshStandardMaterial({ color: 0x24180f })
    );
    line.position.set(zx, h / 2, (stage.zMin + stage.zMax) / 2);
    group.add(line);
  }
}

function addTechDesk(group, layout) {
  const { techDeskLengthZ, techDeskDepthM, techDeskHeightM, techDeskCenterZ, scale: s } =
    layout;
  const bounds = layout.footprint;
  const maxX = Math.max(...bounds.map((p) => p.x));
  const mat = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.85 });
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(techDeskDepthM * s, techDeskHeightM, techDeskLengthZ * s),
    mat
  );
  desk.position.set(
    maxX - techDeskDepthM * s / 2 - 0.18,
    techDeskHeightM / 2,
    techDeskCenterZ * s
  );
  group.add(desk);
}

export function getLayoutFromGroup(roomGroup) {
  return roomGroup?.userData?.layout ?? resolveRoomLayout();
}

export { defaultRoomDims, resolveRoomLayout } from './room-layout.js';
