import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';
import { collectSeatTransforms } from './seat-layout.js';

let chairTemplate = null;

export async function preloadChairTemplate() {
  if (chairTemplate) return chairTemplate;
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('./assets/chair/chair.glb');
  let mesh = null;
  gltf.scene.traverse((o) => {
    if (o.isMesh && !mesh) mesh = o;
  });
  if (!mesh) throw new Error('Kein Mesh in chair.glb');
  const geom = mesh.geometry.clone();
  mesh.updateWorldMatrix(true, true);
  geom.applyMatrix4(mesh.matrixWorld);
  const mat = mesh.material.clone
    ? mesh.material.clone()
    : new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.85 });

  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  const scale = 0.48 / Math.max(size.y, 0.01);
  chairTemplate = { geometry: geom, material: mat, scale, yOffset: -box.min.y * scale };
  return chairTemplate;
}

export function createChairInstances(layout, template) {
  const transforms = collectSeatTransforms(layout);
  const count = transforms.length;
  if (count === 0) return null;

  const mesh = new THREE.InstancedMesh(
    template.geometry,
    template.material,
    count
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const m = new THREE.Matrix4();
  const s = new THREE.Vector3(template.scale, template.scale, template.scale);
  const hq = new THREE.Quaternion();
  const p = new THREE.Vector3();

  transforms.forEach((t, i) => {
    hq.setFromEuler(new THREE.Euler(0, t.rotY, 0));
    p.set(t.x, template.yOffset * template.scale, t.z);
    m.compose(p, hq, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
