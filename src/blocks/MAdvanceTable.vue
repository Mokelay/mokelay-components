<script lang="ts">
import { i18n } from '@/i18n';

import {
  getParagraphText,
  normalizeStoredBlocks,
  type StoredBlock
} from '@/blocks/storedBlocks';
import {
  normalizeDatasource,
  type MDatasourceBodyItem,
  type MDatasourceApiObject
} from '@/datasource/datasource';
import type { BlockDataField, VariableValueConfig } from '@/runtime/variableValue';
import { isRecord } from '@/datasource/schema';
import {
  normalizeAdvanceTableColumns as normalizeColumns,
  type MAdvanceTableColumnConfig
} from '@/blocks/advanceTableColumns';

export type {
  MAdvanceTableColumnConfig,
  MAdvanceTableFixed
} from '@/blocks/advanceTableColumns';

export interface MAdvanceTableProps {
  edit: boolean;
  currentBlockId?: string;
  index?: boolean;
  selection?: boolean;
  showPageBreak?: boolean;
  rows?: unknown;
  columns?: MAdvanceTableColumnConfig[];
  ds?: MDatasourceApiObject;
}

export function getAdvanceTableDataFields(): BlockDataField[] {
  return [
    {
      label: i18n.t('advanceTable.datasourceFields.data'),
      variable: 'data',
      dataType: 'array'
    },
    {
      label: i18n.t('advanceTable.datasourceFields.page'),
      variable: 'page',
      dataType: 'number'
    },
    {
      label: i18n.t('advanceTable.datasourceFields.pageSize'),
      variable: 'pageSize',
      dataType: 'number'
    },
    {
      label: i18n.t('advanceTable.datasourceFields.total'),
      variable: 'total',
      dataType: 'number'
    },
    {
      label: i18n.t('advanceTable.datasourceFields.search'),
      variable: 'search',
      dataType: 'object'
    }
  ];
}

function normalizeDatasourceConfig(value: unknown): MDatasourceApiObject | undefined {
  if (!isRecord(value)) return undefined;
  const datasource = normalizeDatasource(value);
  return datasource.type === 'API' ? datasource : undefined;
}

function getDatasourceConfigSignature(value: MDatasourceApiObject | undefined) {
  if (!value) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}
</script>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { getInlineRuntimeComponentDefinition } from '@/blocks/inlineRuntimeComponents';
import { useI18n } from '@/i18n';
import {
  resolveDatasourceRuntimeData,
  type DatasourceRuntimeMatchingExternalFieldData
} from '@/datasource/runtime';
import { normalizeBlockEvents } from '@/blocks/blockEvents';
import {
  PreviewBlockRuntimeKey,
  type PreviewRuntimeBlock
} from '@/runtime/previewBlockRuntime';
import {
  PageRuntimeVariableContextKey
} from '@/pages/runtimeContext';
import { PageReferenceAncestryKey } from '@/pages/referenceRuntime';
import { resolveRuntimeValue, type VariableValueResolveContext } from '@/runtime/variableValue';

const props = defineProps<MAdvanceTableProps & {
  onChange?: (payload: MAdvanceTableProps) => void;
  onToolChange?: (payload: MAdvanceTableProps) => void;
}>();
const emit = defineEmits<{
  (event: 'havingSelectedRows', payload: {
    selectedRows: Record<string, unknown>[];
    selection: ReturnType<typeof getSelectionState>;
  }): void;
  (event: 'emptySelectedRow', payload: {
    selectedRows: Record<string, unknown>[];
    selection: ReturnType<typeof getSelectionState>;
  }): void;
}>();

type PaginationState = {
  page: number;
  pageSize: number;
  total: number;
};

const { t } = useI18n();
const previewRuntime = inject(PreviewBlockRuntimeKey, null);
const pageReferenceAncestry = inject(PageReferenceAncestryKey, computed<readonly string[]>(() => []));
const pageVariableContext = inject(PageRuntimeVariableContextKey, computed<VariableValueResolveContext>(() => ({})));
const rootRef = ref<HTMLElement | null>(null);
const selectedRows = ref(new Set<number>());
const tableData = shallowRef<Record<string, unknown>[]>([]);
const runtimeBlockData = shallowRef<Record<string, Record<string, unknown>>>({});
const cellRuntimeInstances = new Map<string, unknown>();
const submittedSearch = shallowRef<Record<string, unknown>>({});
const paginationState = ref<PaginationState>({
  page: 1,
  pageSize: 10,
  total: 0
});
const datasourceLoading = ref(false);
const datasourceError = ref('');
let datasourceLoadId = 0;
let lastSelectionEmpty = true;

