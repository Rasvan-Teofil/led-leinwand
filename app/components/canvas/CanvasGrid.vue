<script setup lang="ts">
import { Circle } from 'vue-konva'

const props = defineProps<{
  width: number
  height: number
  zoom: number
  panX: number
  panY: number
  visible: boolean
  gridMm: number
}>()

const dots = computed(() => {
  if (!props.visible) return []
  const spacing = Math.max(20, Math.min(48, props.gridMm * props.zoom * 0.8))
  const result: Array<{ x: number, y: number }> = []
  const startX = props.panX % spacing
  const startY = props.panY % spacing
  for (let x = startX; x < props.width; x += spacing) {
    for (let y = startY; y < props.height; y += spacing) {
      result.push({ x, y })
    }
  }
  return result
})
</script>

<template>
  <Circle
    v-for="(dot, i) in dots"
    :key="i"
    :config="{
      x: dot.x,
      y: dot.y,
      radius: 1,
      fill: '#2e2e2e',
      listening: false
    }"
  />
</template>
