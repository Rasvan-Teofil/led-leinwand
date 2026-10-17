/**
 * Gottesdienstraum — Maße zentral (Bühne 8 m = 4×2 m Module entlang Z).
 * +X = Publikum, −X = Backstage; Bühne an der linken Saalwand, LED an der vorderen Bühnenkante.
 */

import { footprintBounds, HALL_FOOTPRINT_XZ } from './room-footprint.js';

const STAGE_MODULE_M = 2;

export const ROOM_LAYOUT_DEFAULTS = {
  scale: 1,
  stageModuleM: STAGE_MODULE_M,
  stageModulesAlongWall: 4,
  /** Tiefe der Bühne ins Publikum (+X), Lageplan ~2,5 m */
  stageDepthM: 2.5,
  stageHeightM: 0.2,
  backstageDepthM: 2.8,
  trussOutM: STAGE_MODULE_M * 0.45,
  trussHeightM: 4.4,
  roomHeightM: 5.5,
  aisleFromStageM: 2.6,
  techDeskLengthZ: 8,
  techDeskDepthM: 1.15,
  techDeskHeightM: 1.0,
  techDeskCenterZ: -0.8,
  seatW: 0.52,
  seatD: 0.5,
  seatH: 0.45,
  footprint: HALL_FOOTPRINT_XZ,
};

export function resolveRoomLayout(overrides = {}) {
  const base = { ...ROOM_LAYOUT_DEFAULTS, ...overrides };
  const s = base.scale;
  const bounds = footprintBounds(base.footprint);
  const hallWidthM = bounds.widthX * s;
  const hallDepthM = bounds.depthZ * s;
  const minX = bounds.minX * s;
  const maxX = bounds.maxX * s;
  const minZ = bounds.minZ * s;
  const maxZ = bounds.maxZ * s;
  const halfW = (maxX - minX) / 2;
  const halfD = (maxZ - minZ) / 2;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  const stageLengthZ = base.stageModulesAlongWall * base.stageModuleM * s;
  const stageDepthX = base.stageDepthM * s;
  const stageHeightM = base.stageHeightM;

  const hallLeftX = bounds.minX * s + 0.12 * s;

  const stage = {
    xMin: hallLeftX,
    xMax: hallLeftX + stageDepthX,
    zMin: -stageLengthZ / 2,
    zMax: stageLengthZ / 2,
    lengthZ: stageLengthZ,
    depthX: stageDepthX,
    heightM: stageHeightM,
  };

  const backstage = {
    xMin: hallLeftX - base.backstageDepthM * s,
    xMax: hallLeftX,
    zMin: stage.zMin - 0.5 * s,
    zMax: stage.zMax + 0.5 * s,
  };

  const ledPlaneX = stage.xMax + 0.04 * s;

  const truss = {
    xMin: stage.xMin - base.trussOutM * s * 0.15,
    xMax: stage.xMax + base.trussOutM * s * 0.2,
    zMin: stage.zMin - base.trussOutM * s * 0.4,
    zMax: stage.zMax + base.trussOutM * s * 0.4,
    heightM: base.trussHeightM,
    openFront: true,
  };

  const viewpoints = {
    ersteReihe: {
      x: ledPlaneX + base.aisleFromStageM * s + 1.0 * s,
      z: 0,
      label: 'Erste Reihe',
    },
    mitte: {
      x: ledPlaneX + 7.5 * s,
      z: 0,
      label: 'Mitte',
    },
    letzteReihe: {
      x: maxX - 2.2 * s,
      z: 0.2 * s,
      label: 'Letzte Reihe',
    },
    techPult: {
      x: maxX - base.techDeskDepthM * s - 0.65 * s,
      z: base.techDeskCenterZ * s,
      label: 'Tech-Pult',
    },
  };

  return {
    ...base,
    hallWidthM,
    hallDepthM,
    roomHeightM: base.roomHeightM,
    halfW,
    halfD,
    minX,
    maxX,
    minZ,
    maxZ,
    centerX,
    centerZ,
    hallLeftX,
    wallX: ledPlaneX,
    ledPlaneX,
    stage,
    backstage,
    truss,
    viewpoints,
    footprint: base.footprint.map((p) => ({ x: p.x * s, z: p.z * s })),
    ledWall: {
      anchorX: ledPlaneX,
      centerZ: 0,
      defaultMountHeightM: stageHeightM + 1.0,
    },
  };
}

export function layoutFromUiDims({ hallWidthM, hallDepthM, roomHeightM, scale = 1 }) {
  return resolveRoomLayout({
    scale,
    hallWidthM: hallWidthM / scale,
    hallDepthM: hallDepthM / scale,
    roomHeightM,
  });
}

export function defaultRoomDims() {
  const L = resolveRoomLayout();
  return {
    hallWidthM: L.hallWidthM,
    hallDepthM: L.hallDepthM,
    roomHeightM: L.roomHeightM,
    scale: 1,
  };
}
