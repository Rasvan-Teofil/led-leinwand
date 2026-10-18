import type { PanelDefinition } from '../types/panel'
import { occupiedSizeMm, pitchXMm, pitchYMm } from '../types/panel'
import type { LEDWall } from '../types/wall'
import { wallLocalBoundingBox } from './geometry'
import { analyzeNativeResolution } from './resolution'

export type ResolutionMaskPresetId = 'hd' | 'fullHd' | 'qhd' | 'uhd' | 'custom'

export type ResolutionMaskFitMode = 'contain' | 'cover' | 'oneToOne'

export interface ResolutionMaskPreset {
  id: ResolutionMaskPresetId
  label: string
  widthPx: number
  heightPx: number
}

export const RESOLUTION_MASK_PRESETS: ResolutionMaskPreset[] = [
  { id: 'hd', label: 'HD 1280×720', widthPx: 1280, heightPx: 720 },
  { id: 'fullHd', label: 'Full HD 1920×1080', widthPx: 1920, heightPx: 1080 },
  { id: 'qhd', label: 'QHD 2560×1440', widthPx: 2560, heightPx: 1440 },
  { id: 'uhd', label: 'UHD 3840×2160', widthPx: 3840, heightPx: 2160 }
]

export interface ResolutionMaskWallSettings {
  enabled?: boolean
  preset?: ResolutionMaskPresetId
  customWidthPx?: number
  customHeightPx?: number
  fitMode?: ResolutionMaskFitMode
  offsetLocalXMm?: number
  offsetLocalYMm?: number
}

export interface LedRasterRectPx {
  x: number
  y: number
  width: number
  height: number
}

export interface LedRasterRectMm {
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
}

export interface WallLedRaster {
  originLocalXMm: number
  originLocalYMm: number
  widthPx: number
  heightPx: number
  pitchXMm: number
  pitchYMm: number
  active: Uint8Array
  activePixelCount: number
}

export interface ResolutionMaskAnalysis {
  comparable: boolean
  sourceWidthPx: number
  sourceHeightPx: number
  fitMode: ResolutionMaskFitMode
  ledRaster: WallLedRaster
  /** Content frame in LED pixel space (relative to raster origin). */
  contentLedPx: LedRasterRectPx
  /** Full content frame including parts outside the LED raster (cover). */
  contentLedPxFull: LedRasterRectPx
  contentLedMm: LedRasterRectMm
  ledBoundsMm: LedRasterRectMm
  /** Verschnitt: active panel area outside the content frame (wall-local mm). */
  verschnittRectsMm: LedRasterRectMm[]
  verschnittLabel: string
  /** @deprecated Use verschnittRectsMm */
  unusedLedRectsMm: LedRasterRectMm[]
  contentAreaPx: number
  contentAreaMm2: number
  unusedLedPixels: number
  unusedLedPercent: number
  unusedAreaM2: number
  croppedContentPercent: number
  scaleLedPerSource: number
  rulerLabels: {
    contentWidthPx: number
    contentHeightPx: number
    contentWidthMm: number
    contentHeightMm: number
    ledWidthPx: number
    ledHeightPx: number
  }
}

export function resolveSourceResolution(
  settings: ResolutionMaskWallSettings
): { widthPx: number, heightPx: number } | null {
  const preset = settings.preset ?? 'fullHd'
  if (preset === 'custom') {
    const w = settings.customWidthPx ?? 0
    const h = settings.customHeightPx ?? 0
    if (w < 1 || h < 1) return null
    return { widthPx: Math.round(w), heightPx: Math.round(h) }
  }
  const ref = RESOLUTION_MASK_PRESETS.find(p => p.id === preset)
  if (!ref) return null
  return { widthPx: ref.widthPx, heightPx: ref.heightPx }
}

