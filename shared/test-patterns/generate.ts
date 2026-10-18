import { analyzeUniformPitchRaster } from '../calculations/uniform-pitch-raster'
import { analyzeNativeResolution } from '../calculations/resolution'
import { wallLocalBoundingBox } from '../calculations/geometry'
import type { PanelDefinition } from '../types/panel'
import { occupiedSizeMm } from '../types/panel'
import type { LEDWall } from '../types/wall'

export type TestPatternKind = 'smpte' | 'grid' | 'cabinet' | 'pitch'

export interface TestPatternInput {
  wall: LEDWall
  defsById: Map<string, PanelDefinition>
  panelDefinitions: PanelDefinition[]
  kind: TestPatternKind
  resolutionX?: number
  resolutionY?: number
}

const MAX_EDGE_PX = 2048

export interface PatternRasterResolution {
  resX: number
  resY: number
  useNativePitchMap: boolean
}

export interface PanelPixelRect {
  panelId: string
  x: number
  y: number
  w: number
  h: number
}

function scaleToMax(w: number, h: number): { w: number, h: number } {
  const m = Math.max(w, h)
  if (m <= MAX_EDGE_PX) return { w, h }
  const scale = MAX_EDGE_PX / m
  return {
    w: Math.max(1, Math.round(w * scale)),
    h: Math.max(1, Math.round(h * scale))
  }
}

export function resolveWallPatternRaster(
  wall: LEDWall,
  defsById: Map<string, PanelDefinition>,
  panelDefinitions: PanelDefinition[],
  overrides?: { resolutionX?: number, resolutionY?: number }
): PatternRasterResolution | null {
  const bbox = wallLocalBoundingBox(wall, defsById)
  if (!bbox || bbox.widthMm <= 0 || bbox.heightMm <= 0) return null

  const uniform = analyzeUniformPitchRaster(wall, defsById)
  const native = analyzeNativeResolution(wall, panelDefinitions, 0)

  const resX = overrides?.resolutionX && overrides.resolutionX > 0
    ? overrides.resolutionX
    : uniform?.resolutionX
      ?? (native.valid ? native.resolutionX : Math.round(bbox.widthMm / 3.91))
  const resY = overrides?.resolutionY && overrides.resolutionY > 0
    ? overrides.resolutionY
    : uniform?.resolutionY
      ?? (native.valid ? native.resolutionY : Math.round(bbox.heightMm / 3.91))

  if (resX <= 0 || resY <= 0) return null

  const useNativePitchMap = Boolean(uniform) || native.valid

  return { resX, resY, useNativePitchMap }
}

function panelNativePixelRect(
  panel: LEDWall['panels'][number],
  def: PanelDefinition,
  bbox: { xMm: number, yMm: number, widthMm: number, heightMm: number }
): { x0: number, y0: number, x1: number, y1: number } {
  const size = occupiedSizeMm(def, panel.rotation)
  const px0 = ((panel.xMm - bbox.xMm) * def.resolutionX) / def.widthMm
  const py0 = ((panel.yMm - bbox.yMm) * def.resolutionY) / def.heightMm
  const px1 = px0 + (size.widthMm * def.resolutionX) / def.widthMm
  const py1 = py0 + (size.heightMm * def.resolutionY) / def.heightMm
  return {
    x0: Math.floor(px0),
    y0: Math.floor(py0),
    x1: Math.ceil(px1),
    y1: Math.ceil(py1)
  }
}

function mmToPxLinear(mm: number, spanMm: number, pxSpan: number): number {
  return (mm / spanMm) * pxSpan
}

export function buildPatternPanelMaskRects(
  wall: LEDWall,
  defsById: Map<string, PanelDefinition>,
  resX: number,
  resY: number,
  useNativePitchMap: boolean
): PanelPixelRect[] {
  const bbox = wallLocalBoundingBox(wall, defsById)
  if (!bbox) return []

  const out: PanelPixelRect[] = []
  for (const panel of wall.panels.filter(p => p.enabled)) {
    const def = defsById.get(panel.panelDefinitionId)
    if (!def) continue
    const size = occupiedSizeMm(def, panel.rotation)

    if (useNativePitchMap) {
      const { x0, y0, x1, y1 } = panelNativePixelRect(panel, def, bbox)
      const w = Math.max(1, Math.min(resX, x1) - Math.max(0, x0))
      const h = Math.max(1, Math.min(resY, y1) - Math.max(0, y0))
      const x = Math.max(0, x0)
      const y = Math.max(0, y0)
      out.push({ panelId: panel.id, x, y, w, h })
    } else {
      const x = Math.floor(
        mmToPxLinear(panel.xMm - bbox.xMm, bbox.widthMm, resX)
      )
      const y = Math.floor(
        mmToPxLinear(panel.yMm - bbox.yMm, bbox.heightMm, resY)
      )
      const x1 = Math.ceil(
        mmToPxLinear(
          panel.xMm - bbox.xMm + size.widthMm,
          bbox.widthMm,
          resX
        )
      )
      const y1 = Math.ceil(
        mmToPxLinear(
          panel.yMm - bbox.yMm + size.heightMm,
          bbox.heightMm,
          resY
        )
      )
      out.push({
        panelId: panel.id,
        x: Math.max(0, x),
        y: Math.max(0, y),
        w: Math.max(1, Math.min(resX, x1) - x),
        h: Math.max(1, Math.min(resY, y1) - y)
      })
    }
  }
  return out
}

