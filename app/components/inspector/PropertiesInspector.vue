<script setup lang="ts">
import type { RotationDeg } from '#shared/types/panel'
import { pitchXMm, pitchYMm } from '#shared/types/panel'
import { WARNING_LABELS_DE } from '#shared/i18n/messages-de'
import type { TestPatternKind } from '#shared/types/wall'
import { useDeleteActions } from '~/composables/useDeleteActions'
import { useWallMetrics } from '~/composables/useWallMetrics'
import { useWallOverviewSummary } from '~/composables/useWallOverviewSummary'
import { useEditorStore } from '~/stores/editor'
import { useHistoryStore } from '~/stores/history'
import { useProjectStore } from '~/stores/project'

const project = useProjectStore()
const editor = useEditorStore()
const history = useHistoryStore()
const { deletePanel } = useDeleteActions()

const patternKinds: Array<{ label: string, value: TestPatternKind }> = [
  { label: 'SMPTE-Farbbalken', value: 'smpte' },
  { label: 'Raster & Kreuz', value: 'grid' },
  { label: 'Panel-Nummerierung', value: 'cabinet' },
  { label: 'Pixel-Pitch-Checker', value: 'pitch' }
]

const wall = computed(() =>
  project.walls.find(w => w.id === editor.primaryWallId)
)
const panel = computed(() => {
  const w = wall.value
  if (!w) return null
  return w.panels.find(p => p.id === editor.primaryPanelId) ?? null
})
const panelDef = computed(() =>
  panel.value ? project.defsById.get(panel.value.panelDefinitionId) : null
)

const metrics = useWallMetrics(() => wall.value)
const overview = useWallOverviewSummary()

function rotatePanel(deg: RotationDeg) {
  if (!wall.value || !panel.value) return
  history.pushHistory()
  project.updatePanel(wall.value.id, panel.value.id, { rotation: deg })
  history.pushHistory()
}

function onDeletePanel() {
  if (!wall.value || !panel.value) return
  deletePanel(wall.value.id, panel.value.id)
}

function onDeleteWall() {
  if (!wall.value) return
  editor.requestDeleteWall(wall.value.id)
}

function updateTestPattern(patch: { enabled?: boolean, kind?: TestPatternKind }) {
  if (!wall.value) return
  history.pushHistory()
  project.updateWall(wall.value.id, {
    testPatternEnabled: patch.enabled ?? wall.value.testPatternEnabled,
    testPatternKind: patch.kind ?? wall.value.testPatternKind ?? 'smpte'
  })
  history.pushHistory()
}
</script>

