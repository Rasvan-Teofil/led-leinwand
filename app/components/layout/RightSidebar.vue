<script setup lang="ts">
</script>

<template>
  <aside class="flex h-full w-72 shrink-0 flex-col border-l border-default bg-elevated/50">
    <div class="border-b border-default px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
      Inspector
    </div>
    <div class="flex-1 overflow-y-auto">
      <InspectorPropertiesInspector />
    </div>
  </aside>
</template>
