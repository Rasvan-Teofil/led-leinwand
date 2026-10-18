<script setup lang="ts">
import { REFERENCE_KIND_LABELS_DE, WARNING_LABELS_DE } from '#shared/i18n/messages-de'
import { useProjectMetrics, useWallMetrics } from '~/composables/useWallMetrics'
import { useWallOverviewSummary } from '~/composables/useWallOverviewSummary'
import { useEditorStore } from '~/stores/editor'
import { useProjectStore } from '~/stores/project'

const project = useProjectStore()
const editor = useEditorStore()
const totals = useProjectMetrics()
const overview = useWallOverviewSummary()

const activeWall = computed(() =>
  project.walls.find(w => w.id === editor.primaryWallId) ?? project.walls[0]
)
const wallMetrics = useWallMetrics(() => activeWall.value)
</script>

<template>
  <footer class="shrink-0 border-t border-default bg-elevated/80 px-3 py-3 text-xs">
    <div class="flex flex-wrap items-start gap-6">
      <div class="min-w-[200px] flex-1">
        <WallsWallGesamtuebersichtCard
          title="Gesamtübersicht"
          :summary="overview"
        />
      </div>
      <div>
        <div class="font-semibold text-muted uppercase tracking-wide">
          Projekt
        </div>
        <div>{{ totals.wallCount }} Wände · {{ totals.panels }} Panels</div>
        <div>Aktive Fläche: {{ totals.activeAreaM2.toFixed(2) }} m²</div>
        <div
          v-if="totals.incomplete"
          class="text-warning"
        >
          Summen unvollständig (fehlende Gewicht/Leistung/Preis-Daten)
        </div>
      </div>
      <div
        v-if="wallMetrics && activeWall"
        class="max-w-sm"
      >
        <div class="font-semibold text-muted uppercase tracking-wide">
          {{ activeWall.name }} · Details
        </div>
        <ul
          v-if="wallMetrics.resolution.warnings.length"
          class="text-warning"
        >
          <li
            v-for="(w, i) in wallMetrics.resolution.warnings"
            :key="i"
          >
            {{ WARNING_LABELS_DE[w] ?? w }}
          </li>
        </ul>
        <ul class="mt-1 text-muted">
          <li
            v-for="ref in wallMetrics.references"
            :key="ref.label"
          >
            {{ ref.label }}: {{ REFERENCE_KIND_LABELS_DE[ref.kind] ?? ref.kind }}
          </li>
        </ul>
      </div>
    </div>
  </footer>
</template>
