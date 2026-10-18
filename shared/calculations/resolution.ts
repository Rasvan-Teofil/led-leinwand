import type { PanelDefinition } from '../types/panel'
import { occupiedResolution, pitchXMm, pitchYMm } from '../types/panel'
import type { LEDWall } from '../types/wall'
import { wallWithRoundedPanelOrigins } from '../utils/position'
import { analyzeUniformPitchRaster } from './uniform-pitch-raster'

export type ResolutionWarningCode
  = | 'mixed_pitch'
    | 'non_rectangular'
    | 'gaps_in_grid'
    | 'overlapping_panels'
    | 'no_panels'
    | 'mixed_panel_sizes'

export interface NativeResolutionResult {
  valid: boolean
  resolutionX: number
  resolutionY: number
  totalPixels: number
  warnings: ResolutionWarningCode[]
  pitchGroups: PitchGroup[]
}

export interface PitchGroup {
  pitchX: number
  pitchY: number
  panelDefinitionId: string
  panels: number
  nativePixels: number
}

const REFERENCE_RESOLUTIONS = [
  { label: 'HD', width: 1280, height: 720 },
  { label: 'Full HD', width: 1920, height: 1080 },
  { label: 'QHD', width: 2560, height: 1440 },
  { label: 'UHD / 4K', width: 3840, height: 2160 }
] as const

export type ReferenceMatchKind
  = | 'exact_native'
    | 'same_aspect_different_res'
    | 'different_aspect'
    | 'larger_than_reference'
    | 'smaller_than_reference'
    | 'not_comparable'

export interface ReferenceComparison {
  label: string
  kind: ReferenceMatchKind
  referenceWidth: number
  referenceHeight: number
}

function panelsShareUniformGrid(
  wall: LEDWall,
  def: PanelDefinition
): { cols: number, rows: number } | null {
  if (wall.panels.length === 0) return null
  const enabled = wall.panels.filter(p => p.enabled && p.rotation === 0)
  if (enabled.length !== wall.panels.filter(p => p.enabled).length) {
    return null
  }
  const xs = new Set(enabled.map(p => p.xMm))
  const ys = new Set(enabled.map(p => p.yMm))
  const cols = xs.size
  const rows = ys.size
  if (cols * rows !== enabled.length) return null
  const sortedX = [...xs].sort((a, b) => a - b)
  const sortedY = [...ys].sort((a, b) => a - b)
  for (let i = 1; i < sortedX.length; i++) {
    if (sortedX[i]! - sortedX[i - 1]! !== def.widthMm) return null
  }
  for (let i = 1; i < sortedY.length; i++) {
    if (sortedY[i]! - sortedY[i - 1]! !== def.heightMm) return null
  }
  const minX = sortedX[0]!
  const minY = sortedY[0]!
  for (const p of enabled) {
    const col = (p.xMm - minX) / def.widthMm
    const row = (p.yMm - minY) / def.heightMm
    if (!Number.isInteger(col) || !Number.isInteger(row)) return null
  }
  return { cols, rows }
}

function pitchKey(def: PanelDefinition): string {
  return `${pitchXMm(def).toFixed(6)}:${pitchYMm(def).toFixed(6)}`
}

function pitchKeyWithSize(def: PanelDefinition): string {
  return `${pitchKey(def)}:${def.widthMm}x${def.heightMm}`
}

