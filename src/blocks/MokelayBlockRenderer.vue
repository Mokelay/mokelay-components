<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import {
  loadMokelayBlockDefinition,
  isMokelayBlockRegistered
} from '@/blocks/runtimeRegistry';
import type { MokelayBlock, MokelayBlockRenderDefinition } from '@/blocks/types';
import { normalizeBlockEvents } from '@/blocks/blockEvents';
import { normalizeSelectorBlock } from '@/blocks/storedBlocks';
import {
  PreviewBlockRuntimeKey,
  type PreviewRuntimeBlock
} from '@/runtime/previewBlockRuntime';
import {
  PageRuntimeVariableContextKey
} from '@/pages/runtimeContext';
import { PageLocaleConfigKey } from '@/pages/runtimeContext';
import { languageValue } from '@/runtime/globalSettingsRuntime';
import { isLocalizedValue, normalizePageLocaleConfig, resolveLocalizedTree } from '@/runtime/localization';
import { PageReferenceAncestryKey } from '@/pages/referenceRuntime';
import {
  isVariableValueConfig,
  readRuntimePath,
  resolveRuntimeValue,
  type VariableValueResolveContext
} from '@/runtime/variableValue';

interface MokelayBlockRendererProps {
  block: MokelayBlock;
  compactTable?: boolean;
}

const props = withDefaults(defineProps<MokelayBlockRendererProps>(), {
  compactTable: false
});

const tableClass = computed(() =>
  props.compactTable ? 'min-w-full border-collapse text-xs' : 'min-w-full border-collapse text-sm'
);

const previewRuntime = inject(PreviewBlockRuntimeKey, null);
const pageVariableContext = inject(PageRuntimeVariableContextKey, computed<VariableValueResolveContext>(() => ({})));
const pageLocaleConfig = inject(PageLocaleConfigKey, computed(() => normalizePageLocaleConfig(undefined, languageValue.value)));
const pageReferenceAncestry = inject(PageReferenceAncestryKey, computed<readonly string[]>(() => []));
const componentInstance = shallowRef<unknown | null>(null);
const loadedDefinition = shallowRef<MokelayBlockRenderDefinition | undefined>();
const componentLoadError = ref('');
const runtimeBlockData = shallowRef<Record<string, Record<string, unknown>>>({});
let registeredId = '';
let registeredInstance: unknown;
let blockDataLoadId = 0;
let componentLoadId = 0;
let unsubscribeBlockDataChanges: Array<() => void> = [];

const tableCellClass = computed(() =>
  props.compactTable
    ? 'border border-slate-200 px-2 py-1 text-left align-top dark:border-slate-700'
    : 'border border-slate-200 px-3 py-2 text-left align-top dark:border-slate-700'
);
const inlineTemplatePattern = /\{\{\s*([^}]+?)\s*\}\}/g;
const blockTemplateRefPattern = /blocks(?:\[['"]([^'"]+)['"]\]|\.([A-Za-z0-9_-]+))/g;

function getTableRows(block: MokelayBlock) {
  const content = (block.data as { withHeadings?: boolean; content?: unknown }).content;
  if (!Array.isArray(content)) return [];
  return content.filter((row): row is string[] => Array.isArray(row));
}

function shouldRenderTableHeaderCell(block: MokelayBlock, rowIndex: number) {
  const withHeadings = (block.data as { withHeadings?: unknown }).withHeadings;
  return rowIndex === 0 && withHeadings === true;
}

function isCustomBlock(type: string) {
  return isMokelayBlockRegistered(type);
}

function getBlockComponent(type: string) {
  return type === props.block.type ? loadedDefinition.value?.component ?? null : null;
}

function getBlockId(block: MokelayBlock) {
  return typeof block.id === 'string' ? block.id : '';
}

const resolvedBlockData = computed(() => resolveBlockData(props.block.data, props.block.type));
const selectedSelectorBlock = computed(() => (
  props.block.type === 'MEditorSelector'
    ? normalizeSelectorBlock(resolvedBlockData.value.value)
    : undefined
));
const paragraphHtml = computed(() => {
  const rawText = resolvedBlockData.value.text ?? (props.block.data as { text?: unknown }).text ?? '';
  return resolveInlineTemplate(typeof rawText === 'string' ? rawText : String(rawText ?? ''));
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getVariableResolveContext() {
  return {
    ...pageVariableContext.value,
    blocks: {
      ...(pageVariableContext.value.blocks ?? {}),
      ...runtimeBlockData.value
    }
  };
}

function isDatasourceConfig(value: unknown) {
  return isRecord(value) && (
    (value.type === 'API' && (
      Array.isArray(value.headerData) ||
      Array.isArray(value.queryData) ||
      Array.isArray(value.bodyData)
    )) ||
    (value.type === 'JSON' && Object.prototype.hasOwnProperty.call(value, 'rawData'))
  );
}

function shouldKeepDatasourceRuntimeConfig(blockType: string, propName: string, value: unknown) {
  if (blockType === 'MActionCardList' && propName === 'items' && isVariableValueConfig(value)) {
    return true;
  }
  if (!isDatasourceConfig(value)) return false;
  return propName === 'ds' || (blockType === 'MDatasourceEditor' && propName === 'value');
}

function resolveBlockData(data: unknown, blockType: string) {
  if (isRecord(data)) {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        shouldKeepDatasourceRuntimeConfig(blockType, key, value)
          ? value
          : resolveBlockRuntimeValue(value)
      ])
    );
  }

  const resolved = resolveBlockRuntimeValue(data);
  return isRecord(resolved) ? resolved : {};
}

