import { describe, expect, it } from 'vitest'
import { roundPositionMm, roundPositionPatch } from '../../shared/utils/position'

describe('roundPositionMm', () => {
  it('rounds drag artifacts to whole millimetres', () => {
    expect(roundPositionMm(357.142857142857)).toBe(357)
    expect(roundPositionMm(499.6)).toBe(500)
  })

  it('rounds patch fields only when present', () => {
    expect(roundPositionPatch({ xMm: 10.9, name: 'x' })).toEqual({
      xMm: 11,
      name: 'x'
    })
  })
})
