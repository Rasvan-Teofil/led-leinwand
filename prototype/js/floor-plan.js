/**
 * Messwerte aus dem Lageplan (PNG 1024 × 451 px), abgelesen in Plan-Pixeln.
 *
 * Maßstab: braune Bühnenfläche y 118 → 385 px = 8 m (4 × 2-m-Elemente) ⇒ 33,4 px/m.
 * Ursprung: Bühnenvorderkante (x 280 px) auf Höhe der Bühnenmitte (y 251,5 px).
 * Achsen: +X = Plan nach rechts (von der Bühne Richtung Tech-Pult),
 *         +Z = Plan nach unten (aus Publikumssicht links), +Y = oben.
 */
export const PLAN_PX_PER_M = (385 - 118) / 8;
export const PLAN_ORIGIN_PX = Object.freeze({ x: 280, y: 251.5 });

export function planPx(px, py) {
  return {
    x: (px - PLAN_ORIGIN_PX.x) / PLAN_PX_PER_M,
    z: (py - PLAN_ORIGIN_PX.y) / PLAN_PX_PER_M,
  };
}

export function planLenM(px) {
  return px / PLAN_PX_PER_M;
}

/** Innenkante der Saalwände (ohne Backstage und Nebenräume). */
export const HALL_OUTLINE_PX = [
  [160, 110], // hinter der Bühne, Wand zur Bible Crew
  [365, 110], // Ecke Bible Crew
  [365, 72], // Nische: Holzkreuz, Connect Point, Info
  [763, 72],
  [792, 103], // Schräge zum Church Lager
  [792, 384], // Wand hinter Tech-/Übersetzungspult
  [455, 384], // Versatz der unteren Wand (Kicker)
  [455, 393],
  [160, 393],
];

/** Bühne: braune Fläche x 183–280 px (≈ 2,9 m) → 3 Reihen à 1-m-Elemente. */
export const STAGE_PX = { xBack: 180, xFront: 280, yTop: 118, yBottom: 385 };

/** Weiße Traversenlinie: Rückseite des vorne offenen U hinter dem Vorhang. */
export const STAGE_TRUSS_BACK_X_PX = 166;

const ROW_PITCH_PX = 40; // 1,2 m Reihenabstand
const WING_STEP_PX = { dx: 9, dy: 17 }; // Nachbarstuhl in den schrägen Reihen (0,58 m)

/**
 * Stuhlblöcke wie im Plan:
 * - Mitte: 7 gerade Reihen × 4 Stühle
 * - oben: 7 schräge Reihen × 3 Stühle (zur Bühnenmitte gedreht)
 * - unten: 5 schräge Reihen × 3 Stühle
 */
export const SEAT_BLOCKS_PX = [
  {
    id: 'mitte',
    rows: 7,
    seats: 4,
    seat: (row, i) => [337 + row * ROW_PITCH_PX, 218 + i * 19],
    facing: [-1, 0],
  },
  {
    id: 'oben',
    rows: 7,
    seats: 3,
    seat: (row, i) => [318 + row * ROW_PITCH_PX + i * WING_STEP_PX.dx, 136 + i * WING_STEP_PX.dy],
    facing: [-WING_STEP_PX.dy, WING_STEP_PX.dx],
  },
  {
    id: 'unten',
    rows: 5,
    seats: 3,
    seat: (row, i) => [332 + row * ROW_PITCH_PX - i * WING_STEP_PX.dx, 326 + i * WING_STEP_PX.dy],
    facing: [-WING_STEP_PX.dy, -WING_STEP_PX.dx],
  },
];

/** Tech-/Übersetzungspult (braun) mit Abtrennung und Bedienplätzen. */
export const TECH_DESK_PX = {
  desk: { x0: 713, x1: 747, y0: 118, y1: 338 },
  partitionX: 703,
  partitionYTop: 110,
  partitionYBottom: 346,
  partitionTopXEnd: 752,
  operatorX: 752,
  operatorYs: [162, 232, 297],
  monitorYs: [128, 196, 262, 320],
};

export const WALL_CROSS_PX = { x: 386, y: 92 };
export const CONNECT_POINT_PX = { x0: 442, x1: 514 };
export const INFO_PX = { x0: 530, x1: 570 };
