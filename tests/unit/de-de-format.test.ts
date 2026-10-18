import { describe, expect, it } from 'vitest'
import {
  formatDecimalDe,
  formatIntegerDe,
  formatMmDe,
  formatMmPairDe,
  formatMetersPair,
  formatPhysicalAspectDisplay,
  formatPitchPairMm,
  formatResolutionPair,
  simplifiedAspectLabel
} from '../../shared/format/de-de'

describe('de-DE formatting', () => {
  it('formats integers with dot thousands separator', () => {
    expect(formatIntegerDe(1843200)).toBe('1.843.200')
    expect(formatIntegerDe(1920)).toBe('1.920')
  })

  it('formats whole millimetres', () => {
    expect(formatMmDe(4000)).toBe('4.000 mm')
    expect(formatMmDe(357)).toBe('357 mm')
    expect(formatMmPairDe(500, 1000)).toBe('500 × 1.000 mm')
  })

  it('formats decimals with comma', () => {
    expect(formatDecimalDe(12.5, 1)).toBe('12,5')
    expect(formatDecimalDe(2, 2)).toBe('2,00')
  })

  it('formats metre pairs', () => {
    expect(formatMetersPair(5000, 2500)).toBe('5 × 2,5 m')
    expect(formatMetersPair(4000, 2500)).toBe('4 × 2,5 m')
  })

  it('formats resolution pair', () => {
    expect(formatResolutionPair(1920, 960)).toBe('1.920 × 960 px')
  })

  it('formats pitch pair', () => {
    expect(formatPitchPairMm(2.6, 2.6)).toBe('2,6 × 2,6 mm')
  })

  it('formats physical aspect with preset suffix', () => {
    expect(formatPhysicalAspectDisplay(1600, 900)).toContain('16:9')
    expect(formatPhysicalAspectDisplay(2000, 1000)).toContain('2:1')
    expect(formatPhysicalAspectDisplay(2000, 1000)).toMatch(/2,00 : 1/)
  })

  it('detects simplified aspect labels', () => {
    expect(simplifiedAspectLabel(16 / 10)).toBe('16:10')
    expect(simplifiedAspectLabel(2)).toBe('2:1')
  })
})
