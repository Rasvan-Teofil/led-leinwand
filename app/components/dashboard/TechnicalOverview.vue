<script setup lang="ts">
import { REFERENCE_KIND_LABELS_DE, WARNING_LABELS_DE, formatAspectRatio } from '#shared/i18n/messages-de'
import { useProjectMetrics, useWallMetrics } from '~/composables/useWallMetrics'
import { useEditorStore } from '~/stores/editor'
import { useProjectStore } from '~/stores/project'

const project = useProjectStore()
const editor = useEditorStore()
const totals = useProjectMetrics()

const activeWall = computed(() =>
  project.walls.find(w => w.id === editor.primaryWallId) ?? project.walls[0]
)
const wallMetrics = useWallMetrics(() => activeWall.value)
</script>

<template>
  <footer class="shrink-0 border-t border-default bg-elevated/80 px-3 py-2 text-xs">
    <div class="flex flex-wrap items-start gap-6">
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
      <div v-if="wallMetrics && activeWall">
        <div class="font-semibold text-muted uppercase tracking-wide">
          {{ activeWall.name }}
        </div>
        <div>
          {{ wallMetrics.dims.bboxWidthMm }}×{{ wallMetrics.dims.bboxHeightMm }} mm
          ({{ (wallMetrics.dims.bboxWidthMm / 1000).toFixed(2) }}×{{ (wallMetrics.dims.bboxHeightMm / 1000).toFixed(2) }} m)
        </div>
        <div>
          Native:
          <span
            v-if="wallMetrics.resolution.valid"
            class="font-mono text-highlighted"
          >
            {{ wallMetrics.resolution.resolutionX }}×{{ wallMetrics.resolution.resolutionY }}
            ({{ wallMetrics.resolution.totalPixels.toLocaleString() }} px)
          </span>
          <span
            v-else
            class="text-warning"
          >kein einheitliches Raster</span>
        </div>
        <div v-if="wallMetrics.physicalAspect">
          Phys. AR: {{ formatAspectRatio(wallMetrics.physicalAspect) }}
          <span
            v-if="wallMetrics.resolution.valid && wallMetrics.resolution.resolutionY > 0"
            class="text-muted"
          >
            · Pixel-AR:
            {{ formatAspectRatio(wallMetrics.resolution.resolutionX / wallMetrics.resolution.resolutionY) }}
          </span>
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
