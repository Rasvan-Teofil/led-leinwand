/** Sitzplätze gemäß Lageplan: Mitte 4×4, Flügel oben/unten je 2+3+3+3, Blick zur Bühne (−X). */

export function collectSeatTransforms(layout) {
  const out = [];
  const { seatW, seatD, stage } = layout;
  const s = layout.scale ?? 1;
  const rowPitch = (seatD + 0.34) * s;
  const colPitch = (seatW + 0.13) * s;
  const baseX = stage.xMax + layout.aisleFromStageM * s;
  const face = Math.PI / 2;

  const centerCols = [-1.5, -0.5, 0.5, 1.5].map((i) => i * colPitch);
  for (let row = 0; row < 4; row++) {
    const x = baseX + row * rowPitch;
    for (const z of centerCols) {
      out.push({ x, z, rotY: face });
    }
  }

  const wingCounts = [2, 3, 3, 3];
  const wingAngle = 0.24;

  for (let row = 0; row < 4; row++) {
    const n = wingCounts[row];
    const x = baseX + 0.15 + row * rowPitch;
    const zBase = stage.zMin + 0.95 + row * 0.12;
    for (let c = 0; c < n; c++) {
      const z = zBase + c * colPitch;
      const t = (c - (n - 1) / 2) * 0.08;
      out.push({ x, z, rotY: face - wingAngle + t });
    }
  }

  for (let row = 0; row < 4; row++) {
    const n = wingCounts[row];
    const x = baseX + 0.15 + row * rowPitch;
    const zBase = stage.zMax - 0.95 - row * 0.12;
    for (let c = 0; c < n; c++) {
      const z = zBase - c * colPitch;
      const t = (c - (n - 1) / 2) * 0.08;
      out.push({ x, z, rotY: face + wingAngle - t });
    }
  }

  return out;
}

export function audienceFacingY() {
  return Math.PI / 2;
}
