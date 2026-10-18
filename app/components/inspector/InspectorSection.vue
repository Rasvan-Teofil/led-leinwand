<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string
    defaultOpen?: boolean
  }>(),
  { defaultOpen: true }
)

const open = ref(props.defaultOpen)
</script>

<template>
  <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)]/40">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)] hover:text-[var(--app-text)]"
      @click="open = !open"
    >
      <span>{{ title }}</span>
      <UIcon
        :name="open ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
        class="size-4 shrink-0"
      />
    </button>
    <div
      v-show="open"
      class="space-y-3 border-t border-[var(--app-border)] px-3 py-3"
    >
      <slot />
    </div>
  </section>
</template>