const normalizedColumns = computed(() => normalizeColumns(props.columns));
const normalizedDatasource = computed(() => normalizeDatasourceConfig(props.ds));
const normalizedInlineRows = computed(() => normalizeRuntimeRows(resolveRuntimeValue(props.rows, pageVariableContext.value)));
const hasInlineRows = computed(() => normalizedInlineRows.value !== undefined);
const normalizedData = computed(() => normalizedInlineRows.value ?? tableData.value);
const hasConfiguredColumns = computed(() => normalizedColumns.value.length > 0);
const displayRows = computed(() => hasConfiguredColumns.value ? normalizedData.value : []);
const hasSelectionColumn = computed(() => props.selection === true);
const hasIndexColumn = computed(() => props.index === true);
const shouldShowPageBreak = computed(() => props.showPageBreak === true);
const pagination = computed(() => {
  const pageSize = normalizePositiveIntegerValue(paginationState.value.pageSize, 10);
  const total = normalizeNonNegativeIntegerValue(paginationState.value.total, 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(normalizePositiveIntegerValue(paginationState.value.page, 1), 1), totalPages);
  const start = total > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const end = total > 0 ? Math.min(currentPage * pageSize, total) : 0;

  return {
    currentPage,
    end,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    pageSize,
    start,
    total,
    totalPages
  };
});
const paginationSummary = computed(() => t('advanceTable.pagination.summary')
  .replace('{start}', String(pagination.value.start))
  .replace('{end}', String(pagination.value.end))
  .replace('{total}', String(pagination.value.total))
  .replace('{page}', String(pagination.value.currentPage))
  .replace('{totalPages}', String(pagination.value.totalPages)));
const shouldShowEmptyRow = computed(() =>
  !hasConfiguredColumns.value ||
  datasourceLoading.value ||
  Boolean(datasourceError.value) ||
  (!hasInlineRows.value && !normalizedDatasource.value && !displayRows.value.length) ||
  !displayRows.value.length
);
const emptyMessage = computed(() => {
  if (!hasConfiguredColumns.value) return t('advanceTable.noColumns');
  if (datasourceLoading.value) return t('advanceTable.loading');
  if (datasourceError.value) return datasourceError.value;
  if (!hasInlineRows.value && !normalizedDatasource.value && !displayRows.value.length) return t('advanceTable.noDatasource');
  return t('advanceTable.empty');
});
const emptyColumnSpan = computed(() => Math.max(
  1,
  normalizedColumns.value.length + (hasSelectionColumn.value ? 1 : 0) + (hasIndexColumn.value ? 1 : 0)
));
const selectionColumnWidth = 44;
const indexColumnWidth = 56;
const fallbackFixedColumnWidth = 160;
type RowPathValue = {
  found: boolean;
  value: unknown;
};


function normalizeRuntimeRows(value: unknown): Record<string, unknown>[] | undefined {
  if (!Array.isArray(value) || !value.every((item) => isRecord(item))) {
    return undefined;
  }

  return value.map((row) => ({ ...row }));
}

function normalizePositiveIntegerValue(value: unknown, fallback: number) {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim()
      ? Number(value)
      : fallback;
  const normalized = Math.trunc(parsed);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback;
}

function normalizeNonNegativeIntegerValue(value: unknown, fallback: number) {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim()
      ? Number(value)
      : fallback;
  const normalized = Math.trunc(parsed);
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : fallback;
}

function clonePlainRecord(value: Record<string, unknown>) {
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return { ...value };
  }
}

function getInvocationArgs(value: unknown) {
  if (!isRecord(value)) return value;

  if (Object.prototype.hasOwnProperty.call(value, 'args')) {
    return value.args;
  }

  const inputs = isRecord(value.inputs) ? value.inputs : undefined;
  if (inputs && Object.prototype.hasOwnProperty.call(inputs, 'args')) {
    return inputs.args;
  }

  return value;
}

function normalizeSearchObject(value: unknown) {
  const rawValue = getInvocationArgs(value);
  return isRecord(rawValue) ? clonePlainRecord(rawValue) : {};
}

