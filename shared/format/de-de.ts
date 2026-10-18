const integerFormatter = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 0
})

const decimalFormatter = (decimals: number) =>
  new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })

export function formatIntegerDe(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return integerFormatter.format(Math.round(value))
}

export function formatDecimalDe(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—'
  return decimalFormatter(decimals).format(value)
}

/** Physical size pair in metres, e.g. `5 × 2,5 m`. */
export function formatMetersPair(widthMm: number, heightMm: number): string {
  if (widthMm <= 0 || heightMm <= 0) return '—'
  const w = formatDecimalDe(widthMm / 1000, widthMm % 1000 === 0 ? 0 : 1)
  const h = formatDecimalDe(heightMm / 1000, heightMm % 1000 === 0 ? 0 : 1)
  return `${w} × ${h} m`
}

export function formatResolutionPair(resX: number, resY: number): string {
  if (resX <= 0 || resY <= 0) return '—'
  return `${formatIntegerDe(resX)} × ${formatIntegerDe(resY)} px`
}

export function formatPitchPairMm(pitchX: number, pitchY: number): string {
  if (pitchX <= 0 || pitchY <= 0) return '—'
  const same = Math.abs(pitchX - pitchY) < 0.0005
  if (same) {
    return `${formatDecimalDe(pitchX, 1)} × ${formatDecimalDe(pitchY, 1)} mm`
  }
  return `${formatDecimalDe(pitchX, 2)} × ${formatDecimalDe(pitchY, 2)} mm`
}

const ASPECT_PRESETS: Array<[string, number]> = [
  ['16:9', 16 / 9],
  ['16:10', 16 / 10],
  ['4:3', 4 / 3],
  ['21:9', 21 / 9],
  ['2:1', 2],
  ['1:1', 1]
]

export function simplifiedAspectLabel(ratio: number): string | null {
  for (const [label, target] of ASPECT_PRESETS) {
    if (Math.abs(ratio - target) < 0.002) return label
  }
  return null
}

/** e.g. `2,00 : 1` with optional ` (16:10)`. */
export function formatPhysicalAspectDisplay(widthMm: number, heightMm: number): string {
  if (widthMm <= 0 || heightMm <= 0) return '—'
  const ratio = widthMm / heightMm
  const base = `${formatDecimalDe(ratio, 2)} : 1`
  const preset = simplifiedAspectLabel(ratio)
  return preset ? `${base} (${preset})` : base
}

export function formatPanelsAreaLine(panelCount: number, areaM2: number): string {
  if (panelCount <= 0) return '—'
  const area = areaM2 > 0 ? formatDecimalDe(areaM2, 1) : '0'
  return `${formatIntegerDe(panelCount)} / ${area} m²`
}
