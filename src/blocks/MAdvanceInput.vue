<script lang="ts">
import type { StoredBlock } from '@/blocks/storedBlocks';

export interface MAdvanceInputProps {
  edit: boolean;
  value?: StoredBlock[];
}
</script>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { getInlineRuntimeComponentDefinition } from '@/blocks/inlineRuntimeComponents';
import { PageRuntimeVariableContextKey } from '@/pages/runtimeContext';
import {
  getParagraphText,
  normalizeStoredBlocks
} from '@/blocks/storedBlocks';
import { resolveRuntimeValue, type VariableValueResolveContext } from '@/runtime/variableValue';

const props = defineProps<MAdvanceInputProps & {
  onChange?: (payload: MAdvanceInputProps) => void;
  onToolChange?: (payload: MAdvanceInputProps) => void;
}>();

const pageVariableContext = inject(
  PageRuntimeVariableContextKey,
  computed<VariableValueResolveContext>(() => ({}))
);
const segments = computed(() => normalizeStoredBlocks(props.value));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRuntimeComponent(type: string) {
  return getInlineRuntimeComponentDefinition(type)?.component ?? null;
}

function getRuntimeProps(block: StoredBlock) {
  const definition = getInlineRuntimeComponentDefinition(block.type);
  if (!definition) return { edit: props.edit };

  const data = resolveRuntimeValue(block.data, pageVariableContext.value);
  return {
    ...definition.normalizeProps({
      ...(isRecord(data) ? data : {}),
      edit: props.edit,
      currentBlockId: block.id
    }),
    currentBlockId: block.id
  };
}
</script>

<template>
  <div
    class="mokelay-advance-input"
    :class="{ 'mokelay-advance-input--preview-edit': edit }"
    :data-edit-context="edit ? 'true' : undefined"
    data-testid="preview-advance-input-value"
  >
    <template v-for="(block, index) in segments" :key="`${block.id}-${block.type}-${index}`">
      <span v-if="block.type === 'paragraph'" class="mokelay-advance-input__text">
        {{ getParagraphText(block) }}
      </span>
      <span v-else-if="getRuntimeComponent(block.type)" class="mokelay-advance-input__token">
        <component :is="getRuntimeComponent(block.type)" v-bind="getRuntimeProps(block)" />
      </span>
      <span v-else class="mokelay-advance-input__unknown">{{ block.type }}</span>
    </template>
  </div>
</template>

<style scoped>
.mokelay-advance-input {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 42px;
  width: 100%;
  border: 1px solid rgb(148 163 184 / 0.6);
  border-radius: 10px;
  padding: 9px 12px;
  background: rgb(255 255 255);
  white-space: pre;
  overflow-x: auto;
  overflow-y: hidden;
  line-height: 22px;
}

.mokelay-advance-input--preview-edit {
  cursor: default;
  user-select: none;
}

.mokelay-advance-input__token {
  display: inline-flex;
  align-items: center;
  margin: 0 2px;
  vertical-align: middle;
}

.mokelay-advance-input__unknown {
  border-radius: 10px;
  padding: 2px 8px;
  background: rgb(248 250 252);
  color: rgb(71 85 105);
  font-size: 12px;
}

.dark .mokelay-advance-input {
  border-color: rgb(71 85 105 / 0.9);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

.dark .mokelay-advance-input__unknown {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}
</style>
