<script setup lang="ts">
import type Konva from 'konva'
import type { PanelInstance } from '#shared/types/panel'
import { occupiedSizeMm } from '#shared/types/panel'
import { useProjectStore } from '~/stores/project'

const props = defineProps<{
  panel: PanelInstance
  wallId: string
  zoom: number
  locked: boolean
  selected: boolean
  invalid: boolean
}>()

const emit = defineEmits<{
  select: [additive: boolean]
  dragStart: []
  dragMove: [xMm: number, yMm: number]
}>()

const project = useProjectStore()

const def = computed(() => project.defsById.get(props.panel.panelDefinitionId))

const size = computed(() => {
  if (!def.value) return { w: 0, h: 0 }
  const s = occupiedSizeMm(def.value, props.panel.rotation)
  return { w: s.widthMm, h: s.heightMm }
})

const rectConfig = computed(() => ({
  x: props.panel.xMm * props.zoom,
  y: props.panel.yMm * props.zoom,
  width: size.value.w * props.zoom,
  height: size.value.h * props.zoom,
  fill: props.invalid
    ? 'rgba(239,68,68,0.35)'
    : props.selected
      ? 'rgba(56,189,248,0.35)'
      : 'rgba(30,64,175,0.45)',
  stroke: props.invalid ? '#ef4444' : props.selected ? '#38bdf8' : '#1d4ed8',
  strokeWidth: props.selected ? 2 : 1,
  draggable: !props.locked && props.panel.enabled,
  rotation: props.panel.rotation
}))

function onClick(e: Konva.KonvaEventObject<MouseEvent>) {
  e.cancelBubble = true
  emit('select', e.evt.shiftKey)
}

function onDragStart() {
  emit('dragStart')
}

function onDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
  const node = e.target
  emit('dragMove', node.x() / props.zoom, node.y() / props.zoom)
}
</script>

<template>
  <v-rect
    v-if="def && panel.enabled"
    :config="rectConfig"
    @click="onClick"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  />
</template>
