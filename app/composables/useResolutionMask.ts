import { detectOverlaps } from '#shared/calculations/geometry'
import {
  analyzeResolutionMask,
  type ResolutionMaskWallSettings
} from '#shared/calculations/resolution-mask'
import type { LEDWall } from '#shared/types/wall'
import { useProjectStore } from '~/stores/project'

export function wallToMaskSettings(wall: LEDWall): ResolutionMaskWallSettings {
  return {
    enabled: wall.resolutionMaskEnabled,
    preset: wall.resolutionMaskPreset ?? 'fullHd',
    customWidthPx: wall.resolutionMaskCustomWidthPx,
    customHeightPx: wall.resolutionMaskCustomHeightPx,
    fitMode: wall.resolutionMaskFitMode ?? 'contain',
    offsetLocalXMm: wall.resolutionMaskOffsetLocalXMm ?? 0,
    offsetLocalYMm: wall.resolutionMaskOffsetLocalYMm ?? 0
  }
}

export function useResolutionMask(wall: () => LEDWall | null | undefined) {
  const project = useProjectStore()

  return computed(() => {
    const w = wall()
    if (!w?.resolutionMaskEnabled) return null
    const overlaps = detectOverlaps(w, project.defsById).length
    return analyzeResolutionMask(
      w,
      project.panelDefinitions,
      overlaps,
      wallToMaskSettings(w)
    )
  })
}
