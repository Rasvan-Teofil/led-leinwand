<script setup lang="ts">
import { analyzeNativeResolution, detectOverlaps } from '#shared/calculations'
import { wallLocalBoundingBox } from '#shared/calculations/geometry'
import { useEditorStore } from '~/stores/editor'
import { useProjectStore } from '~/stores/project'

const project = useProjectStore()
const editor = useEditorStore()

const wall = computed(() =>
  project.walls.find(w => w.id === editor.primaryWallId) ?? project.walls[0]
)

const bbox = computed(() =>
  wall.value ? wallLocalBoundingBox(wall.value, project.defsById) : null
)

const resolution = computed(() => {
  if (!wall.value) return null
  const overlaps = detectOverlaps(wall.value, project.defsById)
  return analyzeNativeResolution(wall.value, project.panelDefinitions, overlaps.length)
})

async function onUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    useToast().add({ title: 'Nur Bilddateien', color: 'error' })
    return
  }
  if (file.size > 15 * 1024 * 1024) {
    useToast().add({ title: 'Max. 15 MB', color: 'error' })
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    editor.previewImageDataUrl = String(reader.result)
  }
  reader.readAsDataURL(file)
}

const canvasRef = ref<HTMLCanvasElement | null>(null)

watch(
  [wall, () => editor.previewImageDataUrl, () => editor.previewFitMode, bbox],
  () => drawPreview(),
  { flush: 'post' }
)

function drawPreview() {
  const canvas = canvasRef.value
  if (!canvas || !wall.value || !bbox.value) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = 640
  const h = 360
  canvas.width = w
  canvas.height = h
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, w, h)
  const scale = Math.min(w / bbox.value.widthMm, h / bbox.value.heightMm) * 0.9
  const ox = (w - bbox.value.widthMm * scale) / 2
  const oy = (h - bbox.value.heightMm * scale) / 2

  if (editor.previewImageDataUrl) {
    const img = new Image()
    img.onload = () => {
      const dw = bbox.value!.widthMm * scale
      const dh = bbox.value!.heightMm * scale
      let sx = 0
      let sy = 0
      let sw = img.width
      let sh = img.height
      if (editor.previewFitMode === 'contain') {
        const ir = img.width / img.height
        const wr = bbox.value!.widthMm / bbox.value!.heightMm
        if (ir > wr) {
          sh = img.width / wr
          sy = (img.height - sh) / 2
        } else {
          sw = img.height * wr
          sx = (img.width - sw) / 2
        }
      }
      ctx.drawImage(img, sx, sy, sw, sh, ox, oy, dw, dh)
      drawOutlines(ctx, ox, oy, scale)
    }
    img.src = editor.previewImageDataUrl
  } else {
    drawOutlines(ctx, ox, oy, scale)
  }
}

function drawOutlines(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  scale: number
) {
  if (!wall.value || !bbox.value || !editor.previewShowOutlines) return
  ctx.strokeStyle = 'rgba(56,189,248,0.8)'
  ctx.lineWidth = 1
  for (const panel of wall.value.panels) {
    if (!panel.enabled) continue
    const def = project.defsById.get(panel.panelDefinitionId)
    if (!def) continue
    const x = ox + (panel.xMm - bbox.value.xMm) * scale
    const y = oy + (panel.yMm - bbox.value.yMm) * scale
    ctx.strokeRect(x, y, def.widthMm * scale, def.heightMm * scale)
  }
}

onMounted(() => drawPreview())
</script>

<template>
  <div class="h-full overflow-y-auto p-4">
    <h2 class="mb-2 text-lg font-semibold">
      Content Preview
    </h2>
    <p
      v-if="resolution && !resolution.valid"
      class="mb-2 text-sm text-warning"
    >
      Gemischte Pitchs oder unregelmäßiges Raster — Vorschau ist approximativ.
    </p>
    <div class="mb-3 flex flex-wrap gap-2">
      <input
        type="file"
        accept="image/*"
        class="text-xs"
        @change="onUpload"
      >
      <USelect
        v-model="editor.previewFitMode"
        :items="[
          { label: 'Contain', value: 'contain' },
          { label: 'Cover', value: 'cover' },
          { label: 'Stretch', value: 'stretch' }
        ]"
        size="sm"
        class="w-36"
      />
      <UCheckbox
        v-model="editor.previewShowOutlines"
        label="Panel-Umrisse"
      />
    </div>
    <canvas
      ref="canvasRef"
      class="max-w-full rounded-md border border-default"
    />
  </div>
</template>
