<script setup lang="ts">
import type { OptimizerRankMode } from '#shared/calculations/optimizer'
import { runOptimizer } from '#shared/calculations/optimizer'
import { formatAspectRatio, parseAspectRatioInput } from '#shared/i18n/messages-de'
import { useEditorStore } from '~/stores/editor'
import { useHistoryStore } from '~/stores/history'
import { useProjectStore } from '~/stores/project'

const project = useProjectStore()
const editor = useEditorStore()
const history = useHistoryStore()

const maxWidthM = ref(10)
const maxHeightM = ref(4)
const aspectPreset = ref('16:9')
const aspectCustom = ref('')
const rankMode = ref<OptimizerRankMode>('best_aspect')
const maxPanels = ref(80)

const rankModes: Array<{ label: string, value: OptimizerRankMode }> = [
  { label: 'Bestes Seitenverhältnis', value: 'best_aspect' },
  { label: 'Höchste Auflösung', value: 'highest_resolution' },
  { label: 'Minimale Panelanzahl', value: 'min_panels' },
  { label: 'Nächste Full HD', value: 'closest_fhd' },
  { label: 'Maximale Fläche', value: 'max_area' },
  { label: 'Niedrigste Kosten', value: 'lowest_cost' }
]

const aspectPresets = ['16:9', '16:10', '4:3', '21:9', '1:1', 'custom']

const desiredAspect = computed(() => {
  if (aspectPreset.value === 'custom') {
    return parseAspectRatioInput(aspectCustom.value) ?? 16 / 9
  }
  return parseAspectRatioInput(aspectPreset.value) ?? 16 / 9
})

const panelDefs = computed(() => {
  const jinyuan = project.panelDefinitions.filter(d =>
    d.id.startsWith('jinyuan-')
  )
  const rest = project.panelDefinitions.filter(d =>
    !d.id.startsWith('jinyuan-')
  )
  return [...jinyuan, ...rest]
})

const candidates = computed(() =>
  runOptimizer(panelDefs.value, {
    maxWidthMm: maxWidthM.value * 1000,
    maxHeightMm: maxHeightM.value * 1000,
    desiredAspect: desiredAspect.value,
    maxPanels: maxPanels.value,
    rankMode: rankMode.value
  }).slice(0, 12)
)

function applyCandidate(cols: number, rows: number, defId: string, createNew: boolean) {
  history.pushHistory()
  let wallId = editor.optimizerWallTargetId ?? editor.primaryWallId
  if (createNew || !wallId) {
    wallId = project.addWall('Optimierte Wand') ?? undefined
    if (wallId) editor.selectWall(wallId)
  }
  if (wallId) {
    project.setRectangularWall(wallId, defId, cols, rows)
  }
  history.pushHistory()
  editor.setView('editor')
}
</script>

<template>
  <div class="h-full overflow-y-auto p-4 text-sm">
    <h2 class="mb-3 text-lg font-semibold">
      Auflösungs-Optimizer
    </h2>
    <div class="mb-4 grid max-w-3xl grid-cols-2 gap-3 lg:grid-cols-3">
      <UFormField label="Max. Breite (m)">
        <UInput
          v-model.number="maxWidthM"
          type="number"
          step="0.1"
        />
      </UFormField>
      <UFormField label="Max. Höhe (m)">
        <UInput
          v-model.number="maxHeightM"
          type="number"
          step="0.1"
        />
      </UFormField>
      <UFormField label="Ziel-Seitenverhältnis">
        <USelect
          v-model="aspectPreset"
          :items="aspectPresets.map(p => ({ label: p === 'custom' ? 'Eigene Eingabe' : p, value: p }))"
        />
      </UFormField>
      <UFormField
        v-if="aspectPreset === 'custom'"
        label="Eigene Eingabe (z. B. 16:9)"
      >
        <UInput
          v-model="aspectCustom"
          placeholder="16:9"
        />
      </UFormField>
      <UFormField
        v-else
        label="Aktuelles Ziel"
      >
        <p class="pt-1 text-muted">
          {{ formatAspectRatio(desiredAspect) }}
        </p>
      </UFormField>
      <UFormField label="Sortierung">
        <USelect
          v-model="rankMode"
          :items="rankModes"
        />
      </UFormField>
      <UFormField label="Max. Panels">
        <UInput
          v-model.number="maxPanels"
          type="number"
        />
      </UFormField>
    </div>

    <div class="grid gap-2 lg:grid-cols-2">
      <UCard
        v-for="c in candidates"
        :key="`${c.panelDefinition.id}-${c.columns}x${c.rows}`"
        class="text-xs"
      >
        <div class="font-medium">
          {{ c.panelDefinition.name }}
        </div>
        <div>{{ c.columns }}×{{ c.rows }} = {{ c.totalPanels }} Panels</div>
        <div>{{ c.widthMm }}×{{ c.heightMm }} mm · {{ c.areaM2.toFixed(2) }} m²</div>
        <div class="font-mono text-highlighted">
          {{ c.nativeResolutionX }}×{{ c.nativeResolutionY }} px
        </div>
        <div class="text-muted">
          AR {{ formatAspectRatio(c.physicalAspect) }} · Abweichung {{ (c.aspectDeviation * 100).toFixed(1) }}%
        </div>
        <div class="mt-2 flex gap-1">
          <UButton
            size="xs"
            label="Neue Wand"
            @click="applyCandidate(c.columns, c.rows, c.panelDefinition.id, true)"
          />
          <UButton
            size="xs"
            variant="soft"
            label="Aktuelle Wand"
            :disabled="!editor.primaryWallId"
            @click="applyCandidate(c.columns, c.rows, c.panelDefinition.id, false)"
          />
        </div>
      </UCard>
    </div>
  </div>
</template>
