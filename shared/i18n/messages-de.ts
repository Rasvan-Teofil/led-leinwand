import type { ReferenceMatchKind, ResolutionWarningCode } from '../calculations/resolution'

export const WARNING_LABELS_DE: Record<ResolutionWarningCode, string> = {
  mixed_pitch: 'Gemischte Pixel-Pitches — kein einheitliches natives Raster',
  non_rectangular: 'Unregelmäßige Anordnung — keine rechteckige Native-Auflösung',
  gaps_in_grid: 'Lücken im Panel-Raster',
  overlapping_panels: 'Überlappende Panels',
  no_panels: 'Keine aktiven Panels',
  mixed_panel_sizes: 'Verschiedene Panelgrößen (einheitlicher Pitch)'
}

export const REFERENCE_KIND_LABELS_DE: Record<ReferenceMatchKind, string> = {
  exact_native: 'Exakte Native-Auflösung',
  same_aspect_different_res: 'Gleiches Seitenverhältnis, andere Auflösung',
  different_aspect: 'Anderes Seitenverhältnis',
  larger_than_reference: 'Größer als Referenz',
  smaller_than_reference: 'Kleiner als Referenz',
  not_comparable: 'Nicht vergleichbar'
}

export function formatAspectRatio(value: number): string {
  const presets: Array<[string, number]> = [
    ['16:9', 16 / 9],
    ['16:10', 16 / 10],
    ['4:3', 4 / 3],
    ['21:9', 21 / 9],
    ['1:1', 1]
  ]
  for (const [label, ratio] of presets) {
    if (Math.abs(value - ratio) < 0.002) return label
  }
  return value.toFixed(4).replace(/\.?0+$/, '')
}

export function parseAspectRatioInput(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (trimmed.includes(':')) {
    const [w, h] = trimmed.split(':').map(s => Number(s.trim()))
    if (!w || !h || h === 0) return null
    return w / h
  }
  const n = Number(trimmed)
  return Number.isFinite(n) && n > 0 ? n : null
}