<template>
  <div class="space-y-4 p-3 text-sm">
    <WallsWallGesamtuebersichtCard
      title="Gesamtübersicht"
      :summary="overview"
    />
    <template v-if="wall && !panel">
      <h3 class="font-semibold">
        Wand-Eigenschaften
      </h3>
      <UFormField label="Name">
        <UInput
          :model-value="wall.name"
          @update:model-value="(v) => project.updateWall(wall!.id, { name: String(v) })"
        />
      </UFormField>
      <div class="grid grid-cols-2 gap-2">
        <UFormField label="X (mm)">
          <UInput
            :model-value="wall.xMm"
            type="number"
            @update:model-value="(v) => project.updateWall(wall!.id, { xMm: Number(v) })"
          />
        </UFormField>
        <UFormField label="Y (mm)">
          <UInput
            :model-value="wall.yMm"
            type="number"
            @update:model-value="(v) => project.updateWall(wall!.id, { yMm: Number(v) })"
          />
        </UFormField>
      </div>
      <WallsWallBuilder />
      <UFormField label="Testbild auf Wand">
        <div class="space-y-2">
          <UCheckbox
            :model-value="wall.testPatternEnabled ?? false"
            label="Testbild anzeigen"
            data-testid="wall-testpattern-toggle"
            @update:model-value="(v) => updateTestPattern({ enabled: Boolean(v) })"
          />
          <USelect
            :model-value="wall.testPatternKind ?? 'smpte'"
            :items="patternKinds"
            :disabled="!wall.testPatternEnabled"
            @update:model-value="(v) => updateTestPattern({ kind: v as TestPatternKind })"
          />
        </div>
      </UFormField>
      <UButton
        color="error"
        variant="soft"
        size="sm"
        icon="i-lucide-trash-2"
        label="Wand löschen"
        data-testid="inspector-delete-wall"
        @click="onDeleteWall"
      />
      <dl
        v-if="metrics"
        class="space-y-1 rounded-md border border-default bg-default/30 p-2 text-xs"
      >
        <div class="flex justify-between">
          <dt class="text-muted">
            BBox
          </dt>
          <dd class="font-mono text-highlighted">
            {{ metrics.dims.bboxWidthMm }}×{{ metrics.dims.bboxHeightMm }} mm
          </dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-muted">
            Aktive Fläche
          </dt>
          <dd class="font-mono">
            {{ metrics.dims.activeAreaM2.toFixed(2) }} m²
          </dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-muted">
            Panels
          </dt>
          <dd>{{ metrics.dims.enabledPanelCount }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-muted">
            Native Auflösung
          </dt>
          <dd class="font-mono">
            <span v-if="metrics.resolution.valid">
              {{ metrics.resolution.resolutionX }}×{{ metrics.resolution.resolutionY }}
            </span>
            <span
              v-else
              class="text-warning"
            >n/a</span>
          </dd>
        </div>
        <ul
          v-if="metrics.resolution.warnings.length"
          class="list-disc pl-4 text-warning"
        >
          <li
            v-for="(w, i) in metrics.resolution.warnings"
            :key="i"
          >
            {{ WARNING_LABELS_DE[w] ?? w }}
          </li>
        </ul>
      </dl>
    </template>

    <template v-else-if="wall && panel && panelDef && editor.primaryWallId && editor.primaryPanelId">
      <h3 class="font-semibold">
        Panel-Instanz
      </h3>
      <p class="text-xs text-muted">
        {{ panelDef.name }}
      </p>
      <div class="grid grid-cols-2 gap-2">
        <UFormField label="X (mm)">
          <UInput
            :model-value="panel.xMm"
            type="number"
            @update:model-value="(v) => project.updatePanel(editor.primaryWallId!, editor.primaryPanelId!, { xMm: Number(v) })"
          />
        </UFormField>
        <UFormField label="Y (mm)">
          <UInput
            :model-value="panel.yMm"
            type="number"
            @update:model-value="(v) => project.updatePanel(editor.primaryWallId!, editor.primaryPanelId!, { yMm: Number(v) })"
          />
        </UFormField>
      </div>
      <UFormField label="Rotation">
        <USelect
          :model-value="panel.rotation"
          :items="panelDef.allowedRotations.map((r) => ({ label: `${r}°`, value: r }))"
          @update:model-value="(v) => rotatePanel(Number(v) as RotationDeg)"
        />
      </UFormField>
      <dl class="space-y-1 text-xs text-muted">
        <div>Physikalisch: {{ panelDef.widthMm }}×{{ panelDef.heightMm }} mm</div>
        <div>Pixel: {{ panelDef.resolutionX }}×{{ panelDef.resolutionY }}</div>
        <div>Pitch: {{ pitchXMm(panelDef).toFixed(3) }}×{{ pitchYMm(panelDef).toFixed(3) }} mm</div>
      </dl>
      <UButton
        color="error"
        variant="soft"
        size="sm"
        icon="i-lucide-trash-2"
        label="Panel löschen"
        data-testid="inspector-delete-panel"
        @click="onDeletePanel"
      />
    </template>

    <p
      v-else
      class="text-muted text-sm"
    >
      Wand oder Panel auswählen, um Eigenschaften zu bearbeiten.
    </p>
  </div>
</template>
