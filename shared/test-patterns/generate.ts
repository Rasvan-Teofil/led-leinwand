import type { PanelDefinition } from '../types/panel'
import { occupiedSizeMm } from '../types/panel'
import type { LEDWall } from '../types/wall'
import { wallLocalBoundingBox } from '../calculations/geometry'

export type TestPatternKind = 'smpte' | 'grid' | 'cabinet' | 'pitch'

export interface TestPatternInput {
  wall: LEDWall
  defsById: Map<string, PanelDefinition>
  kind: TestPatternKind
  resolutionX?: number
  resolutionY?: number
}

const MAX_EDGE_PX = 2048

function scaleToMax(w: number, h: number): { w: number, h: number, scale: number } {
  const m = Math.max(w, h)
  if (m <= MAX_EDGE_PX) return { w, h, scale: 1 }
  const scale = MAX_EDGE_PX / m
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)), scale }
}

function mmToPx(
  mm: number,
  bboxWidthMm: number,
  pxWidth: number
): number {
  return (mm / bboxWidthMm) * pxWidth
}

export function generateWallTestPatternDataUrl(input: TestPatternInput): string | null {
  if (typeof document === 'undefined') return null
  const bbox = wallLocalBoundingBox(input.wall, input.defsById)
  if (!bbox || bbox.widthMm <= 0 || bbox.heightMm <= 0) return null

  const resX = input.resolutionX && input.resolutionX > 0
    ? input.resolutionX
    : Math.round(bbox.widthMm / 3.91)
  const resY = input.resolutionY && input.resolutionY > 0
    ? input.resolutionY
    : Math.round(bbox.heightMm / 3.91)
  const { w, h } = scaleToMax(resX, resY)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, w, h)

  const panels = input.wall.panels.filter(p => p.enabled)
  const mask = document.createElement('canvas')
  mask.width = w
  mask.height = h
  const mctx = mask.getContext('2d')!
  mctx.fillStyle = '#000'
  mctx.fillRect(0, 0, w, h)
  for (const panel of panels) {
    const def = input.defsById.get(panel.panelDefinitionId)
    if (!def) continue
    const size = occupiedSizeMm(def, panel.rotation)
    const x = mmToPx(panel.xMm - bbox.xMm, bbox.widthMm, w)
    const y = mmToPx(panel.yMm - bbox.yMm, bbox.heightMm, h)
    const pw = mmToPx(size.widthMm, bbox.widthMm, w)
    const ph = mmToPx(size.heightMm, bbox.heightMm, h)
    mctx.fillStyle = '#fff'
    mctx.fillRect(x, y, pw, ph)
  }

  drawPattern(ctx, input.kind, w, h, input.wall, input.defsById, bbox)
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(mask, 0, 0)
  ctx.globalCompositeOperation = 'source-over'

  return canvas.toDataURL('image/png')
}

function drawPattern(
  ctx: CanvasRenderingContext2D,
  kind: TestPatternKind,
  w: number,
  h: number,
  wall: LEDWall,
  defsById: Map<string, PanelDefinition>,
  bbox: { xMm: number, yMm: number, widthMm: number, heightMm: number }
) {
  switch (kind) {
    case 'smpte':
      drawSmpte(ctx, w, h)
      break
    case 'grid':
      drawGrid(ctx, w, h)
      break
    case 'cabinet':
      drawCabinet(ctx, w, h, wall, defsById, bbox)
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
  bbox: { xMm: number, yMm: number, widthMm: number, heightMm: number }
) {
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, w, h)
  let idx = 1
  const sorted = [...wall.panels].filter(p => p.enabled).sort((a, b) => a.yMm - b.yMm || a.xMm - b.xMm)
  for (const panel of sorted) {
    const def = defsById.get(panel.panelDefinitionId)
    if (!def) continue
    const size = occupiedSizeMm(def, panel.rotation)
    const x = mmToPx(panel.xMm - bbox.xMm, bbox.widthMm, w)
    const y = mmToPx(panel.yMm - bbox.yMm, bbox.heightMm, h)
    const pw = mmToPx(size.widthMm, bbox.widthMm, w)
    const ph = mmToPx(size.heightMm, bbox.heightMm, h)
    ctx.fillStyle = idx % 2 === 0 ? '#1e3a8a' : '#1e40af'
    ctx.fillRect(x, y, pw, ph)
    ctx.strokeStyle = '#7dd3fc'
    ctx.strokeRect(x, y, pw, ph)
    ctx.fillStyle = '#e2e8f0'
    ctx.font = `${Math.max(10, pw / 8)}px sans-serif`
    ctx.fillText(`#${idx}`, x + 4, y + ph / 2)
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
