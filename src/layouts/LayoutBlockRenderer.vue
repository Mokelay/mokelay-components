<script setup lang="ts">
import { computed, defineAsyncComponent, useSlots } from 'vue';
import type { MokelayBlock } from '@/blocks/types';
import {
  type LayoutRuntimeContext
} from '@/layouts/runtime';
import type { LayoutBlock } from '@/layouts/domain';
import {
  defaultResolveLayoutBlockData,
  getLayoutBlockDefinition
} from '@/layouts/layoutBlockRegistry';
import { normalizeLayoutBlocks } from '@/layouts/topNavRuntime';

defineOptions({
  name: 'LayoutBlockRenderer'
});

const MPage = defineAsyncComponent(() => import('@/blocks/MPage.vue'));

const props = defineProps<{
  block: LayoutBlock;
  context: LayoutRuntimeContext;
}>();

const slots = useSlots();
const blockDefinition = computed(() => getLayoutBlockDefinition(props.block.type));
const hasPageSlot = computed(() => Boolean(slots.pageSlot));

const resolvedDataResult = computed(() => {
  try {
    const definition = blockDefinition.value;

    if (!definition) {
      return {
        data: {},
        error: `Layout block was not registered: ${props.block.type}`
      };
    }

    const resolver = definition.resolveData ?? defaultResolveLayoutBlockData;
    const value = resolver(props.block.data ?? {}, props.context, props.block);

    return {
      data: isRecord(value) ? value : {},
      error: ''
    };
  } catch (error) {
    return {
      data: {},
      error: error instanceof Error ? error.message : 'Layout template failed.'
    };
  }
});

const resolvedData = computed(() => resolvedDataResult.value.data);
const resolvedError = computed(() => resolvedDataResult.value.error);
const pageSlotSurface = computed(() => resolvedData.value.surface === 'panel' ? 'panel' : 'plain');
const isPageSlotPanel = computed(() => pageSlotSurface.value === 'panel');
const conditionMatched = computed(() => Boolean(resolvedData.value.condition));
const ifBlocks = computed(() => normalizeLayoutBlocks(conditionMatched.value
  ? resolvedData.value.thenBlocks ?? resolvedData.value.blocks
  : resolvedData.value.elseBlocks));
const componentToRender = computed(() => blockDefinition.value?.kind === 'component'
  ? blockDefinition.value.component
  : undefined);
const defaultSlotBlocks = computed(() => normalizeLayoutBlocks(props.block.slots?.default));
const componentProps = computed(() => {
  const definition = blockDefinition.value;
  if (!definition || definition.kind !== 'component') return {};

  return definition.normalizeProps?.({
    block: props.block,
    data: resolvedData.value,
    context: props.context
  }) ?? {
    block: props.block,
    data: resolvedData.value,
    context: props.context
  };
});
const previewBlock = computed(() => ({
  id: props.block.id,
  type: props.block.type,
  data: resolvedData.value,
  ...(Array.isArray(props.block.events) ? { events: props.block.events } : {}),
  ...(props.block.slots ? { slots: props.block.slots } : {})
}) as MokelayBlock);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
</script>

<template>
  <pre v-if="resolvedError" data-testid="layout-block-error" class="layout-block-error">{{ resolvedError }}</pre>

  <div
    v-else-if="blockDefinition?.kind === 'pageSlot'"
    :class="['layout-page-slot', { 'layout-page-slot--panel': isPageSlotPanel }]"
    :data-testid="isPageSlotPanel ? 'layout-page-slot-panel' : undefined"
    :data-layout-page-slot-surface="pageSlotSurface"
  >
    <slot v-if="hasPageSlot" name="pageSlot"></slot>
    <MPage
      v-else
      :edit="false"
      :value="context.page.blocks"
      :page-id="context.page.uuid"
      :data-sources="context.page.dataSources"
      :runtime-context="context.pageContext"
    />
  </div>

  <template v-else-if="blockDefinition?.kind === 'conditional'">
    <LayoutBlockRenderer
      v-for="(childBlock, index) in ifBlocks"
      :key="childBlock.id || `${childBlock.type}-${index}`"
      :block="childBlock"
      :context="context"
    >
      <template v-if="hasPageSlot" #pageSlot>
        <slot name="pageSlot"></slot>
      </template>
    </LayoutBlockRenderer>
  </template>

  <component
    :is="componentToRender"
    v-else-if="componentToRender"
    v-bind="componentProps"
  >
    <LayoutBlockRenderer
      v-for="(slotBlock, index) in defaultSlotBlocks"
      :key="slotBlock.id || `${slotBlock.type}-${index}`"
      :block="slotBlock"
      :context="context"
    >
      <template v-if="hasPageSlot" #pageSlot>
        <slot name="pageSlot"></slot>
      </template>
    </LayoutBlockRenderer>
  </component>

  <pre v-else data-testid="layout-block-error" class="layout-block-error">{{ previewBlock }}</pre>
</template>

<style scoped>
.layout-block-error {
  overflow: auto;
  border: 1px solid rgb(252 165 165);
  border-radius: 8px;
  background: rgb(254 242 242);
  color: rgb(153 27 27);
  font-size: 12px;
  line-height: 18px;
  margin: 8px 0;
  padding: 10px;
}

.layout-page-slot {
  min-width: 0;
}

.layout-page-slot--panel {
  border: 1px solid rgb(226 232 240);
  border-radius: 12px;
  background: rgb(255 255 255);
  padding: 16px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.06);
}

.dark .layout-block-error {
  border-color: rgb(127 29 29);
  background: rgb(127 29 29 / 0.24);
  color: rgb(254 202 202);
}

.dark .layout-page-slot--panel {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
}
</style>
