<script setup lang="ts">
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  htmlAttrs: { lang: 'de' },
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'
    }
  ]
})

const colorMode = useColorMode()
colorMode.preference = 'dark'
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
