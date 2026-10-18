import { describe, expect, it } from 'vitest'
import {
  activeAreaMm2,
  buildRectangularGrid,
  detectOverlaps,
  getWallDimensions,
  analyzeNativeResolution,
  runOptimizer
} from '../../shared/calculations'
import type { PanelDefinition } from '../../shared/types/panel'
import { occupiedSizeMm } from '../../shared/types/panel'
import type { LEDWall } from '../../shared/types/wall'
import { createId } from '../../shared/utils/id'
import { parseProjectJson } from '../../shared/schemas/project'
import { clonePresetsForProject } from '../../shared/panel-presets'

function panel500(): PanelDefinition {
  const presets = clonePresetsForProject()
  const p = presets.find(d => d.id === 'preset-500x500-P391')
  if (!p) {
    return {
      id: 'test-500',
      name: '500x500 P3.91',
      widthMm: 500,
      heightMm: 500,
      resolutionX: 128,
      resolutionY: 128,
      allowedRotations: [0, 90, 180, 270],
      createdAt: '',
      updatedAt: ''
    }
  }
  return p
}

function wallFromGrid(cols: number, rows: number, def: PanelDefinition): LEDWall {
  const slots = buildRectangularGrid(def.id, def, cols, rows)
  return {
    id: 'w1',
    name: 'Test',
    xMm: 0,
    yMm: 0,
    visible: true,
    locked: false,
    panels: slots.map(s => ({
      id: createId('p'),
      ...s
    }))
  }
}

