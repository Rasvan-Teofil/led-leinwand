<script setup lang="ts">
import type { PanelDefinition } from '#shared/types/panel'
import { useEditorStore } from '~/stores/editor'
import { useHistoryStore } from '~/stores/history'
import { useProjectStore } from '~/stores/project'
import { createId } from '#shared/utils/id'
import { useAddPanelFromLibrary } from '~/composables/useAddPanelFromLibrary'

const project = useProjectStore()
const editor = useEditorStore()
const history = useHistoryStore()
const { addDefinitionToWall } = useAddPanelFromLibrary()

const selectedLibraryDefId = ref<string | null>(null)

const expandedWalls = ref<Record<string, boolean>>({})
const panelEditorOpen = ref(false)
const editingPanel = ref<PanelDefinition | null>(null)

function toggleWall(id: string) {
  expandedWalls.value[id] = !expandedWalls.value[id]
}

function onNewWall() {
  history.pushHistory()
  const id = project.addWall()
  history.pushHistory()
  if (id) {
    expandedWalls.value[id] = true
    editor.selectWall(id)
  }
}

function onDragPanel(defId: string) {
  editor.dragPanelDefinitionId = defId
}

function onSelectLibraryDef(defId: string) {
  selectedLibraryDefId.value = defId
}

function onAddLibraryPanelToWall() {
  if (!selectedLibraryDefId.value) return
  addDefinitionToWall(selectedLibraryDefId.value)
}

function onAddCustomPanel() {
  const t = new Date().toISOString()
  editingPanel.value = {
    id: createId('paneldef'),
    name: 'Custom Panel',
    widthMm: 500,
    heightMm: 500,
    resolutionX: 128,
    resolutionY: 128,
    allowedRotations: [0, 90, 180, 270],
    createdAt: t,
    updatedAt: t
  }
  panelEditorOpen.value = true
}

function saveCustomPanel(def: PanelDefinition) {
  history.pushHistory()
  project.addPanelDefinition(def)
  history.pushHistory()
  panelEditorOpen.value = false
}
</script>

<template>
  <aside class="app-surface flex h-full w-64 shrink-0 flex-col border-r">
    <div class="space-y-2 border-b border-default p-2">
      <UButton
        block
        size="sm"
        icon="i-lucide-plus"
        label="Neue Wand"
        class="btn-primary-mono"
        @click="onNewWall"
      />
    </div>

    <div class="flex-1 overflow-y-auto p-2 space-y-3">
      <section>
        <h3 class="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Wände
        </h3>
        <ul class="space-y-1">
          <li
            v-for="wall in project.walls"
            :key="wall.id"
            class="rounded-md border border-transparent hover:border-default"
          >
            <button
              type="button"
              class="flex w-full items-center gap-1 px-2 py-1.5 text-left text-sm"
              :class="editor.selection.wallIds.includes(wall.id) ? 'bg-[var(--app-surface-2)] ring-1 ring-[var(--app-border)]' : ''"
              @click="editor.selectWall(wall.id)"
            >
              <UIcon
                :name="expandedWalls[wall.id] ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                class="size-4 shrink-0"
                @click.stop="toggleWall(wall.id)"
              />
              <span class="truncate">{{ wall.name }}</span>
              <span class="ml-auto text-xs text-muted">{{ wall.panels.length }}</span>
            </button>
            <div
              v-if="expandedWalls[wall.id]"
              class="pb-1 pl-6 pr-2 text-xs text-muted"
            >
              <div class="flex items-center gap-2 py-0.5">
                <UButton
                  size="xs"
                  variant="ghost"
                  :icon="wall.visible ? 'i-lucide-eye' : 'i-lucide-eye-off'"
                  @click="project.updateWall(wall.id, { visible: !wall.visible })"
                />
                <UButton
                  size="xs"
                  variant="ghost"
                  :icon="wall.locked ? 'i-lucide-lock' : 'i-lucide-lock-open'"
                  @click="project.updateWall(wall.id, { locked: !wall.locked })"
                />
                <UButton
                  size="xs"
                  variant="ghost"
                  icon="i-lucide-copy"
                  @click="project.duplicateWall(wall.id)"
                />
                <UButton
                  size="xs"
                  variant="ghost"
                  color="error"
                  icon="i-lucide-trash-2"
                  data-testid="sidebar-delete-wall"
                  @click="editor.requestDeleteWall(wall.id)"
                />
              </div>
            </div>
          </li>
        </ul>
      </section>

      <PanelsPanelLibrary
        :definitions="project.panelDefinitions"
        :selected-definition-id="selectedLibraryDefId"
        @drag="onDragPanel"
        @select="onSelectLibraryDef"
        @edit="(d) => { editingPanel = { ...d }; panelEditorOpen = true }"
      />

      <UButton
        v-if="selectedLibraryDefId"
        block
        size="sm"
        icon="i-lucide-plus-square"
        label="Zur Wand hinzufügen"
        data-testid="library-add-to-wall"
        class="btn-primary-mono"
        @click="onAddLibraryPanelToWall"
      />

      <UButton
        block
        size="xs"
        variant="soft"
        icon="i-lucide-plus"
        label="Eigenes Panel"
        @click="onAddCustomPanel"
      />
    </div>

    <PanelsPanelEditor
      v-if="editingPanel"
      v-model:open="panelEditorOpen"
      :definition="editingPanel"
      @save="saveCustomPanel"
    />
  </aside>
</template>