function getMatchedRuntimeField(
  fields: DatasourceRuntimeMatchingExternalFieldData[],
  variable: string
) {
  return fields.find((field) => field.variable === variable);
}

function getMatchedRuntimeValue(
  fields: DatasourceRuntimeMatchingExternalFieldData[],
  variable: string
) {
  return getMatchedRuntimeField(fields, variable)?.value;
}

function resetRuntimeData() {
  tableData.value = [];
  paginationState.value = {
    page: pagination.value.currentPage,
    pageSize: pagination.value.pageSize,
    total: pagination.value.total
  };
}

function notifyRuntimeDataChange() {
  if (!props.currentBlockId) return;
  previewRuntime?.notifyBlockDataChange(props.currentBlockId);
}

function syncSelectionEvent() {
  const selection = getSelectionState();
  if (selection.empty === lastSelectionEmpty) return;

  lastSelectionEmpty = selection.empty;
  const payload = {
    selectedRows: selection.rows,
    selection
  };
  if (selection.empty) {
    emit('emptySelectedRow', payload);
    return;
  }

  emit('havingSelectedRows', payload);
}

function setSelectedRows(nextSelectedRows: Set<number>) {
  selectedRows.value = nextSelectedRows;
  notifyRuntimeDataChange();
  syncSelectionEvent();
}

function getVariableConfigBlockId(value: unknown) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return '';
  const config = value as Partial<VariableValueConfig>;
  const source = 'source' in config ? config.source : 'Block';
  return config.mode === 'variable' &&
    (source === undefined || source === 'Block') &&
    config.blockType === 'MAdvanceTable' &&
    typeof config.blockId === 'string'
    ? config.blockId
    : '';
}

function collectVariableConfigBlockIds(value: unknown, result = new Set<string>()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectVariableConfigBlockIds(item, result));
    return result;
  }

  if (!isRecord(value)) return result;

  const blockId = getVariableConfigBlockId(value);
  if (blockId) {
    result.add(blockId);
  }

  Object.values(value).forEach((item) => collectVariableConfigBlockIds(item, result));
  return result;
}

function getDatasourceSelfReferenceBlockId(datasource: MDatasourceApiObject) {
  const referencedBlockIds = new Set<string>();
  datasource.headerData.forEach((item) => {
    collectVariableConfigBlockIds(item.value, referencedBlockIds);
  });
  datasource.queryData.forEach((item) => {
    collectVariableConfigBlockIds(item.value, referencedBlockIds);
  });
  datasource.bodyData.forEach((item: MDatasourceBodyItem) => {
    collectVariableConfigBlockIds(item.value, referencedBlockIds);
  });
  return referencedBlockIds.size === 1 ? [...referencedBlockIds][0] : props.currentBlockId ?? '';
}

async function loadDatasourceRows() {
  const datasource = normalizedDatasource.value;
  const inlineRows = normalizedInlineRows.value;
  const loadId = ++datasourceLoadId;
  setSelectedRows(new Set());

  if (inlineRows !== undefined) {
    tableData.value = [];
    paginationState.value = {
      page: 1,
      pageSize: Math.max(inlineRows.length, 1),
      total: inlineRows.length
    };
    datasourceLoading.value = false;
    datasourceError.value = '';
    notifyRuntimeDataChange();
    return;
  }

  resetRuntimeData();

  if (!datasource) {
    datasourceLoading.value = false;
    datasourceError.value = '';
    return;
  }

  datasourceLoading.value = true;
  datasourceError.value = '';

  try {
    const selfBlockId = getDatasourceSelfReferenceBlockId(datasource);
    const blocks = await previewRuntime?.getBlockDataContext(selfBlockId) ?? {};
    if (selfBlockId) {
      blocks[selfBlockId] = getData();
    }
    runtimeBlockData.value = blocks;
    const runtimeData = await resolveDatasourceRuntimeData(datasource, {
      variableContext: {
        ...pageVariableContext.value,
        blocks
      }
    });
    if (loadId !== datasourceLoadId) return;

    const matchedDataField = runtimeData.matchingExternalFieldData.find((field) => field.variable === 'data');
    if (!matchedDataField?.matchFieldPath) {
      datasourceError.value = t('advanceTable.missingMatchedField');
      return;
    }

    const rows = normalizeRuntimeRows(matchedDataField.value);
    if (!rows) {
      datasourceError.value = t('advanceTable.invalidMatchedData');
      return;
    }

    tableData.value = rows;
    paginationState.value = {
      page: normalizePositiveIntegerValue(getMatchedRuntimeValue(runtimeData.matchingExternalFieldData, 'page'), 1),
      pageSize: normalizePositiveIntegerValue(getMatchedRuntimeValue(runtimeData.matchingExternalFieldData, 'pageSize'), 10),
      total: normalizeNonNegativeIntegerValue(getMatchedRuntimeValue(runtimeData.matchingExternalFieldData, 'total'), 0)
    };
    notifyRuntimeDataChange();
    await nextTick();
  } catch {
    if (loadId !== datasourceLoadId) return;
    datasourceError.value = t('advanceTable.loadFailed');
  } finally {
    if (loadId === datasourceLoadId) {
      datasourceLoading.value = false;
    }
  }
}

