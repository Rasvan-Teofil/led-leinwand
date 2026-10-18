import type { PanelDefinition } from '../types/panel'
import type { LEDWall } from '../types/wall'
import {
  formatIntegerDe,
  formatMetersPair,
  formatPanelsAreaLine,
  formatPhysicalAspectDisplay,
  formatPitchPairMm,
  formatResolutionPair
} from '../format/de-de'
import { getWallDimensions } from './dimensions'
import { detectOverlaps } from './geometry'
import {
  activePixelCountFromGroups,
  analyzeNativeResolution,
  type ResolutionWarningCode
} from './resolution'

export interface WallOverviewSummary {
  layoutSubtitle: string
  overallSize: string
  nativeResolution: string
  nativeResolutionNote: string | null
  panelsArea: string
  effectivePitch: string
  effectivePitchNote: string | null
  physicalAspect: string
  totalPixels: string
  totalPixelsNote: string | null
  usesActivePixels: boolean
}

function inferWallLayoutLabel(wall: LEDWall): string {
  const enabled = wall.panels.filter(p => p.enabled)
  if (enabled.length === 0) return 'Keine Panels'
  const xs = new Set(enabled.map(p => p.xMm))
  const ys = new Set(enabled.map(p => p.yMm))
  const cols = xs.size
  const rows = ys.size
  if (cols > 0 && rows > 0 && cols * rows === enabled.length) {
    return `${cols} Spalten × ${rows} Reihen`
  }
  return `Unregelmäßig · ${enabled.length} Panels`
}

function shortWarning(code: ResolutionWarningCode): string {
  switch (code) {
    case 'mixed_pitch':
      return 'Gemischter Pitch'
    case 'non_rectangular':
      return 'Unregelmäßiges Raster'
    case 'gaps_in_grid':
      return 'Lücken im Raster'
    case 'overlapping_panels':
      return 'Überlappung'
    case 'no_panels':
      return 'Keine Panels'
    case 'mixed_panel_sizes':
      return 'Verschiedene Panelgrößen'
    default:
      return 'Kein natives Raster'
  }
}

function primaryWarning(warnings: ResolutionWarningCode[]): string | null {
  if (warnings.length === 0) return null
  const order: ResolutionWarningCode[] = [
    'overlapping_panels',
    'mixed_pitch',
    'non_rectangular',
    'gaps_in_grid',
    'mixed_panel_sizes',
    'no_panels'
  ]
  for (const code of order) {
    if (warnings.includes(code)) return shortWarning(code)
  }
  return shortWarning(warnings[0]!)
}

export function buildWallOverviewSummary(
  wall: LEDWall,
  defs: PanelDefinition[],
  defsById: Map<string, PanelDefinition>
): WallOverviewSummary {
  const dims = getWallDimensions(wall, defs)
  const overlaps = detectOverlaps(wall, defsById)
  const resolution = analyzeNativeResolution(wall, defs, overlaps.length)
  const layoutSubtitle = inferWallLayoutLabel(wall)
  const overallSize = formatMetersPair(dims.bboxWidthMm, dims.bboxHeightMm)
  const panelsArea = formatPanelsAreaLine(
    dims.enabledPanelCount,
    dims.activeAreaM2
  )
  const physicalAspect = formatPhysicalAspectDisplay(
    dims.bboxWidthMm,
    dims.bboxHeightMm
  )

  let nativeResolution: string
  let nativeResolutionNote: string | null = null
  let totalPixels: string
  let totalPixelsNote: string | null = null
  let usesActivePixels = false

  if (resolution.valid && resolution.resolutionX > 0 && resolution.resolutionY > 0) {
    nativeResolution = formatResolutionPair(
      resolution.resolutionX,
      resolution.resolutionY
    )
    totalPixels = formatIntegerDe(resolution.totalPixels)
  } else {
    nativeResolution = '—'
    nativeResolutionNote = primaryWarning(resolution.warnings)
    usesActivePixels = true
    const activePx = activePixelCountFromGroups(resolution.pitchGroups)
    totalPixels = formatIntegerDe(activePx)
    totalPixelsNote = 'Aktive Pixel (kein einheitliches Native-Raster)'
  }

  let effectivePitch: string
  let effectivePitchNote: string | null = null
  if (
    resolution.valid
    && resolution.resolutionX > 0
    && resolution.resolutionY > 0
  ) {
    const px = dims.bboxWidthMm / resolution.resolutionX
    const py = dims.bboxHeightMm / resolution.resolutionY
    effectivePitch = formatPitchPairMm(px, py)
  } else if (resolution.pitchGroups.length === 1) {
    const g = resolution.pitchGroups[0]!
    effectivePitch = formatPitchPairMm(g.pitchX, g.pitchY)
    effectivePitchNote = 'Pitch der Panel-Gruppe'
  } else {
    effectivePitch = '—'
    effectivePitchNote = nativeResolutionNote ?? 'Nicht berechenbar'
  }

  return {
    layoutSubtitle,
    overallSize,
    nativeResolution,
    nativeResolutionNote,
    panelsArea,
    effectivePitch,
    effectivePitchNote,
    physicalAspect,
    totalPixels,
    totalPixelsNote,
    usesActivePixels
  }
}

export interface ProjectOverviewSummary {
  layoutSubtitle: string
  overallSize: string
  nativeResolution: string
  nativeResolutionNote: string | null
  panelsArea: string
  effectivePitch: string
  effectivePitchNote: string | null
  physicalAspect: string
  totalPixels: string
  totalPixelsNote: string | null
}

export function buildProjectOverviewSummary(
  walls: LEDWall[],
  defs: PanelDefinition[],
  defsById: Map<string, PanelDefinition>
): ProjectOverviewSummary {
  if (walls.length === 0) {
    return {
      layoutSubtitle: 'Kein Projektinhalt',
      overallSize: '—',
      nativeResolution: '—',
      nativeResolutionNote: null,
      panelsArea: '—',
      effectivePitch: '—',
      effectivePitchNote: null,
      physicalAspect: '—',
      totalPixels: '—',
      totalPixelsNote: null
    }
  }
  if (walls.length === 1) {
    return buildWallOverviewSummary(walls[0]!, defs, defsById)
  }

  let panels = 0
  let areaM2 = 0
  let totalPixels = 0
  for (const wall of walls) {
    const d = getWallDimensions(wall, defs)
    const overlaps = detectOverlaps(wall, defsById)
    const res = analyzeNativeResolution(wall, defs, overlaps.length)
    panels += d.enabledPanelCount
    areaM2 += d.activeAreaM2
    totalPixels += res.valid
      ? res.totalPixels
      : activePixelCountFromGroups(res.pitchGroups)
  }

  return {
    layoutSubtitle: `${walls.length} Wände · ${panels} Panels`,
    overallSize: '—',
    nativeResolution: '—',
    nativeResolutionNote: 'Projektweit nicht eindeutig',
    panelsArea: formatPanelsAreaLine(panels, areaM2),
    effectivePitch: '—',
    effectivePitchNote: 'Projektweit nicht eindeutig',
    physicalAspect: '—',
    totalPixels: formatIntegerDe(totalPixels),
    totalPixelsNote: 'Summe aller Wände'
  }
}
