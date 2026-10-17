import * as THREE from 'three';
import {
  BoxTrussBuilder,
  TRUSS_CHORD_OFFSET_M,
  TRUSS_CHORD_R,
  TRUSS_SECTION_M,
} from './box-truss.js';

const FLYBAR_H = 0.05;
const SLING_LEN = 0.26;
const TOWER_CLEARANCE_M = 0.25;

/** Höhe der Traversenachse über dem Boden für eine LED-Oberkante bei panelTopY. */
export function lintelCenterY(panelTopY) {
  return panelTopY + FLYBAR_H + SLING_LEN + TRUSS_CHORD_OFFSET_M + TRUSS_CHORD_R;
}

export function trussTopForPanelTop(panelTopY) {
  return lintelCenterY(panelTopY) + TRUSS_SECTION_M / 2;
}

/**
 * Torbogen aus F34-Traverse (zwei Türme + Querträger) im lokalen System der LED-Wand:
 * x entlang der Wandbreite, y = Höhe über Boden, z = 0 Traversenachse (Cabinet-Mitte).
 * Die Cabinets hängen über eine Flugschiene und Stahlseile an den unteren Gurtrohren.
 */
export function buildHangingTruss({ widthM, panelBottomY, panelHeightM, baseY }) {
  const group = new THREE.Group();
  group.name = 'led-hanging-truss';
  const h = TRUSS_SECTION_M / 2;
  const o = TRUSS_CHORD_OFFSET_M;
  const panelTop = panelBottomY + panelHeightM;
  const lintelY = lintelCenterY(panelTop);
  const halfSpan = widthM / 2 + TOWER_CLEARANCE_M;

  const b = new BoxTrussBuilder();
  b.addTower(-halfSpan, 0, baseY, lintelY);
  b.addTower(halfSpan, 0, baseY, lintelY);
  b.addRun([-halfSpan + h, lintelY, 0], [halfSpan - h, lintelY, 0]);
  group.add(b.toGroup());

  const blackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.6, roughness: 0.35 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x8c9098, metalness: 0.7, roughness: 0.3 });

  const flybar = new THREE.Mesh(new THREE.BoxGeometry(widthM, FLYBAR_H, 0.06), blackMat);
  flybar.position.set(0, panelTop + FLYBAR_H / 2, 0);
  group.add(flybar);

  const slingBottom = panelTop + FLYBAR_H;
  const chordBottom = lintelY - o - TRUSS_CHORD_R;
  const slingCount = Math.max(2, Math.round(widthM));
  const slingGeo = new THREE.CylinderGeometry(0.005, 0.005, chordBottom - slingBottom, 6);
  const adapterGeo = new THREE.BoxGeometry(0.05, 0.025, 2 * o + 0.08);
  for (let i = 0; i < slingCount; i++) {
    const x = -widthM / 2 + (widthM * (i + 0.5)) / slingCount;
    const sling = new THREE.Mesh(slingGeo, steelMat);
    sling.position.set(x, (slingBottom + chordBottom) / 2, 0);
    group.add(sling);
    const adapter = new THREE.Mesh(adapterGeo, blackMat);
    adapter.position.set(x, chordBottom - 0.0125, 0);
    group.add(adapter);
  }
  return group;
}
