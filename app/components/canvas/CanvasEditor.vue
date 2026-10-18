<script setup lang="ts">
import type Konva from 'konva'
import { Stage, Layer } from 'vue-konva'
import CanvasGrid from '~/components/canvas/CanvasGrid.vue'
import WallRenderer from '~/components/canvas/WallRenderer.vue'
import CanvasContextMenu from '~/components/canvas/CanvasContextMenu.vue'
import { detectOverlaps, unionBoundingBox } from '#shared/calculations/geometry'
import { occupiedSizeMm } from '#shared/types/panel'
import SnapGuidesLayer from '~/components/canvas/SnapGuidesLayer.vue'
import { useCanvasNavigation } from '~/composables/useCanvasNavigation'
import { usePanelSnap } from '~/composables/usePanelSnap'
import { snapWallOriginMm } from '#shared/calculations/wall-snap'
import { useEditorStore } from '~/stores/editor'
import { useHistoryStore } from '~/stores/history'
import { useProjectStore } from '~/stores/project'
import { useAddPanelFromLibrary } from '~/composables/useAddPanelFromLibrary'
import { useWallLayoutMode } from '~/composables/useWallLayoutMode'

const emit = defineEmits<{ ready: [] }>()

const project = useProjectStore()
const editor = useEditorStore()
const history = useHistoryStore()
const { zoomAt, fitToContent, resetView } = useCanvasNavigation()
const { snapOnWallLocal, snapFromPointerClient, isWorldTopLeftFree } = usePanelSnap()
const { addDefinitionToWall } = useAddPanelFromLibrary()
const { ensureManualLayout } = useWallLayoutMode()

const containerRef = ref<HTMLDivElement | null>(null)
const isClient = ref(false)
const stageMounted = ref(false)
const stageConfig = reactive({
  width: 800,
  height: 600
})

const isPanning = ref(false)
const panStart = { x: 0, y: 0, panX: 0, panY: 0 }
const dragPanelStart = ref<{
  wallId: string
  panelId: string
  originLocalXMm: number
  originLocalYMm: number
} | null>(null)
const dragWallStart = ref<{
  wallId: string
  originXMm: number
  originYMm: number
} | null>(null)

let resizeObserver: ResizeObserver | null = null

function resizeStage() {
  if (!containerRef.value) return
  const w = containerRef.value.clientWidth
  const h = containerRef.value.clientHeight
  if (w < 1 || h < 1) return
  stageConfig.width = w
  stageConfig.height = h
}

function fitAll() {
  resizeStage()
  const rects = project.walls.flatMap(wall =>
    wall.panels
      .filter(p => p.enabled)
      .map((p) => {
        const def = project.defsById.get(p.panelDefinitionId)
        if (!def) return null
        const size = occupiedSizeMm(def, p.rotation)
        return {
          xMm: wall.xMm + p.xMm,
          yMm: wall.yMm + p.yMm,
          widthMm: size.widthMm,
          heightMm: size.heightMm
        }
      })
      .filter(Boolean)
  )
  const bbox = unionBoundingBox(rects as { xMm: number, yMm: number, widthMm: number, heightMm: number }[])
  if (!bbox) return
  fitToContent(
    {
      x: bbox.xMm,
      y: bbox.yMm,
      width: bbox.widthMm,
      height: bbox.heightMm
    },
    stageConfig.width,
    stageConfig.height
  )
}

function onStageMounted() {
  stageMounted.value = true
  resizeStage()
  fitAll()
  emit('ready')
}

onMounted(() => {
  isClient.value = true
  resizeStage()
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      resizeStage()
    })
    resizeObserver.observe(containerRef.value)
  }
  requestAnimationFrame(() => {
    resizeStage()
    if (stageMounted.value) fitAll()
  })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

const layoutSignature = computed(
  () => `${project.walls.length}:${project.walls.reduce((n, w) => n + w.panels.length, 0)}`
)
watch(layoutSignature, (next, prev) => {
  if (next !== prev && stageMounted.value) {
    nextTick(() => fitAll())
  }
})

const visibleWalls = computed(() =>
  project.walls.filter(w => w.visible)
)

