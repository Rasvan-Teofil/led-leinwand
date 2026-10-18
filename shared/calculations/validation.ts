import type { PanelDefinition } from '../types/panel'
import { pitchXMm, pitchYMm } from '../types/panel'

export interface PanelValidationIssue {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export function validatePanelDefinition(
  def: PanelDefinition
): PanelValidationIssue[] {
  const issues: PanelValidationIssue[] = []
  if (def.widthMm <= 0) {
    issues.push({
      field: 'widthMm',
      message: 'Width must be positive',
      severity: 'error'
    })
  }
  if (def.heightMm <= 0) {
    issues.push({
      field: 'heightMm',
      message: 'Height must be positive',
      severity: 'error'
    })
  }
  if (def.resolutionX <= 0 || def.resolutionY <= 0) {
    issues.push({
      field: 'resolution',
      message: 'Resolution must be positive',
      severity: 'error'
    })
  }
  if (def.nominalPitchMm != null && def.resolutionX > 0 && def.resolutionY > 0) {
    const calcX = pitchXMm(def)
    const calcY = pitchYMm(def)
    const nom = def.nominalPitchMm
    const tol = 0.15
    if (Math.abs(calcX - nom) > tol || Math.abs(calcY - nom) > tol) {
      issues.push({
        field: 'nominalPitchMm',
        message: `Nominal pitch ${nom} mm differs from calculated ${calcX.toFixed(3)}×${calcY.toFixed(3)} mm`,
        severity: 'warning'
      })
    }
  }
  return issues
}
