<script setup lang="ts">
import LayoutRenderer from '@/layouts/LayoutRenderer.vue';
import type { MokelayLayout, RenderBundlePage } from '@/layouts/domain';

defineProps<{
  layout: MokelayLayout | null;
  page: RenderBundlePage;
  error?: string;
}>();
</script>

<template>
  <LayoutRenderer v-if="layout" :layout="layout" :page="page">
    <template #pageSlot>
      <slot></slot>
    </template>
  </LayoutRenderer>

  <section v-else class="source-layout-shell source-layout-shell--fallback" data-testid="source-layout-fallback">
    <p v-if="error" class="source-layout-shell__error" data-testid="source-layout-error">{{ error }}</p>
    <slot></slot>
  </section>
</template>

<style scoped>
.source-layout-shell {
  min-height: 100%;
  background: rgb(241 245 249);
  color: rgb(15 23 42);
  padding: 12px;
}

.source-layout-shell--fallback {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.source-layout-shell__error {
  border: 1px solid rgb(252 165 165);
  background: rgb(254 242 242);
  color: rgb(153 27 27);
  margin: 0;
  padding: 10px 16px;
  font-size: 13px;
}

.dark .source-layout-shell {
  background: rgb(2 6 23);
  color: rgb(241 245 249);
}

.dark .source-layout-shell__error {
  border-color: rgb(127 29 29);
  background: rgb(127 29 29 / 0.24);
  color: rgb(254 202 202);
}

@media (max-width: 720px) {
  .source-layout-shell {
    padding: 8px;
  }
}
</style>