function pitchesUniform(
  wall: LEDWall,
  defsById: Map<string, PanelDefinition>
): { pitchXMm: number, pitchYMm: number } | null {
  const enabled = wall.panels.filter(p => p.enabled && p.rotation === 0)
  if (enabled.length === 0) return null
  let px: number | null = null
  let py: number | null = null
  for (const panel of enabled) {
    const def = defsById.get(panel.panelDefinitionId)
    if (!def) return null
    const pitchX = pitchXMm(def)
    const pitchY = pitchYMm(def)
    if (px == null) {
      px = pitchX
      py = pitchY
    } else if (
      Math.abs(px - pitchX) > 1e-3
      || Math.abs(py! - pitchY) > 1e-3
    ) {
      return null
    }
  }
  if (px == null || py == null) return null
  return { pitchXMm: px, pitchYMm: py }
}

export function buildWallLedRaster(
  wall: LEDWall,
  defs: PanelDefinition[]
): WallLedRaster | null {
  const defsById = new Map(defs.map(d => [d.id, d]))
  const pitches = pitchesUniform(wall, defsById)
  const bbox = wallLocalBoundingBox(wall, defsById)
  if (!pitches || !bbox) return null

  const enabled = wall.panels.filter(p => p.enabled && p.rotation === 0)
  if (enabled.length === 0) return null

  let widthPx = 0
  let heightPx = 0
  const stamps: Array<{ x: number, y: number, w: number, h: number }> = []

  for (const panel of enabled) {
    const def = defsById.get(panel.panelDefinitionId)
    if (!def) continue
    const x0 = Math.round(
      ((panel.xMm - bbox.xMm) * def.resolutionX) / def.widthMm
    )
    const y0 = Math.round(
      ((panel.yMm - bbox.yMm) * def.resolutionY) / def.heightMm
    )
    const w = def.resolutionX
    const h = def.resolutionY
    stamps.push({ x: x0, y: y0, w, h })
    widthPx = Math.max(widthPx, x0 + w)
    heightPx = Math.max(heightPx, y0 + h)
  }

  if (widthPx < 1 || heightPx < 1) return null

  const active = new Uint8Array(widthPx * heightPx)
  let activePixelCount = 0
  for (const s of stamps) {
    for (let y = 0; y < s.h; y++) {
      for (let x = 0; x < s.w; x++) {
        const idx = (s.y + y) * widthPx + (s.x + x)
        if (idx >= 0 && idx < active.length && active[idx] === 0) {
          active[idx] = 1
          activePixelCount += 1
        }
      }
    }
  }

  return {
    originLocalXMm: bbox.xMm,
    originLocalYMm: bbox.yMm,
    widthPx,
    heightPx,
    pitchXMm: pitches.pitchXMm,
    pitchYMm: pitches.pitchYMm,
    active,
    activePixelCount
  }
}

export function computeContentFrameLedPx(
  ledW: number,
  ledH: number,
  sourceW: number,
  sourceH: number,
  mode: ResolutionMaskFitMode
): LedRasterRectPx {
  const aspect = sourceW / sourceH
  if (mode === 'oneToOne') {
    return {
      x: (ledW - sourceW) / 2,
      y: (ledH - sourceH) / 2,
      width: sourceW,
      height: sourceH
    }
  }
  const ledAspect = ledW / ledH
  if (mode === 'contain') {
    if (ledAspect > aspect) {
      const h = ledH
      const w = h * aspect
      return { x: (ledW - w) / 2, y: 0, width: w, height: h }
    }
    const w = ledW
    const h = w / aspect
    return { x: 0, y: (ledH - h) / 2, width: w, height: h }
  }
  // cover
  if (ledAspect > aspect) {
    const w = ledW
    const h = w / aspect
    return { x: 0, y: (ledH - h) / 2, width: w, height: h }
  }
  const h = ledH
  const w = h * aspect
  return { x: (ledW - w) / 2, y: 0, width: w, height: h }
}

function pxToMm(
  raster: WallLedRaster,
  rect: LedRasterRectPx
): LedRasterRectMm {
  return {
    xMm: raster.originLocalXMm + rect.x * raster.pitchXMm,
    yMm: raster.originLocalYMm + rect.y * raster.pitchYMm,
    widthMm: rect.width * raster.pitchXMm,
    heightMm: rect.height * raster.pitchYMm
  }
}

function intersectRectsPx(
  a: LedRasterRectPx,
  b: LedRasterRectPx
): LedRasterRectPx | null {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)
  if (x2 <= x1 || y2 <= y1) return null
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
}

