import { exportProjectPdf } from '#shared/export/pdf-report'
import { useProjectStore } from '~/stores/project'

export function useExport() {
  const project = useProjectStore()

  async function exportPng(options: {
    includeGrid?: boolean
    scale?: number
  } = {}) {
    const { includeGrid = false, scale = 2 } = options
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const wall of project.walls) {
      for (const panel of wall.panels) {
        const def = project.defsById.get(panel.panelDefinitionId)
        if (!def || !panel.enabled) continue
        const x = wall.xMm + panel.xMm
        const y = wall.yMm + panel.yMm
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x + def.widthMm)
        maxY = Math.max(maxY, y + def.heightMm)
      }
    }
    if (!Number.isFinite(minX)) return
    const pad = 100
    const w = (maxX - minX + pad * 2) * scale
    const h = (maxY - minY + pad * 2) * scale
    canvas.width = w
    canvas.height = h
    ctx.fillStyle = '#0b0f14'
    ctx.fillRect(0, 0, w, h)
    if (includeGrid) {
      ctx.strokeStyle = '#1e293b'
      const step = 500 * scale
      for (let x = 0; x < w; x += step) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
    }
    for (const wall of project.walls) {
      for (const panel of wall.panels) {
        const def = project.defsById.get(panel.panelDefinitionId)
        if (!def || !panel.enabled) continue
        const x = (wall.xMm + panel.xMm - minX + pad) * scale
        const y = (wall.yMm + panel.yMm - minY + pad) * scale
        ctx.fillStyle = '#1e3a8a'
        ctx.strokeStyle = '#38bdf8'
        ctx.fillRect(x, y, def.widthMm * scale, def.heightMm * scale)
        ctx.strokeRect(x, y, def.widthMm * scale, def.heightMm * scale)
        ctx.fillStyle = '#e2e8f0'
        ctx.font = `${10 * scale}px sans-serif`
        ctx.fillText(`${def.widthMm}×${def.heightMm}`, x + 4, y + 14 * scale)
      }
    }
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.project.name.replace(/\s+/g, '_')}.png`
    a.click()
  }

  function exportPdf() {
    const blob = exportProjectPdf(project.exportProject())
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.project.name.replace(/\s+/g, '_')}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return { exportPng, exportPdf }
}
