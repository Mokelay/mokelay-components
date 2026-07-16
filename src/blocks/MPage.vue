<script setup lang="ts">
import { computed, inject, onBeforeUnmount, provide, ref, watch } from 'vue';
import MokelayBlockRenderer from '@/blocks/MokelayBlockRenderer.vue';
import type { MokelayBlock, MokelayPageDocument } from '@/blocks/types';
import {
  createPreviewBlockRuntime,
  PreviewBlockRuntimeKey,
  type BlockRuntimeHandle
} from '@/runtime/previewBlockRuntime';
import {
  normalizePageDataSources,
  PageRuntimeContextKey,
  PageRuntimeDataKey,
  PageRuntimeVariableContextKey,
  resolvePageDataSources,
  type PageDataSourceConfig,
  type PageRuntimeContext,
  type PageRuntimeData
} from '@/pages/runtimeContext';
import {
  getRegisteredPageVariableRuntimes,
  registerPageVariableRuntime,
  unregisterPageVariableRuntime,
  type VariableValueResolveContext
} from '@/runtime/variableValue';
import {
  appendPageReferenceAncestry,
  PageReferenceAncestryKey
} from '@/pages/referenceRuntime';

export interface MPageProps {
  edit?: boolean;
  value?: MokelayBlock[];
  pageId?: string;
  dataSources?: PageDataSourceConfig[];
  runtimeContext?: PageRuntimeContext;
  context?: PageRuntimeContext;
  onToolChange?: (payload: { edit: boolean; value: MokelayBlock[] }) => void;
}

const props = withDefaults(defineProps<MPageProps>(), {
  edit: false,
  value: () => [],
  dataSources: () => []
});

const emit = defineEmits<{
  (event: 'change', blocks: MokelayBlock[]): void;
  (event: 'close', result?: unknown): void;
}>();

type RuntimeColumnData = { blocks?: MokelayBlock[] };

const previewBlocks = computed(() => Array.isArray(props.value) ? props.value : []);
const pageRuntimeContext = computed<PageRuntimeContext>(() => props.runtimeContext ?? props.context ?? {});
const normalizedDataSources = computed(() => normalizePageDataSources(props.dataSources));
const pageRuntimeData = ref<PageRuntimeData>({});
const pageDataLoading = ref(false);
const pageDataError = ref('');
const parentPreviewRuntime = inject(PreviewBlockRuntimeKey, null);
const previewRuntime = parentPreviewRuntime ?? createPreviewBlockRuntime();
const parentPageReferenceAncestry = inject(PageReferenceAncestryKey, computed<readonly string[]>(() => []));
const pageReferenceAncestry = computed(() => appendPageReferenceAncestry(
  parentPageReferenceAncestry.value,
  props.pageId
));
const pageVariableRuntimeContext = computed<VariableValueResolveContext>(() => {
  const pageId = getPageRuntimeId();
  const currentPage = {
    context: pageRuntimeContext.value,
    dataSources: pageRuntimeData.value,
    pageData: pageRuntimeData.value
  };
  return {
    pageId,
    context: pageRuntimeContext.value,
    dataSources: pageRuntimeData.value,
    pageData: pageRuntimeData.value,
    pages: {
      ...getRegisteredPageVariableRuntimes(),
      ...(pageId ? { [pageId]: currentPage } : {})
    },
    ...pageRuntimeData.value
  };
});

let pageDataLoadId = 0;
let registeredPageVariableRuntimeId = '';
let registeredPageRuntimeId = '';

provide(PreviewBlockRuntimeKey, previewRuntime);
provide(PageRuntimeContextKey, pageRuntimeContext);
provide(PageRuntimeDataKey, computed(() => pageRuntimeData.value));
provide(PageRuntimeVariableContextKey, pageVariableRuntimeContext);
provide(PageReferenceAncestryKey, pageReferenceAncestry);

function getColumns(block: MokelayBlock): RuntimeColumnData[] {
  const cols = (block.data as { cols?: unknown }).cols;
  if (!Array.isArray(cols)) return [];
  return cols.filter((column): column is RuntimeColumnData => typeof column === 'object' && column !== null);
}

