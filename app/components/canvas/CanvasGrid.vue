<script setup lang="ts">
import { Line } from 'vue-konva'

const props = defineProps<{
  width: number
  height: number
  zoom: number
  panX: number
  panY: number
  visible: boolean
  gridMm: number
}>()

const lines = computed(() => {
  if (!props.visible) return []
  const spacing = Math.max(props.gridMm * props.zoom, 8)
  const result: Array<{ points: number[] }> = []
  const startX = props.panX % spacing
  for (let x = startX; x < props.width; x += spacing) {
    result.push({ points: [x, 0, x, props.height] })
  }
  const startY = props.panY % spacing
  for (let y = startY; y < props.height; y += spacing) {
    result.push({ points: [0, y, props.width, y] })
  }
  return result
})
</script>

<template>
  <Line
    v-for="(line, i) in lines"
    :key="i"
    :config="{
      points: line.points,
      stroke: '#243044',
      strokeWidth: 1,
      listening: false
    }"
  />
</template>
