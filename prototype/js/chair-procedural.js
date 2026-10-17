import * as THREE from 'three';
import { mergeGeometries } from '../vendor/utils/BufferGeometryUtils.js';

/** Schwarzer Stapelstuhl (Sitz + Lehne + Metallbeine), angelehnt an Fotos. */
export function buildStackableChairGeometry() {
  const black = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.82 });
  const metal = new THREE.MeshStandardMaterial({
    color: 0xb8bcc4,
    metalness: 0.85,
    roughness: 0.32,
  });

  const parts = [];
  const seat = new THREE.BoxGeometry(0.44, 0.045, 0.4);
  const seatMesh = new THREE.Mesh(seat);
  seatMesh.position.set(0, 0.44, 0.02);
  seatMesh.updateMatrix();
  parts.push(seatMesh.geometry.clone().applyMatrix4(seatMesh.matrix));

  const back = new THREE.BoxGeometry(0.44, 0.38, 0.035);
  const backMesh = new THREE.Mesh(back);
  backMesh.position.set(0, 0.66, -0.17);
  backMesh.rotation.x = -0.12;
  backMesh.updateMatrix();
  parts.push(backMesh.geometry.clone().applyMatrix4(backMesh.matrix));

  const legGeo = new THREE.BoxGeometry(0.018, 0.44, 0.018);
  for (const [x, z] of [
    [-0.17, 0.14],
    [0.17, 0.14],
    [-0.17, -0.14],
    [0.17, -0.14],
  ]) {
    const leg = new THREE.Mesh(legGeo);
    leg.position.set(x, 0.22, z);
    leg.updateMatrix();
    parts.push(leg.geometry.clone().applyMatrix4(leg.matrix));
  }

  const geo = mergeGeometries(parts, false);
  geo.computeVertexNormals();
  return { geometry: geo, material: black, legMaterial: metal, scale: 1, yOffset: 0 };
}
