import type { LEDWall } from '../types/wall'
import type { LEDWallProject } from '../types/project'

/** Snap stored canvas positions to whole millimetres. */
export function roundPositionMm(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value)
}

export function roundPositionPatch<T extends { xMm?: number, yMm?: number }>(
  patch: T
): T {
  const out = { ...patch }
  if (out.xMm != null) out.xMm = roundPositionMm(out.xMm)
  if (out.yMm != null) out.yMm = roundPositionMm(out.yMm)
  return out
}

/** Analysis helper: snap panel origins to whole mm (fixes stale float autosave). */
export function wallWithRoundedPanelOrigins(wall: LEDWall): LEDWall {
  return {
    ...wall,
    xMm: roundPositionMm(wall.xMm),
    yMm: roundPositionMm(wall.yMm),
    panels: wall.panels.map(p => ({
      ...p,
      xMm: roundPositionMm(p.xMm),
      yMm: roundPositionMm(p.yMm)
    }))
  }
}

export function normalizeProjectPositions(project: LEDWallProject): LEDWallProject {
  for (const wall of project.walls) {
    wall.xMm = roundPositionMm(wall.xMm)
    wall.yMm = roundPositionMm(wall.yMm)
    for (const panel of wall.panels) {
      panel.xMm = roundPositionMm(panel.xMm)
      panel.yMm = roundPositionMm(panel.yMm)
    }
  }
  return project
}
