<script lang="ts">

export interface MDividerLineProps {
  edit: boolean;
}
</script>

<script setup lang="ts">
defineProps<MDividerLineProps & {
  onChange?: (payload: MDividerLineProps) => void;
  onToolChange?: (payload: MDividerLineProps) => void;
}>();
</script>

<template>
  <div
    class="ce-divider-line-tool"
    data-testid="editor-divider-line-tool"
    role="separator"
    aria-orientation="horizontal"
  >
    <span class="ce-divider-line-tool__line"></span>
  </div>
</template>

<style scoped>
.ce-divider-line-tool {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 32px;
  padding: 8px 0;
}

.ce-divider-line-tool__line {
  display: block;
  width: 100%;
  height: 1px;
  background-color: rgb(203 213 225);
}

.dark .ce-divider-line-tool__line {
  background-color: rgb(71 85 105);
}
</style>
