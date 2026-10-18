import { describe, expect, it } from 'vitest'
import { analyzeUniformPitchRaster } from '../../shared/calculations/uniform-pitch-raster'
import { clonePresetsForProject } from '../../shared/panel-presets'
import type { LEDWall } from '../../shared/types/wall'

function buildJinyuanWall() {
  const presets = clonePresetsForProject()
  const j500 = presets.find(d => d.id === 'jinyuan-p391-500x500')!
  const j1000 = presets.find(d => d.id === 'jinyuan-p391-500x1000')!
  const defs = [j500, j1000]
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
  return { wall, defsById: new Map(defs.map(d => [d.id, d])) }
}

describe('analyzeUniformPitchRaster', () => {
  it('detects 1024×640 for Jinyuan 8×3 mixed cabinet wall', () => {
    const { wall, defsById } = buildJinyuanWall()
    const u = analyzeUniformPitchRaster(wall, defsById)
    expect(u).not.toBeNull()
    expect(u!.resolutionX).toBe(1024)
    expect(u!.resolutionY).toBe(640)
  })
})
