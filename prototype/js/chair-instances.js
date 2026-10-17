import * as THREE from 'three';
import { collectSeatTransforms } from './seat-layout.js';
import { buildStackableChairGeometry } from './chair-procedural.js';

let chairTemplate = null;

export async function preloadChairTemplate() {
  if (chairTemplate) return chairTemplate;
  chairTemplate = buildStackableChairGeometry();
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
    p.set(t.x, template.yOffset, t.z);
    m.compose(p, hq, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