function rectAreaPx(r: LedRasterRectPx): number {
  return Math.max(0, r.width) * Math.max(0, r.height)
}

function countActiveInRect(
  raster: WallLedRaster,
  rect: LedRasterRectPx
): number {
  const x0 = Math.max(0, Math.floor(rect.x))
  const y0 = Math.max(0, Math.floor(rect.y))
  const x1 = Math.min(raster.widthPx, Math.ceil(rect.x + rect.width))
  const y1 = Math.min(raster.heightPx, Math.ceil(rect.y + rect.height))
  let n = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = y * raster.widthPx + x
      if (raster.active[idx]) n += 1
    }
  }
  return n
}

function countActiveOutsideRect(
  raster: WallLedRaster,
  inner: LedRasterRectPx
): number {
  return raster.activePixelCount - countActiveInRect(raster, inner)
}

function intersectMm(
  a: LedRasterRectMm,
  b: LedRasterRectMm
): LedRasterRectMm | null {
  const x1 = Math.max(a.xMm, b.xMm)
  const y1 = Math.max(a.yMm, b.yMm)
  const x2 = Math.min(a.xMm + a.widthMm, b.xMm + b.widthMm)
  const y2 = Math.min(a.yMm + a.heightMm, b.yMm + b.heightMm)
  if (x2 <= x1 + 0.01 || y2 <= y1 + 0.01) return null
  return { xMm: x1, yMm: y1, widthMm: x2 - x1, heightMm: y2 - y1 }
}

function subtractPanelFromContentMm(
  panel: LedRasterRectMm,
  content: LedRasterRectMm
): LedRasterRectMm[] {
  const hit = intersectMm(panel, content)
  if (!hit) return [panel]
  const out: LedRasterRectMm[] = []
  const px = panel.xMm
  const py = panel.yMm
  const pw = panel.widthMm
  const ph = panel.heightMm
  const cx = hit.xMm
  const cy = hit.yMm
  const cw = hit.widthMm
  const ch = hit.heightMm
  if (py < cy - 0.01) {
    out.push({
      xMm: px,
      yMm: py,
      widthMm: pw,
      heightMm: cy - py
    })
  }
  if (py + ph > cy + ch + 0.01) {
    out.push({
      xMm: px,
      yMm: cy + ch,
      widthMm: pw,
      heightMm: py + ph - (cy + ch)
    })
  }
  const midY = Math.max(py, cy)
  const midH = Math.min(py + ph, cy + ch) - midY
  if (midH > 0.01) {
    if (px < cx - 0.01) {
      out.push({
        xMm: px,
        yMm: midY,
        widthMm: cx - px,
        heightMm: midH
      })
    }
    if (px + pw > cx + cw + 0.01) {
      out.push({
        xMm: cx + cw,
        yMm: midY,
        widthMm: px + pw - (cx + cw),
        heightMm: midH
      })
    }
  }
  return out.filter(r => r.widthMm > 0.5 && r.heightMm > 0.5)
}

/** Clip Verschnitt to enabled panel footprints (irregular walls). */
export function computeVerschnittRectsMm(
  wall: LEDWall,
  defs: PanelDefinition[],
  contentLedMm: LedRasterRectMm
): LedRasterRectMm[] {
  const defsById = new Map(defs.map(d => [d.id, d]))
  const rects: LedRasterRectMm[] = []
  for (const panel of wall.panels) {
    if (!panel.enabled || panel.rotation !== 0) continue
    const def = defsById.get(panel.panelDefinitionId)
    if (!def) continue
    const size = occupiedSizeMm(def, panel.rotation)
    const panelMm: LedRasterRectMm = {
      xMm: panel.xMm,
      yMm: panel.yMm,
      widthMm: size.widthMm,
      heightMm: size.heightMm
    }
    rects.push(...subtractPanelFromContentMm(panelMm, contentLedMm))
  }
  return rects
}

