import * as THREE from 'three';
import { resolveRoomLayout } from './room-layout.js';
import { createChairInstances, preloadChairTemplate } from './chair-instances.js';
import { buildCeilingSlab, buildFootprintFloor, buildFootprintWalls } from './room-footprint.js';
import { buildStageSurroundTruss } from './box-truss.js';
import { addCeilingStructure, addFurniture, addStageDressing, addWallCross } from './room-visual.js';

/**
 * Saal nach Lageplan. userData.ceilingObjects: alles oberhalb der Traversen, das in der
 * Draufsicht ausgeblendet wird.
 */
export function buildRoom(layout = resolveRoomLayout()) {
  const group = new THREE.Group();
  group.name = 'worship-room';
  group.userData.layout = layout;
  const ceilingObjects = [];
  group.userData.ceilingObjects = ceilingObjects;
  const { footprint, roomHeightM } = layout;

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x5f6166, roughness: 0.82, metalness: 0.02 });
  group.add(buildFootprintFloor(footprint, floorMat));

  const wallMats = [
    new THREE.MeshStandardMaterial({ color: 0x2c2d31, roughness: 0.95 }),
    new THREE.MeshStandardMaterial({ color: 0x77797d, roughness: 0.94, side: THREE.DoubleSide }),
  ];
  group.add(buildFootprintWalls(footprint, roomHeightM, wallMats));

  const ceiling = buildCeilingSlab(
    footprint,
    roomHeightM,
    new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.98 })
  );
  ceilingObjects.push(ceiling);
  group.add(ceiling);

  addStage(group, layout);
  addStageDressing(group, layout);
  group.add(buildStageSurroundTruss(layout));
  addCeilingStructure(group, layout, ceilingObjects);
  addWallCross(group, layout);
  addFurniture(group, layout);
  addTechDesk(group, layout);
  return group;
}

export function attachAudienceChairs(roomGroup, chairTemplate) {
  const prev = roomGroup.userData.chairMesh;
  if (prev) roomGroup.remove(prev);
  const chairs = createChairInstances(chairTemplate);
  roomGroup.add(chairs);
  roomGroup.userData.chairMesh = chairs;
  roomGroup.userData.chairCount = chairs.userData.count;
}

export async function ensureChairTemplate() {
  return preloadChairTemplate();
}

/** 8 × 3 m Bühne aus 2 × 1-m-Elementen, 20 cm hoch, dunkle Oberfläche wie auf Foto 2. */
function addStage(group, layout) {
  const { stage } = layout;
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(stage.depthX, stage.heightM, stage.lengthZ),
    new THREE.MeshStandardMaterial({ color: 0x26262b, roughness: 0.55, metalness: 0.05 })
  );
  deck.position.set(stage.xMin + stage.depthX / 2, stage.heightM / 2, stage.centerZ);
  deck.receiveShadow = true;
  deck.name = 'stage';
  group.add(deck);

  const seamMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.7 });
  const y = stage.heightM + 0.001;
  for (let z = stage.zMin + stage.elementLengthM; z < stage.zMax - 0.01; z += stage.elementLengthM) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(stage.depthX, 0.002, 0.012), seamMat);
    seam.position.set(stage.xMin + stage.depthX / 2, y, z);
    group.add(seam);
  }
  for (let x = stage.xMin + stage.elementDepthM; x < stage.xMax - 0.01; x += stage.elementDepthM) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, stage.lengthZ), seamMat);
    seam.position.set(x, y, stage.centerZ);
    group.add(seam);
  }
}

/** Tech-/Übersetzungspult mit Abtrennung, Monitoren und drei Bedienplätzen (rechts im Plan). */
function addTechDesk(group, layout) {
  const t = layout.techDesk;
  const desk = new THREE.Group();
  desk.name = 'tech-desk';
  const depth = t.xMax - t.xMin;
  const len = t.zMax - t.zMin;
  const cx = (t.xMin + t.xMax) / 2;
  const cz = (t.zMin + t.zMax) / 2;
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x17171b, roughness: 0.8 });
  const partitionMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2f, roughness: 0.9 });

  const top = new THREE.Mesh(new THREE.BoxGeometry(depth, 0.04, len), wood);
  top.position.set(cx, t.heightM - 0.02, cz);
  desk.add(top);
  const body = new THREE.Mesh(new THREE.BoxGeometry(depth * 0.55, t.heightM - 0.04, len), dark);
  body.position.set(t.xMin + depth * 0.275, (t.heightM - 0.04) / 2, cz);
  desk.add(body);

  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x101418,
    emissive: 0x2a4a78,
    emissiveIntensity: 0.7,
  });
  for (const z of t.monitorZs) {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.34, 0.58), dark);
    housing.position.set(t.xMin + 0.28, t.heightM + 0.3, z);
    desk.add(housing);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.3), screenMat);
    screen.rotation.y = Math.PI / 2;
    screen.position.set(t.xMin + 0.301, t.heightM + 0.3, z);
    desk.add(screen);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.05), dark);
    foot.position.set(t.xMin + 0.28, t.heightM + 0.06, z);
    desk.add(foot);
  }

  for (const z of t.operatorZs) desk.add(buildOfficeChair(t.operatorX, z, dark));

  const h = t.partitionHeightM;
  const wall = (x0, z0, x1, z1) => {
    const lenP = Math.hypot(x1 - x0, z1 - z0);
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(x0 === x1 ? 0.08 : lenP, h, z0 === z1 ? 0.08 : lenP),
      partitionMat
    );
    p.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
    desk.add(p);
  };
  wall(t.partitionX, t.partitionZTop, t.partitionX, t.partitionZBottom);
  wall(t.partitionX, t.partitionZBottom, layout.maxX, t.partitionZBottom);
  wall(t.partitionX, t.partitionZTop, t.partitionTopXEnd, t.partitionZTop);
  group.add(desk);
}

function buildOfficeChair(x, z, material) {
  const chair = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 5), material);
  base.position.y = 0.06;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), material);
  post.position.y = 0.28;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.48), material);
  seat.position.y = 0.5;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.44), material);
  back.position.set(0.24, 0.82, 0);
  chair.add(base, post, seat, back);
  chair.position.set(x, 0, z);
  return chair;
}

export { defaultRoomDims, resolveRoomLayout } from './room-layout.js';
