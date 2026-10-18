import type { PanelDefinition } from '../types/panel'
import { pitchXMm } from '../types/panel'
import { rectangularWallSizeMm } from './dimensions'
import { mm2ToM2 } from './geometry'

export interface OptimizerConstraints {
  maxWidthMm: number
  maxHeightMm: number
  desiredAspect?: number
  minNativeWidth?: number
  minNativeHeight?: number
  preferredPanelDefinitionIds?: string[]
  maxPanels?: number
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
  score: number
  estimatedCost?: number
  benefits: string[]
  tradeoffs: string[]
}

function aspectDeviation(actual: number, desired?: number): number {
  if (!desired || desired <= 0) return 0
  return Math.abs(actual - desired) / desired
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
    maxPanels = Infinity
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
        const fhdPixels = 1920 * 1080
        const fhdDistance = Math.abs(totalPixels - fhdPixels) / fhdPixels
        let score = 0
        score -= dev * 100
        score += totalPixels / 10_000
        score -= totalPanels * 0.5
        score -= fhdDistance * 20
        score += areaM2 * 2
        const benefits: string[] = []
        const tradeoffs: string[] = []
        if (dev < 0.02) benefits.push('Matches desired aspect closely')
        if (totalPixels >= fhdPixels) benefits.push('Full HD pixel count or higher')
        if (totalPanels <= 20) benefits.push('Moderate panel count')
        if (dev > 0.1) tradeoffs.push('Aspect ratio deviates from target')
        if (totalPanels > 50) tradeoffs.push('High panel count')
        let estimatedCost: number | undefined
        if (def.pricePerPanel != null) {
          estimatedCost = def.pricePerPanel * totalPanels
          score -= estimatedCost / 10_000
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
          score,
          estimatedCost,
          benefits,
          tradeoffs
        })
      }
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
}
