<script lang="ts">

import { booleanValue, normalizeSelectValue, normalizeValue, numberValue, stringValue } from '@/blocks/pageDslRuntime';
import { cloneActions, type ActionConfig, type ActionContext } from '@/actions';
import type { BlockDataField } from '@/runtime/variableValue';

export type MUploadImportMode = 'file' | 'image' | 'excel' | 'csv' | 'batchText';

export type MUploadImportUploadedFile = {
  name: string;
  size?: number;
  type?: string;
  url?: string;
  status?: 'ready' | 'uploading' | 'success' | 'error';
  response?: unknown;
  error?: string;
};

export type MUploadImportTemplate = {
  label?: string;
  url?: string;
  action?: ActionConfig[];
};

export type MUploadImportResult = {
  successCount?: number;
  failedCount?: number;
  failedRowsUrl?: string;
  message?: string;
  raw?: unknown;
};

export interface MUploadImportProps {
  edit: boolean;
  currentBlockId?: string;
  mode?: MUploadImportMode | string;
  accept?: string;
  multiple?: boolean;
  maxCount?: number;
  maxSizeMB?: number;
  drag?: boolean;
  autoUpload?: boolean;
  uploadAction?: ActionConfig[];
  template?: MUploadImportTemplate;
  parsePreview?: boolean;
  result?: MUploadImportResult;
  value?: MUploadImportUploadedFile[];
}

