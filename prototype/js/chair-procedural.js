import * as THREE from 'three';
import { mergeGeometries } from '../vendor/utils/BufferGeometryUtils.js';

function placed(geometry, x, y, z, rotX = 0) {
  const g = geometry.clone();
  if (rotX) g.rotateX(rotX);
  g.translate(x, y, z);
  return g;
}

/** Ersatz-Stapelstuhl (Sitz + Lehne + Metallbeine), blickt bei rotY = 0 nach −X. */
export function buildStackableChairGeometry() {
  const shell = mergeGeometries([
    placed(new THREE.BoxGeometry(0.46, 0.045, 0.42), 0, 0.44, 0.02),
    placed(new THREE.BoxGeometry(0.46, 0.32, 0.03), 0, 0.68, -0.2, -0.12),
  ]);
  const legGeo = new THREE.BoxGeometry(0.018, 0.44, 0.018);
  const legs = mergeGeometries(
    [
      [-0.19, 0.17],
      [0.19, 0.17],
      [-0.19, -0.17],
      [0.19, -0.17],
    ].map(([x, z]) => placed(legGeo, x, 0.22, z))
  );
  for (const g of [shell, legs]) g.rotateY(-Math.PI / 2);
  return {
    parts: [
      { geometry: shell, material: new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.85 }) },
      {
        geometry: legs,
        material: new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.7, roughness: 0.35 }),
      },
    ],
  };
}
