<script setup lang="ts">
import type { RotationDeg } from '#shared/types/panel'
import { useEditorStore } from '~/stores/editor'
import { useHistoryStore } from '~/stores/history'
import { useProjectStore } from '~/stores/project'

const editor = useEditorStore()
const project = useProjectStore()
const history = useHistoryStore()

const menu = computed(() => editor.contextMenu)

function close() {
  editor.contextMenu = null
}

function rotate(delta: 90 | -90) {
  const m = menu.value
  if (!m?.panelId) return
  const wall = project.walls.find(w => w.id === m.wallId)
  const panel = wall?.panels.find(p => p.id === m.panelId)
  const def = panel ? project.defsById.get(panel.panelDefinitionId) : null
  if (!wall || !panel || !def) return
  const order = def.allowedRotations
  const idx = order.indexOf(panel.rotation)
  const next = order[(idx + (delta > 0 ? 1 : order.length - 1)) % order.length] as RotationDeg
  history.pushHistory()
  project.updatePanel(m.wallId, m.panelId, { rotation: next })
  history.pushHistory()
  close()
}

function duplicatePanel() {
  const m = menu.value
  if (!m?.panelId) return
  const wall = project.walls.find(w => w.id === m.wallId)
  const panel = wall?.panels.find(p => p.id === m.panelId)
  if (!panel) return
  history.pushHistory()
  project.addPanel(
    m.wallId,
    panel.panelDefinitionId,
    panel.xMm + 50,
    panel.yMm + 50,
    panel.rotation
  )
  history.pushHistory()
  close()
}

function deletePanel() {
  const m = menu.value
  if (!m?.panelId) return
  history.pushHistory()
  project.removePanel(m.wallId, m.panelId)
  editor.clearSelection()
  history.pushHistory()
  close()
}

function duplicateWall() {
  const m = menu.value
  if (!m) return
  history.pushHistory()
  project.duplicateWall(m.wallId)
  history.pushHistory()
  close()
}

onMounted(() => {
  window.addEventListener('click', close)
  window.addEventListener('scroll', close, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', close)
  window.removeEventListener('scroll', close, true)
})
</script>

<template>
  <div
    v-if="menu"
    class="fixed z-50 min-w-40 rounded-md border border-default bg-elevated py-1 text-sm shadow-lg"
    :style="{ left: `${menu.x}px`, top: `${menu.y}px` }"
    @click.stop
  >
    <template v-if="menu.panelId">
      <button
        type="button"
        class="block w-full px-3 py-1.5 text-left hover:bg-default/60"
        @click="rotate(90)"
      >
        90° drehen
      </button>
      <button
        type="button"
        class="block w-full px-3 py-1.5 text-left hover:bg-default/60"
        @click="duplicatePanel"
      >
        Panel duplizieren
      </button>
      <button
        type="button"
        class="block w-full px-3 py-1.5 text-left text-error hover:bg-default/60"
        @click="deletePanel"
      >
        Panel löschen
      </button>
    </template>
    <template v-else>
      <button
        type="button"
        class="block w-full px-3 py-1.5 text-left hover:bg-default/60"
        @click="duplicateWall"
      >
        Wand duplizieren
      </button>
    </template>
  </div>
</template>
