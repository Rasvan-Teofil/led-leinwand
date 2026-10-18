export type RotationDeg = 0 | 90 | 180 | 270

export interface PanelDefinition {
  id: string
  name: string
  manufacturer?: string
  model?: string
  widthMm: number
  heightMm: number
  resolutionX: number
  resolutionY: number
  nominalPitchMm?: number
  weightKg?: number
  maxPowerW?: number
  averagePowerW?: number
  pricePerPanel?: number
  currency?: string
  allowedRotations: RotationDeg[]
  isPreset?: boolean
  disclaimer?: string
  createdAt: string
  updatedAt: string
}

export interface PanelInstance {
  id: string
  panelDefinitionId: string
  xMm: number
  yMm: number
  rotation: RotationDeg
  enabled: boolean
}

export function pitchXMm(def: PanelDefinition): number {
  return def.widthMm / def.resolutionX
}

export function pitchYMm(def: PanelDefinition): number {
  return def.heightMm / def.resolutionY
}

export function occupiedSizeMm(
  def: PanelDefinition,
  rotation: RotationDeg
): { widthMm: number, heightMm: number } {
  const swap = rotation === 90 || rotation === 270
  return {
    widthMm: swap ? def.heightMm : def.widthMm,
    heightMm: swap ? def.widthMm : def.heightMm
  }
}

export function occupiedResolution(
  def: PanelDefinition,
  rotation: RotationDeg
): { resolutionX: number, resolutionY: number } {
  const swap = rotation === 90 || rotation === 270
  return {
    resolutionX: swap ? def.resolutionY : def.resolutionX,
    resolutionY: swap ? def.resolutionX : def.resolutionY
  }
}
