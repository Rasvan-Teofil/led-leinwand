import { SEAT_BLOCKS_PX, planPx } from './floor-plan.js';

export const EXPECTED_SEAT_COUNT = SEAT_BLOCKS_PX.reduce((n, b) => n + b.rows * b.seats, 0);

/** Drehung um Y für eine Stuhlvorlage, die bei rotY = 0 zur Bühne (−X) blickt. */
export function yawForFacing(fx, fz) {
  return Math.atan2(fz, -fx);
}

export function facingFromYaw(rotY) {
  return { x: -Math.cos(rotY), z: Math.sin(rotY) };
}

/** Stuhlpositionen (Mittelpunkt der Stuhlfläche) und Blickrichtung aller Plan-Blöcke. */
export function collectSeatTransforms() {
  const out = [];
  for (const block of SEAT_BLOCKS_PX) {
    const rotY = yawForFacing(block.facing[0], block.facing[1]);
    for (let row = 0; row < block.rows; row++) {
      for (let seat = 0; seat < block.seats; seat++) {
        const [px, py] = block.seat(row, seat);
        const p = planPx(px, py);
        out.push({ x: p.x, z: p.z, rotY, block: block.id, row, seat });
      }
    }
  }
  return out;
}
