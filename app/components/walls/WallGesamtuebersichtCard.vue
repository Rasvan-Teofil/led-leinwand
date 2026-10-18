<script setup lang="ts">
import type { WallOverviewSummary } from '#shared/calculations/wall-overview'

defineProps<{
  summary: WallOverviewSummary
  title?: string
}>()
</script>

<template>
  <section
    class="rounded-lg border border-default bg-default/40 p-3"
    data-testid="gesamtuebersicht-card"
  >
    <div
      v-if="title"
      class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted"
    >
      {{ title }}
    </div>
    <p class="mb-3 text-center text-xs text-muted">
      {{ summary.layoutSubtitle }}
    </p>
    <div class="grid grid-cols-2 gap-x-3 gap-y-4">
      <div>
        <div class="text-[10px] uppercase tracking-wide text-muted">
          Gesamtmaße
        </div>
        <div class="text-base font-semibold text-highlighted">
          {{ summary.overallSize }}
        </div>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-wide text-muted">
          Native Auflösung
        </div>
        <div class="text-base font-semibold text-highlighted">
          {{ summary.nativeResolution }}
        </div>
        <p
          v-if="summary.nativeResolutionNote"
          class="mt-0.5 text-[10px] text-warning"
        >
          {{ summary.nativeResolutionNote }}
        </p>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-wide text-muted">
          Panels / Fläche
        </div>
        <div class="text-base font-semibold text-highlighted">
          {{ summary.panelsArea }}
        </div>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-wide text-muted">
          Effektiver Pixelpitch
        </div>
        <div class="text-base font-semibold text-highlighted">
          {{ summary.effectivePitch }}
        </div>
        <p
          v-if="summary.effectivePitchNote"
          class="mt-0.5 text-[10px] text-muted"
        >
          {{ summary.effectivePitchNote }}
        </p>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-wide text-muted">
          Seitenverhältnis (physisch)
        </div>
        <div class="text-base font-semibold text-highlighted">
          {{ summary.physicalAspect }}
        </div>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-wide text-muted">
          {{ summary.usesActivePixels ? 'Aktive Pixel' : 'Native Gesamtpixel' }}
        </div>
        <div class="text-base font-semibold text-highlighted">
          {{ summary.totalPixels }}
        </div>
        <p
          v-if="summary.totalPixelsNote"
          class="mt-0.5 text-[10px] text-muted"
        >
          {{ summary.totalPixelsNote }}
        </p>
      </div>
    </div>
  </section>
</template>
