import { describe, expect, it } from 'vitest'
import { wallLocalBoundingBox } from '../../shared/calculations/geometry'
import {
  analyzeResolutionMask,
  computeContentFrameLedPx
} from '../../shared/calculations/resolution-mask'
import { clonePresetsForProject } from '../../shared/panel-presets'
import type { LEDWall } from '../../shared/types/wall'

function buildJinyuanWall(): LEDWall {
  const presets = clonePresetsForProject()
  const j1000 = presets.find(d => d.id === 'jinyuan-p391-500x1000')!
  const j500 = presets.find(d => d.id === 'jinyuan-p391-500x500')!
  const panels: LEDWall['panels'] = []
  for (let col = 0; col < 8; col++) {
    const x = col * 500
    panels.push({
      id: `p-${col}-0`,
      panelDefinitionId: j1000.id,
      xMm: x,
      yMm: 0,
      rotation: 0,
      enabled: true
    })
    panels.push({
      id: `p-${col}-1`,
      panelDefinitionId: j1000.id,
      xMm: x,
      yMm: 1000,
      rotation: 0,
      enabled: true
    })
    panels.push({
      id: `p-${col}-2`,
      panelDefinitionId: j500.id,
      xMm: x,
      yMm: 2000,
      rotation: 0,
      enabled: true
    })
  }
  return {
    id: 'w',
    name: 'Jinyuan',
    xMm: 0,
    yMm: 0,
    panels,
    visible: true,
    locked: false
  }
}

describe('resolution mask', () => {
  it('contain Full HD on 1024×640 uses 1024×576 with ~10% unused rows', () => {
    const wall = buildJinyuanWall()
    const defs = clonePresetsForProject()
    const res = analyzeResolutionMask(wall, defs, 0, {
      enabled: true,
      preset: 'fullHd',
      fitMode: 'contain'
    })
    expect(res).not.toBeNull()
    expect(res!.rulerLabels.ledWidthPx).toBe(1024)
    expect(res!.rulerLabels.ledHeightPx).toBe(640)
    expect(Math.round(res!.contentLedPx.height)).toBe(576)
    expect(res!.unusedLedPercent).toBeCloseTo(10, 0)
    expect(res!.unusedLedPixels).toBe(64 * 1024)
  })

  it('cover mode crops content beyond native raster', () => {
    const wall = buildJinyuanWall()
    const defs = clonePresetsForProject()
    const res = analyzeResolutionMask(wall, defs, 0, {
      enabled: true,
      preset: 'fullHd',
      fitMode: 'cover'
    })
    expect(res).not.toBeNull()
    expect(res!.croppedContentPercent).toBeGreaterThan(0)
    expect(res!.contentLedPx.width).toBeGreaterThan(1024 - 0.01)
  })

  it('computeContentFrameLedPx contain aspect math', () => {
    const frame = computeContentFrameLedPx(1024, 640, 1920, 1080, 'contain')
    expect(Math.round(frame.width)).toBe(1024)
    expect(Math.round(frame.height)).toBe(576)
  })

  it('verschnitt rects stay within panel footprints', () => {
    const wall = buildJinyuanWall()
    const defs = clonePresetsForProject()
    const res = analyzeResolutionMask(wall, defs, 0, {
      enabled: true,
      preset: 'fullHd',
      fitMode: 'contain'
    })!
    const bbox = wallLocalBoundingBox(wall, new Map(defs.map(d => [d.id, d])))!
    for (const r of res.verschnittRectsMm) {
      expect(r.xMm).toBeGreaterThanOrEqual(bbox.xMm - 0.01)
      expect(r.yMm).toBeGreaterThanOrEqual(bbox.yMm - 0.01)
      expect(r.xMm + r.widthMm).toBeLessThanOrEqual(bbox.xMm + bbox.widthMm + 0.01)
      expect(r.yMm + r.heightMm).toBeLessThanOrEqual(bbox.yMm + bbox.heightMm + 0.01)
    }
    expect(res.verschnittLabel).toContain('Verschnitt')
    expect(res.verschnittLabel).toContain('10 %')
  })
})
