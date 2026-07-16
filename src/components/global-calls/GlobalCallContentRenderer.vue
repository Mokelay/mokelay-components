<script setup lang="ts">
import { computed } from 'vue';
import { getInlineRuntimeComponentDefinition } from '@/blocks/inlineRuntimeComponents';
import {
  getParagraphText,
  normalizeStoredBlocks,
  type StoredBlock
} from '@/blocks/storedBlocks';
import type { GlobalCallContent } from '@/components/global-calls/globalCalls';

const props = defineProps<{
  content: GlobalCallContent;
}>();

const isTextContent = computed(() => typeof props.content === 'string');
const textContent = computed(() => (typeof props.content === 'string' ? props.content : ''));
const blocks = computed<StoredBlock[]>(() => (Array.isArray(props.content) ? normalizeStoredBlocks(props.content) : []));

function getPreviewComponent(type: string) {
  return getInlineRuntimeComponentDefinition(type)?.component ?? null;
}

function getBlockText(block: StoredBlock) {
  return getParagraphText(block);
}

function getPreviewProps(block: StoredBlock) {
  const definition = getInlineRuntimeComponentDefinition(block.type);
  if (!definition) return { edit: false };

  return {
    ...definition.normalizeProps({
      ...block.data,
      edit: false,
      currentBlockId: block.id
    }),
    currentBlockId: block.id
  };
}
</script>

<template>
  <div class="global-call-content" data-testid="global-call-content">
    <span v-if="isTextContent" class="global-call-content__text">{{ textContent }}</span>

    <template v-else>
      <template v-for="(block, index) in blocks" :key="`${block.id}-${block.type}-${index}`">
        <span v-if="block.type === 'paragraph'" class="global-call-content__text">{{ getBlockText(block) }}</span>
        <span v-else-if="getPreviewComponent(block.type)" class="global-call-content__token">
          <component :is="getPreviewComponent(block.type)" v-bind="getPreviewProps(block)" />
        </span>
        <span v-else class="global-call-content__unknown">{{ block.type }}</span>
      </template>
    </template>
  </div>
</template>

<style scoped>
.global-call-content {
  display: inline;
  max-width: 100%;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.6;
}

.global-call-content__text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.global-call-content__token {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  margin: 0 2px;
  vertical-align: middle;
}

.global-call-content__unknown {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  margin: 0 2px;
  border-radius: 8px;
  background: rgb(241 245 249);
  padding: 2px 8px;
  color: rgb(71 85 105);
  font-size: 12px;
  vertical-align: middle;
}

.dark .global-call-content__unknown {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}
</style>
