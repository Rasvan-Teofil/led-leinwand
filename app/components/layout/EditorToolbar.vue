<script setup lang="ts">
import { useEditorStore } from '~/stores/editor'
import { useHistoryStore } from '~/stores/history'
import { resetDemoProject } from '~/composables/useDemoProject'
import { useProjectStore } from '~/stores/project'

const project = useProjectStore()
const editor = useEditorStore()
const history = useHistoryStore()
const persistence = useProjectPersistence()
const { exportPng, exportPdf } = useExport()

const settingsOpen = ref(false)
const resetDemoOpen = ref(false)

function confirmResetDemo() {
  resetDemoProject()
  resetDemoOpen.value = false
  settingsOpen.value = false
}
const projectName = computed({
  get: () => project.project.name,
  set: (v: string) => project.renameProject(v)
})

function onExportJson() {
  const blob = new Blob([persistence.exportJson()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.project.name.replace(/\s+/g, '_')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function onImportJson() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    const text = await file.text()
    persistence.importJson(text)
  }
  input.click()
}

watch(
  () => project.project,
  () => persistence.autosave(),
  { deep: true }
)
</script>

<template>
  <header
    class="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3"
  >
    <div class="flex min-w-0 items-center gap-2">
      <UIcon
        name="i-lucide-grid-3x3"
        class="size-5 text-[var(--app-text)]"
      />
      <span class="hidden font-semibold text-sm sm:inline">LED Wall Designer</span>
      <UInput
        v-model="projectName"
        size="xs"
        class="w-40 sm:w-56"
        :ui="{ base: 'font-medium' }"
      />
    </div>

    <div class="ml-auto flex flex-wrap items-center gap-1">
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-save"
        label="Speichern"
        @click="persistence.saveManual()"
      />
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-folder-open"
        label="Laden"
        @click="persistence.loadAutosave()"
      />
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-undo-2"
        data-testid="toolbar-undo"
        :disabled="!history.canUndo"
        @click="history.undo()"
      />
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-redo-2"
        data-testid="toolbar-redo"
        :disabled="!history.canRedo"
        @click="history.redo()"
      />
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-download"
        label="JSON"
        @click="onExportJson"
      />
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-upload"
        @click="onImportJson"
      />
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-image-down"
        label="PNG"
        @click="exportPng({ includeGrid: true })"
      />
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-file-text"
        label="PDF"
        @click="exportPdf()"
      />
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-sparkles"
        label="Optimizer"
        :class="editor.activeView === 'optimizer' ? 'view-tab-active' : ''"
        @click="editor.setView('optimizer')"
      />
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-image"
        label="Preview"
        :class="editor.activeView === 'preview' ? 'view-tab-active' : ''"
        @click="editor.setView('preview')"
      />
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-pencil-ruler"
        label="Editor"
        :class="editor.activeView === 'editor' ? 'view-tab-active' : ''"
        @click="editor.setView('editor')"
      />
      <UColorModeButton size="xs" />
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-settings"
        aria-label="Einstellungen"
        @click="settingsOpen = !settingsOpen"
      />
    </div>

    <UModal
      v-model:open="settingsOpen"
      title="Einstellungen"
    >
      <template #body>
        <div class="space-y-3 text-sm">
          <UFormField label="Raster (mm)">
            <UInput
              v-model.number="editor.preferences.snapMm"
              type="number"
              min="1"
            />
          </UFormField>
          <p class="text-muted text-xs">
            Alle Berechnungen in mm. Keine Daten werden an Server gesendet.
          </p>
          <UButton
            block
            variant="outline"
            color="neutral"
            icon="i-lucide-rotate-ccw"
            label="Standardangebote laden"
            data-testid="reset-demo-button"
            @click="resetDemoOpen = true"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="resetDemoOpen"
      title="Standardangebote laden?"
    >
      <template #body>
        <p class="text-sm text-muted">
          Das aktuelle Projekt wird durch die beiden Angebote ersetzt: Jinyuan P3.91 und P2.6,
          jeweils mit gleichem Aufbau in 4 × 2,5 m.
          Eigene Änderungen gehen verloren.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            variant="ghost"
            label="Abbrechen"
            @click="resetDemoOpen = false"
          />
          <UButton
            color="neutral"
            label="Angebote laden"
            data-testid="reset-demo-confirm"
            @click="confirmResetDemo"
          />
        </div>
      </template>
    </UModal>
  </header>
</template>
