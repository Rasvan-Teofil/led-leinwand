import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';
import { mergeGeometries } from '../vendor/utils/BufferGeometryUtils.js';
import { collectSeatTransforms } from './seat-layout.js';
import { buildStackableChairGeometry } from './chair-procedural.js';

const CHAIR_URL = './assets/chair/chair.glb';

let chairTemplate = null;

function mergeSceneMeshes(object) {
  const geos = [];
  const mats = [];
  object.updateMatrixWorld(true);
  object.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    geos.push(g);
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m && !mats.includes(m)) mats.push(m);
  });
  if (geos.length === 0) return null;
  const geometry = mergeGeometries(geos, false);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: 0x161616,
    roughness: 0.82,
    metalness: 0.12,
  });
  return { geometry, material };
}

function normalizeKenneyChair(scene) {
  const root = scene.clone(true);
  root.rotation.y = Math.PI;
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  const targetHeight = 0.86;
  const scale = targetHeight / Math.max(size.y, 0.01);
  root.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);

  const merged = mergeSceneMeshes(root);
  if (!merged) throw new Error('empty chair GLB');
  return { geometry: merged.geometry, material: merged.material, scale: 1, yOffset: 0 };
}

export async function preloadChairTemplate() {
  if (chairTemplate) return chairTemplate;
  const loader = new GLTFLoader();
  try {
    const gltf = await loader.loadAsync(CHAIR_URL);
    chairTemplate = normalizeKenneyChair(gltf.scene);
    return chairTemplate;
  } catch (err) {
    console.warn('Chair GLB fallback:', err);
    return buildStackableChairGeometry();
  }
}

export function createChairInstances(layout, template) {
  const transforms = collectSeatTransforms(layout);
  const count = transforms.length;
  if (count === 0) return null;

  const mesh = new THREE.InstancedMesh(template.geometry, template.material, count);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const m = new THREE.Matrix4();
  const s = new THREE.Vector3(template.scale, template.scale, template.scale);
  const hq = new THREE.Quaternion();
  const p = new THREE.Vector3();

  transforms.forEach((t, i) => {
    hq.setFromEuler(new THREE.Euler(0, t.rotY, 0));
    p.set(t.x, template.yOffset, t.z);
    m.compose(p, hq, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
