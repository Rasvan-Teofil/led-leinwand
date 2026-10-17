import * as THREE from 'three';

const TRUSS_SIZE_M = 0.29;

/**
 * F34-Boxtruss parallel zur LED-Wand (Lintell entlang Wandbreite = lokale X-Achse).
 * Die LED-Gruppe wird in app.js um 90° gedreht; Lintell und Türme liegen daher auf lokaler X/Z,
 * nicht auf Z allein.
 */
export function buildHangingTruss(widthM, heightM, mountBottomM = 0) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x8a8a94,
    metalness: 0.72,
    roughness: 0.32,
  });

  const wallTopY = mountBottomM + heightM;
  const lintelY = wallTopY + 0.42;
  const towerBaseY = mountBottomM;
  const towerTopY = lintelY + TRUSS_SIZE_M * 0.5;
  const halfSpanX = widthM / 2 + 0.28;
  const trussDepthZ = TRUSS_SIZE_M;

  for (const x of [-halfSpanX, halfSpanX]) {
    const towerH = towerTopY - towerBaseY;
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(TRUSS_SIZE_M, towerH, trussDepthZ),
      mat
    );
    tower.position.set(x, towerBaseY + towerH / 2, 0);
    group.add(tower);
    addTrussLattice(group, mat, x, towerBaseY, towerTopY, trussDepthZ);
  }

  const lintel = new THREE.Mesh(
    new THREE.BoxGeometry(widthM + 0.55, TRUSS_SIZE_M, trussDepthZ),
    mat
  );
  lintel.position.set(0, lintelY, 0);
  group.add(lintel);
  addLintelLattice(group, mat, widthM, lintelY, trussDepthZ);

  const hangMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.85, roughness: 0.25 });
  const clampMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, metalness: 0.9, roughness: 0.2 });
  const chainZ = 0.12;
  const chainCount = 7;
  for (let i = 0; i < chainCount; i++) {
    const t = chainCount === 1 ? 0.5 : i / (chainCount - 1);
    const x = -widthM / 2 + widthM * t;
    const chainLen = Math.max(0.12, lintelY - wallTopY - 0.06);
    const chain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, chainLen, 8),
      hangMat
    );
    chain.position.set(x, wallTopY + chainLen / 2 + 0.03, chainZ);
    group.add(chain);

    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.06), clampMat);
    clamp.position.set(x, wallTopY + 0.02, chainZ);
    group.add(clamp);

    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.008, 6, 12), hangMat);
    hook.rotation.x = Math.PI / 2;
    hook.position.set(x, lintelY - TRUSS_SIZE_M * 0.35, chainZ);
    group.add(hook);
  }

  return group;
}

function addTrussLattice(group, mat, x, y0, y1, depthZ) {
  const h = y1 - y0;
  const steps = Math.max(3, Math.floor(h / 0.55));
  for (let i = 0; i < steps; i++) {
    const y = y0 + (h * (i + 0.5)) / steps;
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, depthZ + 0.08), mat);
    brace.position.set(x, y, 0);
    brace.rotation.z = i % 2 ? 0.55 : -0.55;
    group.add(brace);
  }
}

function addLintelLattice(group, mat, widthM, lintelY, depthZ) {
  const segments = Math.max(4, Math.floor(widthM / 0.9));
  for (let i = 0; i < segments; i++) {
    const x = -widthM / 2 + (widthM * (i + 0.5)) / segments;
    const diag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, depthZ + 0.1), mat);
    diag.position.set(x, lintelY, 0);
    diag.rotation.y = i % 2 ? 0.4 : -0.4;
    group.add(diag);
  }
}
