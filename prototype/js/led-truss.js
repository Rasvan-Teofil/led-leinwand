import * as THREE from 'three';
import { BoxTrussBuilder, TRUSS_SECTION_M } from './box-truss.js';

/**
 * Hängende F34-Boxtruss parallel zur LED-Wand (Lintell entlang lokaler X).
 */
export function buildHangingTruss(widthM, heightM, mountBottomM = 0) {
  const group = new THREE.Group();
  const wallTopY = mountBottomM + heightM;
  const lintelY = wallTopY + 0.45;
  const halfSpanX = widthM / 2 + 0.32;
  const builder = new BoxTrussBuilder();

  builder.addRun([-halfSpanX, mountBottomM, 0], [-halfSpanX, lintelY, 0], {
    basePlate: true,
    basePlateAtStart: true,
  });
  builder.addRun([halfSpanX, mountBottomM, 0], [halfSpanX, lintelY, 0], {
    basePlate: true,
    basePlateAtStart: true,
  });
  builder.addRun([-halfSpanX - 0.02, lintelY, 0], [halfSpanX + 0.02, lintelY, 0]);

  group.add(builder.toGroup());

  const hangMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.85, roughness: 0.25 });
  const clampMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, metalness: 0.9, roughness: 0.2 });
  const chainZ = TRUSS_SECTION_M * 0.45;
  const chainCount = 7;
  for (let i = 0; i < chainCount; i++) {
    const t = chainCount === 1 ? 0.5 : i / (chainCount - 1);
    const x = -widthM / 2 + widthM * t;
    const chainLen = Math.max(0.12, lintelY - wallTopY - 0.08);
    const chain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, chainLen, 8),
      hangMat
    );
    chain.position.set(x, wallTopY + chainLen / 2 + 0.04, chainZ);
    group.add(chain);

    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.06), clampMat);
    clamp.position.set(x, wallTopY + 0.02, chainZ);
    group.add(clamp);
  }

  return group;
}