function getData() {
  return {
    data: normalizedData.value,
    page: pagination.value.currentPage,
    pageSize: pagination.value.pageSize,
    total: pagination.value.total,
    search: clonePlainRecord(submittedSearch.value),
    selectedRows: getSelectedRows(),
    selection: getSelectionState()
  };
}

async function refresh() {
  await loadDatasourceRows();
  return getData();
}

async function search(searchObject: unknown = {}) {
  submittedSearch.value = normalizeSearchObject(searchObject);
  paginationState.value = {
    ...paginationState.value,
    page: 1
  };
  await loadDatasourceRows();
  return getData();
}

async function loadRuntimeBlockData() {
  const blocks = await previewRuntime?.getBlockDataContext(props.currentBlockId) ?? {};
  if (props.currentBlockId) {
    blocks[props.currentBlockId] = getData();
  }
  runtimeBlockData.value = blocks;
}

function getSelectedRows() {
  return displayRows.value.filter((_, index) => selectedRows.value.has(index));
}

function getSelectedValueField(value: unknown) {
  if (typeof value === 'string') return value.trim();
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return '';

  const record = value as Record<string, unknown>;
  const inputs = typeof record.inputs === 'object' && record.inputs !== null && !Array.isArray(record.inputs)
    ? record.inputs as Record<string, unknown>
    : {};
  const args = typeof inputs.args === 'object' && inputs.args !== null && !Array.isArray(inputs.args)
    ? inputs.args as Record<string, unknown>
    : {};
  const field = inputs.field ?? inputs.path ?? args.field ?? args.path;

  return typeof field === 'string' ? field.trim() : '';
}

function getSelectedValues(fieldOrInvocation: unknown) {
  const field = getSelectedValueField(fieldOrInvocation);
  if (!field) return [];

  return getSelectedRows()
    .map((row) => readRowPath(row, field))
    .filter((value) => value !== null && value !== undefined && value !== '');
}

function getSelectionState() {
  const indexes = [...selectedRows.value].sort((left, right) => left - right);
  const rows = indexes.flatMap((index) => {
    const row = displayRows.value[index];
    return row ? [row] : [];
  });

  return {
    empty: rows.length === 0,
    count: rows.length,
    indexes,
    rows
  };
}

function clearSelection() {
  setSelectedRows(new Set());
}

function stringifyCellValue(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function interpolateValue(value: string, row: Record<string, unknown>, options: { preserveMissing?: boolean } = {}) {
  return value.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, path: string) => {
    const result = getRowPathValue(row, path);
    if (!result.found && options.preserveMissing) return match;
    return stringifyCellValue(result.value);
  });
}

function getRowPathValue(row: Record<string, unknown>, path: string): RowPathValue {
  let current: unknown = row;

  for (const key of path.split('.')) {
    if (typeof current !== 'object' || current === null || !(key in current)) {
      return {
        found: false,
        value: ''
      };
    }

    current = (current as Record<string, unknown>)[key];
  }

  return {
    found: true,
    value: current
  };
}

function readRowPath(row: Record<string, unknown>, path: string) {
  return getRowPathValue(row, path).value;
}

function interpolateComponentData(
  value: unknown,
  row: Record<string, unknown>,
  options: { preserveMissing?: boolean } = {}
): unknown {
  if (typeof value === 'string') {
    return interpolateValue(value, row, options);
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolateComponentData(item, row, options));
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, interpolateComponentData(item, row, options)])
    );
  }

  return value;
}