function resolveBlockRuntimeValue(value: unknown): unknown {
  if (isLocalizedValue(value)) {
    return resolveLocalizedTree(value, {
      locale: languageValue.value === 'en' ? 'en-US' : 'zh-CN',
      localeConfig: pageLocaleConfig.value
    });
  }
  if (isVariableValueConfig(value)) {
    return resolveRuntimeValue(value, getVariableResolveContext());
  }

  if (Array.isArray(value)) {
    if (isNestedBlockArray(value)) return value;
    return value.map((item) => resolveBlockRuntimeValue(item));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        key === 'blocks' && isNestedBlockArray(item)
          ? item
          : resolveBlockRuntimeValue(item)
      ])
    );
  }

  return value;
}

function getResolvedBlockData(block: MokelayBlock) {
  if (block === props.block) return resolvedBlockData.value;
  return resolveBlockData(block.data, block.type);
}

function getBlockProps(block: MokelayBlock) {
  const definition = block.type === props.block.type ? loadedDefinition.value : undefined;
  const data = getResolvedBlockData(block);
  const currentBlockId = getBlockId(block);
  if (!definition) {
    return {
      edit: false,
      ...data
    };
  }

  return {
    ...(definition.normalizeProps?.({
      ...data,
      edit: false,
      currentBlockId
    }) ?? { ...data, edit: false, currentBlockId }),
    currentBlockId,
    onChange: notifyRuntimeValueChange,
    onToolChange: notifyRuntimeValueChange
  };
}

async function loadBlockComponent() {
  const loadId = ++componentLoadId;
  loadedDefinition.value = undefined;
  componentLoadError.value = '';
  if (!isCustomBlock(props.block.type)) return;

  try {
    const definition = await loadMokelayBlockDefinition(props.block.type);
    if (loadId !== componentLoadId) return;
    if (!definition) {
      throw new Error('未注册的 Block: ' + props.block.type);
    }
    loadedDefinition.value = definition;
  } catch (error) {
    if (loadId !== componentLoadId) return;
    componentLoadError.value = error instanceof Error ? error.message : String(error);
  }
}

function notifyRuntimeValueChange() {
  const blockId = getBlockId(props.block);
  if (!blockId) return;
  previewRuntime?.notifyBlockDataChange(blockId);
}

function stringifyTemplateValue(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveInlineTemplate(text: string) {
  return text.replace(inlineTemplatePattern, (_match, path: string) => {
    const value = readRuntimePath(getVariableResolveContext(), path);
    return escapeHtml(stringifyTemplateValue(value));
  });
}

function unregisterCurrentBlock() {
  if (!previewRuntime || !registeredId) return;
  previewRuntime.unregisterBlock(registeredId, registeredInstance);
  registeredId = '';
  registeredInstance = undefined;
}

function registerCurrentBlock() {
  const id = getBlockId(props.block);
  const instance = componentInstance.value;
  if (!previewRuntime || !id || !instance || !isCustomBlock(props.block.type)) return;

  previewRuntime.registerBlock(id, {
    id,
    type: props.block.type,
    instance,
    data: resolvedBlockData.value
  });
  registeredId = id;
  registeredInstance = instance;
}

function setComponentRef(instance: unknown) {
  unregisterCurrentBlock();
  componentInstance.value = instance;
  if (instance) {
    registerCurrentBlock();
  }
}

const blockEventListeners = computed(() => {
  const listeners: Record<string, (event: unknown) => void> = {};
  const events = normalizeBlockEvents(resolveBlockRuntimeValue(props.block.events));

  events.forEach((eventConfig) => {
    if (!eventConfig.event) return;
    const previousListener = listeners[eventConfig.event];
    listeners[eventConfig.event] = (event: unknown) => {
      previousListener?.(event);
      previewRuntime?.invokeBlockActions(eventConfig, {
        ...props.block,
        data: resolvedBlockData.value,
        _pageAncestry: [...pageReferenceAncestry.value],
        _variableContext: getVariableResolveContext()
      } as PreviewRuntimeBlock & { _pageAncestry: string[] }, event);
    };
  });

  return listeners;
});

async function loadRuntimeBlockData() {
  const loadId = ++blockDataLoadId;
  const blocks = await previewRuntime?.getBlockDataContext(getBlockId(props.block)) ?? {};
  if (loadId !== blockDataLoadId) return;
  runtimeBlockData.value = blocks;
}

function collectStringReferencedBlockIds(value: string, result: Set<string>) {
  for (const match of value.matchAll(blockTemplateRefPattern)) {
    const blockId = (match[1] ?? match[2] ?? '').trim();
    if (blockId) result.add(blockId);
  }
}

function collectReferencedBlockIds(value: unknown, result = new Set<string>()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectReferencedBlockIds(item, result));
    return result;
  }

  if (typeof value === 'string') {
    collectStringReferencedBlockIds(value, result);
    return result;
  }

  if (!isRecord(value)) return result;

  if (
    value.mode === 'variable' &&
    (value.source === undefined || value.source === 'Block') &&
    typeof value.blockId === 'string' &&
    value.blockId.trim()
  ) {
    result.add(value.blockId.trim());
  }

  Object.entries(value).forEach(([key, item]) => {
    // Nested preview blocks register their own dependencies; the container must stay stable.
    if (key === 'blocks' && isNestedBlockArray(item)) return;
    collectReferencedBlockIds(item, result);
  });
  return result;
}

