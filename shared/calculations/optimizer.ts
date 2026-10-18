import type { PanelDefinition } from '../types/panel'
import { pitchXMm } from '../types/panel'
import { aspectDeviation } from './aspect'
import { rectangularWallSizeMm } from './dimensions'
import { mm2ToM2 } from './geometry'

export type OptimizerRankMode
  = | 'best_aspect'
    | 'highest_resolution'
    | 'min_panels'
    | 'closest_fhd'
    | 'max_area'
    | 'lowest_cost'

export interface OptimizerConstraints {
  maxWidthMm: number
  maxHeightMm: number
  desiredAspect?: number
  minNativeWidth?: number
  minNativeHeight?: number
  preferredPanelDefinitionIds?: string[]
  maxPanels?: number
  rankMode?: OptimizerRankMode
}

export interface OptimizerCandidate {
  panelDefinition: PanelDefinition
  columns: number
  rows: number
  totalPanels: number
  widthMm: number
  heightMm: number
  areaM2: number
  nativeResolutionX: number
  nativeResolutionY: number
  totalPixels: number
  pitchMm: number
  physicalAspect: number
  aspectDeviation: number
  fhdDistance: number
  estimatedCost?: number
  benefits: string[]
  tradeoffs: string[]
}

const FHD_PIXELS = 1920 * 1080

function compareCandidates(
  a: OptimizerCandidate,
  b: OptimizerCandidate,
  mode: OptimizerRankMode
): number {
  switch (mode) {
    case 'best_aspect':
      if (a.aspectDeviation !== b.aspectDeviation) {
        return a.aspectDeviation - b.aspectDeviation
      }
      return b.totalPixels - a.totalPixels
    case 'highest_resolution':
      return b.totalPixels - a.totalPixels
    case 'min_panels':
      if (a.totalPanels !== b.totalPanels) return a.totalPanels - b.totalPanels
      return a.aspectDeviation - b.aspectDeviation
    case 'closest_fhd':
      if (a.fhdDistance !== b.fhdDistance) return a.fhdDistance - b.fhdDistance
      return a.aspectDeviation - b.aspectDeviation
    case 'max_area':
      if (a.areaM2 !== b.areaM2) return b.areaM2 - a.areaM2
      return a.aspectDeviation - b.aspectDeviation
    case 'lowest_cost': {
      const ac = a.estimatedCost ?? Number.POSITIVE_INFINITY
      const bc = b.estimatedCost ?? Number.POSITIVE_INFINITY
      if (ac !== bc) return ac - bc
      return a.aspectDeviation - b.aspectDeviation
    }
    default:
      return 0
  }
}

export function runOptimizer(
  panelDefinitions: PanelDefinition[],
  constraints: OptimizerConstraints
): OptimizerCandidate[] {
  const {
    maxWidthMm,
    maxHeightMm,
    desiredAspect,
    minNativeWidth = 0,
    minNativeHeight = 0,
    preferredPanelDefinitionIds,
    maxPanels = Infinity,
    rankMode = 'best_aspect'
  } = constraints

  const defs = preferredPanelDefinitionIds?.length
    ? panelDefinitions.filter(d =>
        preferredPanelDefinitionIds.includes(d.id)
      )
    : panelDefinitions

  const candidates: OptimizerCandidate[] = []

  for (const def of defs) {
    const maxCols = Math.floor(maxWidthMm / def.widthMm)
    const maxRows = Math.floor(maxHeightMm / def.heightMm)
    for (let cols = 1; cols <= maxCols; cols++) {
      for (let rows = 1; rows <= maxRows; rows++) {
        const totalPanels = cols * rows
        if (totalPanels > maxPanels) continue
        const { widthMm, heightMm } = rectangularWallSizeMm(def, cols, rows)
        if (widthMm > maxWidthMm || heightMm > maxHeightMm) continue
        const nativeResolutionX = cols * def.resolutionX
        const nativeResolutionY = rows * def.resolutionY
        if (
          nativeResolutionX < minNativeWidth
          || nativeResolutionY < minNativeHeight
        ) {
          continue
        }
        const physicalAspect = widthMm / heightMm
        const dev = aspectDeviation(physicalAspect, desiredAspect)
        const areaM2 = mm2ToM2(widthMm * heightMm)
        const totalPixels = nativeResolutionX * nativeResolutionY
        const pitchMm = pitchXMm(def)
        const fhdDistance = Math.abs(totalPixels - FHD_PIXELS) / FHD_PIXELS
        const benefits: string[] = []
        const tradeoffs: string[] = []
        if (dev < 0.02) benefits.push('Nahe am Ziel-Seitenverhältnis')
        if (totalPixels >= FHD_PIXELS) benefits.push('Full-HD-Pixelzahl oder höher')
        if (totalPanels <= 20) benefits.push('Moderate Panelanzahl')
        if (dev > 0.1) tradeoffs.push('Seitenverhältnis weicht ab')
        if (totalPanels > 50) tradeoffs.push('Hohe Panelanzahl')
        let estimatedCost: number | undefined
        if (def.pricePerPanel != null) {
          estimatedCost = def.pricePerPanel * totalPanels
        }
        candidates.push({
          panelDefinition: def,
          columns: cols,
          rows,
          totalPanels,
          widthMm,
          heightMm,
          areaM2,
          nativeResolutionX,
          nativeResolutionY,
          totalPixels,
          pitchMm,
          physicalAspect,
          aspectDeviation: dev,
          fhdDistance,
          estimatedCost,
          benefits,
          tradeoffs
        })
      }
    }
  }

  return candidates
    .sort((a, b) => compareCandidates(a, b, rankMode))
    .slice(0, 50)
}
