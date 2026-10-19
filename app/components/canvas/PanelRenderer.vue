<script setup lang="ts">
import type Konva from 'konva'
import { Group, Rect } from 'vue-konva'
import type { PanelInstance } from '#shared/types/panel'
import { occupiedSizeMm } from '#shared/types/panel'
import { useEditorStore } from '~/stores/editor'
import { useProjectStore } from '~/stores/project'

const props = defineProps<{
  panel: PanelInstance
  wallId: string
  zoom: number
  locked: boolean
  testPatternActive?: boolean
  selected: boolean
  invalid: boolean
}>()

const emit = defineEmits<{
  select: [additive: boolean]
  dragStart: []
  dragMove: [xMm: number, yMm: number]
  dragEnd: [xMm: number, yMm: number]
  contextMenu: [evt: MouseEvent]
}>()

const project = useProjectStore()
const editor = useEditorStore()
const groupRef = ref<{ getNode: () => Konva.Group } | null>(null)
const hovered = ref(false)

const def = computed(() => project.defsById.get(props.panel.panelDefinitionId))
const dragPreview = computed(() =>
  editor.panelDragPreview?.panelId === props.panel.id ? editor.panelDragPreview : null
)
const isInvalid = computed(() => dragPreview.value?.invalid ?? props.invalid)

const geometry = computed(() => {
  if (!def.value) return null
  const occ = occupiedSizeMm(def.value, props.panel.rotation)
  const unrotW = def.value.widthMm * props.zoom
  const unrotH = def.value.heightMm * props.zoom
  const occW = occ.widthMm * props.zoom
  const occH = occ.heightMm * props.zoom
  return {
    x: (dragPreview.value?.xMm ?? props.panel.xMm) * props.zoom + occW / 2,
    y: (dragPreview.value?.yMm ?? props.panel.yMm) * props.zoom + occH / 2,
    offsetX: unrotW / 2,
    offsetY: unrotH / 2,
    width: unrotW,
    height: unrotH,
    rotation: props.panel.rotation
  }
})

const groupConfig = computed(() => {
  if (!geometry.value) return null
  return {
    id: props.panel.id,
    ...geometry.value,
    draggable:
      editor.canManipulateObjects
      && !props.locked
      && props.panel.enabled
  }
})

const bodyConfig = computed(() => {
  if (!geometry.value) return null
  const selected = props.selected
  const hover = hovered.value && !selected
  let fill = 'rgba(255, 255, 255, 0.08)'
  if (isInvalid.value) {
    fill = 'rgba(239, 68, 68, 0.35)'
  } else if (selected) {
    fill = props.testPatternActive
      ? 'rgba(255, 255, 255, 0.38)'
      : 'rgba(255, 255, 255, 0.34)'
  } else if (hover) {
    fill = props.testPatternActive
      ? 'rgba(255, 255, 255, 0.16)'
      : 'rgba(255, 255, 255, 0.14)'
  } else if (props.testPatternActive) {
    fill = 'rgba(255, 255, 255, 0.03)'
  }

  let stroke = '#525252'
  let strokeWidth = 1
  if (isInvalid.value) {
    stroke = '#ef4444'
    strokeWidth = selected ? 2 : 1
  } else if (selected) {
    stroke = '#ffffff'
    strokeWidth = 2
  } else if (hover) {
    stroke = '#d4d4d4'
    strokeWidth = 1
  }

  return {
    x: 0,
    y: 0,
    width: geometry.value.width,
    height: geometry.value.height,
    fill,
    stroke,
    strokeWidth,
    strokeScaleEnabled: false,
    lineJoin: 'round' as const,
    perfectDrawEnabled: false
  }
})

function onClick(e: Konva.KonvaEventObject<MouseEvent>) {
  e.cancelBubble = true
  if (editor.handPanActive) return
  if (e.target.getStage()?.isDragging?.()) return
  emit('select', e.evt.shiftKey)
}

function onDragStart(e: Konva.KonvaEventObject<DragEvent>) {
  e.cancelBubble = true
  emit('dragStart')
}

function localTopLeftFromNode(node: Konva.Node) {
  if (!def.value) return null
  const occ = occupiedSizeMm(def.value, props.panel.rotation)
  const cx = node.x() / props.zoom
  const cy = node.y() / props.zoom
  return { xMm: cx - occ.widthMm / 2, yMm: cy - occ.heightMm / 2, occ }
}

function onDragMove(e: Konva.KonvaEventObject<DragEvent>) {
  e.cancelBubble = true
  const pos = localTopLeftFromNode(e.target)
  if (!pos) return
  emit('dragMove', pos.xMm, pos.yMm)
  syncNodePosition(e.target)
}

function syncNodePosition(node: Konva.Node) {
  if (!geometry.value) return
  // During drag, render the preview; after release, render the committed position.
  node.position({ x: geometry.value.x, y: geometry.value.y })
}

watch(
  () => [props.panel.xMm, props.panel.yMm],
  () => {
    if (!editor.canvasDragging || !def.value || !geometry.value) return
    const node = groupRef.value?.getNode()
    if (!node) return
    syncNodePosition(node)
  }
)

function onDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
  e.cancelBubble = true
  const pos = localTopLeftFromNode(e.target)
  if (!pos) return
  emit('dragEnd', pos.xMm, pos.yMm)
  syncNodePosition(e.target)
}

function onContextMenu(e: Konva.KonvaEventObject<PointerEvent>) {
  e.evt.preventDefault()
  e.cancelBubble = true
  emit('contextMenu', e.evt as MouseEvent)
}
</script>

<template>
  <Group
    v-if="def && panel.enabled && groupConfig && bodyConfig"
    ref="groupRef"
    :config="groupConfig"
    @click="onClick"
    @dragstart="onDragStart"
    @dragmove="onDragMove"
    @dragend="onDragEnd"
    @contextmenu="onContextMenu"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <Rect :config="bodyConfig" />
    <Rect
      v-if="selected && !isInvalid"
      :config="{
        x: 0,
        y: 0,
        width: geometry!.width,
        height: geometry!.height,
        fill: 'transparent',
        stroke: '#ffffff',
        strokeWidth: 2,
        strokeScaleEnabled: false,
        listening: false
      }"
    />
  </Group>
</template>
