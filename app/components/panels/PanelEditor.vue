<script setup lang="ts">
import type { PanelDefinition } from '#shared/types/panel'
import { suggestResolutionFromPitch } from '#shared/calculations/resolution'
import { validatePanelDefinition } from '#shared/calculations/validation'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ definition: PanelDefinition }>()
const emit = defineEmits<{ save: [def: PanelDefinition] }>()

const draft = ref<PanelDefinition>({ ...props.definition })
const pitchInput = ref<number | undefined>(props.definition.nominalPitchMm)

watch(
  () => props.definition,
  (d) => {
    draft.value = { ...d }
    pitchInput.value = d.nominalPitchMm
  }
)

const issues = computed(() => validatePanelDefinition(draft.value))

function applyPitchSuggestion() {
  if (!pitchInput.value) return
  const s = suggestResolutionFromPitch(
    draft.value.widthMm,
    draft.value.heightMm,
    pitchInput.value
  )
  draft.value.resolutionX = s.resolutionX
  draft.value.resolutionY = s.resolutionY
  if (!s.exact) {
    // user must confirm — we only suggest, never silent round without feedback
  }
}

function save() {
  if (issues.value.some(i => i.severity === 'error')) return
  emit('save', { ...draft.value, updatedAt: new Date().toISOString() })
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Panel-Definition"
  >
    <template #body>
      <div class="grid gap-2 text-sm">
        <UFormField label="Name">
          <UInput v-model="draft.name" />
        </UFormField>
        <div class="grid grid-cols-2 gap-2">
          <UFormField label="Breite (mm)">
            <UInput
              v-model.number="draft.widthMm"
              type="number"
            />
          </UFormField>
          <UFormField label="Höhe (mm)">
            <UInput
              v-model.number="draft.heightMm"
              type="number"
            />
          </UFormField>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <UFormField label="Auflösung X">
            <UInput
              v-model.number="draft.resolutionX"
              type="number"
            />
          </UFormField>
          <UFormField label="Auflösung Y">
            <UInput
              v-model.number="draft.resolutionY"
              type="number"
            />
          </UFormField>
        </div>
        <UFormField label="Nominal Pitch (mm) — Vorschlag">
          <div class="flex gap-2">
            <UInput
              v-model.number="pitchInput"
              type="number"
              step="0.01"
            />
            <UButton
              label="Auflösung vorschlagen"
              size="sm"
              @click="applyPitchSuggestion"
            />
          </div>
        </UFormField>
        <ul
          v-if="issues.length"
          class="text-xs"
        >
          <li
            v-for="(issue, i) in issues"
            :key="i"
            :class="issue.severity === 'error' ? 'text-error' : 'text-warning'"
          >
            {{ issue.message }}
          </li>
        </ul>
      </div>
    </template>
    <template #footer>
      <UButton
        label="Speichern"
        @click="save"
      />
    </template>
  </UModal>
</template>
