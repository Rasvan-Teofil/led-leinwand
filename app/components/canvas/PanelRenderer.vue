<script setup lang="ts">
import type Konva from 'konva'
import { Rect } from 'vue-konva'
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
  contextMenu: [evt: MouseEvent]
}>()

const project = useProjectStore()

const def = computed(() => project.defsById.get(props.panel.panelDefinitionId))

const rectConfig = computed(() => {
  if (!def.value) return null
  const occ = occupiedSizeMm(def.value, props.panel.rotation)
  const unrotW = def.value.widthMm * props.zoom
  const unrotH = def.value.heightMm * props.zoom
  const occW = occ.widthMm * props.zoom
  const occH = occ.heightMm * props.zoom
  return {
    x: props.panel.xMm * props.zoom + occW / 2,
    y: props.panel.yMm * props.zoom + occH / 2,
    offsetX: unrotW / 2,
    offsetY: unrotH / 2,
    width: unrotW,
    height: unrotH,
    rotation: props.panel.rotation,
    fill: props.invalid
      ? 'rgba(239,68,68,0.35)'
      : props.selected
        ? 'rgba(56,189,248,0.35)'
        : 'rgba(30,64,175,0.45)',
    stroke: props.invalid ? '#ef4444' : props.selected ? '#38bdf8' : '#1d4ed8',
    strokeWidth: props.selected ? 2 : 1,
    draggable: !props.locked && props.panel.enabled
  }
})

function onClick(e: Konva.KonvaEventObject<MouseEvent>) {
  e.cancelBubble = true
  if (e.target.getStage()?.isDragging?.()) return
  emit('select', e.evt.shiftKey)
}

function onDragStart() {
  emit('dragStart')
}

function onDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
  if (!def.value) return
  const node = e.target
  const occ = occupiedSizeMm(def.value, props.panel.rotation)
  const cx = node.x() / props.zoom
  const cy = node.y() / props.zoom
  emit('dragMove', cx - occ.widthMm / 2, cy - occ.heightMm / 2)
}

function onContextMenu(e: Konva.KonvaEventObject<PointerEvent>) {
  e.evt.preventDefault()
  e.cancelBubble = true
  emit('contextMenu', e.evt as MouseEvent)
}
</script>

<template>
  <Rect
    v-if="def && panel.enabled && rectConfig"
    :config="rectConfig"
    @click="onClick"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @contextmenu="onContextMenu"
  />
</template>