function getCellBlocks(row: Record<string, unknown>, column: MAdvanceTableColumnConfig): StoredBlock[] {
  return normalizeStoredBlocks(column.columnContent).map((block) => {
    if (block.type === 'paragraph') {
      return {
        ...block,
        id: interpolateValue(block.id, row, { preserveMissing: true }),
        data: {
          text: interpolateValue(getParagraphText(block), row)
        },
        events: interpolateComponentData(block.events, row, { preserveMissing: true }) as StoredBlock['events']
      };
    }

    return {
      ...block,
      id: interpolateValue(block.id, row, { preserveMissing: true }),
      data: interpolateComponentData(block.data, row) as Record<string, unknown>,
      events: interpolateComponentData(block.events, row, { preserveMissing: true }) as StoredBlock['events']
    };
  });
}

function getRowRenderKey(row: Record<string, unknown>, rowIndex: number) {
  const stableId = [row.uuid, row.id, row.key]
    .find((value) => (typeof value === 'string' || typeof value === 'number') && String(value).trim());
  return stableId === undefined ? `row-${rowIndex}` : `row-${String(stableId)}`;
}

function getPreviewComponent(type: string) {
  return getInlineRuntimeComponentDefinition(type)?.component ?? null;
}

function getPreviewProps(block: StoredBlock) {
  const definition = getInlineRuntimeComponentDefinition(block.type);
  if (!definition) return { edit: false };
  const data = getBoundCellBlockData(block);
  return {
    ...definition.normalizeProps({
      ...data,
      edit: false,
      currentBlockId: block.id
    }),
    currentBlockId: block.id
  };
}

function getBoundCellBlockData(block: StoredBlock) {
  const resolved = resolveRuntimeValue(block.data, {
    ...pageVariableContext.value,
    blocks: {
      ...(pageVariableContext.value.blocks ?? {}),
      ...runtimeBlockData.value
    }
  });
  return isRecord(resolved) ? resolved : {};
}

function setCellBlockRuntimeRef(block: StoredBlock, instance: unknown) {
  const id = block.id.trim();
  if (!previewRuntime || !id) return;

  const existing = cellRuntimeInstances.get(id);
  if (!instance) {
    if (existing) {
      previewRuntime.unregisterBlock(id, existing);
      cellRuntimeInstances.delete(id);
    }
    return;
  }

  if (existing && existing !== instance) {
    previewRuntime.unregisterBlock(id, existing);
  }

  previewRuntime.registerBlock(id, {
    id,
    type: block.type,
    instance,
    data: getBoundCellBlockData(block)
  });
  cellRuntimeInstances.set(id, instance);
}

function getCellBlockEventListeners(block: StoredBlock) {
  if (props.edit) return {};

  const listeners: Record<string, (event: unknown) => void> = {};
  normalizeBlockEvents(block.events).forEach((eventConfig) => {
    if (!eventConfig.event) return;
    const previousListener = listeners[eventConfig.event];
    listeners[eventConfig.event] = (event: unknown) => {
      previousListener?.(event);
      previewRuntime?.invokeBlockActions(eventConfig, {
        ...block,
        data: getBoundCellBlockData(block),
        _pageAncestry: [...pageReferenceAncestry.value]
      } as PreviewRuntimeBlock, event);
    };
  });

  return listeners;
}

function getBlockText(block: StoredBlock) {
  return getParagraphText(block);
}

function getColumnWidth(column: MAdvanceTableColumnConfig) {
  return column.width ?? null;
}

function getFixedColumnWidth(column: MAdvanceTableColumnConfig) {
  return getColumnWidth(column) ?? fallbackFixedColumnWidth;
}

function getLeftOffset(columnIndex: number) {
  let offset = 0;
  if (hasSelectionColumn.value) offset += selectionColumnWidth;
  if (hasIndexColumn.value) offset += indexColumnWidth;

  for (let index = 0; index < columnIndex; index += 1) {
    const column = normalizedColumns.value[index];
    if (column?.fixed === 'left') {
      offset += getFixedColumnWidth(column);
    }
  }

  return offset;
}

function getRightOffset(columnIndex: number) {
  let offset = 0;

  for (let index = normalizedColumns.value.length - 1; index > columnIndex; index -= 1) {
    const column = normalizedColumns.value[index];
    if (column?.fixed === 'right') {
      offset += getFixedColumnWidth(column);
    }
  }

  return offset;
}

