import * as THREE from 'three';
import { HALL_OUTLINE_PX, planPx } from './floor-plan.js';

/** Saal-Innenkante in Metern (siehe floor-plan.js). */
export const HALL_FOOTPRINT_XZ = HALL_OUTLINE_PX.map(([px, py]) => planPx(px, py));

export const WALL_THICKNESS_M = 0.25;

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

/** Vorzeichenbehaftete Fläche (Gaußsche Trapezformel) in der x/z-Ebene. */
export function signedArea(points) {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    a += p.x * q.z - q.x * p.z;
  }
  return a / 2;
}

export function pointInFootprint(x, z, points = HALL_FOOTPRINT_XZ) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/** Innere Saalbreite (z-Bereich) an Position x. */
export function footprintSpanZ(x, points = HALL_FOOTPRINT_XZ) {
  const zs = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    if (a.x === b.x) continue;
    const t = (x - a.x) / (b.x - a.x);
    if (t >= 0 && t <= 1) zs.push(a.z + t * (b.z - a.z));
  }
  if (zs.length < 2) return null;
  return { zMin: Math.min(...zs), zMax: Math.max(...zs) };
}

/** Polygon um `distance` nach außen versetzt (Gehrung an den Ecken). */
export function offsetOutline(points, distance) {
  const n = points.length;
  const outward = signedArea(points) > 0 ? 1 : -1;
  const lines = [];
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const nx = (outward * (b.z - a.z)) / len;
    const nz = (outward * -(b.x - a.x)) / len;
    lines.push({
      a: { x: a.x + nx * distance, z: a.z + nz * distance },
      b: { x: b.x + nx * distance, z: b.z + nz * distance },
    });
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const l0 = lines[(i - 1 + n) % n];
    const l1 = lines[i];
    out.push(intersectLines(l0.a, l0.b, l1.a, l1.b) ?? l1.a);
  }
  return out;
}

function intersectLines(p1, p2, p3, p4) {
  const d = (p1.x - p2.x) * (p3.z - p4.z) - (p1.z - p2.z) * (p3.x - p4.x);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((p1.x - p3.x) * (p3.z - p4.z) - (p1.z - p3.z) * (p3.x - p4.x)) / d;
  return { x: p1.x + t * (p2.x - p1.x), z: p1.z + t * (p2.z - p1.z) };
}

function shapeFromPoints(points, flipZ) {
  const sign = flipZ ? -1 : 1;
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, sign * points[0].z);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i].x, sign * points[i].z);
  }
  shape.closePath();
  return shape;
}

/** Boden: Shape in (x, −z), nach −90° um X gekippt ⇒ Normale +Y, Welt-z unverändert. */
export function buildFootprintFloor(points, material) {
  const geo = new THREE.ShapeGeometry(shapeFromPoints(points, true));
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.name = 'hall-floor';
  return mesh;
}

/** Decke: Shape in (x, z), +90° um X ⇒ Normale −Y (sichtbar von unten). */
export function buildCeilingSlab(points, heightM, material) {
  const geo = new THREE.ShapeGeometry(shapeFromPoints(points, false));
  geo.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = heightM;
  mesh.name = 'hall-ceiling';
  return mesh;
}

/**
 * Wände als ein extrudierter Ring zwischen Innenkante und nach außen versetzter Kontur.
 * Materialien: [Wandkrone (Draufsicht), Wandflächen].
 */
export function buildFootprintWalls(points, heightM, materials, thickness = WALL_THICKNESS_M) {
  const outer = offsetOutline(points, thickness);
  const shape = shapeFromPoints(outer, true);
  const hole = new THREE.Path();
  hole.moveTo(points[0].x, -points[0].z);
  for (let i = 1; i < points.length; i++) {
    hole.lineTo(points[i].x, -points[i].z);
  }
  hole.closePath();
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: heightM,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, materials);
  mesh.receiveShadow = true;
  mesh.name = 'hall-walls';
  return mesh;
}
