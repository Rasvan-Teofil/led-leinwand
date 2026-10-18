import { describe, expect, it } from 'vitest'
import {
  collectNeighborRects,
  resolveMagneticSnap,
  type SnapNeighborRect
} from '../../shared/calculations/magnetic-snap'

function neighbor(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  wallId = 'w1'
): SnapNeighborRect {
  return {
    panelId: id,
    wallId,
    xMm: x,
    yMm: y,
    widthMm: w,
    heightMm: h
  }
}

describe('resolveMagneticSnap', () => {
  it('snaps to the nearest right-adjacent non-overlapping position', () => {
    const neighbors = [neighbor('a', 0, 0, 500, 500)]
    const result = resolveMagneticSnap({
      proposedXMm: 480,
      proposedYMm: 0,
      widthMm: 500,
      heightMm: 500,
      zoom: 0.1,
      thresholdPx: 12,
      gridMm: 50,
      magneticEnabled: true,
      gridSnapEnabled: true,
      neighbors,
      excludePanelId: 'moving'
    })
    expect(result.mode).toBe('magnetic')
    expect(result.xMm).toBe(500)
    expect(result.yMm).toBe(0)
    expect(result.guides.length).toBeGreaterThan(0)
  })

  it('skips overlapping candidate and picks next nearest', () => {
    const neighbors = [
      neighbor('a', 0, 0, 500, 500),
      neighbor('b', 500, 0, 500, 500)
    ]
    const result = resolveMagneticSnap({
      proposedXMm: 490,
      proposedYMm: 0,
      widthMm: 500,
      heightMm: 500,
      zoom: 0.1,
      thresholdPx: 12,
      gridMm: 50,
      magneticEnabled: true,
      gridSnapEnabled: true,
      neighbors,
      excludePanelId: 'b'
    })
    expect(result.mode).toBe('magnetic')
    expect(result.xMm).toBe(500)
    expect(result.yMm).toBe(0)
  })

  it('falls back to grid when no magnetic candidate is within threshold', () => {
    const result = resolveMagneticSnap({
      proposedXMm: 123,
      proposedYMm: 77,
      widthMm: 500,
      heightMm: 500,
      zoom: 0.1,
      thresholdPx: 12,
      gridMm: 50,
      magneticEnabled: true,
      gridSnapEnabled: true,
      neighbors: [neighbor('a', 2000, 2000, 500, 500)],
      excludePanelId: 'moving'
    })
    expect(result.mode).toBe('grid')
    expect(result.xMm).toBe(100)
    expect(result.yMm).toBe(100)
  })

  it('respects rotation-aware occupied size for vertical panel', () => {
    const neighbors = [neighbor('a', 0, 0, 500, 1000)]
    const result = resolveMagneticSnap({
      proposedXMm: 490,
      proposedYMm: 0,
      widthMm: 1000,
      heightMm: 500,
      zoom: 0.1,
      thresholdPx: 12,
      gridMm: 50,
      magneticEnabled: true,
      gridSnapEnabled: true,
      neighbors,
      excludePanelId: 'moving'
    })
    expect(result.xMm).toBe(500)
    expect(result.yMm).toBe(0)
  })
})

describe('collectNeighborRects', () => {
  it('returns world-space rects across walls', () => {
    const defs = new Map([
      [
        'd1',
        {
          id: 'd1',
          name: 'p',
          widthMm: 500,
          heightMm: 500,
          resolutionX: 128,
          resolutionY: 128,
          allowedRotations: [0],
          createdAt: '',
          updatedAt: ''
        }
      ]
    ])
    const rects = collectNeighborRects(
      [
        {
          id: 'w1',
          xMm: 0,
          yMm: 0,
          panels: [
            {
              id: 'p1',
              enabled: true,
              panelDefinitionId: 'd1',
              xMm: 0,
              yMm: 0,
              rotation: 0
            }
          ]
        },
        {
          id: 'w2',
          xMm: 5000,
          yMm: 0,
          panels: [
            {
              id: 'p2',
              enabled: true,
              panelDefinitionId: 'd1',
              xMm: 0,
              yMm: 0,
              rotation: 0
            }
          ]
        }
      ],
      defs
    )
    expect(rects).toHaveLength(2)
    expect(rects[1]!.xMm).toBe(5000)
    expect(rects[1]!.wallId).toBe('w2')
  })
})
