/**
 * Sitzplan Lageplan (62 Plätze):
 * - Mitte: 4 Reihen × 7 Stühle
 * - Oben (−Z): 7 Spalten mit 2+3+3+3+3+3+3 Stühlen (20)
 * - Unten (+Z): 5 Spalten mit 2+3+3+3+3 (14)
 * Alle Blicke zur Bühne (+X → −X, rotY = π/2).
 */

export const EXPECTED_SEAT_COUNT = 62;

export function collectSeatTransforms(layout) {
  const out = [];
  const { seatW, seatD, stage } = layout;
  const s = layout.scale ?? 1;
  const rowPitch = (seatD + 0.32) * s;
  const colPitch = (seatW + 0.11) * s;
  const baseX = stage.xMax + layout.aisleFromStageM * s;
  const face = Math.PI / 2;
  const wingAngle = 0.2;

  const midZMin = -2.45 * s;
  const midZMax = 2.45 * s;
  for (let row = 0; row < 4; row++) {
    const x = baseX + row * rowPitch;
    for (let col = 0; col < 7; col++) {
      const z = midZMin + (col / 6) * (midZMax - midZMin);
      out.push({ x, z, rotY: face });
    }
  }

  const topColCounts = [2, 3, 3, 3, 3, 3, 3];
  const topZMin = stage.zMin + 0.45 * s;
  const topZMax = midZMin - 0.55 * s;
  for (let col = 0; col < topColCounts.length; col++) {
    const n = topColCounts[col];
    const z = topZMin + (col / (topColCounts.length - 1)) * (topZMax - topZMin);
    for (let i = 0; i < n; i++) {
      const x = baseX + i * rowPitch;
      const yaw = face - wingAngle + col * 0.015;
      out.push({ x, z, rotY: yaw });
    }
  }

  const bottomColCounts = [2, 3, 3, 3, 3];
  const bottomZMax = stage.zMax - 0.45 * s;
  const bottomZMin = midZMax + 0.55 * s;
  for (let col = 0; col < bottomColCounts.length; col++) {
    const n = bottomColCounts[col];
    const z = bottomZMax - (col / (bottomColCounts.length - 1)) * (bottomZMax - bottomZMin);
    for (let i = 0; i < n; i++) {
      const x = baseX + i * rowPitch;
      const yaw = face + wingAngle - col * 0.015;
      out.push({ x, z, rotY: yaw });
    }
  }

  return out;
}

export function audienceFacingY() {
  return Math.PI / 2;
}