function isNestedBlockArray(value: unknown) {
  return Array.isArray(value) && value.some((item) => (
    isRecord(item) && typeof item.type === 'string' && isRecord(item.data)
  ));
}

function getReferencedBlockIdsSignature() {
  return [...collectReferencedBlockIds(props.block.data)].sort().join('|');
}

function resetBlockDataSubscriptions() {
  unsubscribeBlockDataChanges.forEach((unsubscribe) => unsubscribe());
  unsubscribeBlockDataChanges = [];

  if (!previewRuntime) return;

  unsubscribeBlockDataChanges = [...collectReferencedBlockIds(props.block.data)]
    .filter((blockId) => blockId !== getBlockId(props.block))
    .map((blockId) => previewRuntime.subscribeBlockDataChange(blockId, () => {
      void loadRuntimeBlockData();
    }));
}

watch(
  () => [props.block.id, props.block.type, resolvedBlockData.value],
  () => {
    unregisterCurrentBlock();
    registerCurrentBlock();
  },
  { deep: true }
);

watch(
  () => props.block.type,
  () => {
    void loadBlockComponent();
  }
);

watch(loadedDefinition, () => {
  unregisterCurrentBlock();
  registerCurrentBlock();
});

watch(
  () => props.block.data,
  () => {
    void loadRuntimeBlockData();
  },
  { deep: true, immediate: true }
);

watch(
  getReferencedBlockIdsSignature,
  () => {
    resetBlockDataSubscriptions();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  componentLoadId += 1;
  unsubscribeBlockDataChanges.forEach((unsubscribe) => unsubscribe());
  unregisterCurrentBlock();
});

onMounted(() => {
  void loadBlockComponent();
});
</script>

<template>
  <p v-if="block.type === 'paragraph'" class="text-sm leading-6" v-html="paragraphHtml"></p>

  <div v-else-if="block.type === 'table'" class="overflow-auto">
    <table :class="tableClass">
      <tbody>
        <tr
          v-for="(row, rowIndex) in getTableRows(block)"
          :key="`table-${rowIndex}`"
          class="border-b border-slate-200 dark:border-slate-700"
        >
          <component
            :is="shouldRenderTableHeaderCell(block, rowIndex) ? 'th' : 'td'"
            v-for="(cell, cellIndex) in row"
            :key="`table-${rowIndex}-${cellIndex}`"
            :class="tableCellClass"
            v-html="cell"
          />
        </tr>
      </tbody>
    </table>
  </div>

  <div
    v-else-if="block.type === 'MEditorSelector'"
    class="min-w-0"
    data-testid="preview-editor-selector-value"
  >
    <MokelayBlockRenderer v-if="selectedSelectorBlock" :block="selectedSelectorBlock" />
  </div>

  <p v-else-if="isCustomBlock(block.type) && componentLoadError" class="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/60 dark:bg-red-950/30 dark:text-red-200">
    {{ componentLoadError }}
    <button type="button" class="ml-2 underline" @click="loadBlockComponent">重试</button>
  </p>

  <p v-else-if="isCustomBlock(block.type) && !loadedDefinition" data-testid="preview-block-loading" class="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
    页面加载中...
  </p>

  <component
    :is="getBlockComponent(block.type)"
    v-else-if="isCustomBlock(block.type)"
    :ref="setComponentRef"
    v-bind="getBlockProps(block)"
    v-on="blockEventListeners"
  />

  <pre v-else class="overflow-auto rounded bg-slate-100 p-2 text-xs dark:bg-slate-800">{{ block }}</pre>
</template>
