import { describe, expect, it } from 'vitest'
import { clonePresetsForProject } from '../../shared/panel-presets'
import type { LEDWall } from '../../shared/types/wall'
import {
  buildPatternPanelMaskRects,
  panelPatternSamplePoints,
  resolveWallPatternRaster
} from '../../shared/test-patterns/generate'

function buildJinyuanWall() {
  const presets = clonePresetsForProject()
  const j500 = presets.find(d => d.id === 'jinyuan-p391-500x500')!
  const j1000 = presets.find(d => d.id === 'jinyuan-p391-500x1000')!
  const defsById = new Map([j500, j1000].map(d => [d.id, d]))
  const wall: LEDWall = {
    id: 'jinyuan',
    name: 'Jinyuan',
    xMm: 0,
    yMm: 0,
    visible: true,
    locked: false,
    panels: []
  }
  for (let col = 0; col < 8; col++) {
    const x = col * 500
    wall.panels.push(
      {
        id: `p-${col}-t1`,
        panelDefinitionId: j1000.id,
        xMm: x,
        yMm: 0,
        rotation: 0,
        enabled: true
      },
      {
        id: `p-${col}-t2`,
        panelDefinitionId: j1000.id,
        xMm: x,
        yMm: 1000,
        rotation: 0,
        enabled: true
      },
      {
        id: `p-${col}-b`,
        panelDefinitionId: j500.id,
        xMm: x,
        yMm: 2000,
        rotation: 0,
        enabled: true
      }
    )
  }
  return { wall, defsById, defs: [j500, j1000] }
}

describe('wall test pattern raster', () => {
  it('resolves 1024×640 native raster for Jinyuan wall', () => {
    const { wall, defsById, defs } = buildJinyuanWall()
    const raster = resolveWallPatternRaster(wall, defsById, defs)
    expect(raster).toEqual({
      resX: 1024,
      resY: 640,
      useNativePitchMap: true
    })
  })

  it('mask rects cover bottom 500×500 row through y=640', () => {
    const { wall, defsById, defs } = buildJinyuanWall()
    const raster = resolveWallPatternRaster(wall, defsById, defs)!
    const rects = buildPatternPanelMaskRects(
      wall,
      defsById,
      raster.resX,
      raster.resY,
      raster.useNativePitchMap
    )
    expect(rects.length).toBe(24)
    const bottom = rects.filter(r => r.panelId.includes('-b'))
    expect(bottom.length).toBe(8)
    for (const r of bottom) {
      expect(r.y + r.h).toBe(640)
      expect(r.h).toBeGreaterThanOrEqual(128)
    }
    const samples = panelPatternSamplePoints(
      wall,
      defsById,
      raster.resX,
      raster.resY,
      raster.useNativePitchMap
    )
    expect(samples.length).toBe(24)
    for (const s of samples.filter(p => p.panelId.includes('-b'))) {
      expect(s.y).toBeGreaterThanOrEqual(512)
      expect(s.y).toBeLessThan(640)
    }
  })
})