const overlapSet = computed(() => {
  const set = new Set<string>()
  for (const wall of project.walls) {
    for (const pair of detectOverlaps(wall, project.defsById)) {
      set.add(pair.panelAId)
      set.add(pair.panelBId)
    }
  }
  return set
})

function onWheel(e: Konva.KonvaEventObject<WheelEvent>) {
  e.evt.preventDefault()
  const stage = e.target.getStage()
  if (!stage) return
  const pointer = stage.getPointerPosition()
  if (!pointer) return
  const factor = e.evt.deltaY > 0 ? 0.9 : 1.1
  zoomAt(pointer.x, pointer.y, factor)
}

function onStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
  const stage = e.target.getStage()
  if (!stage) return
  const isMiddle = e.evt.button === 1
  const hand = editor.handPanActive
  if (isMiddle || hand) {
    isPanning.value = true
    panStart.x = e.evt.clientX
    panStart.y = e.evt.clientY
    panStart.panX = editor.panX
    panStart.panY = editor.panY
    return
  }
  if (e.target === stage && !editor.canvasDragging && !editor.canvasDraggingWall) {
    editor.clearSelection()
  }
}

function onStageMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
  if (!isPanning.value) return
  editor.setPan(
    panStart.panX + (e.evt.clientX - panStart.x),
    panStart.panY + (e.evt.clientY - panStart.y)
  )
}

function onStageMouseUp() {
  isPanning.value = false
}

function onPanelDragStart(wallId: string, panelId: string) {
  const wall = project.walls.find(w => w.id === wallId)
  const panel = wall?.panels.find(p => p.id === panelId)
  if (!wall || !panel) return
  ensureManualLayout(wallId)
  history.beginDrag()
  editor.canvasDragging = true
  dragPanelStart.value = {
    wallId,
    panelId,
    originLocalXMm: panel.xMm,
    originLocalYMm: panel.yMm
  }
}

function applyPanelPosition(
  fromWallId: string,
  panelId: string,
  localXMm: number,
  localYMm: number
) {
  let wall = project.walls.find(w => w.id === fromWallId)
  let panel = wall?.panels.find(p => p.id === panelId)
  if (!panel) {
    for (const w of project.walls) {
      const p = w.panels.find(pp => pp.id === panelId)
      if (p) {
        wall = w
        panel = p
        break
      }
    }
  }
  if (!wall || !panel) return
  const origin = dragPanelStart.value?.panelId === panelId
    ? {
        xMm: dragPanelStart.value.originLocalXMm,
        yMm: dragPanelStart.value.originLocalYMm
      }
    : { xMm: panel.xMm, yMm: panel.yMm }
  const def = project.defsById.get(panel.panelDefinitionId)
  if (!def) return
  const size = occupiedSizeMm(def, panel.rotation)

  let snapped = snapOnWallLocal(
    fromWallId,
    localXMm,
    localYMm,
    panel.panelDefinitionId,
    panel.rotation,
    panelId,
    origin
  )
  const targetWall = project.walls.find(w => w.id === snapped.wallId) ?? wall
  const worldX = targetWall.xMm + snapped.localXMm
  const worldY = targetWall.yMm + snapped.localYMm
  if (
    !isWorldTopLeftFree(worldX, worldY, size.widthMm, size.heightMm, panelId)
  ) {
    snapped = {
      wallId: fromWallId,
      localXMm: origin.xMm,
      localYMm: origin.yMm,
      guides: [],
      mode: 'none'
    }
  }
  editor.setSnapGuides(snapped.guides)

  const currentHost = project.walls.find(w =>
    w.panels.some(p => p.id === panelId)
  )
  const hostId = currentHost?.id ?? fromWallId

  if (snapped.wallId === hostId) {
    project.movePanel(hostId, panelId, snapped.localXMm, snapped.localYMm)
  } else {
    project.movePanelToWall(
      hostId,
      panelId,
      snapped.wallId,
      snapped.localXMm,
      snapped.localYMm
    )
    editor.selectPanel(snapped.wallId, panelId)
  }
}

function onPanelDragMove(
  wallId: string,
  panelId: string,
  xMm: number,
  yMm: number
) {
  applyPanelPosition(wallId, panelId, xMm, yMm)
}

