/**
 * Gottesdienstraum — alle Maße zentral, abgeleitet aus floor-plan.js.
 * x = 0 an der Bühnenvorderkante, +X Richtung Tech-Pult; z = 0 Bühnenmitte.
 */

import {
  CONNECT_POINT_PX,
  INFO_PX,
  SEAT_BLOCKS_PX,
  STAGE_PX,
  STAGE_TRUSS_BACK_X_PX,
  TECH_DESK_PX,
  WALL_CROSS_PX,
  planPx,
} from './floor-plan.js';
import { footprintBounds, footprintSpanZ, HALL_FOOTPRINT_XZ } from './room-footprint.js';

export const ROOM_HEIGHT_M = 5.5;
export const SEATED_EYE_M = 1.2;

const TRUSS_HALF_M = 0.145;
/** Turm-Mitten der LED-Traverse vor der Bühnenrückwand / dem Vorhang (keine Kollision). */
const LED_TRUSS_INSET_FROM_STAGE_BACK_M = 0.35;

export function resolveRoomLayout({ roomHeightM = ROOM_HEIGHT_M } = {}) {
  const footprint = HALL_FOOTPRINT_XZ.map((p) => ({ ...p }));
  const bounds = footprintBounds(footprint);

  const s0 = planPx(STAGE_PX.xBack, STAGE_PX.yTop);
  const s1 = planPx(STAGE_PX.xFront, STAGE_PX.yBottom);
  const stage = {
    xMin: s0.x,
    xMax: s1.x,
    zMin: s0.z,
    zMax: s1.z,
    depthX: s1.x - s0.x,
    lengthZ: s1.z - s0.z,
    centerZ: (s0.z + s1.z) / 2,
    heightM: 0.2,
    elementLengthM: 2,
    elementDepthM: 1,
  };

  const backTrussX = planPx(STAGE_TRUSS_BACK_X_PX, 0).x;
  const stageTruss = {
    xBack: backTrussX,
    xFront: stage.xMax - 0.2,
    zHalf: stage.lengthZ / 2 - 0.17,
    centerY: 4.6,
  };
  const curtainX = (backTrussX + TRUSS_HALF_M + stage.xMin) / 2;

  const ledTrussX = stage.xMin + LED_TRUSS_INSET_FROM_STAGE_BACK_M;
  const ledPlaneX = ledTrussX + 0.035;

  const ceilingTruss = {
    xs: [1.2, 4.6],
    zHalf: 3.9,
    longZ: [-2.6, 2.6],
    centerY: 4.65,
  };
  const ceilingBeams = [2.1, 6.2, 10.3, 14.0].map((x) => ({ x, ...footprintSpanZ(x, footprint) }));

  const mid = SEAT_BLOCKS_PX[0];
  const midRowX = (row) => planPx(mid.seat(row, 0)[0], 0).x;
  const midCenterZ =
    (planPx(0, mid.seat(0, 0)[1]).z + planPx(0, mid.seat(0, mid.seats - 1)[1]).z) / 2;
  const headBehindSeatM = 0.12;

  const desk = TECH_DESK_PX.desk;
  const d0 = planPx(desk.x0, desk.y0);
  const d1 = planPx(desk.x1, desk.y1);
  const techDesk = {
    xMin: d0.x,
    xMax: d1.x,
    zMin: d0.z,
    zMax: d1.z,
    heightM: 0.75,
    partitionX: planPx(TECH_DESK_PX.partitionX, 0).x,
    partitionZTop: planPx(0, TECH_DESK_PX.partitionYTop).z,
    partitionZBottom: planPx(0, TECH_DESK_PX.partitionYBottom).z,
    partitionTopXEnd: planPx(TECH_DESK_PX.partitionTopXEnd, 0).x,
    partitionHeightM: 1.05,
    operatorX: planPx(TECH_DESK_PX.operatorX, 0).x,
    operatorZs: TECH_DESK_PX.operatorYs.map((y) => planPx(0, y).z),
    monitorZs: TECH_DESK_PX.monitorYs.map((y) => planPx(0, y).z),
  };

  const alcoveWallZ = bounds.minZ;
  const cross = planPx(WALL_CROSS_PX.x, WALL_CROSS_PX.y);
  const furniture = {
    wallCross: { x: cross.x, z: alcoveWallZ + 0.16 },
    connectPoint: {
      xMin: planPx(CONNECT_POINT_PX.x0, 0).x,
      xMax: planPx(CONNECT_POINT_PX.x1, 0).x,
      zWall: alcoveWallZ,
    },
    info: {
      xMin: planPx(INFO_PX.x0, 0).x,
      xMax: planPx(INFO_PX.x1, 0).x,
      zWall: alcoveWallZ,
    },
  };

  const viewpoints = {
    ersteReihe: { x: midRowX(0) + headBehindSeatM, z: midCenterZ, eyeY: SEATED_EYE_M, label: 'Erste Reihe' },
    mitte: { x: midRowX(3) + headBehindSeatM, z: midCenterZ, eyeY: SEATED_EYE_M, label: 'Mitte' },
    letzteReihe: { x: midRowX(6) + headBehindSeatM, z: midCenterZ, eyeY: SEATED_EYE_M, label: 'Letzte Reihe' },
    techPult: { x: techDesk.operatorX, z: techDesk.operatorZs[1], eyeY: 1.3, label: 'Tech-Pult' },
  };

  return {
    roomHeightM,
    footprint,
    bounds,
    minX: bounds.minX,
    maxX: bounds.maxX,
    minZ: bounds.minZ,
    maxZ: bounds.maxZ,
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerZ: (bounds.minZ + bounds.maxZ) / 2,
    hallWidthM: bounds.widthX,
    hallDepthM: bounds.depthZ,
    stage,
    stageTruss,
    curtainX,
    ceilingTruss,
    ceilingBeams,
    techDesk,
    furniture,
    viewpoints,
    wallX: ledPlaneX,
    ledPlaneX,
    ledWall: {
      trussX: ledTrussX,
      centerZ: stage.centerZ,
      baseY: stage.heightM,
      defaultMountHeightM: stage.heightM + 1.0,
    },
  };
}

export function defaultRoomDims() {
  const L = resolveRoomLayout();
  return {
    hallWidthM: L.hallWidthM,
    hallDepthM: L.hallDepthM,
    roomHeightM: L.roomHeightM,
  };
}
