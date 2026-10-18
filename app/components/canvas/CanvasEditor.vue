<script setup lang="ts">
import type Konva from 'konva'
import { detectOverlaps, snapValue, unionBoundingBox } from '#shared/calculations/geometry'
import { occupiedSizeMm } from '#shared/types/panel'
import { useCanvasNavigation } from '~/composables/useCanvasNavigation'
import { useEditorStore } from '~/stores/editor'
import { useHistoryStore } from '~/stores/history'
import { useProjectStore } from '~/stores/project'

const project = useProjectStore()
const editor = useEditorStore()
const history = useHistoryStore()
const { zoomAt, fitToContent, resetView } = useCanvasNavigation()

const containerRef = ref<HTMLDivElement | null>(null)
const stageConfig = reactive({
  width: 800,
  height: 600
})

const isPanning = ref(false)
const panStart = { x: 0, y: 0, panX: 0, panY: 0 }
const dragPanelStart = ref<{ wallId: string, panelId: string, x: number, y: number } | null>(null)

function resizeStage() {
  if (!containerRef.value) return
  stageConfig.width = containerRef.value.clientWidth
  stageConfig.height = containerRef.value.clientHeight
}

onMounted(() => {
  resizeStage()
  window.addEventListener('resize', resizeStage)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeStage)
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

function screenToWorld(x: number, y: number) {
  return {
    x: (x - editor.panX) / editor.zoom,
    y: (y - editor.panY) / editor.zoom
  }
}

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

function onDropPanel(wallId: string, screenX: number, screenY: number) {
  const defId = editor.dragPanelDefinitionId
  if (!defId) return
  const wall = project.walls.find(w => w.id === wallId)
  const def = project.defsById.get(defId)
  if (!wall || !def || wall.locked) return
  const world = screenToWorld(screenX, screenY)
  let x = world.x - wall.xMm - def.widthMm / 2
  let y = world.y - wall.yMm - def.heightMm / 2
  if (editor.preferences.snapEnabled) {
    x = snapValue(x, editor.preferences.snapMm)
    y = snapValue(y, editor.preferences.snapMm)
  }
  history.pushHistory()
  const id = project.addPanel(wallId, defId, x, y)
  if (id) editor.selectPanel(wallId, id)
  editor.dragPanelDefinitionId = null
  history.pushHistory()
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

function fitAll() {
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

defineExpose({ fitAll, resetView })
</script>

<template>
  <div
    ref="containerRef"
    class="relative h-full min-h-0 flex-1 bg-[#0b0f14]"
    @dragover.prevent
  >
    <ClientOnly>
      <v-stage
        :config="stageConfig"
        @wheel="onWheel"
        @mousedown="onStageMouseDown"
        @mousemove="onStageMouseMove"
        @mouseup="onStageMouseUp"
      >
        <v-layer>
          <CanvasCanvasGrid
            :width="stageConfig.width"
            :height="stageConfig.height"
            :zoom="editor.zoom"
            :pan-x="editor.panX"
            :pan-y="editor.panY"
            :visible="editor.preferences.gridVisible"
            :grid-mm="editor.preferences.snapMm"
          />
        </v-layer>
        <v-layer>
          <CanvasWallRenderer
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
            @panel-drag-move="(panelId, x, y) => onPanelDragMove(wall.id, panelId, x, y)"
            @drop-panel="(x, y) => onDropPanel(wall.id, x, y)"
          />
        </v-layer>
      </v-stage>
    </ClientOnly>

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
  </div>
</template>