const uploadImportDefaults = {
  mode: 'file',
  accept: '',
  multiple: false,
  maxCount: 1,
  maxSizeMB: 20,
  drag: true,
  autoUpload: false,
  uploadAction: [] as ActionConfig[],
  parsePreview: false,
  value: [] as MUploadImportUploadedFile[]
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeMode(value: unknown): MUploadImportMode {
  return normalizeSelectValue(value, ['file', 'image', 'excel', 'csv', 'batchText'] as const, 'file');
}

function normalizeUploadStatus(value: unknown): MUploadImportUploadedFile['status'] {
  if (value === 'ready' || value === 'uploading' || value === 'success' || value === 'error') {
    return value;
  }

  return undefined;
}

function normalizeUploadedFiles(value: unknown): MUploadImportUploadedFile[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((file) => {
      const status = normalizeUploadStatus(file.status);

      return {
        name: stringValue(file.name),
        ...(typeof file.size === 'number' && Number.isFinite(file.size) ? { size: file.size } : {}),
        ...(stringValue(file.type) ? { type: stringValue(file.type) } : {}),
        ...(stringValue(file.url) ? { url: stringValue(file.url) } : {}),
        ...(status ? { status } : {}),
        ...(file.response !== undefined ? { response: normalizeValue(file.response, {}) } : {}),
        ...(stringValue(file.error) ? { error: stringValue(file.error) } : {})
      };
    })
    .filter((file) => file.name);
}

function normalizeTemplate(value: unknown): MUploadImportTemplate | undefined {
  if (!isRecord(value)) return undefined;

  const label = stringValue(value.label);
  const url = stringValue(value.url);
  const action = cloneActions(value.action);
  if (!label && !url && !action.length) return undefined;

  return {
    ...(label ? { label } : {}),
    ...(url ? { url } : {}),
    ...(action.length ? { action } : {})
  };
}

function normalizeResult(value: unknown): MUploadImportResult | undefined {
  if (!isRecord(value)) return undefined;

  return {
    ...(typeof value.successCount === 'number' ? { successCount: value.successCount } : {}),
    ...(typeof value.failedCount === 'number' ? { failedCount: value.failedCount } : {}),
    ...(stringValue(value.failedRowsUrl) ? { failedRowsUrl: stringValue(value.failedRowsUrl) } : {}),
    ...(stringValue(value.message) ? { message: stringValue(value.message) } : {}),
    ...(value.raw !== undefined ? { raw: normalizeValue(value.raw, {}) } : {})
  };
}

export function normalizeUploadImportProps(props: Partial<MUploadImportProps>): MUploadImportProps {
  const merged = {
    ...uploadImportDefaults,
    ...props
  };
  const mode = normalizeMode(merged.mode);
  const multiple = booleanValue(merged.multiple);

  return {
    edit: props.edit ?? false,
    currentBlockId: stringValue(props.currentBlockId),
    mode,
    accept: stringValue(merged.accept),
    multiple,
    maxCount: Math.max(1, Math.trunc(numberValue(merged.maxCount, multiple ? 10 : 1))),
    maxSizeMB: Math.max(0, numberValue(merged.maxSizeMB, uploadImportDefaults.maxSizeMB)),
    drag: booleanValue(merged.drag, uploadImportDefaults.drag),
    autoUpload: booleanValue(merged.autoUpload),
    uploadAction: cloneActions(merged.uploadAction),
    template: normalizeTemplate(merged.template),
    parsePreview: booleanValue(merged.parsePreview),
    result: normalizeResult(merged.result),
    value: normalizeUploadedFiles(merged.value)
  };
}

function serializeUploadImportProps(props: Partial<MUploadImportProps>) {
  const normalized = normalizeUploadImportProps(props);
  return {
    mode: normalized.mode,
    accept: normalized.accept,
    multiple: normalized.multiple,
    maxCount: normalized.maxCount,
    maxSizeMB: normalized.maxSizeMB,
    drag: normalized.drag,
    autoUpload: normalized.autoUpload,
    uploadAction: cloneActions(normalized.uploadAction),
    ...(normalized.template ? { template: normalized.template } : {}),
    parsePreview: normalized.parsePreview,
    ...(normalized.result ? { result: normalized.result } : {}),
    value: normalized.value
  };
}

function getUploadImportDataFields(): BlockDataField[] {
  return [
    { label: '文件列表', variable: 'files', dataType: 'array' },
    { label: 'URL 列表', variable: 'urls', dataType: 'array' },
    { label: '上传结果', variable: 'result', dataType: 'object' },
    { label: '批量文本', variable: 'text', dataType: 'string' }
  ];
}
</script>

<script setup lang="ts">
import { computed, inject, reactive, ref, shallowRef, watch } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';
import {
  PreviewBlockRuntimeKey,
  type PreviewRuntimeBlock
} from '@/runtime/previewBlockRuntime';
import { PageReferenceAncestryKey } from '@/pages/referenceRuntime';

type RuntimeFile = MUploadImportUploadedFile & {
  id: string;
};

const props = defineProps<MUploadImportProps & PageDslCallbacks<MUploadImportProps>>();
const emit = defineEmits<{
  (event: 'change', payload: MUploadImportProps & { files: MUploadImportUploadedFile[] }): void;
  (event: 'before-upload', payload: { files: MUploadImportUploadedFile[] }): void;
  (event: 'upload-progress', payload: { file: MUploadImportUploadedFile; percent: number }): void;
  (event: 'upload-success', payload: { result: MUploadImportResult; files: MUploadImportUploadedFile[] }): void;
  (event: 'upload-error', payload: { error: Error; file?: MUploadImportUploadedFile }): void;
  (event: 'template-download', payload: { template?: MUploadImportTemplate }): void;
}>();

const previewRuntime = inject(PreviewBlockRuntimeKey, null);
const pageReferenceAncestry = inject(PageReferenceAncestryKey, computed<readonly string[]>(() => []));
const fileInputRef = ref<HTMLInputElement | null>(null);
const dragActive = ref(false);
const uploading = ref(false);
const errorMessage = ref('');
const batchText = ref('');
const previewRows = ref<string[][]>([]);
const rawFiles = shallowRef(new Map<string, File>());
const state = reactive({
  files: createRuntimeFiles(props.value),
  result: normalizeResult(props.result)
});

const normalizedProps = computed(() => normalizeUploadImportProps({
  ...props,
  value: state.files,
  result: state.result
}));
const mode = computed<MUploadImportMode>(() => normalizeMode(normalizedProps.value.mode));
const isBatchTextMode = computed(() => mode.value === 'batchText');
const templateLabel = computed(() => normalizedProps.value.template?.label || '下载导入模板');
const effectiveAccept = computed(() => normalizedProps.value.accept || getDefaultAccept(mode.value));
const helperText = computed(() => {
  const maxSize = normalizedProps.value.maxSizeMB;
  const count = normalizedProps.value.maxCount;
  return `${effectiveAccept.value || '任意文件'} / ${maxSize}MB / ${count} 个文件`;
});
const statusText = computed(() => {
  if (uploading.value) return '上传中...';
  if (state.result?.message) return state.result.message;
  return '';
});
const successCount = computed(() => state.result?.successCount ?? countFilesByStatus('success'));
const failedCount = computed(() => state.result?.failedCount ?? countFilesByStatus('error'));
const fileList = computed(() => state.files);

watch(
  () => props.value,
  (value) => {
    state.files = createRuntimeFiles(value);
  },
  { deep: true }
);

watch(
  () => props.result,
  (value) => {
    state.result = normalizeResult(value);
  },
  { deep: true }
);

function createRuntimeFiles(value: unknown): RuntimeFile[] {
  return normalizeUploadedFiles(value).map((file, index) => ({
    ...file,
    id: createRuntimeFileId(file, index)
  }));
}

function createRuntimeFileId(file: Pick<MUploadImportUploadedFile, 'name' | 'size'>, index = 0) {
  return `${file.name || 'file'}-${file.size ?? 0}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function stripRuntimeFile(file: RuntimeFile): MUploadImportUploadedFile {
  const { id: _id, ...rest } = file;
  return rest;
}

function stripRuntimeFiles(files = state.files) {
  return files.map(stripRuntimeFile);
}

function emitStateChange(patch: Partial<MUploadImportProps> = {}) {
  const nextPayload = normalizeUploadImportProps({
    ...props,
    value: stripRuntimeFiles(),
    result: state.result,
    ...patch
  });
  props.onToolChange?.(nextPayload);
  emit('change', {
    ...nextPayload,
    files: nextPayload.value ?? []
  });
  if (props.currentBlockId) {
    previewRuntime?.notifyBlockDataChange(props.currentBlockId);
  }
}

function getDefaultAccept(uploadMode: MUploadImportMode) {
  if (uploadMode === 'image') return 'image/*';
  if (uploadMode === 'excel') return '.xlsx,.xls,.csv';
  if (uploadMode === 'csv') return '.csv,text/csv';
  return '';
}

function getAcceptRules() {
  return effectiveAccept.value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getFileExtension(file: File) {
  const dotIndex = file.name.lastIndexOf('.');
  return dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : '';
}

function matchesAccept(file: File) {
  const rules = getAcceptRules();
  if (!rules.length) return true;

  const extension = getFileExtension(file);
  const mime = file.type.toLowerCase();
  return rules.some((rule) => {
    if (rule.startsWith('.')) return extension === rule;
    if (rule.endsWith('/*')) return mime.startsWith(rule.slice(0, -1));
    return mime === rule;
  });
}

function validateFiles(files: File[]) {
  const config = normalizedProps.value;
  const maxCount = config.multiple ? config.maxCount ?? 1 : 1;
  const existingCount = config.multiple ? state.files.length : 0;
  if (existingCount + files.length > maxCount) {
    return `最多只能选择 ${maxCount} 个文件。`;
  }

  const maxBytes = (config.maxSizeMB ?? 20) * 1024 * 1024;
  for (const file of files) {
    if (!matchesAccept(file)) {
      return `文件类型不符合要求：${file.name}`;
    }
    if (maxBytes > 0 && file.size > maxBytes) {
      return `文件超过大小限制：${file.name}`;
    }
  }

  return '';
}

function selectFiles() {
  fileInputRef.value?.click();
  return Promise.resolve();
}

function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement;
  void addFiles(Array.from(input.files ?? []));
  input.value = '';
}

async function addFiles(files: File[]) {
  if (!files.length) return;
  errorMessage.value = '';
  const validationError = validateFiles(files);
  if (validationError) {
    errorMessage.value = validationError;
    return;
  }

  const runtimeFiles = files.map((file, index): RuntimeFile => ({
    id: createRuntimeFileId(file, index),
    name: file.name,
    size: file.size,
    type: file.type,
    status: 'ready'
  }));
  const nextFiles = normalizedProps.value.multiple
    ? [...state.files, ...runtimeFiles]
    : runtimeFiles.slice(0, 1);
  const nextRawFiles = new Map(rawFiles.value);
  if (!normalizedProps.value.multiple) {
    nextRawFiles.clear();
  }
  runtimeFiles.forEach((file, index) => {
    nextRawFiles.set(file.id, files[index]);
  });
  rawFiles.value = nextRawFiles;
  state.files = nextFiles;
  emitStateChange({ value: stripRuntimeFiles(nextFiles) });

  if (normalizedProps.value.parsePreview) {
    await parseFiles();
  }
  if (normalizedProps.value.autoUpload) {
    await upload();
  }
}

function handleDragEnter(event: DragEvent) {
  if (!normalizedProps.value.drag) return;
  event.preventDefault();
  dragActive.value = true;
}

function handleDragOver(event: DragEvent) {
  if (!normalizedProps.value.drag) return;
  event.preventDefault();
}

function handleDragLeave() {
  dragActive.value = false;
}

function handleDrop(event: DragEvent) {
  if (!normalizedProps.value.drag) return;
  event.preventDefault();
  dragActive.value = false;
  void addFiles(Array.from(event.dataTransfer?.files ?? []));
}

function removeFile(fileId: string) {
  const nextRawFiles = new Map(rawFiles.value);
  nextRawFiles.delete(fileId);
  rawFiles.value = nextRawFiles;
  state.files = state.files.filter((file) => file.id !== fileId && file.name !== fileId);
  emitStateChange();
}

function clear() {
  state.files = [];
  state.result = undefined;
  rawFiles.value = new Map();
  previewRows.value = [];
  errorMessage.value = '';
  batchText.value = '';
  emitStateChange({ value: [], result: undefined });
}

function setValue(files: MUploadImportUploadedFile[]) {
  state.files = createRuntimeFiles(files);
  rawFiles.value = new Map();
  emitStateChange({ value: stripRuntimeFiles() });
}

function getUploadFiles() {
  if (isBatchTextMode.value && batchText.value.trim()) {
    const file = new File([batchText.value], 'batch-text.txt', { type: 'text/plain' });
    return [{
      file,
      runtime: {
        id: createRuntimeFileId(file),
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'ready' as const
      }
    }];
  }

  return state.files.flatMap((runtime) => {
    const file = rawFiles.value.get(runtime.id);
    return file ? [{ file, runtime }] : [];
  });
}

function createSourceBlock(): PreviewRuntimeBlock {
  return {
    id: props.currentBlockId,
    type: 'MUploadImport',
    data: getSerializedData(),
    _pageAncestry: [...pageReferenceAncestry.value]
  };
}

async function upload() {
  if (uploading.value) return state.result;

  const uploadFiles = getUploadFiles();
  if (!uploadFiles.length) {
    errorMessage.value = isBatchTextMode.value ? '请输入批量文本。' : '请先选择文件。';
    return state.result;
  }

  const validationError = validateFiles(uploadFiles.map((item) => item.file));
  if (validationError) {
    errorMessage.value = validationError;
    return state.result;
  }

  const actions = cloneActions(normalizedProps.value.uploadAction);
  if (!actions.length) {
    errorMessage.value = '请先配置上传 Action。';
    return state.result;
  }

  errorMessage.value = '';
  uploading.value = true;
  state.files = uploadFiles.map((item) => ({ ...item.runtime, status: 'uploading' }));
  emit('before-upload', { files: stripRuntimeFiles() });
  emitStateChange();

  try {
    const files = uploadFiles.map((item) => item.file);
    const actionState = await previewRuntime?.runActions(actions, createSourceBlock(), {
      file: files[0],
      files,
      metadata: stripRuntimeFiles(),
      text: batchText.value
    });
    const uploadOutputs = extractUploadOutputs(actionState);
    state.files = mergeUploadedFiles(state.files, uploadOutputs.files);
    state.result = normalizeUploadResult(uploadOutputs, state.files.length);
    emit('upload-progress', { file: stripRuntimeFile(state.files[0]), percent: 100 });
    emit('upload-success', { result: state.result, files: stripRuntimeFiles() });
    emitStateChange({ value: stripRuntimeFiles(), result: state.result });
    return state.result;
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    errorMessage.value = normalizedError.message;
    state.files = state.files.map((file) => ({
      ...file,
      status: 'error',
      error: normalizedError.message
    }));
    state.result = {
      successCount: 0,
      failedCount: state.files.length,
      message: normalizedError.message
    };
    emit('upload-error', { error: normalizedError, file: stripRuntimeFile(state.files[0]) });
    emitStateChange({ value: stripRuntimeFiles(), result: state.result });
    return state.result;
  } finally {
    uploading.value = false;
  }
}

function extractUploadOutputs(actionState: ActionContext | undefined) {
  const actionOutputs = Object.values(actionState?.actions ?? {}).map((item) => item.outputs);
  const matched = actionOutputs.find((outputs) =>
    Array.isArray(outputs.files) ||
    Array.isArray(outputs.urls) ||
    outputs.success !== undefined ||
    outputs.rawResponse !== undefined
  ) ?? {};
  return {
    files: normalizeUploadedFiles(matched.files),
    urls: Array.isArray(matched.urls) ? matched.urls.filter((item): item is string => typeof item === 'string') : [],
    success: matched.success === true,
    rawResponse: matched.rawResponse
  };
}

function mergeUploadedFiles(currentFiles: RuntimeFile[], uploadedFiles: MUploadImportUploadedFile[]) {
  if (!uploadedFiles.length) {
    return currentFiles.map((file) => ({
      ...file,
      status: 'success' as const
    }));
  }

  return currentFiles.map((file, index) => {
    const uploaded = uploadedFiles[index];
    return {
      ...file,
      ...uploaded,
      id: file.id,
      status: uploaded?.status ?? 'success'
    };
  });
}

function readPath(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((cursor, key) => (
    isRecord(cursor) && key in cursor ? cursor[key] : undefined
  ), value);
}

function firstNumber(value: unknown, paths: string[]) {
  for (const path of paths) {
    const item = readPath(value, path);
    if (typeof item === 'number' && Number.isFinite(item)) return item;
  }
  return undefined;
}

function firstString(value: unknown, paths: string[]) {
  for (const path of paths) {
    const item = readPath(value, path);
    if (typeof item === 'string' && item.trim()) return item.trim();
  }
  return '';
}

function normalizeUploadResult(
  outputs: { success: boolean; rawResponse: unknown; files: MUploadImportUploadedFile[]; urls: string[] },
  fallbackSuccessCount: number
): MUploadImportResult {
  const raw = outputs.rawResponse;
  const successCount = firstNumber(raw, ['successCount', 'success', 'data.successCount', 'data.success']);
  const failedCount = firstNumber(raw, ['failedCount', 'failCount', 'failed', 'data.failedCount', 'data.failCount', 'data.failed']);
  const failedRowsUrl = firstString(raw, [
    'failedRowsUrl',
    'failedUrl',
    'data.failedRowsUrl',
    'data.failedUrl',
    'data.failedFileUrl'
  ]);

  return {
    successCount: successCount ?? (outputs.success ? fallbackSuccessCount : countFilesByStatus('success')),
    failedCount: failedCount ?? countFilesByStatus('error'),
    ...(failedRowsUrl ? { failedRowsUrl } : {}),
    message: '上传完成',
    ...(raw !== undefined ? { raw } : {})
  };
}

function countFilesByStatus(status: RuntimeFile['status']) {
  return state.files.filter((file) => file.status === status).length;
}

async function downloadTemplate() {
  const template = normalizedProps.value.template;
  if (!template) return;

  if (template.action?.length) {
    await previewRuntime?.runActions(template.action, createSourceBlock(), {
      template
    });
  } else if (template.url) {
    triggerDownload(template.url, getTemplateFileName(template));
  }

  emit('template-download', { template });
}

function getTemplateFileName(template: MUploadImportTemplate) {
  if (template.label && /\.[a-z0-9]+$/i.test(template.label)) return template.label;
  if (template.url) {
    const pathname = template.url.split('?')[0] ?? '';
    const lastSegment = pathname.split('/').filter(Boolean).pop();
    if (lastSegment) return lastSegment;
  }
  return 'template.xlsx';
}

function triggerDownload(url: string, fileName: string) {
  if (typeof document === 'undefined') return;
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadFailedRows() {
  const url = state.result?.failedRowsUrl;
  if (!url) return;
  triggerDownload(url, 'failed-rows.xlsx');
}

async function parseFiles() {
  errorMessage.value = '';
  if (isBatchTextMode.value) {
    previewRows.value = batchText.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => [line]);
    return previewRows.value;
  }

  const csvRuntimeFile = state.files.find((file) => getRuntimeFileExtension(file) === '.csv');
  const csvFile = csvRuntimeFile ? rawFiles.value.get(csvRuntimeFile.id) : undefined;
  if (!csvFile) {
    previewRows.value = [];
    if (mode.value === 'excel') {
      errorMessage.value = 'Excel 内容预览暂未启用，请直接上传。';
    }
    return previewRows.value;
  }

  const text = await csvFile.text();
  previewRows.value = parseCsv(text).slice(0, 20);
  return previewRows.value;
}

function getRuntimeFileExtension(file: RuntimeFile) {
  const dotIndex = file.name.lastIndexOf('.');
  return dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : '';
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];
    if (char === '"' && quoted && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && nextChar === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += char;
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((items) => items.some((item) => item.trim()));
}

function handleBatchTextInput(event: Event) {
  batchText.value = (event.target as HTMLTextAreaElement).value;
  if (normalizedProps.value.parsePreview) {
    void parseFiles();
  }
  emitStateChange();
}

function getSerializedData() {
  return serializeUploadImportProps({
    ...props,
    value: stripRuntimeFiles(),
    result: state.result
  });
}

function getData() {
  const files = stripRuntimeFiles();
  return {
    files,
    urls: files.map((file) => file.url).filter((url): url is string => typeof url === 'string' && Boolean(url)),
    result: state.result ?? {},
    text: batchText.value
  };
}

defineExpose({
  selectFiles,
  upload,
  clear,
  removeFile,
  downloadTemplate,
  parseFiles,
  setValue,
  getData
});
</script>

<template>
  <PageDslBlock block-type="MUploadImport">
    <section class="m-upload-import" data-testid="editor-upload-import-tool">
      <input
        ref="fileInputRef"
        class="m-upload-import__input"
        type="file"
        :accept="effectiveAccept"
        :multiple="normalizedProps.multiple"
        data-testid="upload-import-file-input"
        @change="handleFileInput"
      />

      <textarea
        v-if="isBatchTextMode"
        class="m-upload-import__batch"
        :value="batchText"
        placeholder="每行一条数据"
        data-testid="upload-import-batch-text"
        @input="handleBatchTextInput"
      ></textarea>

      <button
        v-else
        class="m-upload-import__dropzone"
        :class="{ 'm-upload-import__dropzone--active': dragActive }"
        type="button"
        data-testid="upload-import-dropzone"
        @click="selectFiles"
        @dragenter="handleDragEnter"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
      >
        <span class="m-upload-import__drop-title">Drop Excel / CSV / Image here</span>
        <span class="m-upload-import__drop-subtitle">or click to select files</span>
        <span class="m-upload-import__helper">{{ helperText }}</span>
      </button>

      <div class="m-upload-import__actions">
        <button
          v-if="normalizedProps.template"
          class="m-upload-import__button m-upload-import__button--secondary"
          type="button"
          data-testid="upload-import-template"
          @click="downloadTemplate"
        >
          {{ templateLabel }}
        </button>
        <button
          class="m-upload-import__button m-upload-import__button--primary"
          type="button"
          :disabled="uploading"
          data-testid="upload-import-upload"
          @click="upload"
        >
          上传
        </button>
        <button
          class="m-upload-import__button m-upload-import__button--secondary"
          type="button"
          data-testid="upload-import-clear"
          @click="clear"
        >
          清空
        </button>
        <button
          v-if="normalizedProps.parsePreview"
          class="m-upload-import__button m-upload-import__button--secondary"
          type="button"
          data-testid="upload-import-parse"
          @click="parseFiles"
        >
          预览
        </button>
      </div>

      <ul v-if="fileList.length" class="m-upload-import__files" data-testid="upload-import-file-list">
        <li
          v-for="file in fileList"
          :key="file.id"
          class="m-upload-import__file"
          :data-testid="`upload-import-file-${file.name}`"
        >
          <span class="m-upload-import__file-name">{{ file.name }}</span>
          <span class="m-upload-import__file-meta">{{ file.status || 'ready' }}</span>
          <button
            class="m-upload-import__remove"
            type="button"
            :aria-label="`remove ${file.name}`"
            @click="removeFile(file.id)"
          >
            x
          </button>
        </li>
      </ul>

      <p v-if="errorMessage" class="m-upload-import__error" data-testid="upload-import-error">
        {{ errorMessage }}
      </p>

      <div v-if="previewRows.length" class="m-upload-import__preview" data-testid="upload-import-preview">
        <table>
          <tbody>
            <tr v-for="(row, rowIndex) in previewRows" :key="`row-${rowIndex}`">
              <td v-for="(cell, cellIndex) in row" :key="`cell-${rowIndex}-${cellIndex}`">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="state.result || statusText"
        class="m-upload-import__result"
        data-testid="upload-import-result"
      >
        <span>Result: success {{ successCount }}, failed {{ failedCount }}</span>
        <button
          v-if="state.result?.failedRowsUrl"
          class="m-upload-import__link"
          type="button"
          data-testid="upload-import-failed-download"
          @click="downloadFailedRows"
        >
          download failed rows
        </button>
      </div>
    </section>
  </PageDslBlock>
</template>

<style scoped>
.m-upload-import {
  display: grid;
  gap: 12px;
  width: 100%;
  color: rgb(15 23 42);
}

.m-upload-import__input {
  display: none;
}

.m-upload-import__dropzone {
  display: grid;
  gap: 8px;
  width: 100%;
  min-height: 150px;
  place-items: center;
  border: 1px dashed rgb(148 163 184);
  border-radius: 8px;
  padding: 24px;
  background: rgb(248 250 252);
  color: rgb(37 99 235);
  cursor: default;
}

.m-upload-import__dropzone--active {
  border-color: rgb(37 99 235);
  background: rgb(239 246 255);
}

.m-upload-import__drop-title {
  font-size: 18px;
  font-weight: 700;
}

.m-upload-import__drop-subtitle,
.m-upload-import__helper,
.m-upload-import__file-meta {
  color: rgb(100 116 139);
  font-size: 13px;
}

.m-upload-import__batch {
  min-height: 150px;
  width: 100%;
  resize: vertical;
  border: 1px solid rgb(203 213 225);
  border-radius: 8px;
  padding: 12px;
  background: rgb(255 255 255);
  color: rgb(15 23 42);
  font-size: 14px;
  line-height: 1.5;
}

.m-upload-import__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.m-upload-import__button {
  border-radius: 7px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 700;
}

.m-upload-import__button--primary {
  border: 1px solid rgb(37 99 235);
  background: rgb(37 99 235);
  color: white;
}

.m-upload-import__button--secondary {
  border: 1px solid rgb(203 213 225);
  background: rgb(255 255 255);
  color: rgb(71 85 105);
}

.m-upload-import__button:disabled {
  opacity: 0.6;
}

.m-upload-import__files {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.m-upload-import__file {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  border: 1px solid rgb(226 232 240);
  border-radius: 8px;
  padding: 8px 10px;
  background: rgb(255 255 255);
}

.m-upload-import__file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m-upload-import__remove {
  border: 0;
  background: transparent;
  color: rgb(100 116 139);
  font-weight: 700;
}

.m-upload-import__error {
  margin: 0;
  border: 1px solid rgb(254 202 202);
  border-radius: 8px;
  padding: 8px 10px;
  background: rgb(254 242 242);
  color: rgb(185 28 28);
  font-size: 13px;
}

.m-upload-import__preview {
  overflow: auto;
  max-height: 180px;
  border: 1px solid rgb(226 232 240);
  border-radius: 8px;
}

.m-upload-import__preview table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.m-upload-import__preview td {
  border-bottom: 1px solid rgb(226 232 240);
  padding: 6px 8px;
}

.m-upload-import__result {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  border: 1px solid rgb(187 247 208);
  border-radius: 8px;
  padding: 8px 10px;
  background: rgb(236 253 245);
  color: rgb(21 128 61);
  font-size: 14px;
}

.m-upload-import__link {
  border: 0;
  background: transparent;
  color: rgb(37 99 235);
  font-weight: 700;
}

.dark .m-upload-import {
  color: rgb(226 232 240);
}

.dark .m-upload-import__dropzone,
.dark .m-upload-import__batch,
.dark .m-upload-import__button--secondary,
.dark .m-upload-import__file {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}
</style>
