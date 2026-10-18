<script setup lang="ts">
import type Konva from 'konva'
import { Group, Rect, Text, Line } from 'vue-konva'
import PanelRenderer from '~/components/canvas/PanelRenderer.vue'
import type { LEDWall } from '#shared/types/wall'
import { wallLocalBoundingBox } from '#shared/calculations/geometry'
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
}>()

const project = useProjectStore()
const editor = useEditorStore()
const bbox = computed(() =>
  wallLocalBoundingBox(props.wall, project.defsById)
)

const groupConfig = computed(() => ({
  x: props.panX + props.wall.xMm * props.zoom,
  y: props.panY + props.wall.yMm * props.zoom,
  draggable: !props.wall.locked && editor.selection.wallIds.includes(props.wall.id),
  listening: true
}))

const wallSelected = computed(() =>
  editor.selection.wallIds.includes(props.wall.id)
)

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
    widthLabel: `${bbox.value.widthMm} mm`,
    heightLabel: `${bbox.value.heightMm} mm`,
    widthText: { x: x + w / 2 - 30, y: y + h + 22 },
    heightText: { x: x - 72, y: y + h / 2 - 6 }
  }
})

function onWallClick(e: Konva.KonvaEventObject<MouseEvent>) {
  emit('selectWall', e.evt.shiftKey)
}

function onGroupDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
  const node = e.target
  const xMm = (node.x() - props.panX) / props.zoom
  const yMm = (node.y() - props.panY) / props.zoom
  project.updateWall(props.wall.id, { xMm, yMm })
}

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
    :config="groupConfig"
    @click="onWallClick"
    @dragend="onGroupDragEnd"
  >
    <Rect
      v-if="bbox"
      :config="{
        x: bbox.xMm * zoom,
        y: bbox.yMm * zoom,
        width: bbox.widthMm * zoom,
        height: bbox.heightMm * zoom,
        stroke: wallSelected ? '#38bdf8' : '#334155',
        strokeWidth: wallSelected ? 2 : 1,
        dash: [6, 4],
        fill: 'rgba(15,23,42,0.35)',
        listening: true
      }"
      @contextmenu="onWallContextMenu"
    />
    <Text
      :config="{
        x: (bbox?.xMm ?? 0) * zoom,
        y: (bbox?.yMm ?? 0) * zoom - 18,
        text: wall.name,
        fontSize: 12,
        fill: '#94a3b8',
        listening: false
      }"
    />
    <template v-if="dimensionOverlay">
      <Line
        :config="{
          points: dimensionOverlay.hLine,
          stroke: '#64748b',
          strokeWidth: 1,
          listening: false
        }"
      />
      <Line
        :config="{
          points: dimensionOverlay.vLine,
          stroke: '#64748b',
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
          fill: '#94a3b8',
          listening: false
        }"
      />
      <Text
        :config="{
          x: dimensionOverlay.heightText.x,
          y: dimensionOverlay.heightText.y,
          text: dimensionOverlay.heightLabel,
          fontSize: 11,
          fill: '#94a3b8',
          listening: false
        }"
      />
    </template>
    <PanelRenderer
      v-for="panel in wall.panels"
      :key="panel.id"
      :panel="panel"
      :wall-id="wall.id"
      :zoom="zoom"
      :locked="wall.locked"
      :selected="editor.selection.panelIds.includes(panel.id)"
      :invalid="overlapIds.has(panel.id)"
      @select="(additive) => emit('selectPanel', panel.id, additive)"
      @drag-start="emit('panelDragStart', panel.id)"
      @drag-move="(x, y) => emit('panelDragMove', panel.id, x, y)"
      @context-menu="(evt) => onPanelContext(panel.id, evt)"
    />
  </Group>
</template>