describe('LED wall calculations', () => {
  const def = panel500()
  const defs = [def]

  it('9x5 of 500x500 -> 4500x2500 mm', () => {
    const wall = wallFromGrid(9, 5, def)
    const dims = getWallDimensions(wall, defs)
    expect(dims.widthMm).toBe(4500)
    expect(dims.heightMm).toBe(2500)
  })

  it('45 panels', () => {
    const wall = wallFromGrid(9, 5, def)
    expect(wall.panels.length).toBe(45)
  })

  it('11.25 m² active area', () => {
    const wall = wallFromGrid(9, 5, def)
    const dims = getWallDimensions(wall, defs)
    expect(dims.activeAreaM2).toBeCloseTo(11.25, 5)
  })

  it('4x3 of 128x128 px -> 512x384 native resolution', () => {
    const wall = wallFromGrid(4, 3, def)
    const overlaps = detectOverlaps(wall, new Map(defs.map(d => [d.id, d])))
    const res = analyzeNativeResolution(wall, defs, overlaps.length)
    expect(res.resolutionX).toBe(512)
    expect(res.resolutionY).toBe(384)
    expect(res.valid).toBe(true)
  })

  it('union area stays positive when panels overlap', () => {
    const wall = wallFromGrid(2, 2, def)
    const a = wall.panels[0]!
    wall.panels.push({
      ...a,
      id: 'overlap',
      xMm: a.xMm + 100,
      yMm: a.yMm + 100
    })
    const defsById = new Map(defs.map(d => [d.id, d]))
    const area = activeAreaMm2(wall, defsById)
    expect(area).toBeGreaterThan(0)
    expect(area).toBeLessThanOrEqual(4 * 500 * 500)
    const dims = getWallDimensions(wall, defs)
    expect(dims.activeAreaM2).toBeGreaterThan(0)
  })

  it('removing a corner panel reduces active area', () => {
    const wall = wallFromGrid(3, 3, def)
    const before = activeAreaMm2(
      wall,
      new Map(defs.map(d => [d.id, d]))
    )
    const corner = wall.panels.find(p => p.xMm === 1000 && p.yMm === 1000)!
    corner.enabled = false
    const after = activeAreaMm2(
      wall,
      new Map(defs.map(d => [d.id, d]))
    )
    expect(after).toBe(before - 500 * 500)
    expect(wall.panels.length).toBe(9)
  })

  it('mixed pitches warn', () => {
    const def2: PanelDefinition = {
      ...def,
      id: 'def2',
      name: 'Other pitch',
      resolutionX: 96,
      resolutionY: 96
    }
    const wall: LEDWall = {
      id: 'w',
      name: 'Mixed',
      xMm: 0,
      yMm: 0,
      visible: true,
      locked: false,
      panels: [
        {
          id: 'a',
          panelDefinitionId: def.id,
          xMm: 0,
          yMm: 0,
          rotation: 0,
          enabled: true
        },
        {
          id: 'b',
          panelDefinitionId: def2.id,
          xMm: 500,
          yMm: 0,
          rotation: 0,
          enabled: true
        }
      ]
    }
    const res = analyzeNativeResolution(wall, [def, def2], 0)
    expect(res.warnings).toContain('mixed_pitch')
    expect(res.valid).toBe(false)
  })

  it('rotating 500x1000 by 90 swaps occupied W/H', () => {
    const tall: PanelDefinition = {
      ...def,
      id: 'tall',
      widthMm: 500,
      heightMm: 1000,
      resolutionX: 128,
      resolutionY: 256
    }
    const s0 = occupiedSizeMm(tall, 0)
    const s90 = occupiedSizeMm(tall, 90)
    expect(s0.widthMm).toBe(500)
    expect(s0.heightMm).toBe(1000)
    expect(s90.widthMm).toBe(1000)
    expect(s90.heightMm).toBe(500)
  })

  it('overlap detected', () => {
    const wall: LEDWall = {
      id: 'w',
      name: 'Overlap',
      xMm: 0,
      yMm: 0,
      visible: true,
      locked: false,
      panels: [
        {
          id: 'a',
          panelDefinitionId: def.id,
          xMm: 0,
          yMm: 0,
          rotation: 0,
          enabled: true
        },
        {
          id: 'b',
          panelDefinitionId: def.id,
          xMm: 100,
          yMm: 100,
          rotation: 0,
          enabled: true
        }
      ]
    }
    const overlaps = detectOverlaps(
      wall,
      new Map(defs.map(d => [d.id, d]))
    )
    expect(overlaps.length).toBe(1)
  })

  it('negative coords fine for bbox', () => {
    const wall: LEDWall = {
      id: 'w',
      name: 'Neg',
      xMm: 0,
      yMm: 0,
      visible: true,
      locked: false,
      panels: [
        {
          id: 'a',
          panelDefinitionId: def.id,
          xMm: -500,
          yMm: -500,
          rotation: 0,
          enabled: true
        },
        {
          id: 'b',
          panelDefinitionId: def.id,
          xMm: 0,
          yMm: 0,
          rotation: 0,
          enabled: true
        }
      ]
    }
    const dims = getWallDimensions(wall, defs)
    expect(dims.widthMm).toBe(1000)
    expect(dims.heightMm).toBe(1000)
  })

  it('save/load roundtrip preserves config', () => {
    const wall = wallFromGrid(2, 2, def)
    const project = {
      schemaVersion: 1,
      id: 'proj',
      name: 'Roundtrip',
      walls: [wall],
      panelDefinitions: defs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    const json = JSON.parse(JSON.stringify(project))
    const result = parseProjectJson(json)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.walls[0].panels.length).toBe(4)
    }
  })

  it('optimizer never exceeds limits', () => {
    const presets = clonePresetsForProject()
    const candidates = runOptimizer(presets, {
      maxWidthMm: 5000,
      maxHeightMm: 3000,
      maxPanels: 40
    })
    for (const c of candidates) {
      expect(c.widthMm).toBeLessThanOrEqual(5000)
      expect(c.heightMm).toBeLessThanOrEqual(3000)
      expect(c.totalPanels).toBeLessThanOrEqual(40)
    }
  })

  it('import validation rejects malformed data', () => {
    const bad = { foo: 'bar' }
    const result = parseProjectJson(bad)
    expect(result.ok).toBe(false)
  })

  it('Jinyuan with float panel coords still resolves native 1024×640', () => {
    const presets = clonePresetsForProject()
    const j500 = presets.find(d => d.id === 'jinyuan-p391-500x500')!
    const j1000 = presets.find(d => d.id === 'jinyuan-p391-500x1000')!
    const defs = [j500, j1000]
    const wall: LEDWall = {
      id: 'jinyuan-float',
      name: 'Jinyuan',
      xMm: 0,
      yMm: 0,
      visible: true,
      locked: false,
      panels: []
    }
    for (let col = 0; col < 8; col++) {
      const x = col * 500 + 0.142857
      wall.panels.push(
        {
          id: `p-${col}-t1`,
          panelDefinitionId: j1000.id,
          xMm: x,
          yMm: 0.00001,
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
    const res = analyzeNativeResolution(wall, defs, 0)
    expect(res.valid).toBe(true)
    expect(res.resolutionX).toBe(1024)
    expect(res.resolutionY).toBe(640)
    expect(res.warnings).not.toContain('gaps_in_grid')
    expect(res.warnings).not.toContain('non_rectangular')
  })

  it('Jinyuan 8-column wall: 1024x640 native, 10 m², uniform pitch raster', () => {
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
    const dims = getWallDimensions(wall, defs)
    expect(dims.bboxWidthMm).toBe(4000)
    expect(dims.bboxHeightMm).toBe(2500)
    expect(dims.activeAreaM2).toBeCloseTo(10, 5)
    const res = analyzeNativeResolution(wall, defs, 0)
    expect(res.resolutionX).toBe(1024)
    expect(res.resolutionY).toBe(640)
    expect(res.valid).toBe(true)
    expect(res.warnings).not.toContain('mixed_pitch')
    expect(res.warnings).not.toContain('non_rectangular')
    const physAr = dims.bboxWidthMm / dims.bboxHeightMm
    const pixAr = res.resolutionX / res.resolutionY
    expect(physAr).toBeCloseTo(1.6, 5)
    expect(pixAr).toBeCloseTo(1.6, 5)
  })

  it('optimizer best aspect ranks 16:9 candidates first', () => {
    const presets = clonePresetsForProject()
    const candidates = runOptimizer(presets, {
      maxWidthMm: 10000,
      maxHeightMm: 4000,
      desiredAspect: 16 / 9,
      rankMode: 'best_aspect',
      maxPanels: 100
    })
    expect(candidates.length).toBeGreaterThan(0)
    const top = candidates[0]!
    expect(top.aspectDeviation).toBeLessThanOrEqual(candidates[candidates.length - 1]!.aspectDeviation)
    const near169 = candidates.filter(c => c.aspectDeviation < 0.05)
    if (near169.length) {
      expect(top.aspectDeviation).toBeLessThan(0.1)
    }
  })
})