export function verschnittLabelText(
  unusedLedPixels: number,
  unusedLedPercent: number,
  ledWidthPx: number
): string {
  const rowPx
    = ledWidthPx > 0 ? Math.round(unusedLedPixels / ledWidthPx) : unusedLedPixels
  const pct = unusedLedPercent.toFixed(0)
  return `Verschnitt ${rowPx} px · ${pct} %`
}

export function analyzeResolutionMask(
  wall: LEDWall,
  defs: PanelDefinition[],
  overlapCount: number,
  settings: ResolutionMaskWallSettings
): ResolutionMaskAnalysis | null {
  if (!settings.enabled) return null
  const source = resolveSourceResolution(settings)
  if (!source) return null
  const fitMode = settings.fitMode ?? 'contain'
  const raster = buildWallLedRaster(wall, defs)
  if (!raster) return null

  const native = analyzeNativeResolution(wall, defs, overlapCount)
  const comparable = native.valid || raster.activePixelCount > 0

  const baseFrame = computeContentFrameLedPx(
    raster.widthPx,
    raster.heightPx,
    source.widthPx,
    source.heightPx,
    fitMode
  )
  const offsetPxX = (settings.offsetLocalXMm ?? 0) / raster.pitchXMm
  const offsetPxY = (settings.offsetLocalYMm ?? 0) / raster.pitchYMm
  const contentLedPx: LedRasterRectPx = {
    x: baseFrame.x + offsetPxX,
    y: baseFrame.y + offsetPxY,
    width: baseFrame.width,
    height: baseFrame.height
  }
  const contentLedPxFull = { ...contentLedPx }

  const ledBoundsPx: LedRasterRectPx = {
    x: 0,
    y: 0,
    width: raster.widthPx,
    height: raster.heightPx
  }
  const onWall = intersectRectsPx(contentLedPx, ledBoundsPx)
  const contentAreaPx = onWall ? rectAreaPx(onWall) : 0
  const fullAreaPx = rectAreaPx(contentLedPx)
  const croppedContentPercent
    = fullAreaPx > 0
      ? ((fullAreaPx - contentAreaPx) / fullAreaPx) * 100
      : 0

  const unusedLedPixels = countActiveOutsideRect(
    raster,
    onWall ?? { x: 0, y: 0, width: 0, height: 0 }
  )
  const unusedLedPercent
    = raster.activePixelCount > 0
      ? (unusedLedPixels / raster.activePixelCount) * 100
      : 0
  const pixelAreaMm2 = raster.pitchXMm * raster.pitchYMm
  const unusedAreaM2 = (unusedLedPixels * pixelAreaMm2) / 1_000_000
  const contentAreaMm2 = (contentAreaPx * pixelAreaMm2) / 1_000_000

  const scaleLedPerSource
    = source.widthPx > 0 ? contentLedPx.width / source.widthPx : 0

  const contentLedMm = pxToMm(raster, contentLedPx)
  const contentOnWallMm = pxToMm(
    raster,
    onWall ?? { x: 0, y: 0, width: 0, height: 0 }
  )
  const ledBoundsMm = pxToMm(raster, ledBoundsPx)
  const verschnittRectsMm = computeVerschnittRectsMm(
    wall,
    defs,
    contentOnWallMm
  )

  return {
    comparable,
    sourceWidthPx: source.widthPx,
    sourceHeightPx: source.heightPx,
    fitMode,
    ledRaster: raster,
    contentLedPx,
    contentLedPxFull,
    contentLedMm,
    ledBoundsMm,
    verschnittRectsMm,
    verschnittLabel: verschnittLabelText(
      unusedLedPixels,
      unusedLedPercent,
      raster.widthPx
    ),
    unusedLedRectsMm: verschnittRectsMm,
    contentAreaPx,
    contentAreaMm2,
    unusedLedPixels,
    unusedLedPercent,
    unusedAreaM2,
    croppedContentPercent,
    scaleLedPerSource,
    rulerLabels: {
      contentWidthPx: Math.round(contentLedPx.width),
      contentHeightPx: Math.round(contentLedPx.height),
      contentWidthMm: contentLedMm.widthMm,
      contentHeightMm: contentLedMm.heightMm,
      ledWidthPx: raster.widthPx,
      ledHeightPx: raster.heightPx
    }
  }
}
