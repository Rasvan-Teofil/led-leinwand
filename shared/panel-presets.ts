import type { PanelDefinition } from './types/panel'

const now = () => new Date().toISOString()

function preset(
  partial: Omit<
    PanelDefinition,
    'id' | 'allowedRotations' | 'createdAt' | 'updatedAt' | 'isPreset'
  > & { id: string }
): PanelDefinition {
  const t = now()
  return {
    ...partial,
    allowedRotations: [0, 90, 180, 270],
    isPreset: true,
    createdAt: t,
    updatedAt: t
  }
}

const GENERIC_DISCLAIMER
  = 'Generic example, not verified commercial specs — verify before quoting.'

export const BUILTIN_PANEL_PRESETS: PanelDefinition[] = [
  ...([500, 1000] as const).flatMap(w =>
    ([500, 1000] as const).flatMap((h) => {
      if (w === h && w === 1000) return []
      const pitches = [
        { label: 'P1.9', pitch: 1.9 },
        { label: 'P2.6', pitch: 2.6 },
        { label: 'P2.9', pitch: 2.9 },
        { label: 'P3.91', pitch: 3.91 },
        { label: 'P4.81', pitch: 4.81 }
      ]
      return pitches
        .map(({ label, pitch }) => {
          const rx = Math.round(w / pitch)
          const ry = Math.round(h / pitch)
          if (rx < 1 || ry < 1) return null
          const id = `preset-${w}x${h}-${label.replace('.', '')}`
          return preset({
            id,
            name: `Generic ${w}×${h} mm ${label}`,
            widthMm: w,
            heightMm: h,
            resolutionX: rx,
            resolutionY: ry,
            nominalPitchMm: pitch,
            disclaimer: GENERIC_DISCLAIMER
          })
        })
        .filter(Boolean) as PanelDefinition[]
    })
  ),
  preset({
    id: 'jinyuan-p391-500x500',
    name: 'Jinyuan P3.91 (Angebot) 500×500',
    manufacturer: 'Jinyuan',
    model: 'P3.91',
    widthMm: 500,
    heightMm: 500,
    resolutionX: 128,
    resolutionY: 128,
    nominalPitchMm: 3.91,
    disclaimer: 'From supplier quote — verify before ordering.'
  }),
  preset({
    id: 'jinyuan-p391-500x1000',
    name: 'Jinyuan P3.91 (Angebot) 500×1000',
    manufacturer: 'Jinyuan',
    model: 'P3.91',
    widthMm: 500,
    heightMm: 1000,
    resolutionX: 128,
    resolutionY: 256,
    nominalPitchMm: 3.91,
    disclaimer: 'From supplier quote — verify before ordering.'
  }),
  // P2.6 is nominal: use the same 192-pixel raster per 500 mm for both sizes.
  preset({
    id: 'offer-2-p26-500x500',
    name: 'Angebot 2 P2.6 500×500',
    model: 'P2.6',
    widthMm: 500,
    heightMm: 500,
    resolutionX: 192,
    resolutionY: 192,
    nominalPitchMm: 2.6,
    disclaimer: 'Rechenmodell: 192 Pixel je 500 mm; genaue Auflösung mit dem Angebot abgleichen.'
  }),
  preset({
    id: 'offer-2-p26-500x1000',
    name: 'Angebot 2 P2.6 500×1000',
    model: 'P2.6',
    widthMm: 500,
    heightMm: 1000,
    resolutionX: 192,
    resolutionY: 384,
    nominalPitchMm: 2.6,
    disclaimer: 'Rechenmodell: 192 Pixel je 500 mm; genaue Auflösung mit dem Angebot abgleichen.'
  })
]

export function clonePresetsForProject(): PanelDefinition[] {
  const t = now()
  return BUILTIN_PANEL_PRESETS.map(p => ({
    ...p,
    createdAt: t,
    updatedAt: t
  }))
}
