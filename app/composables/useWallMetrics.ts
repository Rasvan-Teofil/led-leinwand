import {
  analyzeNativeResolution,
  compareToReferenceResolutions,
  detectOverlaps,
  getWallDimensions
} from '#shared/calculations'
import type { LEDWall } from '#shared/types/wall'
import { useProjectStore } from '~/stores/project'

export function useWallMetrics(getWall: () => LEDWall | null | undefined) {
  const project = useProjectStore()
  return computed(() => {
    const wall = getWall()
    if (!wall) return null
    const defs = project.panelDefinitions
    const dims = getWallDimensions(wall, defs)
    const overlaps = detectOverlaps(wall, project.defsById)
    const resolution = analyzeNativeResolution(wall, defs, overlaps.length)
    const references = compareToReferenceResolutions(
      resolution.resolutionX,
      resolution.resolutionY,
      resolution.valid
    )
    return {
      dims,
      overlaps,
      resolution,
      references,
      physicalAspect:
        dims.bboxHeightMm > 0 ? dims.bboxWidthMm / dims.bboxHeightMm : null
    }
  })
}

export function useProjectMetrics() {
  const project = useProjectStore()
  return computed(() => {
    let panels = 0
    let activeAreaM2 = 0
    let activePixels = 0
    let weight = 0
    let maxPower = 0
    let price = 0
    let incomplete = false
    for (const wall of project.walls) {
      const m = getWallMetricsForWall(wall, project.panelDefinitions, project.defsById)
      panels += m.dims.enabledPanelCount
      activeAreaM2 += m.dims.activeAreaM2
      activePixels += m.resolution.totalPixels
      for (const p of wall.panels) {
        const def = project.defsById.get(p.panelDefinitionId)
        if (!def) continue
        if (def.weightKg == null || def.maxPowerW == null || def.pricePerPanel == null) {
          incomplete = true
        }
        if (def.weightKg) weight += def.weightKg
        if (def.maxPowerW) maxPower += def.maxPowerW
        if (def.pricePerPanel) price += def.pricePerPanel
      }
    }
    return {
      wallCount: project.walls.length,
      panels,
      activeAreaM2,
      activePixels,
      weight,
      maxPower,
      price,
      incomplete
    }
  })
}

function getWallMetricsForWall(
  wall: LEDWall,
  defs: ReturnType<typeof useProjectStore>['panelDefinitions'],
  defsById: Map<string, (typeof defs)[number]>
) {
  const dims = getWallDimensions(wall, defs)
  const overlaps = detectOverlaps(wall, defsById)
  const resolution = analyzeNativeResolution(wall, defs, overlaps.length)
  return { dims, resolution, overlaps }
}
