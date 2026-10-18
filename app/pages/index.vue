<script setup lang="ts">
import CanvasEditor from '~/components/canvas/CanvasEditor.vue'
import { useKeyboardShortcuts } from '~/composables/useKeyboardShortcuts'
import { useProjectStore } from '~/stores/project'
import { useEditorStore } from '~/stores/editor'
import { useHistoryStore } from '~/stores/history'

const project = useProjectStore()
const editor = useEditorStore()
const history = useHistoryStore()
const persistence = useProjectPersistence()
const { onKeyDown, onKeyUp } = useKeyboardShortcuts()

const canvasRef = ref<{ fitAll: () => void } | null>(null)

function ensureDemoContent() {
  if (project.walls.length === 0) {
    seedDemoProject()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  const loaded = persistence.loadAutosave()
  if (!loaded) {
    seedDemoProject()
  } else {
    ensureDemoContent()
  }
  if (project.walls[0]) {
    editor.selectWall(project.walls[0].id)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})

function onCanvasReady() {
  canvasRef.value?.fitAll()
}

function seedDemoProject() {
  project.newProject('Demo LED Projekt')
  const jinyuan500 = project.panelDefinitions.find(d => d.id === 'jinyuan-p391-500x500')
  const jinyuan1000 = project.panelDefinitions.find(d => d.id === 'jinyuan-p391-500x1000')
  const generic500 = project.panelDefinitions.find(d => d.id.startsWith('preset-500x500'))
  if (!jinyuan500 || !jinyuan1000 || !generic500) return

  history.pushHistory()
  const rectId = project.addWall('Jinyuan 4×2,5 m')
  if (rectId) {
    project.updateWall(rectId, { xMm: 0, yMm: 0 })
    for (let col = 0; col < 8; col++) {
      const x = col * 500
      project.addPanel(rectId, jinyuan1000.id, x, 0)
      project.addPanel(rectId, jinyuan1000.id, x, 1000)
      project.addPanel(rectId, jinyuan500.id, x, 2000)
    }
  }

  const lId = project.addWall('L-Form Irregular')
  if (lId) {
    project.updateWall(lId, { xMm: 5000, yMm: 0 })
    const positions: Array<[number, number]> = [
      [0, 0],
      [500, 0],
      [1000, 0],
      [0, 500],
      [0, 1000],
      [500, 1000],
      [1000, 500]
    ]
    for (const [x, y] of positions) {
      project.addPanel(lId, generic500.id, x, y)
    }
  }
  history.pushHistory()
  persistence.autosave()
}

useHead({ title: 'LED Wall Designer' })
</script>

<template>
  <div class="flex h-[calc(100vh-0px)] flex-col overflow-hidden">
    <LayoutEditorToolbar />
    <div class="flex min-h-0 flex-1">
      <LayoutLeftSidebar />
      <main class="flex min-w-0 flex-1 flex-col">
        <div class="relative min-h-0 flex-1">
          <CanvasEditor
            v-if="editor.activeView === 'editor'"
            ref="canvasRef"
            @ready="onCanvasReady"
          />
          <OptimizerResolutionOptimizer v-else-if="editor.activeView === 'optimizer'" />
          <PreviewPresentationPreview v-else-if="editor.activeView === 'preview'" />
        </div>
        <DashboardTechnicalOverview />
      </main>
      <LayoutRightSidebar />
    </div>
  </div>
</template>
