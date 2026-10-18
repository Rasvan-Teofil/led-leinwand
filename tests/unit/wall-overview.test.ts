import { describe, expect, it } from 'vitest'
import { buildWallOverviewSummary } from '../../shared/calculations/wall-overview'
import { clonePresetsForProject } from '../../shared/panel-presets'
import type { LEDWall } from '../../shared/types/wall'

describe('buildWallOverviewSummary', () => {
  it('formats regular Jinyuan-style wall', () => {
    const defs = clonePresetsForProject()
    const defsById = new Map(defs.map(d => [d.id, d]))
    const jinyuan500 = defs.find(d => d.id === 'jinyuan-p391-500x500')!
    const jinyuan1000 = defs.find(d => d.id === 'jinyuan-p391-500x1000')!
    const wall: LEDWall = {
      id: 'w',
      name: 'Jinyuan',
      xMm: 0,
      yMm: 0,
      visible: true,
      locked: false,
      panels: []
    }
    for (let col = 0; col < 8; col++) {
      const x = col * 500
      wall.panels.push({
        id: `p-${col}-0`,
        panelDefinitionId: jinyuan1000.id,
        xMm: x,
        yMm: 0,
        rotation: 0,
        enabled: true
      })
      wall.panels.push({
        id: `p-${col}-1`,
        panelDefinitionId: jinyuan1000.id,
        xMm: x,
        yMm: 1000,
        rotation: 0,
        enabled: true
      })
      wall.panels.push({
        id: `p-${col}-2`,
        panelDefinitionId: jinyuan500.id,
        xMm: x,
        yMm: 2000,
        rotation: 0,
        enabled: true
      })
    }
    const summary = buildWallOverviewSummary(wall, defs, defsById)
    expect(summary.layoutSubtitle).toBe('8 Spalten × 3 Reihen')
    expect(summary.overallSize).toBe('4 × 2,5 m')
    expect(summary.nativeResolution).toContain('1.024')
    expect(summary.panelsArea).toContain('24')
    expect(summary.physicalAspect).toContain('16:10')
  })

  it('marks irregular walls with dash native resolution', () => {
    const defs = clonePresetsForProject()
    const defsById = new Map(defs.map(d => [d.id, d]))
    const generic = defs.find(d => d.id.startsWith('preset-500x500'))!
    const wall: LEDWall = {
      id: 'l',
      name: 'L',
      xMm: 0,
      yMm: 0,
      visible: true,
      locked: false,
      panels: [
        { id: '1', panelDefinitionId: generic.id, xMm: 0, yMm: 0, rotation: 0, enabled: true },
        { id: '2', panelDefinitionId: generic.id, xMm: 500, yMm: 0, rotation: 0, enabled: true },
        { id: '3', panelDefinitionId: generic.id, xMm: 0, yMm: 500, rotation: 0, enabled: true }
      ]
    }
    const summary = buildWallOverviewSummary(wall, defs, defsById)
    expect(summary.layoutSubtitle).toContain('Unregelmäßig')
    expect(summary.nativeResolution).toBe('—')
    expect(summary.usesActivePixels).toBe(true)
  })
})