/** Pixel centers (native raster) used to verify each panel received pattern pixels. */
export function panelPatternSamplePoints(
  wall: LEDWall,
  defsById: Map<string, PanelDefinition>,
  resX: number,
  resY: number,
  useNativePitchMap: boolean
): Array<{ panelId: string, x: number, y: number }> {
  return buildPatternPanelMaskRects(
    wall,
    defsById,
    resX,
    resY,
    useNativePitchMap
  ).map(r => ({
    panelId: r.panelId,
    x: Math.min(resX - 1, Math.max(0, r.x + Math.floor(r.w / 2))),
    y: Math.min(resY - 1, Math.max(0, r.y + Math.floor(r.h / 2)))
  }))
}

export function generateWallTestPatternDataUrl(input: TestPatternInput): string | null {
  if (typeof document === 'undefined') return null

  const raster = resolveWallPatternRaster(
    input.wall,
    input.defsById,
    input.panelDefinitions,
    {
      resolutionX: input.resolutionX,
      resolutionY: input.resolutionY
    }
  )
  if (!raster) return null

  const bbox = wallLocalBoundingBox(input.wall, input.defsById)
  if (!bbox) return null

  const { resX, resY, useNativePitchMap } = raster
  const { w: outW, h: outH } = scaleToMax(resX, resY)

  const canvas = document.createElement('canvas')
  canvas.width = resX
  canvas.height = resY
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, resX, resY)

  drawPattern(ctx, input.kind, resX, resY, input.wall, input.defsById, bbox, useNativePitchMap)

  const mask = document.createElement('canvas')
  mask.width = resX
  mask.height = resY
  const mctx = mask.getContext('2d')
  if (!mctx) return null
  mctx.fillStyle = '#000'
  mctx.fillRect(0, 0, resX, resY)
  const rects = buildPatternPanelMaskRects(
    input.wall,
    input.defsById,
    resX,
    resY,
    useNativePitchMap
  )
  for (const r of rects) {
    mctx.fillStyle = '#fff'
    mctx.fillRect(r.x, r.y, r.w, r.h)
  }

  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(mask, 0, 0)
  ctx.globalCompositeOperation = 'source-over'

  if (outW === resX && outH === resY) {
    return canvas.toDataURL('image/png')
  }

  const scaled = document.createElement('canvas')
  scaled.width = outW
  scaled.height = outH
  const sctx = scaled.getContext('2d')
  if (!sctx) return null
  sctx.drawImage(canvas, 0, 0, outW, outH)
  return scaled.toDataURL('image/png')
}

function drawPattern(
  ctx: CanvasRenderingContext2D,
  kind: TestPatternKind,
  w: number,
  h: number,
  wall: LEDWall,
  defsById: Map<string, PanelDefinition>,
  bbox: { xMm: number, yMm: number, widthMm: number, heightMm: number },
  useNativePitchMap: boolean
) {
  switch (kind) {
    case 'smpte':
      drawSmpte(ctx, w, h)
      break
    case 'grid':
      drawGrid(ctx, w, h)
      break
    case 'cabinet':
      drawCabinet(ctx, w, h, wall, defsById, bbox, w, h, useNativePitchMap)
      break
    case 'pitch':
      drawPitch(ctx, w, h)
      break
  }
}

function drawSmpte(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const colors = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0']
  const barW = w / colors.length
  colors.forEach((c, i) => {
    ctx.fillStyle = c
    ctx.fillRect(i * barW, 0, barW + 1, h * 0.75)
  })
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, h * 0.75, w, h * 0.25)
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#111827'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#38bdf8'
  ctx.lineWidth = Math.max(1, w / 512)
  const step = Math.max(16, Math.round(w / 32))
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  ctx.strokeStyle = '#f8fafc'
  ctx.beginPath()
  ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.35, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(w / 2, 0)
  ctx.lineTo(w / 2, h)
  ctx.moveTo(0, h / 2)
  ctx.lineTo(w, h / 2)
  ctx.stroke()
}

function drawCabinet(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  wall: LEDWall,
  defsById: Map<string, PanelDefinition>,
  bbox: { xMm: number, yMm: number, widthMm: number, heightMm: number },
  resX: number,
  resY: number,
  useNative: boolean
) {
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, w, h)
  const rects = buildPatternPanelMaskRects(wall, defsById, resX, resY, useNative)
  let idx = 1
  for (const r of rects) {
    ctx.fillStyle = idx % 2 === 0 ? '#1e3a8a' : '#1e40af'
    ctx.fillRect(r.x, r.y, r.w, r.h)
    ctx.strokeStyle = '#7dd3fc'
    ctx.strokeRect(r.x, r.y, r.w, r.h)
    ctx.fillStyle = '#e2e8f0'
    ctx.font = `${Math.max(10, r.w / 8)}px sans-serif`
    ctx.fillText(`#${idx}`, r.x + 4, r.y + r.h / 2)
    idx++
  }
}

function drawPitch(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cell = Math.max(2, Math.round(w / 128))
  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      const on = ((x / cell) + (y / cell)) % 2 === 0
      ctx.fillStyle = on ? '#f8fafc' : '#020617'
      ctx.fillRect(x, y, cell, cell)
    }
  }
}
