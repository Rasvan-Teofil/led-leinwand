<script setup lang="ts">
import type Konva from 'konva'
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
  dropPanel: [screenX: number, screenY: number]
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

function onWallClick(e: Konva.KonvaEventObject<MouseEvent>) {
  emit('selectWall', e.evt.shiftKey)
}

function onWallDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
  const node = e.target
  const xMm = (node.x() - props.panX) / props.zoom
  const yMm = (node.y() - props.panY) / props.zoom
  project.updateWall(props.wall.id, { xMm, yMm })
}

function onGroupDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
  onWallDragEnd(e)
}
</script>

<template>
  <v-group
    :config="groupConfig"
    @click="onWallClick"
    @dragend="onGroupDragEnd"
  >
    <v-rect
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
    />
    <v-text
      :config="{
        x: (bbox?.xMm ?? 0) * zoom,
        y: (bbox?.yMm ?? 0) * zoom - 18,
        text: wall.name,
        fontSize: 12,
        fill: '#94a3b8',
        listening: false
      }"
    />
    <CanvasPanelRenderer
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
    />
  </v-group>
</template>
