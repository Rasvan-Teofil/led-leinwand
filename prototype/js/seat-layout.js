/** Sitzpositionen für InstancedMesh (Publikum schaut Richtung −X zur Bühne). */

export function collectSeatTransforms(layout) {
  const out = [];
  const { seatW, seatD, stage } = layout;
  const s = layout.scale;
  const baseX = stage.xMax + layout.aisleFromStageM * s;

  for (let row = 0; row < 5; row++) {
    const x = baseX + row * (seatD + 0.35);
    for (let c = 0; c < 4; c++) {
      const z = -1.05 + c * (seatW + 0.12);
      out.push({ x, z, rotY: Math.PI / 2 });
    }
  }

  for (let row = 0; row < 3; row++) {
    const x = baseX + 0.4 + row * (seatD + 0.38);
    const angle = 0.22;
    for (let c = 0; c < 3; c++) {
      const z = stage.zMin + 1.2 + c * (seatW + 0.15);
      out.push({ x, z, rotY: Math.PI / 2 - angle });
    }
  }

  for (let row = 0; row < 3; row++) {
    const x = baseX + 0.4 + row * (seatD + 0.38);
    const angle = -0.22;
    for (let c = 0; c < 3; c++) {
      const z = stage.zMax - 1.2 - c * (seatW + 0.15);
      out.push({ x, z, rotY: Math.PI / 2 - angle });
    }
  }

  return out;
}

export function audienceFacingY() {
  return Math.PI / 2;
}
