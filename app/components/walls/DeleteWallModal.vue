<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ wallName: string }>()
const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <UModal
    v-model:open="open"
    title="Wand löschen?"
  >
    <template #body>
      <p class="text-sm">
        „{{ props.wallName }}“ und alle Panels wirklich löschen? Dieser Schritt ist per Undo rückgängig zu machen.
      </p>
    </template>
    <template #footer>
      <UButton
        label="Abbrechen"
        variant="ghost"
        @click="open = false"
      />
      <UButton
        label="Wand löschen"
        color="error"
        @click="emit('confirm'); open = false"
      />
    </template>
  </UModal>
</template>
