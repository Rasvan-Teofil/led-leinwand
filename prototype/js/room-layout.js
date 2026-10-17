/**
 * Gottesdienstraum — Maße zentral (Bühne 8 m = 4×2 m Module entlang Z).
 * +X = Publikum, −X = Backstage; Bühne an der linken Saalwand, LED an der vorderen Bühnenkante.
 */

const STAGE_MODULE_M = 2;

export const ROOM_LAYOUT_DEFAULTS = {
  scale: 1,
  stageModuleM: STAGE_MODULE_M,
  stageModulesAlongWall: 4,
  /** Tiefe der Bühne ins Publikum (+X) */
  stageDepthM: 4,
  stageHeightM: 0.2,
  /** Backstage westlich der Bühnenrückwand (Lageplan: „Bank“) */
  backstageDepthM: 3.5,
  trussOutM: STAGE_MODULE_M * 0.55,
  trussHeightM: 4.2,
  hallWidthM: 21,
  hallDepthM: 13,
  roomHeightM: 5.5,
  aisleFromStageM: 3,
  techDeskLengthZ: 7,
  techDeskDepthM: 1.2,
  techDeskHeightM: 1.05,
  rugSizeX: 3.2,
  rugSizeZ: 2.4,
  seatW: 0.52,
  seatD: 0.5,
  seatH: 0.45,
};

export function resolveRoomLayout(overrides = {}) {
  const base = { ...ROOM_LAYOUT_DEFAULTS, ...overrides };
  const s = base.scale;
  const stageLengthZ = base.stageModulesAlongWall * base.stageModuleM * s;
  const stageDepthX = base.stageDepthM * s;
  const stageHeightM = base.stageHeightM;
  const hallWidthM = base.hallWidthM * s;
  const hallDepthM = base.hallDepthM * s;
  const halfW = hallWidthM / 2;
  const halfD = hallDepthM / 2;

  /** Innere Saalwand links (Bühnenrückseite) */
  const hallLeftX = -halfW + 0.15 * s;

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

  /** LED-Ebene an der vorderen Bühnenkante, zum Publikum (+X) */
  const ledPlaneX = stage.xMax + 0.04 * s;

  const truss = {
    xMin: stage.xMin - base.trussOutM * s * 0.2,
    xMax: stage.xMax + base.trussOutM * s * 0.15,
    zMin: stage.zMin - base.trussOutM * s * 0.35,
    zMax: stage.zMax + base.trussOutM * s * 0.35,
    heightM: base.trussHeightM,
    openFront: true,
  };

  const viewpoints = {
    ersteReihe: {
      x: ledPlaneX + base.aisleFromStageM * s + 1.2 * s,
      z: 0,
      label: 'Erste Reihe',
    },
    mitte: {
      x: ledPlaneX + 8.8 * s,
      z: 0,
      label: 'Mitte',
    },
    letzteReihe: {
      x: ledPlaneX + 12.8 * s,
      z: 0.3 * s,
      label: 'Letzte Reihe',
    },
    techPult: {
      x: halfW - base.techDeskDepthM * s - 0.8 * s,
      z: -1.5 * s,
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
    hallLeftX,
    /** @deprecated alias — LED-Ebene, nicht Backstage-Wand */
    wallX: ledPlaneX,
    ledPlaneX,
    stage,
    backstage,
    truss,
    viewpoints,
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