function onPanelDragEnd(
  wallId: string,
  panelId: string,
  xMm: number,
  yMm: number
) {
  applyPanelPosition(wallId, panelId, xMm, yMm)
  history.endDrag()
  dragPanelStart.value = null
  editor.canvasDragging = false
  editor.clearSnapGuides()
}

function onCanvasDragOver(e: DragEvent) {
  e.preventDefault()
  const defId = editor.dragPanelDefinitionId
  if (!defId) return
  const def = project.defsById.get(defId)
  if (!def) return
  const placement = snapFromPointerClient(e.clientX, e.clientY, defId, 0)
  if (!placement) return
  const size = occupiedSizeMm(def, 0)
  editor.libraryDropPreview = {
    wallId: placement.wallId,
    localXMm: placement.localXMm,
    localYMm: placement.localYMm,
    widthMm: size.widthMm,
    heightMm: size.heightMm
  }
  editor.setSnapGuides(placement.guides)
}

function onCanvasDrop(e: DragEvent) {
  e.preventDefault()
  const fromTransfer = e.dataTransfer?.getData('text/plain')
  const defId = editor.dragPanelDefinitionId ?? fromTransfer ?? null
  editor.libraryDropPreview = null
  editor.clearSnapGuides()
  if (!defId) {
    editor.dragPanelDefinitionId = null
    return
  }
  addDefinitionToWall(defId, { clientX: e.clientX, clientY: e.clientY })
  editor.dragPanelDefinitionId = null
}

function applyWallPosition(wallId: string, xMm: number, yMm: number) {
  const wall = project.walls.find(w => w.id === wallId)
  if (!wall) return
  const origin = dragWallStart.value?.wallId === wallId
    ? { xMm: dragWallStart.value.originXMm, yMm: dragWallStart.value.originYMm }
    : { xMm: wall.xMm, yMm: wall.yMm }
  const snapOn = editor.preferences.snapEnabled && !editor.snapOverrideDisabled
  const snapped = snapWallOriginMm(
    wall,
    xMm,
    yMm,
    project.walls,
    project.defsById,
    editor.zoom,
    snapOn,
    editor.preferences.snapMm,
    origin
  )
  editor.setSnapGuides(snapped.guides)
  project.updateWall(wallId, { xMm: snapped.xMm, yMm: snapped.yMm })
}

function onWallDragStart(wallId: string) {
  const wall = project.walls.find(w => w.id === wallId)
  if (!wall) return
  history.beginDrag()
  editor.canvasDraggingWall = true
  dragWallStart.value = {
    wallId,
    originXMm: wall.xMm,
    originYMm: wall.yMm
  }
}

function onWallDragMove(wallId: string, xMm: number, yMm: number) {
  applyWallPosition(wallId, xMm, yMm)
}

function onWallDragEnd(wallId: string, xMm: number, yMm: number) {
  applyWallPosition(wallId, xMm, yMm)
  history.endDrag()
  dragWallStart.value = null
  editor.canvasDraggingWall = false
  editor.clearSnapGuides()
}

function onCanvasDragLeave() {
  editor.libraryDropPreview = null
  if (!editor.canvasDragging) {
    editor.clearSnapGuides()
  }
}

function onDocumentDragOver(e: DragEvent) {
  if (!editor.dragPanelDefinitionId && !e.dataTransfer?.types.includes('text/plain')) {
    return
  }
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  if (
    e.clientX < rect.left
    || e.clientX > rect.right
    || e.clientY < rect.top
    || e.clientY > rect.bottom
  ) {
    return
  }
  onCanvasDragOver(e)
}

function onDocumentDrop(e: DragEvent) {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  if (
    e.clientX < rect.left
    || e.clientX > rect.right
    || e.clientY < rect.top
    || e.clientY > rect.bottom
  ) {
    return
  }
  onCanvasDrop(e)
}

