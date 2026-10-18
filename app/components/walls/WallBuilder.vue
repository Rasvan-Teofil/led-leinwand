<script setup lang="ts">
import { inferWallRasterLayout } from '#shared/calculations/dimensions'
import { useEditorStore } from '~/stores/editor'
import { useHistoryStore } from '~/stores/history'
import { useProjectStore } from '~/stores/project'

const project = useProjectStore()
const editor = useEditorStore()
const history = useHistoryStore()

const wallId = computed(() => editor.primaryWallId)
const wall = computed(() => project.walls.find(w => w.id === wallId.value))

const panelDefId = ref('')
const columns = ref(4)
const rows = ref(3)
const mode = ref<'auto' | 'manual'>('auto')

function syncFromWall(w: NonNullable<typeof wall.value>) {
  const defId = w.panels[0]?.panelDefinitionId ?? project.panelDefinitions[0]?.id
  if (defId) panelDefId.value = defId
  const layout = inferWallRasterLayout(w)
  columns.value = layout.columns
  rows.value = layout.rows
}

watch(
  () => wall.value,
  (w) => {
    if (!w) return
    syncFromWall(w)
  },
  { immediate: true, deep: true }
)

function applyRectangular() {
  if (!wallId.value || !panelDefId.value) return
  history.pushHistory()
  project.setRectangularWall(wallId.value, panelDefId.value, columns.value, rows.value)
  history.pushHistory()
}
</script>

<template>
  <section
    v-if="wall"
    class="space-y-2 border-b border-default pb-3"
  >
    <h3 class="text-xs font-semibold uppercase tracking-wide text-muted">
      Wand-Builder
    </h3>
    <URadioGroup
      v-model="mode"
      :items="[
        { label: 'Automatisch (Raster)', value: 'auto' },
        { label: 'Manuell', value: 'manual' }
      ]"
      size="xs"
    />
    <template v-if="mode === 'auto'">
      <UFormField label="Panel-Typ">
        <USelect
          v-model="panelDefId"
          :items="project.panelDefinitions.map((d) => ({ label: d.name, value: d.id }))"
          size="sm"
        />
      </UFormField>
      <div class="grid grid-cols-2 gap-2">
        <UFormField label="Spalten">
          <UInput
            v-model.number="columns"
            type="number"
            min="1"
          />
        </UFormField>
        <UFormField label="Zeilen">
          <UInput
            v-model.number="rows"
            type="number"
            min="1"
          />
        </UFormField>
      </div>
      <UButton
        block
        size="sm"
        label="Raster anwenden"
        @click="applyRectangular"
      />
    </template>
    <p
      v-else
      class="text-xs text-muted"
    >
      Panels aus der Bibliothek auf die Wand ziehen. Snap und Raster helfen beim Ausrichten.
    </p>
  </section>
</template>
