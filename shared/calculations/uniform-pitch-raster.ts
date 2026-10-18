import type { PanelDefinition } from '../types/panel'
import { occupiedSizeMm, pitchXMm, pitchYMm } from '../types/panel'
import type { LEDWall } from '../types/wall'
import { wallLocalBoundingBox } from './geometry'

const PITCH_REL_TOL = 1e-4

export interface UniformPitchRasterResult {
  resolutionX: number
  resolutionY: number
  pitchMm: number
  originXmm: number
  originYmm: number
}

function pitchesMatch(a: number, b: number): boolean {
  if (a === b) return true
  const m = Math.max(a, b)
  if (m === 0) return true
  return Math.abs(a - b) / m < PITCH_REL_TOL
}

function isIntegerRatio(value: number): boolean {
  return Math.abs(value - Math.round(value)) < 1e-6
}

export function analyzeUniformPitchRaster(
  wall: LEDWall,
  defsById: Map<string, PanelDefinition>
): UniformPitchRasterResult | null {
  const enabled = wall.panels.filter(p => p.enabled)
  if (enabled.length === 0) return null
  if (enabled.some(p => p.rotation !== 0)) return null

  let pitchMm: number | null = null
  for (const panel of enabled) {
    const def = defsById.get(panel.panelDefinitionId)
    if (!def) return null
    const px = pitchXMm(def)
    const py = pitchYMm(def)
    if (!pitchesMatch(px, py)) return null
    if (pitchMm == null) pitchMm = px
    else if (!pitchesMatch(pitchMm, px)) return null
  }
  if (pitchMm == null || pitchMm <= 0) return null

  const bbox = wallLocalBoundingBox(wall, defsById)
  if (!bbox) return null

  const ref = defsById.get(enabled[0]!.panelDefinitionId)!
  const resX = (bbox.widthMm * ref.resolutionX) / ref.widthMm
  const resY = (bbox.heightMm * ref.resolutionY) / ref.heightMm
  if (!isIntegerRatio(resX) || !isIntegerRatio(resY)) return null
  const resXi = Math.round(resX)
  const resYi = Math.round(resY)

  const grid = new Uint8Array(resXi * resYi)

  for (const panel of enabled) {
    const def = defsById.get(panel.panelDefinitionId)!
    const size = occupiedSizeMm(def, panel.rotation)
    const px0 = ((panel.xMm - bbox.xMm) * def.resolutionX) / def.widthMm
    const py0 = ((panel.yMm - bbox.yMm) * def.resolutionY) / def.heightMm
    const pw = (size.widthMm * def.resolutionX) / def.widthMm
    const ph = (size.heightMm * def.resolutionY) / def.heightMm
    if (
      !isIntegerRatio(px0)
      || !isIntegerRatio(py0)
      || !isIntegerRatio(pw)
      || !isIntegerRatio(ph)
    ) {
      return null
    }
    const x0 = Math.round(px0)
    const y0 = Math.round(py0)
    const w = Math.round(pw)
    const h = Math.round(ph)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y0 + y) * resXi + (x0 + x)
        if (idx < 0 || idx >= grid.length || grid[idx] !== 0) return null
        grid[idx] = 1
      }
    }
  }

  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === 0) return null
  }

  return {
    resolutionX: resXi,
    resolutionY: resYi,
    pitchMm,
    originXmm: bbox.xMm,
    originYmm: bbox.yMm
  }
}
