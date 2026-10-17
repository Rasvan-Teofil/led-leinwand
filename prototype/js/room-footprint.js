import * as THREE from 'three';

/** Grundriss Gottesdienstraum (skaliert an 8 m Bühnenlänge entlang Z). +X Publikum, Bühne links (−X). */
export const HALL_FOOTPRINT_XZ = [
  { x: -10.55, z: -7.05 },
  { x: -10.55, z: 7.05 },
  { x: 9.85, z: 7.05 },
  { x: 10.85, z: 4.35 },
  { x: 10.95, z: -0.4 },
  { x: 10.15, z: -4.55 },
  { x: 7.35, z: -7.05 },
  { x: 1.85, z: -7.45 },
  { x: -2.45, z: -7.05 },
];

export function footprintBounds(points = HALL_FOOTPRINT_XZ) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  return { minX, maxX, minZ, maxZ, widthX: maxX - minX, depthZ: maxZ - minZ };
}

export function buildFootprintFloor(points, material) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].z);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i].x, points[i].z);
  }
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  return mesh;
}

export function buildFootprintWalls(points, heightM, material) {
  const group = new THREE.Group();
  for (let i = 0; i < points.length; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % points.length];
    const dx = p1.x - p0.x;
    const dz = p1.z - p0.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.05) continue;
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(len, heightM), material);
    wall.position.set((p0.x + p1.x) / 2, heightM / 2, (p0.z + p1.z) / 2);
    wall.rotation.y = Math.atan2(dx, dz);
    group.add(wall);
  }
  return group;
}

export function buildCeilingSlab(points, heightM, material) {
  const floor = buildFootprintFloor(points, material);
  floor.position.y = heightM;
  floor.rotation.x = Math.PI / 2;
  return floor;
}
