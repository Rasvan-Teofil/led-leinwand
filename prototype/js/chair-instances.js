import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';
import { collectSeatTransforms } from './seat-layout.js';
import { buildStackableChairGeometry } from './chair-procedural.js';

const CHAIR_URL = './assets/chair/chair.glb';

/** Stapelstuhl-Maße (Breite × Höhe × Tiefe) in Metern. */
const CHAIR_SIZE = { w: 0.48, h: 0.84, d: 0.52 };

let chairTemplate = null;

function chairMaterialFor(name) {
  if (name === 'metal') {
    return new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.6, roughness: 0.38 });
  }
  return new THREE.MeshStandardMaterial({ color: 0x18181c, metalness: 0.05, roughness: 0.85 });
}

/**
 * Kenney chairModernCushion: Lehne bei −Z (blickt nach +Z), 0,2 × 0,46 × 0,2 Einheiten.
 * Ergebnis: Mittelpunkt auf dem Boden, Blick nach −X (Bühne), reale Stuhlmaße.
 */
function normalizeKenneyChair(scene) {
  scene.updateMatrixWorld(true);
  const parts = [];
  const box = new THREE.Box3();
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const geometry = o.geometry.clone();
    geometry.applyMatrix4(o.matrixWorld);
    geometry.computeBoundingBox();
    box.union(geometry.boundingBox);
    const material = Array.isArray(o.material) ? o.material[0] : o.material;
    parts.push({ geometry, name: material?.name ?? '' });
  });
  if (parts.length === 0) throw new Error('empty chair GLB');

  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);

  return {
    parts: parts.map(({ geometry, name }) => {
      geometry.translate(-center.x, -box.min.y, -center.z);
      geometry.rotateY(-Math.PI / 2);
      geometry.scale(CHAIR_SIZE.d / size.z, CHAIR_SIZE.h / size.y, CHAIR_SIZE.w / size.x);
      return { geometry, material: chairMaterialFor(name) };
    }),
  };
}

export async function preloadChairTemplate() {
  if (chairTemplate) return chairTemplate;
  const loader = new GLTFLoader();
  try {
    const gltf = await loader.loadAsync(CHAIR_URL);
    chairTemplate = normalizeKenneyChair(gltf.scene);
  } catch (err) {
    console.warn('Chair GLB fallback:', err);
    chairTemplate = buildStackableChairGeometry();
  }
  return chairTemplate;
}

/** Eine InstancedMesh je Material (Gestell, Polster) mit identischen Matrizen. */
export function createChairInstances(template) {
  const transforms = collectSeatTransforms();
  const count = transforms.length;
  const group = new THREE.Group();
  group.name = 'audience-chairs';
  group.userData.count = count;
  if (count === 0) return group;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3(0, 1, 0);

  for (const part of template.parts) {
    const mesh = new THREE.InstancedMesh(part.geometry, part.material, count);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    transforms.forEach((t, i) => {
      q.setFromAxisAngle(up, t.rotY);
      p.set(t.x, 0, t.z);
      m.compose(p, q, one);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }
  return group;
}
