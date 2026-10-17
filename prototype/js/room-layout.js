/**
 * Gottesdienstraum — alle Maße an einem Ort (Skala: Bühnenlänge = 4 × 2 m Module).
 * Koordinaten: +X = Publikum/Tech, −X = Bühnenrückwand (LED); Z = entlang der linken Wand (Bühne 8 m).
 */

const STAGE_MODULE_M = 2;

export const ROOM_LAYOUT_DEFAULTS = {
  /** Skalierungsfaktor für alle horizontalen Maße (1 = Lageplan-Maßstab) */
  scale: 1,
  stageModuleM: STAGE_MODULE_M,
  stageModulesAlongWall: 4,
  /** Bühnentiefe ≈ ein Modul + Rand */
  stageDepthM: STAGE_MODULE_M * 1.25,
  /** Traversen-Rahmen um die Bühne (ca. ein Modulbreite) */
  trussOutM: STAGE_MODULE_M,
  trussHeightM: 4.2,
  /** Hauptsaal (ohne Nebenräume) */
  hallWidthM: 21,
  hallDepthM: 13,
  roomHeightM: 5.5,
  /** Abstand Bühne → erste Stuhlreihe */
  aisleFromStageM: 3,
  /** Tech-Pult an der rechten Wand */
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
  const hallWidthM = base.hallWidthM * s;
  const hallDepthM = base.hallDepthM * s;
  const halfW = hallWidthM / 2;
  const halfD = hallDepthM / 2;

  /** Ebene der LED / Bühnenrückwand */
  const wallX = -halfW + 0.12;

  const stage = {
    xMin: -halfW,
    xMax: -halfW + stageDepthX,
    zMin: -stageLengthZ / 2,
    zMax: stageLengthZ / 2,
    lengthZ: stageLengthZ,
    depthX: stageDepthX,
  };

  const truss = {
    xMin: stage.xMin - base.trussOutM * s * 0.15,
    xMax: stage.xMax + base.trussOutM * s * 0.35,
    zMin: stage.zMin - base.trussOutM * s * 0.25,
    zMax: stage.zMax + base.trussOutM * s * 0.25,
    heightM: base.trussHeightM,
  };

  const viewpoints = {
    ersteReihe: {
      x: wallX + base.aisleFromStageM * s + 1.2 * s,
      z: 0,
      label: 'Erste Reihe',
    },
    mitte: {
      x: wallX + 8.8 * s,
      z: 0,
      label: 'Mitte',
    },
    letzteReihe: {
      x: wallX + 12.8 * s,
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
    wallX,
    stage,
    truss,
    viewpoints,
    ledWall: {
      anchorX: wallX + 0.08,
      centerZ: 0,
      defaultMountHeightM: 1.2,
    },
  };
}

/** Für UI: änderbare Kernmaße */
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
