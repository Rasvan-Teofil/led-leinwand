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

function hatchLinesLocal(w: number, h: number, step = 9): number[][] {
  const lines: number[][] = []
  for (let i = -h; i < w + h; i += step) {
    lines.push([i, 0, i + h, h])
  }
  return lines
}

const verschnittLayers = computed(() => {
  const rects = props.analysis.verschnittRectsMm
  let labelIdx = 0
  let maxArea = 0
  rects.forEach((r, i) => {
    const a = r.widthMm * r.heightMm
    if (a > maxArea) {
      maxArea = a
      labelIdx = i
    }
  })
  return rects.map((band, i) => {
    const w = band.widthMm * z.value
    const h = band.heightMm * z.value
    return {
      band,
      x: band.xMm * z.value,
      y: band.yMm * z.value,
      w,
      h,
      hatch: hatchLinesLocal(w, h),
      showLabel: i === labelIdx
    }
  })
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
    vPx: `${formatIntegerDe(r.contentHeightPx)} px`,
    vMm: formatMmDe(r.contentHeightMm)
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
    <Group
      v-for="(layer, i) in verschnittLayers"
      :key="`vs-${i}`"
      :config="{
        x: layer.x,
        y: layer.y,
        clip: { x: 0, y: 0, width: layer.w, height: layer.h }
      }"
    >
      <Rect
        :config="{
          x: 0,
          y: 0,
          width: layer.w,
          height: layer.h,
          fill: 'rgba(0,0,0,0.42)',
          listening: false
        }"
      />
      <Line
        v-for="(pts, hi) in layer.hatch"
        :key="`h-${i}-${hi}`"
        :config="{
          points: pts,
          stroke: 'rgba(255,255,255,0.22)',
          strokeWidth: 1,
          listening: false
        }"
      />
      <Text
        v-if="layer.showLabel"
        :config="{
          x: 0,
          y: layer.h / 2 - 8,
          width: layer.w,
          align: 'center',
          text: analysis.verschnittLabel,
          fontSize: 11,
          fontStyle: 'bold',
          fill: '#ffffff',
          listening: false
        }"
      />
    </Group>

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
          fill: 'rgba(255,255,255,0.02)',
          strokeScaleEnabled: false,
          listening: false
        }"
      />
      <Text
        :config="{
          x: 8,
          y: 6,
          width: contentScreen.w - 16,
          align: 'center',
          text: rulerText.h,
          fontSize: 10,
          fill: '#f5f5f5',
          listening: false
        }"
      />
      <Text
        :config="{
          x: contentScreen.w - 72,
          y: contentScreen.h - 36,
          width: 64,
          align: 'right',
          text: rulerText.vPx,
          fontSize: 10,
          fill: '#f5f5f5',
          listening: false
        }"
      />
      <Text
        :config="{
          x: contentScreen.w - 72,
          y: contentScreen.h - 22,
          width: 64,
          align: 'right',
          text: rulerText.vMm,
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
