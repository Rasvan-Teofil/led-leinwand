<script setup lang="ts">
import type { PanelDefinition } from '#shared/types/panel'
import { formatMmPairDe } from '#shared/format/de-de'
import { pitchXMm, pitchYMm } from '#shared/types/panel'

defineProps<{
  definitions: PanelDefinition[]
  selectedDefinitionId: string | null
}>()

const emit = defineEmits<{
  drag: [id: string]
  select: [id: string]
  edit: [def: PanelDefinition]
}>()

function formatPitch(def: PanelDefinition) {
  const px = pitchXMm(def)
  return def.nominalPitchMm
    ? `P${def.nominalPitchMm} (≈${px.toFixed(2)} mm)`
    : `${px.toFixed(2)}×${pitchYMm(def).toFixed(2)} mm`
}

function onDragStart(e: DragEvent, defId: string) {
  e.dataTransfer?.setData('text/plain', defId)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
  emit('select', defId)
  emit('drag', defId)
}
</script>

<template>
  <section>
    <h3 class="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
      Panel-Bibliothek
    </h3>
    <ul class="max-h-64 space-y-1 overflow-y-auto">
      <li
        v-for="def in definitions"
        :key="def.id"
        draggable="true"
        :data-testid="`library-panel-${def.id}`"
        class="cursor-grab rounded-md border px-2 py-1.5 text-xs hover:border-[var(--app-muted)]"
        :class="
          selectedDefinitionId === def.id
            ? 'border-[var(--app-text)] bg-[var(--app-surface-2)] ring-1 ring-[var(--app-border)]'
            : 'border-[var(--app-border)] bg-[var(--app-surface-2)]'
        "
        @click="emit('select', def.id)"
        @dragstart="(e: DragEvent) => onDragStart(e, def.id)"
      >
        <div class="flex items-start justify-between gap-1">
          <span class="font-medium leading-tight">{{ def.name }}</span>
          <UButton
            size="xs"
            variant="ghost"
            icon="i-lucide-pencil"
            @click.stop="emit('edit', def)"
          />
        </div>
        <div class="text-muted">
          {{ formatMmPairDe(def.widthMm, def.heightMm) }} · {{ def.resolutionX }}×{{ def.resolutionY }} px
        </div>
        <div class="text-muted">
          {{ formatPitch(def) }}
        </div>
        <p
          v-if="def.disclaimer"
          class="mt-0.5 text-[10px] text-warning"
        >
          {{ def.disclaimer }}
        </p>
      </li>
    </ul>
  </section>
</template>
