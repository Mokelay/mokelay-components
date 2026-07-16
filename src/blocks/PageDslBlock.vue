<script setup lang="ts">
defineProps<{
  blockType: string;
}>();
</script>

<template>
  <div
    class="page-dsl-block"
    :data-testid="`page-dsl-block-${blockType}`"
  >
    <slot />
  </div>
</template>

<style scoped>
.page-dsl-block {
  width: 100%;
  color: rgb(15 23 42);
}

.dark .page-dsl-block {
  color: rgb(241 245 249);
}
</style>
