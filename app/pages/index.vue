<script setup lang="ts">
import CanvasEditor from '~/components/canvas/CanvasEditor.vue'
import WallsDeleteWallModal from '~/components/walls/DeleteWallModal.vue'
import { useDeleteActions } from '~/composables/useDeleteActions'
import { useKeyboardShortcuts } from '~/composables/useKeyboardShortcuts'
import { useProjectStore } from '~/stores/project'
import { useEditorStore } from '~/stores/editor'
import { seedDemoProject } from '~/composables/useDemoProject'

const project = useProjectStore()
const editor = useEditorStore()
const persistence = useProjectPersistence()
const { onKeyDown, onKeyUp } = useKeyboardShortcuts()
const { deleteWall } = useDeleteActions()

const deleteWallModalOpen = computed({
  get: () => editor.pendingDeleteWallId != null,
  set: (open: boolean) => {
    if (!open) editor.pendingDeleteWallId = null
  }
})
const pendingWallName = computed(() =>
  project.walls.find(w => w.id === editor.pendingDeleteWallId)?.name ?? ''
)

function confirmDeleteWall() {
  if (!editor.pendingDeleteWallId) return
  deleteWall(editor.pendingDeleteWallId)
  editor.pendingDeleteWallId = null
}

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

useHead({ title: 'LED Wall Designer' })
</script>

<template>
  <div class="flex h-[calc(100vh-0px)] flex-col overflow-hidden">
    <LayoutEditorToolbar />
    <div class="flex min-h-0 flex-1">
      <LayoutLeftSidebar />
      <main class="flex min-w-0 flex-1 flex-col">
        <div class="relative min-h-0 flex-1">
          <CanvasEditor v-if="editor.activeView === 'editor'" />
          <OptimizerResolutionOptimizer v-else-if="editor.activeView === 'optimizer'" />
          <PreviewPresentationPreview v-else-if="editor.activeView === 'preview'" />
        </div>
      </main>
      <LayoutRightSidebar />
    </div>
    <WallsDeleteWallModal
      v-model:open="deleteWallModalOpen"
      :wall-name="pendingWallName"
      @confirm="confirmDeleteWall"
    />
  </div>
</template>