function getColumnStyle(column: MAdvanceTableColumnConfig, columnIndex: number) {
  const width = getColumnWidth(column);
  const style: Record<string, string> = {};

  if (width) {
    style.width = `${width}px`;
    style.minWidth = `${width}px`;
  }

  if (column.fixed === 'left') {
    style.position = 'sticky';
    style.left = `${getLeftOffset(columnIndex)}px`;
  }

  if (column.fixed === 'right') {
    style.position = 'sticky';
    style.right = `${getRightOffset(columnIndex)}px`;
  }

  return style;
}

function getFixedClass(column: MAdvanceTableColumnConfig) {
  return {
    'ce-advance-table-tool__cell--fixed-left': column.fixed === 'left',
    'ce-advance-table-tool__cell--fixed-right': column.fixed === 'right',
    'ce-advance-table-tool__cell--wrap': column.wrap === true
  };
}

function getSelectionStyle() {
  return {
    width: `${selectionColumnWidth}px`,
    minWidth: `${selectionColumnWidth}px`,
    left: '0px'
  };
}

function getIndexStyle() {
  return {
    width: `${indexColumnWidth}px`,
    minWidth: `${indexColumnWidth}px`,
    left: `${hasSelectionColumn.value ? selectionColumnWidth : 0}px`
  };
}

function isRowSelected(rowIndex: number) {
  return selectedRows.value.has(rowIndex);
}

function toggleRow(rowIndex: number) {
  const nextSelectedRows = new Set(selectedRows.value);
  if (nextSelectedRows.has(rowIndex)) {
    nextSelectedRows.delete(rowIndex);
  } else {
    nextSelectedRows.add(rowIndex);
  }
  setSelectedRows(nextSelectedRows);
}

function isAllRowsSelected() {
  return displayRows.value.length > 0 && displayRows.value.every((_, index) => selectedRows.value.has(index));
}

function toggleAllRows() {
  if (isAllRowsSelected()) {
    setSelectedRows(new Set());
    return;
  }

  setSelectedRows(new Set(displayRows.value.map((_, index) => index)));
}

function goToPage(page: number) {
  if (datasourceLoading.value) return;
  const targetPage = Math.min(Math.max(page, 1), pagination.value.totalPages);
  if (targetPage === pagination.value.currentPage) return;
  paginationState.value = {
    ...paginationState.value,
    page: targetPage
  };
  void loadDatasourceRows();
}

watch(
  [
    () => getDatasourceConfigSignature(normalizedDatasource.value),
    () => normalizedInlineRows.value
  ],
  () => {
    void loadDatasourceRows();
  },
  { deep: true, immediate: true }
);

onBeforeUnmount(() => {
  cellRuntimeInstances.forEach((instance, id) => {
    previewRuntime?.unregisterBlock(id, instance);
  });
  cellRuntimeInstances.clear();
});

watch(
  () => props.currentBlockId,
  () => {
    void loadRuntimeBlockData();
  },
  { immediate: true }
);

defineExpose({
  getData,
  refresh,
  search,
  getSelectedRows,
  getSelectedValues,
  clearSelection,
  getSelectionState
});
</script>

