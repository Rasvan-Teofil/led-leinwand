import { describe, expect, it } from 'vitest'
import { findNextPanelPlacementOnWall } from '../../shared/calculations/panel-placement'
import type { PanelDefinition } from '../../shared/types/panel'
import type { LEDWall } from '../../shared/types/wall'

const def500: PanelDefinition = {
  id: 'd500',
  name: '500',
  widthMm: 500,
  heightMm: 500,
  resolutionX: 128,
  resolutionY: 128,
  allowedRotations: [0],
  createdAt: '',
  updatedAt: ''
}

function wallWithPanels(
  panels: Array<{ xMm: number, yMm: number }>
): LEDWall {
  return {
    id: 'w1',
    name: 'W',
    xMm: 0,
    yMm: 0,
    panels: panels.map((p, i) => ({
      id: `p${i}`,
      panelDefinitionId: 'd500',
      xMm: p.xMm,
      yMm: p.yMm,
      rotation: 0,
      enabled: true
    })),
    visible: true,
    locked: false
  }
}

describe('findNextPanelPlacementOnWall', () => {
  it('returns origin on empty wall', () => {
    const wall = wallWithPanels([])
    const next = findNextPanelPlacementOnWall(
      wall,
      def500,
      new Map([['d500', def500]])
    )
    expect(next).toEqual({ localXMm: 0, localYMm: 0 })
  })

  it('places to the right of existing panel', () => {
    const wall = wallWithPanels([{ xMm: 0, yMm: 0 }])
    const next = findNextPanelPlacementOnWall(
      wall,
      def500,
      new Map([['d500', def500]])
    )
    expect(next).toEqual({ localXMm: 500, localYMm: 0 })
  })
})