onMounted(() => {
  document.addEventListener('dragover', onDocumentDragOver, true)
  document.addEventListener('drop', onDocumentDrop, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('dragover', onDocumentDragOver, true)
  document.removeEventListener('drop', onDocumentDrop, true)
})

defineExpose({ fitAll, resetView })
</script>

<template>
  <div
    ref="containerRef"
    class="relative h-full min-h-0 w-full flex-1 bg-[var(--app-canvas)]"
    :class="[
      (editor.handPanActive || isPanning) ? 'cursor-grab' : '',
      isPanning ? 'cursor-grabbing' : ''
    ]"
    data-testid="canvas-container"
    @dragover.capture.prevent="onCanvasDragOver"
    @drop.capture.prevent="onCanvasDrop"
    @dragleave="onCanvasDragLeave"
  >
    <Stage
      v-if="isClient"
      :config="stageConfig"
      data-testid="konva-stage"
      @wheel="onWheel"
      @mousedown="onStageMouseDown"
      @mousemove="onStageMouseMove"
      @mouseup="onStageMouseUp"
      @vue:mounted="onStageMounted"
    >
      <Layer>
        <CanvasGrid
          :width="stageConfig.width"
          :height="stageConfig.height"
          :zoom="editor.zoom"
          :pan-x="editor.panX"
          :pan-y="editor.panY"
          :visible="editor.preferences.gridVisible"
          :grid-mm="editor.preferences.snapMm"
        />
      </Layer>
      <Layer>
        <WallRenderer
          v-for="wall in visibleWalls"
          :key="wall.id"
          :wall="wall"
          :zoom="editor.zoom"
          :pan-x="editor.panX"
          :pan-y="editor.panY"
          :overlap-ids="overlapSet"
          @select-wall="(additive) => editor.selectWall(wall.id, additive)"
          @select-panel="(panelId, additive) => editor.selectPanel(wall.id, panelId, additive)"
          @panel-drag-start="onPanelDragStart(wall.id, $event)"
          @panel-drag-move="(panelId: string, x: number, y: number) => onPanelDragMove(wall.id, panelId, x, y)"
          @panel-drag-end="(panelId: string, x: number, y: number) => onPanelDragEnd(wall.id, panelId, x, y)"
          @wall-drag-start="onWallDragStart(wall.id)"
          @wall-drag-move="(x, y) => onWallDragMove(wall.id, x, y)"
          @wall-drag-end="(x, y) => onWallDragEnd(wall.id, x, y)"
        />
      </Layer>
      <Layer>
        <SnapGuidesLayer
          :zoom="editor.zoom"
          :pan-x="editor.panX"
          :pan-y="editor.panY"
        />
      </Layer>
    </Stage>

    <div
      class="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1.5 shadow-lg"
      data-testid="canvas-floating-toolbar"
    >
      <UButton
        size="xs"
        :variant="editor.canvasTool === 'select' ? 'soft' : 'ghost'"
        icon="i-lucide-mouse-pointer-2"
        title="Auswahl (V)"
        data-testid="tool-select"
        :class="editor.canvasTool === 'select' ? 'view-tab-active' : ''"
        @click="editor.setCanvasTool('select')"
      />
      <UButton
        size="xs"
        :variant="editor.canvasTool === 'hand' ? 'soft' : 'ghost'"
        icon="i-lucide-hand"
        title="Hand (H)"
        data-testid="tool-hand"
        :class="editor.canvasTool === 'hand' ? 'view-tab-active' : ''"
        @click="editor.setCanvasTool('hand')"
      />
      <span class="mx-1 h-5 w-px bg-[var(--app-border)]" />
      <span
        data-testid="zoom-indicator"
        class="min-w-[3rem] px-2 text-center text-xs text-[var(--app-muted)]"
      >{{ Math.round(editor.zoom * 100) }}%</span>
      <UButton
        size="xs"
        variant="ghost"
        icon="i-lucide-maximize"
        data-testid="canvas-fit-all"
        @click="fitAll"
      />
      <UButton
        size="xs"
        variant="ghost"
        icon="i-lucide-rotate-ccw"
        @click="resetView"
      />
      <UButton
        size="xs"
        variant="ghost"
        :icon="editor.preferences.gridVisible ? 'i-lucide-grid-3x3' : 'i-lucide-grid-2x2'"
        @click="editor.toggleGrid()"
      />
      <UButton
        size="xs"
        variant="ghost"
        icon="i-lucide-magnet"
        :class="editor.preferences.snapEnabled ? 'view-tab-active' : ''"
        @click="editor.toggleSnap()"
      />
    </div>
    <CanvasContextMenu />
  </div>
</template>
