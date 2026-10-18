<script setup lang="ts">
import { Line, Rect } from 'vue-konva'
import { useEditorStore } from '~/stores/editor'
import { useProjectStore } from '~/stores/project'

const props = defineProps<{
  zoom: number
  panX: number
  panY: number
}>()

const editor = useEditorStore()
const project = useProjectStore()

const guideLines = computed(() =>
  editor.snapGuides.map((g) => {
    if (g.orientation === 'vertical') {
      const x = props.panX + g.positionMm * props.zoom
      return {
        points: [
          x,
          props.panY + g.startMm * props.zoom,
          x,
          props.panY + g.endMm * props.zoom
        ]
      }
    }
    const y = props.panY + g.positionMm * props.zoom
    return {
      points: [
        props.panX + g.startMm * props.zoom,
        y,
        props.panX + g.endMm * props.zoom,
        y
      ]
    }
  })
)

const dropPreview = computed(() => {
  const p = editor.libraryDropPreview
  if (!p) return null
  const wall = project.walls.find(w => w.id === p.wallId)
  if (!wall) return null
  return {
    x: props.panX + (wall.xMm + p.localXMm) * props.zoom,
    y: props.panY + (wall.yMm + p.localYMm) * props.zoom,
    width: p.widthMm * props.zoom,
    height: p.heightMm * props.zoom
  }
})
</script>

<template>
  <template
    v-for="(line, i) in guideLines"
    :key="`guide-${i}`"
  >
    <Line
      :config="{
        points: line.points,
        stroke: '#fb7185',
        strokeWidth: 2.5,
        dash: [6, 4],
        listening: false
      }"
    />
  </template>
  <Rect
    v-if="dropPreview"
    :config="{
      x: dropPreview.x,
      y: dropPreview.y,
      width: dropPreview.width,
      height: dropPreview.height,
      stroke: '#f472b6',
      strokeWidth: 2,
      dash: [8, 4],
      fill: 'rgba(244,114,182,0.12)',
      listening: false
    }"
  />
</template>