<template>
  <div ref="rootRef" class="ce-advance-table-tool" data-testid="editor-advance-table-tool">
    <div class="ce-advance-table-tool__scroller">
      <table class="ce-advance-table-tool__table" data-testid="advance-table">
        <thead>
          <tr>
            <th
              v-if="selection"
              class="ce-advance-table-tool__cell ce-advance-table-tool__cell--header ce-advance-table-tool__cell--control ce-advance-table-tool__cell--fixed-left"
              :style="getSelectionStyle()"
              data-testid="advance-table-selection-header"
            >
              <input
                class="ce-advance-table-tool__checkbox"
                type="checkbox"
                :checked="isAllRowsSelected()"
                :aria-label="t('advanceTable.selectAll')"
                @change="toggleAllRows"
              />
            </th>
            <th
              v-if="index"
              class="ce-advance-table-tool__cell ce-advance-table-tool__cell--header ce-advance-table-tool__cell--control ce-advance-table-tool__cell--fixed-left"
              :style="getIndexStyle()"
              data-testid="advance-table-index-header"
            >
              #
            </th>
            <th
              v-for="(column, columnIndex) in normalizedColumns"
              :key="`header-${columnIndex}`"
              class="ce-advance-table-tool__cell ce-advance-table-tool__cell--header"
              :class="getFixedClass(column)"
              :style="getColumnStyle(column, columnIndex)"
              :data-testid="`advance-table-header-${columnIndex}`"
            >
              {{ column.columnName }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIndex) in displayRows"
            :key="getRowRenderKey(row, rowIndex)"
            class="ce-advance-table-tool__row"
            :class="{ 'ce-advance-table-tool__row--selected': isRowSelected(rowIndex) }"
            :data-testid="`advance-table-row-${rowIndex}`"
          >
            <td
              v-if="selection"
              class="ce-advance-table-tool__cell ce-advance-table-tool__cell--control ce-advance-table-tool__cell--fixed-left"
              :style="getSelectionStyle()"
              :data-testid="`advance-table-selection-cell-${rowIndex}`"
            >
              <input
                class="ce-advance-table-tool__checkbox"
                type="checkbox"
                :checked="isRowSelected(rowIndex)"
                :aria-label="t('advanceTable.selectRow')"
                @change="toggleRow(rowIndex)"
              />
            </td>
            <td
              v-if="index"
              class="ce-advance-table-tool__cell ce-advance-table-tool__cell--control ce-advance-table-tool__cell--fixed-left"
              :style="getIndexStyle()"
              :data-testid="`advance-table-index-cell-${rowIndex}`"
            >
              {{ rowIndex + 1 }}
            </td>
            <td
              v-for="(column, columnIndex) in normalizedColumns"
              :key="`cell-${getRowRenderKey(row, rowIndex)}-${columnIndex}`"
              class="ce-advance-table-tool__cell"
              :class="getFixedClass(column)"
              :style="getColumnStyle(column, columnIndex)"
              :data-testid="`advance-table-cell-${rowIndex}-${columnIndex}`"
            >
              <template
                v-for="(block, blockIndex) in getCellBlocks(row, column)"
                :key="`${getRowRenderKey(row, rowIndex)}-${columnIndex}-${block.id}-${block.type}-${blockIndex}`"
              >
                <span v-if="block.type === 'paragraph'" class="ce-advance-table-tool__cell-text">{{ getBlockText(block) }}</span>
                <span v-else class="ce-advance-table-tool__cell-token">
                  <component
                    :is="getPreviewComponent(block.type)"
                    :ref="(instance: unknown) => setCellBlockRuntimeRef(block, instance)"
                    v-bind="getPreviewProps(block)"
                    v-on="getCellBlockEventListeners(block)"
                  />
                </span>
              </template>
            </td>
          </tr>
          <tr v-if="shouldShowEmptyRow">
            <td
              class="ce-advance-table-tool__cell ce-advance-table-tool__empty"
              :colspan="emptyColumnSpan"
            >
              {{ emptyMessage }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      v-if="shouldShowPageBreak"
      class="ce-advance-table-tool__pagination"
      data-testid="advance-table-pagination"
    >
      <p data-testid="advance-table-pagination-summary">{{ paginationSummary }}</p>
      <div class="ce-advance-table-tool__pagination-actions" :aria-label="t('advanceTable.pagination.label')">
        <button
          type="button"
          :disabled="datasourceLoading || !pagination.hasPreviousPage"
          @click="goToPage(pagination.currentPage - 1)"
        >
          {{ t('advanceTable.pagination.previous') }}
        </button>
        <button
          type="button"
          :disabled="datasourceLoading || !pagination.hasNextPage"
          @click="goToPage(pagination.currentPage + 1)"
        >
          {{ t('advanceTable.pagination.next') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ce-advance-table-tool {
  width: 100%;
  color: rgb(15 23 42);
}

.ce-advance-table-tool__scroller {
  width: 100%;
  overflow: auto;
  border: 1px solid rgb(226 232 240);
  border-radius: 8px;
  background: rgb(255 255 255);
}

.ce-advance-table-tool__table {
  width: 100%;
  min-width: 520px;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;
  line-height: 20px;
}

.ce-advance-table-tool__cell {
  border-right: 1px solid rgb(226 232 240);
  border-bottom: 1px solid rgb(226 232 240);
  padding: 10px 12px;
  background: rgb(255 255 255);
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
}

.ce-advance-table-tool__cell:last-child {
  border-right: 0;
}

.ce-advance-table-tool__cell--header {
  position: sticky;
  top: 0;
  z-index: 3;
  background: rgb(248 250 252);
  color: rgb(51 65 85);
  font-weight: 600;
}

.ce-advance-table-tool__cell--control {
  padding: 10px;
  text-align: center;
}

.ce-advance-table-tool__cell--wrap {
  white-space: normal;
}

.ce-advance-table-tool__cell--fixed-left,
.ce-advance-table-tool__cell--fixed-right {
  z-index: 2;
}

.ce-advance-table-tool__cell--header.ce-advance-table-tool__cell--fixed-left,
.ce-advance-table-tool__cell--header.ce-advance-table-tool__cell--fixed-right {
  z-index: 4;
}

.ce-advance-table-tool__cell--fixed-left {
  box-shadow: 1px 0 0 rgb(226 232 240);
}

.ce-advance-table-tool__cell--fixed-right {
  box-shadow: -1px 0 0 rgb(226 232 240);
}

.ce-advance-table-tool__row--selected .ce-advance-table-tool__cell {
  background: rgb(239 246 255);
}

.ce-advance-table-tool__checkbox {
  width: 16px;
  height: 16px;
  margin: 0;
  vertical-align: middle;
  accent-color: rgb(37 99 235);
}

.ce-advance-table-tool__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid rgb(226 232 240);
  border-top: 0;
  border-radius: 0 0 8px 8px;
  padding: 10px 12px;
  background: rgb(248 250 252);
}

.ce-advance-table-tool__scroller:has(+ .ce-advance-table-tool__pagination) {
  border-radius: 8px 8px 0 0;
}

.ce-advance-table-tool__pagination p {
  margin: 0;
  color: rgb(71 85 105);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
}

.ce-advance-table-tool__pagination-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}

.ce-advance-table-tool__pagination button {
  min-width: 72px;
  height: 36px;
  border: 1px solid rgb(203 213 225);
  border-radius: 8px;
  background: rgb(255 255 255);
  color: rgb(51 65 85);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  cursor: default;
}

.ce-advance-table-tool__pagination button:disabled {
  color: rgb(148 163 184);
  background: rgb(248 250 252);
}

.ce-advance-table-tool__cell-token {
  display: inline-flex;
  align-items: center;
  margin: 2px 3px;
  vertical-align: middle;
}

.ce-advance-table-tool__cell-token :deep(.page-dsl-block) {
  display: inline-flex;
  width: auto;
}

.ce-advance-table-tool__cell-token :deep(.page-dsl-button-wrap) {
  display: inline-flex;
}

.ce-advance-table-tool__cell-token :deep(.page-dsl-button) {
  min-height: 30px;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  line-height: 16px;
}

.ce-advance-table-tool__cell--wrap :deep(.ce-input-tool) {
  width: 72px;
}

.ce-advance-table-tool__cell--wrap :deep(.ce-input-tool__control) {
  box-sizing: border-box;
  min-width: 0;
  padding: 6px 8px;
  font-size: 12px;
  line-height: 16px;
}

.ce-advance-table-tool__empty {
  color: rgb(100 116 139);
  text-align: center;
}

.dark .ce-advance-table-tool {
  color: rgb(226 232 240);
}

.dark .ce-advance-table-tool__scroller {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
}

.dark .ce-advance-table-tool__cell {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
}

.dark .ce-advance-table-tool__cell--header {
  background: rgb(30 41 59);
  color: rgb(241 245 249);
}

.dark .ce-advance-table-tool__cell--fixed-left {
  box-shadow: 1px 0 0 rgb(51 65 85);
}

.dark .ce-advance-table-tool__cell--fixed-right {
  box-shadow: -1px 0 0 rgb(51 65 85);
}

.dark .ce-advance-table-tool__row--selected .ce-advance-table-tool__cell {
  background: rgb(30 58 138 / 0.35);
}

.dark .ce-advance-table-tool__empty {
  color: rgb(148 163 184);
}

.dark .ce-advance-table-tool__pagination {
  border-color: rgb(51 65 85);
  background: rgb(30 41 59);
}

.dark .ce-advance-table-tool__pagination p {
  color: rgb(203 213 225);
}

.dark .ce-advance-table-tool__pagination button {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

.dark .ce-advance-table-tool__pagination button:disabled {
  color: rgb(100 116 139);
  background: rgb(2 6 23);
}

@media (max-width: 640px) {
  .ce-advance-table-tool__pagination {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
