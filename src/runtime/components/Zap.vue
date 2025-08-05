<script setup lang="ts">
defineProps({
  title: {
    type: String,
    required: false,
  },
})
const open = ref(false)
</script>

<template>
  <UPopover v-model:open="open">
    <UButton color="primary">
      <Icon name="clarity:lightning-solid" />
      {{ title }}
    </UButton>
    <template #content>
      <div class="size-48 m-4 bg-gray-300 rounded animate-pulse">
        <h1>Hello</h1>
        <p>Adding some text to the placeholder </p>
      </div>
    </template>
  </UPopover>
</template>

<style scoped>

</style>
