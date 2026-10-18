import type { TestPatternKind } from '#shared/test-patterns/generate'
import { generateWallTestPatternDataUrl } from '#shared/test-patterns/generate'
import type { LEDWall } from '#shared/types/wall'
import { analyzeNativeResolution, analyzeUniformPitchRaster, detectOverlaps } from '#shared/calculations'
import { useProjectStore } from '~/stores/project'

const cache = new Map<string, string>()

function signature(wall: LEDWall): string {
  return wall.panels
    .filter(p => p.enabled)
    .map(p => `${p.id}:${p.xMm},${p.yMm},${p.rotation}`)
    .join('|')
}

export function useTestPatternCache() {
  const project = useProjectStore()

  function getWallPatternUrl(wall: LEDWall): string | null {
    if (!wall.testPatternEnabled || !wall.testPatternKind) return null
    const defs = project.panelDefinitions
    const overlaps = detectOverlaps(wall, project.defsById).length
    const res = analyzeNativeResolution(wall, defs, overlaps)
    const uniform = analyzeUniformPitchRaster(wall, project.defsById)
    const resX = uniform?.resolutionX ?? (res.valid ? res.resolutionX : 0)
    const resY = uniform?.resolutionY ?? (res.valid ? res.resolutionY : 0)
    const key = `${wall.id}:${wall.testPatternKind}:${resX}x${resY}:${signature(wall)}`
    const hit = cache.get(key)
    if (hit) return hit
    const url = generateWallTestPatternDataUrl({
      wall,
      defsById: project.defsById,
      panelDefinitions: project.panelDefinitions,
      kind: wall.testPatternKind as TestPatternKind,
      resolutionX: resX > 0 ? resX : undefined,
      resolutionY: resY > 0 ? resY : undefined
    })
    if (url) cache.set(key, url)
    return url
  }

  function invalidateWall(wallId: string) {
    for (const k of cache.keys()) {
      if (k.startsWith(`${wallId}:`)) cache.delete(k)
    }
  }

  return { getWallPatternUrl, invalidateWall }
}
