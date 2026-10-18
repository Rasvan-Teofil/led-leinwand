<script setup lang="ts">
import type Konva from 'konva'
import { Group, Line, Rect, Text } from 'vue-konva'
import type { ResolutionMaskAnalysis } from '#shared/calculations/resolution-mask'
import { formatIntegerDe, formatMmDe } from '#shared/format/de-de'
import type { LEDWall } from '#shared/types/wall'
import { useEditorStore } from '~/stores/editor'

const props = defineProps<{
  wall: LEDWall
  analysis: ResolutionMaskAnalysis
  zoom: number
}>()

const emit = defineEmits<{
  offsetChange: [xMm: number, yMm: number]
  dragEnd: []
}>()

const editor = useEditorStore()
const groupRef = ref<{ getNode: () => Konva.Group } | null>(null)
const dragStart = ref<{ x: number, y: number, ox: number, oy: number } | null>(
  null
)

const z = computed(() => props.zoom)
const raster = computed(() => props.analysis.ledRaster)

const ledMm = computed(() => props.analysis.ledBoundsMm)

const contentScreen = computed(() => {
  const c = props.analysis.contentLedMm
  return {
    x: c.xMm * z.value,
    y: c.yMm * z.value,
    w: c.widthMm * z.value,
    h: c.heightMm * z.value
  }
})

const hatchLines = computed(() => {
  const lines: number[][] = []
  const step = 12
  for (const band of props.analysis.unusedLedRectsMm) {
    const x = band.xMm * z.value
    const y = band.yMm * z.value
    const w = band.widthMm * z.value
    const h = band.heightMm * z.value
    const maxLen = Math.hypot(w, h)
    for (let d = -maxLen; d < maxLen; d += step) {
      lines.push([x + d, y, x + d + h, y + h])
      lines.push([x + w + d, y, x + w + d + h, y + h])
    }
  }
  return lines
})

const cropOutline = computed(() => {
  if (props.analysis.fitMode !== 'cover') return null
  const full = props.analysis.contentLedPxFull
  const outside = {
    xMm: raster.value.originLocalXMm + full.x * raster.value.pitchXMm,
    yMm: raster.value.originLocalYMm + full.y * raster.value.pitchYMm,
    widthMm: full.width * raster.value.pitchXMm,
    heightMm: full.height * raster.value.pitchYMm
  }
  const onLed = props.analysis.contentLedMm
  if (
    Math.abs(outside.xMm - onLed.xMm) < 0.01
    && Math.abs(outside.yMm - onLed.yMm) < 0.01
    && Math.abs(outside.widthMm - onLed.widthMm) < 0.01
    && Math.abs(outside.heightMm - onLed.heightMm) < 0.01
  ) {
    return null
  }
  return {
    x: outside.xMm * z.value,
    y: outside.yMm * z.value,
    w: outside.widthMm * z.value,
    h: outside.heightMm * z.value
  }
})

const rulerText = computed(() => {
  const r = props.analysis.rulerLabels
  return {
    h: `${formatIntegerDe(r.contentWidthPx)} px · ${formatMmDe(r.contentWidthMm)}`,
    v: `${formatIntegerDe(r.contentHeightPx)} px · ${formatMmDe(r.contentHeightMm)}`
  }
})

function onDragStart() {
  dragStart.value = {
    x: props.analysis.contentLedMm.xMm,
    y: props.analysis.contentLedMm.yMm,
    ox: props.wall.resolutionMaskOffsetLocalXMm ?? 0,
    oy: props.wall.resolutionMaskOffsetLocalYMm ?? 0
  }
}

function onDragMove(e: Konva.KonvaEventObject<DragEvent>) {
  if (!dragStart.value) return
  const node = e.target
  const dxMm = node.x() / z.value - dragStart.value.x
  const dyMm = node.y() / z.value - dragStart.value.y
  emit(
    'offsetChange',
    dragStart.value.ox + dxMm,
    dragStart.value.oy + dyMm
  )
}

function onDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
  onDragMove(e)
  dragStart.value = null
  const node = groupRef.value?.getNode()
  if (node) {
    node.position({
      x: props.analysis.contentLedMm.xMm * z.value,
      y: props.analysis.contentLedMm.yMm * z.value
    })
  }
  emit('dragEnd')
}

watch(
  () => [
    props.analysis.contentLedMm.xMm,
    props.analysis.contentLedMm.yMm
  ],
  () => {
    const node = groupRef.value?.getNode()
    if (!node || dragStart.value) return
    node.position({
      x: props.analysis.contentLedMm.xMm * z.value,
      y: props.analysis.contentLedMm.yMm * z.value
    })
  }
)
</script>

<template>
  <Group :config="{ listening: true }">
    <Rect
      v-for="(band, i) in analysis.unusedLedRectsMm"
      :key="`band-${i}`"
      :config="{
        x: band.xMm * zoom,
        y: band.yMm * zoom,
        width: band.widthMm * zoom,
        height: band.heightMm * zoom,
        fill: 'rgba(255,255,255,0.06)',
        listening: false
      }"
    />
    <Line
      v-for="(pts, i) in hatchLines"
      :key="`hatch-${i}`"
      :config="{
        points: pts,
        stroke: 'rgba(255,255,255,0.18)',
        strokeWidth: 1,
        listening: false
      }"
    />
    <Rect
      v-if="cropOutline"
      :config="{
        x: cropOutline.x,
        y: cropOutline.y,
        width: cropOutline.w,
        height: cropOutline.h,
        stroke: '#a3a3a3',
        strokeWidth: 1,
        dash: [8, 6],
        fill: 'transparent',
        listening: false
      }"
    />
    <Group
      ref="groupRef"
      :config="{
        x: contentScreen.x,
        y: contentScreen.y,
        draggable: editor.canManipulateObjects && !wall.locked,
        listening: true
      }"
      @dragstart="onDragStart"
      @dragmove="onDragMove"
      @dragend="onDragEnd"
    >
      <Rect
        :config="{
          x: 0,
          y: 0,
          width: contentScreen.w,
          height: contentScreen.h,
          stroke: '#ffffff',
          strokeWidth: 2,
          fill: 'rgba(255,255,255,0.04)',
          dash: [4, 3],
          strokeScaleEnabled: false
        }"
      />
      <Line
        :config="{
          points: [0, -14, contentScreen.w, -14],
          stroke: '#d4d4d4',
          strokeWidth: 1,
          listening: false
        }"
      />
      <Line
        :config="{
          points: [-14, 0, -14, contentScreen.h],
          stroke: '#d4d4d4',
          strokeWidth: 1,
          listening: false
        }"
      />
      <Text
        :config="{
          x: contentScreen.w / 2 - 70,
          y: -28,
          width: 140,
          align: 'center',
          text: rulerText.h,
          fontSize: 10,
          fill: '#d4d4d4',
          listening: false
        }"
      />
      <Text
        :config="{
          x: -148,
          y: contentScreen.h / 2 - 6,
          width: 140,
          align: 'right',
          text: rulerText.v,
          fontSize: 10,
          fill: '#d4d4d4',
          listening: false
        }"
      />
    </Group>
    <Rect
      :config="{
        x: ledMm.xMm * zoom,
        y: ledMm.yMm * zoom,
        width: ledMm.widthMm * zoom,
        height: ledMm.heightMm * zoom,
        stroke: '#737373',
        strokeWidth: 1,
        dash: [2, 4],
        fill: 'transparent',
        listening: false
      }"
    />
  </Group>
</template>
