<script setup lang="ts">
import type Konva from 'konva'
import { Stage, Layer } from 'vue-konva'
import CanvasGrid from '~/components/canvas/CanvasGrid.vue'
import WallRenderer from '~/components/canvas/WallRenderer.vue'
import CanvasContextMenu from '~/components/canvas/CanvasContextMenu.vue'
import { detectOverlaps, snapValue, unionBoundingBox } from '#shared/calculations/geometry'
import { occupiedSizeMm } from '#shared/types/panel'
import { useCanvasNavigation } from '~/composables/useCanvasNavigation'
import { useEditorStore } from '~/stores/editor'
import { useHistoryStore } from '~/stores/history'
import { useProjectStore } from '~/stores/project'

const emit = defineEmits<{ ready: [] }>()

const project = useProjectStore()
const editor = useEditorStore()
const history = useHistoryStore()
const { zoomAt, fitToContent, resetView } = useCanvasNavigation()

const containerRef = ref<HTMLDivElement | null>(null)
const isClient = ref(false)
const stageMounted = ref(false)
const stageConfig = reactive({
  width: 800,
  height: 600
})

const isPanning = ref(false)
const panStart = { x: 0, y: 0, panX: 0, panY: 0 }
const dragPanelStart = ref<{ wallId: string, panelId: string, x: number, y: number } | null>(null)

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

watch(
  () => [project.walls.length, project.walls.reduce((n, w) => n + w.panels.length, 0)],
  () => {
    if (stageMounted.value) {
      nextTick(() => fitAll())
    }
  }
)

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
  if (isMiddle || editor.spacePanning) {
    isPanning.value = true
    panStart.x = e.evt.clientX
    panStart.y = e.evt.clientY
    panStart.panX = editor.panX
    panStart.panY = editor.panY
    return
  }
  if (e.target === stage) {
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
  if (dragPanelStart.value) {
    history.pushHistory()
    dragPanelStart.value = null
  }
}

function onPanelDragStart(wallId: string, panelId: string) {
  history.pushHistory()
  dragPanelStart.value = { wallId, panelId, x: 0, y: 0 }
}

function onPanelDragMove(
  wallId: string,
  panelId: string,
  xMm: number,
  yMm: number
) {
  let nx = xMm
  let ny = yMm
  if (editor.preferences.snapEnabled) {
    nx = snapValue(nx, editor.preferences.snapMm)
    ny = snapValue(ny, editor.preferences.snapMm)
  }
  project.movePanel(wallId, panelId, nx, ny)
}

defineExpose({ fitAll, resetView })
</script>

<template>
  <div
    ref="containerRef"
    class="relative h-full min-h-0 w-full flex-1 bg-[#0b0f14]"
    data-testid="canvas-container"
    @dragover.prevent
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
        />
      </Layer>
    </Stage>

    <div
      class="pointer-events-none absolute bottom-3 left-3 flex gap-2 text-xs text-muted"
    >
      <span class="rounded bg-elevated/90 px-2 py-1">{{ Math.round(editor.zoom * 100) }}%</span>
      <span
        v-if="editor.preferences.snapEnabled"
        class="rounded bg-elevated/90 px-2 py-1"
      >Snap {{ editor.preferences.snapMm }} mm</span>
    </div>

    <div class="absolute bottom-3 right-3 flex gap-1">
      <UButton
        size="xs"
        variant="soft"
        icon="i-lucide-maximize"
        @click="fitAll"
      />
      <UButton
        size="xs"
        variant="soft"
        icon="i-lucide-rotate-ccw"
        @click="resetView"
      />
      <UButton
        size="xs"
        variant="soft"
        :icon="editor.preferences.gridVisible ? 'i-lucide-grid-3x3' : 'i-lucide-grid-2x2'"
        @click="editor.toggleGrid()"
      />
      <UButton
        size="xs"
        variant="soft"
        icon="i-lucide-magnet"
        :color="editor.preferences.snapEnabled ? 'primary' : 'neutral'"
        @click="editor.toggleSnap()"
      />
    </div>
    <CanvasContextMenu />
  </div>
</template>