export function analyzeNativeResolution(
  wall: LEDWall,
  defs: PanelDefinition[],
  overlapCount: number
): NativeResolutionResult {
  const warnings: ResolutionWarningCode[] = []
  const enabled = wall.panels.filter(p => p.enabled)
  if (enabled.length === 0) {
    return {
      valid: false,
      resolutionX: 0,
      resolutionY: 0,
      totalPixels: 0,
      warnings: ['no_panels'],
      pitchGroups: []
    }
  }
  if (overlapCount > 0) {
    warnings.push('overlapping_panels')
  }

  const defsById = new Map(defs.map(d => [d.id, d]))
  const pitchGroupsMap = new Map<string, PitchGroup>()

  for (const panel of enabled) {
    const def = defsById.get(panel.panelDefinitionId)
    if (!def) continue
    const key = pitchKeyWithSize(def)
    const res = occupiedResolution(def, panel.rotation)
    const px = res.resolutionX * res.resolutionY
    const existing = pitchGroupsMap.get(key)
    if (existing) {
      existing.panels += 1
      existing.nativePixels += px
    } else {
      pitchGroupsMap.set(key, {
        pitchX: pitchXMm(def),
        pitchY: pitchYMm(def),
        panelDefinitionId: def.id,
        panels: 1,
        nativePixels: px
      })
    }
  }

  const pitchGroups = [...pitchGroupsMap.values()]
  const uniqueDefs = new Set(enabled.map(p => p.panelDefinitionId))

  const uniformPitchKeys = new Set(
    enabled.map((p) => {
      const d = defsById.get(p.panelDefinitionId)
      return d ? pitchKey(d) : ''
    })
  )
  if (uniformPitchKeys.size > 1) {
    warnings.push('mixed_pitch')
  }

  const uniformRaster = analyzeUniformPitchRaster(
    wallWithRoundedPanelOrigins(wall),
    defsById
  )
  if (uniformRaster) {
    if (uniqueDefs.size > 1) {
      warnings.push('mixed_panel_sizes')
    }
    const blocking = warnings.filter(w =>
      w !== 'mixed_panel_sizes'
    )
    return {
      valid: blocking.length === 0,
      resolutionX: uniformRaster.resolutionX,
      resolutionY: uniformRaster.resolutionY,
      totalPixels: uniformRaster.resolutionX * uniformRaster.resolutionY,
      warnings,
      pitchGroups
    }
  }

  const singleDefId = enabled[0]!.panelDefinitionId
  const singleDef = defsById.get(singleDefId)
  if (!singleDef) {
    return {
      valid: false,
      resolutionX: 0,
      resolutionY: 0,
      totalPixels: 0,
      warnings,
      pitchGroups
    }
  }

  const grid = panelsShareUniformGrid(wall, singleDef)
  if (grid && uniqueDefs.size === 1 && pitchGroups.length === 1) {
    const resX = grid.cols * singleDef.resolutionX
    const resY = grid.rows * singleDef.resolutionY
    const expectedCount = grid.cols * grid.rows
    if (expectedCount !== enabled.length) {
      warnings.push('gaps_in_grid')
    }
    return {
      valid: warnings.length === 0,
      resolutionX: resX,
      resolutionY: resY,
      totalPixels: resX * resY,
      warnings,
      pitchGroups
    }
  }

  if (uniformPitchKeys.size <= 1 && uniqueDefs.size > 1) {
    warnings.push('gaps_in_grid')
  } else if (uniformPitchKeys.size > 1) {
    warnings.push('mixed_pitch')
  }
  warnings.push('non_rectangular')
  const totalPixels = pitchGroups.reduce((s, g) => s + g.nativePixels, 0)
  return {
    valid: false,
    resolutionX: 0,
    resolutionY: 0,
    totalPixels,
    warnings,
    pitchGroups
  }
}

export function compareToReferenceResolutions(
  resX: number,
  resY: number,
  comparable: boolean
): ReferenceComparison[] {
  if (!comparable || resX <= 0 || resY <= 0) {
    return REFERENCE_RESOLUTIONS.map(ref => ({
      label: ref.label,
      kind: 'not_comparable' as ReferenceMatchKind,
      referenceWidth: ref.width,
      referenceHeight: ref.height
    }))
  }
  const aspect = resX / resY
  return REFERENCE_RESOLUTIONS.map((ref) => {
    const refAspect = ref.width / ref.height
    if (resX === ref.width && resY === ref.height) {
      return {
        label: ref.label,
        kind: 'exact_native' as ReferenceMatchKind,
        referenceWidth: ref.width,
        referenceHeight: ref.height
      }
    }
    const sameAspect = Math.abs(aspect - refAspect) < 0.01
    const pixels = resX * resY
    const refPixels = ref.width * ref.height
    if (sameAspect) {
      return {
        label: ref.label,
        kind: 'same_aspect_different_res' as ReferenceMatchKind,
        referenceWidth: ref.width,
        referenceHeight: ref.height
      }
    }
    if (pixels > refPixels) {
      return {
        label: ref.label,
        kind: 'larger_than_reference' as ReferenceMatchKind,
        referenceWidth: ref.width,
        referenceHeight: ref.height
      }
    }
    return {
      label: ref.label,
      kind: 'different_aspect' as ReferenceMatchKind,
      referenceWidth: ref.width,
      referenceHeight: ref.height
    }
  })
}

export function physicalAspectRatio(widthMm: number, heightMm: number): number | null {
  if (widthMm <= 0 || heightMm <= 0) return null
  return widthMm / heightMm
}

export function pixelAspectRatio(resX: number, resY: number): number | null {
  if (resX <= 0 || resY <= 0) return null
  return resX / resY
}

export function activePixelCountFromGroups(groups: PitchGroup[]): number {
  return groups.reduce((s, g) => s + g.nativePixels, 0)
}

export function suggestResolutionFromPitch(
  widthMm: number,
  heightMm: number,
  pitchMm: number
): { resolutionX: number, resolutionY: number, exact: boolean } {
  const rx = widthMm / pitchMm
  const ry = heightMm / pitchMm
  const exact = Number.isInteger(rx) && Number.isInteger(ry)
  return {
    resolutionX: Math.round(rx),
    resolutionY: Math.round(ry),
    exact
  }
}
