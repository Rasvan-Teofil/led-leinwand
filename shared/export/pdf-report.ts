import { jsPDF } from 'jspdf'
import type { LEDWallProject } from '../types/project'
import { analyzeNativeResolution } from '../calculations/resolution'
import { getWallDimensions } from '../calculations/dimensions'
import { detectOverlaps } from '../calculations/geometry'

export function exportProjectPdf(project: LEDWallProject): Blob {
  const doc = new jsPDF()
  let y = 14
  doc.setFontSize(16)
  doc.text(`LED Wall Report: ${project.name}`, 14, y)
  y += 10
  doc.setFontSize(10)
  doc.text(`Erstellt: ${project.updatedAt}`, 14, y)
  y += 8
  const defsById = new Map(project.panelDefinitions.map(d => [d.id, d]))

  for (const wall of project.walls) {
    if (y > 260) {
      doc.addPage()
      y = 14
    }
    const dims = getWallDimensions(wall, project.panelDefinitions)
    const overlaps = detectOverlaps(wall, defsById)
    const res = analyzeNativeResolution(wall, project.panelDefinitions, overlaps.length)
    doc.setFontSize(12)
    doc.text(wall.name, 14, y)
    y += 6
    doc.setFontSize(9)
    doc.text(
      `${dims.bboxWidthMm}×${dims.bboxHeightMm} mm | ${dims.activeAreaM2.toFixed(2)} m² | ${dims.enabledPanelCount} Panels`,
      14,
      y
    )
    y += 5
    if (res.valid) {
      doc.text(`Native: ${res.resolutionX}×${res.resolutionY} px`, 14, y)
    } else {
      doc.text(`Native: n/a (${res.warnings.join(', ')})`, 14, y)
    }
    y += 8
  }

  doc.addPage()
  doc.setFontSize(12)
  doc.text('Panel-Definitionen', 14, 14)
  let py = 22
  for (const def of project.panelDefinitions.slice(0, 30)) {
    doc.setFontSize(8)
    doc.text(
      `${def.name}: ${def.widthMm}×${def.heightMm} mm, ${def.resolutionX}×${def.resolutionY} px`,
      14,
      py
    )
    py += 5
    if (py > 280) break
  }

  return doc.output('blob')
}
