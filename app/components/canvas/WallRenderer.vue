<script setup lang="ts">
import type Konva from 'konva'
import { Group, Rect, Text, Line, Image as KonvaImage, useImage } from 'vue-konva'
import PanelRenderer from '~/components/canvas/PanelRenderer.vue'
import { useTestPatternCache } from '~/composables/useTestPatternCache'
import type { LEDWall } from '#shared/types/wall'
import { wallLocalBoundingBox } from '#shared/calculations/geometry'
import { formatMmDe } from '#shared/format/de-de'
import { useEditorStore } from '~/stores/editor'
import { useProjectStore } from '~/stores/project'

const props = defineProps<{
  wall: LEDWall
  zoom: number
  panX: number
  panY: number
  overlapIds: Set<string>
}>()

const emit = defineEmits<{
  selectWall: [additive: boolean]
  selectPanel: [panelId: string, additive: boolean]
  panelDragStart: [panelId: string]
  panelDragMove: [panelId: string, xMm: number, yMm: number]
  panelDragEnd: [panelId: string, xMm: number, yMm: number]
  wallDragStart: []
  wallDragMove: [xMm: number, yMm: number]
  wallDragEnd: [xMm: number, yMm: number]
}>()

const project = useProjectStore()
const editor = useEditorStore()
const { getWallPatternUrl } = useTestPatternCache()
const groupRef = ref<{ getNode: () => Konva.Group } | null>(null)

const patternUrl = computed(() => {
  if (!props.wall.testPatternEnabled) return ''
  return getWallPatternUrl(props.wall) ?? ''
})
const [patternImage] = useImage(patternUrl)

const bbox = computed(() =>
  wallLocalBoundingBox(props.wall, project.defsById)
)

const wallSelected = computed(() =>
  editor.selection.wallIds.includes(props.wall.id)
)

const panelsPaintOrder = computed(() => {
  const selected = new Set(editor.selection.panelIds)
  const rest = props.wall.panels.filter(p => !selected.has(p.id))
  const sel = props.wall.panels.filter(p => selected.has(p.id))
  return [...rest, ...sel]
})

const groupConfig = computed(() => ({
  x: props.panX + props.wall.xMm * props.zoom,
  y: props.panY + props.wall.yMm * props.zoom,
  draggable: false,
  listening: editor.canManipulateObjects
}))

const dimensionOverlay = computed(() => {
  if (!bbox.value || !wallSelected.value) return null
  const z = props.zoom
  const x = bbox.value.xMm * z
  const y = bbox.value.yMm * z
  const w = bbox.value.widthMm * z
  const h = bbox.value.heightMm * z
  return {
    hLine: [x, y + h + 16, x + w, y + h + 16],
    vLine: [x - 16, y, x - 16, y + h],
    widthLabel: formatMmDe(bbox.value.widthMm),
    heightLabel: formatMmDe(bbox.value.heightMm),
    widthText: { x: x + w / 2 - 30, y: y + h + 22 },
    heightText: { x: x - 72, y: y + h / 2 - 6 }
  }
})

function onWallClick(e: Konva.KonvaEventObject<MouseEvent>) {
  if (editor.handPanActive) return
  e.cancelBubble = true
  if (e.target.getStage()?.isDragging?.()) return
  emit('selectWall', e.evt.shiftKey)
}

function localOriginFromNode(node: Konva.Node) {
  return {
    xMm: (node.x() - props.panX) / props.zoom,
    yMm: (node.y() - props.panY) / props.zoom
  }
}

function onHandleMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
  if (!editor.canManipulateObjects || props.wall.locked) return
  e.cancelBubble = true
  emit('selectWall', false)
  groupRef.value?.getNode()?.startDrag()
}

function onWallDragStart() {
  emit('selectWall', false)
  emit('wallDragStart')
}

function onWallDragMove(e: Konva.KonvaEventObject<DragEvent>) {
  const pos = localOriginFromNode(e.target)
  emit('wallDragMove', pos.xMm, pos.yMm)
}

function onWallDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
  const pos = localOriginFromNode(e.target)
  emit('wallDragEnd', pos.xMm, pos.yMm)
}

watch(
  () => [props.wall.xMm, props.wall.yMm],
  () => {
    const node = groupRef.value?.getNode()
    if (!node || !editor.canvasDraggingWall) return
    node.position({
      x: props.panX + props.wall.xMm * props.zoom,
      y: props.panY + props.wall.yMm * props.zoom
    })
  }
)