function getColumnBlocks(column: RuntimeColumnData): MokelayBlock[] {
  return Array.isArray(column.blocks) ? column.blocks : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getCloseResult(value: unknown) {
  if (!isRecord(value)) return undefined;
  if (Object.prototype.hasOwnProperty.call(value, 'args')) return value.args;
  const inputs = isRecord(value.inputs) ? value.inputs : {};
  if (Object.prototype.hasOwnProperty.call(inputs, 'closeResult')) return inputs.closeResult;
  if (Object.prototype.hasOwnProperty.call(inputs, 'reason') || Object.prototype.hasOwnProperty.call(inputs, 'result')) {
    return {
      reason: typeof inputs.reason === 'string' && inputs.reason.trim() ? inputs.reason.trim() : 'success',
      ...(Object.prototype.hasOwnProperty.call(inputs, 'result') ? { result: inputs.result } : {})
    };
  }
  return undefined;
}

function getData(): MokelayPageDocument {
  return { blocks: previewBlocks.value };
}

function close(invocation?: unknown) {
  const closeResult = getCloseResult(invocation);
  emit('close', closeResult);
  return { closed: true, ...(closeResult !== undefined ? { closeResult } : {}) };
}

async function loadPageDataSources() {
  const requestId = ++pageDataLoadId;
  if (!normalizedDataSources.value.length) {
    pageRuntimeData.value = {};
    pageDataLoading.value = false;
    pageDataError.value = '';
    return;
  }

  pageDataLoading.value = true;
  pageDataError.value = '';
  try {
    const blocks = await previewRuntime.getBlockDataContext();
    const nextPageData = await resolvePageDataSources(normalizedDataSources.value, pageRuntimeContext.value, {
      variableContext: {
        ...pageVariableRuntimeContext.value,
        blocks,
        context: pageRuntimeContext.value,
        pageData: pageRuntimeData.value,
        dataSources: pageRuntimeData.value,
        ...pageRuntimeData.value
      }
    });
    if (requestId === pageDataLoadId) pageRuntimeData.value = nextPageData;
  } catch (error) {
    if (requestId !== pageDataLoadId) return;
    pageRuntimeData.value = {};
    pageDataError.value = error instanceof Error && error.message ? error.message : '页面数据加载失败。';
  } finally {
    if (requestId === pageDataLoadId) pageDataLoading.value = false;
  }
}

const pageRuntimeInstance = { getData, close };

function getPageRuntimeId() {
  return typeof props.pageId === 'string' ? props.pageId.trim() : '';
}

function unregisterPageVariableRuntimeRegistration() {
  if (!registeredPageVariableRuntimeId) return;
  unregisterPageVariableRuntime(registeredPageVariableRuntimeId);
  registeredPageVariableRuntimeId = '';
}

function syncPageVariableRuntimeRegistration() {
  const nextId = getPageRuntimeId();
  if (registeredPageVariableRuntimeId && registeredPageVariableRuntimeId !== nextId) {
    unregisterPageVariableRuntimeRegistration();
  }
  if (!nextId) return;
  registeredPageVariableRuntimeId = nextId;
  registerPageVariableRuntime(nextId, {
    context: pageRuntimeContext.value,
    dataSources: pageRuntimeData.value,
    pageData: pageRuntimeData.value
  });
}

function unregisterPageRuntime() {
  if (!registeredPageRuntimeId) return;
  previewRuntime.unregisterBlock(registeredPageRuntimeId, pageRuntimeInstance);
  registeredPageRuntimeId = '';
}

function syncPageRuntimeRegistration() {
  const nextId = getPageRuntimeId();
  if (registeredPageRuntimeId === nextId) return;
  unregisterPageRuntime();
  if (!nextId) return;
  registeredPageRuntimeId = nextId;
  const handle: BlockRuntimeHandle = {
    id: nextId,
    type: 'MPage',
    instance: pageRuntimeInstance
  };
  previewRuntime.registerBlock(nextId, handle);
}

defineExpose({ getData, close });

watch(() => props.pageId, syncPageRuntimeRegistration, { immediate: true });
watch(
  () => ({ pageId: props.pageId, context: pageRuntimeContext.value, data: pageRuntimeData.value }),
  syncPageVariableRuntimeRegistration,
  { deep: true, immediate: true }
);
watch(
  () => ({ dataSources: normalizedDataSources.value, context: pageRuntimeContext.value }),
  () => void loadPageDataSources(),
  { deep: true, immediate: true }
);

onBeforeUnmount(() => {
  pageDataLoadId += 1;
  unregisterPageVariableRuntimeRegistration();
  unregisterPageRuntime();
});
</script>

<template>
  <div data-testid="preview-blocks" class="space-y-1" :data-edit-context="edit ? 'true' : undefined">
    <p v-if="pageDataLoading" data-testid="page-data-loading-state" class="rounded border border-sky-300 bg-sky-50 p-3 text-sm text-sky-800 dark:border-sky-500/60 dark:bg-sky-900/30 dark:text-sky-100">
      页面数据加载中...
    </p>
    <p v-else-if="pageDataError" data-testid="page-data-error-state" class="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/60 dark:bg-red-900/30 dark:text-red-100">
      {{ pageDataError }}
    </p>

    <template v-else>
      <div v-for="(block, index) in previewBlocks" :key="block.id || index" :data-testid="`preview-block-${block.type}`" class="p-0">
        <MokelayBlockRenderer v-if="block.type !== 'columns'" :block="block" />

        <div v-else data-testid="preview-columns" class="grid gap-3 md:grid-cols-2">
          <div
            v-for="(column, columnIndex) in getColumns(block)"
            :key="`columns-${index}-${columnIndex}`"
            :data-testid="`preview-column-${columnIndex}`"
            class="space-y-2 p-2"
          >
            <div
              v-for="(columnBlock, columnBlockIndex) in getColumnBlocks(column)"
              :key="columnBlock.id || `columns-${index}-${columnIndex}-${columnBlockIndex}`"
              :data-testid="`preview-column-block-${columnBlock.type}`"
              class="p-2"
            >
              <MokelayBlockRenderer :block="columnBlock" compact-table />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
