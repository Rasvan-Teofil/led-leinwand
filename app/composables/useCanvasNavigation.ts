import { useEditorStore } from '~/stores/editor'

export function useCanvasNavigation() {
  const editor = useEditorStore()

  function zoomAt(screenX: number, screenY: number, factor: number) {
    const oldZoom = editor.zoom
    const newZoom = Math.min(2, Math.max(0.01, oldZoom * factor))
    const worldX = (screenX - editor.panX) / oldZoom
    const worldY = (screenY - editor.panY) / oldZoom
    editor.panX = screenX - worldX * newZoom
    editor.panY = screenY - worldY * newZoom
    editor.setZoom(newZoom)
  }

  function fitToContent(
    bbox: { x: number, y: number, width: number, height: number } | null,
    viewportWidth: number,
    viewportHeight: number,
    padding = 80
  ) {
    if (!bbox || bbox.width <= 0 || bbox.height <= 0) return
    const scaleX = (viewportWidth - padding * 2) / bbox.width
    const scaleY = (viewportHeight - padding * 2) / bbox.height
    const zoom = Math.min(scaleX, scaleY, 0.5)
    editor.setZoom(zoom)
    editor.setPan(
      padding - bbox.x * zoom + (viewportWidth - padding * 2 - bbox.width * zoom) / 2,
      padding - bbox.y * zoom + (viewportHeight - padding * 2 - bbox.height * zoom) / 2
    )
  }

  function resetView() {
    editor.setZoom(0.08)
    editor.setPan(80, 80)
  }

  return { zoomAt, fitToContent, resetView }
}