function onWallContextMenu(e: Konva.KonvaEventObject<PointerEvent>) {
  e.evt.preventDefault()
  editor.contextMenu = {
    x: e.evt.clientX,
    y: e.evt.clientY,
    wallId: props.wall.id
  }
  emit('selectWall', false)
}

function onPanelContext(panelId: string, evt: MouseEvent) {
  editor.contextMenu = {
    x: evt.clientX,
    y: evt.clientY,
    wallId: props.wall.id,
    panelId
  }
  editor.selectPanel(props.wall.id, panelId)
}
</script>

<template>
  <Group
    ref="groupRef"
    :config="groupConfig"
    @click="onWallClick"
    @dragstart="onWallDragStart"
    @dragmove="onWallDragMove"
    @dragend="onWallDragEnd"
  >
    <Rect
      v-if="bbox"
      :config="{
        x: bbox.xMm * zoom,
        y: bbox.yMm * zoom,
        width: bbox.widthMm * zoom,
        height: bbox.heightMm * zoom,
        stroke: wallSelected ? '#ffffff' : '#525252',
        strokeWidth: wallSelected ? 2 : 1,
        dash: wallSelected ? [] : [6, 4],
        fill: wallSelected
          ? (wall.testPatternEnabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.12)')
          : (wall.testPatternEnabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)'),
        strokeScaleEnabled: false,
        listening: true,
        name: 'wall-frame'
      }"
      @contextmenu="onWallContextMenu"
    />
    <KonvaImage
      v-if="bbox && patternImage && wall.testPatternEnabled"
      :config="{
        x: bbox.xMm * zoom,
        y: bbox.yMm * zoom,
        width: bbox.widthMm * zoom,
        height: bbox.heightMm * zoom,
        image: patternImage,
        listening: false,
        opacity: 0.92
      }"
    />
    <Rect
      v-if="bbox && wallSelected"
      :config="{
        x: bbox.xMm * zoom,
        y: bbox.yMm * zoom,
        width: bbox.widthMm * zoom,
        height: bbox.heightMm * zoom,
        stroke: '#ffffff',
        strokeWidth: 2,
        dash: [6, 4],
        fill: 'rgba(255,255,255,0.08)',
        listening: false,
        strokeScaleEnabled: false
      }"
    />
    <Rect
      v-if="bbox"
      :config="{
        x: bbox.xMm * zoom,
        y: bbox.yMm * zoom - 22,
        width: Math.min(160, bbox.widthMm * zoom),
        height: 18,
        fill: 'rgba(255,255,255,0.06)',
        stroke: wallSelected ? '#ffffff' : '#525252',
        strokeWidth: 1,
        listening: true,
        name: 'wall-drag-handle'
      }"
      @mousedown="onHandleMouseDown"
    />
    <Text
      :config="{
        x: (bbox?.xMm ?? 0) * zoom + 6,
        y: (bbox?.yMm ?? 0) * zoom - 18,
        text: wall.name,
        fontSize: 11,
        fill: '#a3a3a3',
        listening: false
      }"
    />
    <template v-if="dimensionOverlay">
      <Line
        :config="{
          points: dimensionOverlay.hLine,
          stroke: '#737373',
          strokeWidth: 1,
          listening: false
        }"
      />
      <Line
        :config="{
          points: dimensionOverlay.vLine,
          stroke: '#737373',
          strokeWidth: 1,
          listening: false
        }"
      />
      <Text
        :config="{
          x: dimensionOverlay.widthText.x,
          y: dimensionOverlay.widthText.y,
          text: dimensionOverlay.widthLabel,
          fontSize: 11,
          fill: '#a3a3a3',
          listening: false
        }"
      />
      <Text
        :config="{
          x: dimensionOverlay.heightText.x,
          y: dimensionOverlay.heightText.y,
          text: dimensionOverlay.heightLabel,
          fontSize: 11,
          fill: '#a3a3a3',
          listening: false
        }"
      />
    </template>
    <PanelRenderer
      v-for="panel in panelsPaintOrder"
      :key="panel.id"
      :panel="panel"
      :wall-id="wall.id"
      :zoom="zoom"
      :locked="wall.locked"
      :test-pattern-active="wall.testPatternEnabled"
      :selected="editor.selection.panelIds.includes(panel.id)"
      :invalid="overlapIds.has(panel.id)"
      @select="(additive) => emit('selectPanel', panel.id, additive)"
      @drag-start="emit('panelDragStart', panel.id)"
      @drag-move="(x, y) => emit('panelDragMove', panel.id, x, y)"
      @drag-end="(x, y) => emit('panelDragEnd', panel.id, x, y)"
      @context-menu="(evt) => onPanelContext(panel.id, evt)"
    />
  </Group>
</template>
