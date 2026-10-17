import * as THREE from 'three';

const TRUSS_SIZE_M = 0.29;

export function buildHangingTruss(widthM, heightM, mountBottomM) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xc8c8d0,
    metalness: 0.65,
    roughness: 0.35,
  });

  const wallTopY = mountBottomM + heightM;
  const lintelY = wallTopY + 0.35;
  const towerBaseY = 0.2;
  const towerTopY = lintelY + TRUSS_SIZE_M / 2;
  const halfWz = widthM / 2 + 0.25;

  for (const z of [-halfWz, halfWz]) {
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(TRUSS_SIZE_M, towerTopY - towerBaseY, TRUSS_SIZE_M),
      mat
    );
    tower.position.set(0, (towerTopY + towerBaseY) / 2, z);
    group.add(tower);
    addTrussChord(group, mat, tower, 'vertical');
  }

  const lintel = new THREE.Mesh(
    new THREE.BoxGeometry(TRUSS_SIZE_M, TRUSS_SIZE_M, widthM + 0.5),
    mat
  );
  lintel.position.set(0, lintelY, 0);
  group.add(lintel);

  const hangMat = new THREE.MeshStandardMaterial({ color: 0x333338, metalness: 0.8 });
  for (let i = 0; i < 5; i++) {
    const z = -widthM / 2 + (widthM / 4) * i;
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.32, 6), hangMat);
    chain.position.set(-0.04, wallTopY + 0.16, z);
    group.add(chain);
  }

  return group;
}

function addTrussChord(group, mat, parent, _kind) {
  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4), mat);
  brace.position.copy(parent.position);
  brace.position.x -= 0.12;
  group.add(brace);
}
