<script lang="ts">
import { valueBlockDataField } from '@/blocks/blockDataFields';
import { booleanValue, normalizeValue, numberValue, stringValue } from '@/blocks/pageDslRuntime';
import type { BlockDataField } from '@/runtime/variableValue';

export interface MJsonEditorProps {
  edit: boolean;
  currentBlockId?: string;
  label?: string;
  value?: unknown;
  placeholder?: string;
  rows?: number;
  readonly?: boolean;
  recordUuid?: string;
  recordName?: string;
  schema?: Record<string, unknown>;
  requireObject?: boolean;
  allowArray?: boolean;
}

const jsonEditorDefaults = {
  label: 'JSON',
  value: {},
  placeholder: '{\n  \"schemaVersion\": 1\n}',
  rows: 18,
  readonly: false,
  requireObject: true,
  allowArray: false
} as const;

function cloneValue<T>(value: T): T {
  if (value === undefined || value === null || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function formatJsonValue(value: unknown) {
  if (typeof value === 'string') return value;
  if (value === undefined) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
}

export function normalizeJsonEditorProps(props: Partial<MJsonEditorProps>): MJsonEditorProps {
  const merged = {
    ...jsonEditorDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    currentBlockId: stringValue(props.currentBlockId),
    label: stringValue(merged.label, jsonEditorDefaults.label),
    value: normalizeValue(merged.value, jsonEditorDefaults.value),
    placeholder: stringValue(merged.placeholder, jsonEditorDefaults.placeholder),
    rows: numberValue(merged.rows, jsonEditorDefaults.rows),
    readonly: booleanValue(merged.readonly, jsonEditorDefaults.readonly),
    recordUuid: stringValue(merged.recordUuid),
    recordName: stringValue(merged.recordName),
    schema: typeof merged.schema === 'object' && merged.schema !== null && !Array.isArray(merged.schema)
      ? cloneValue(merged.schema as Record<string, unknown>)
      : undefined,
    requireObject: booleanValue(merged.requireObject, jsonEditorDefaults.requireObject),
    allowArray: booleanValue(merged.allowArray, jsonEditorDefaults.allowArray)
  };
}

function getJsonEditorDataFields(): BlockDataField[] {
  return [
    ...valueBlockDataField('string'),
    {
      label: 'JSON 对象',
      variable: 'layoutJson',
      dataType: 'object'
    },
    {
      label: '记录 UUID',
      variable: 'recordUuid',
      dataType: 'string'
    },
    {
      label: '记录名称',
      variable: 'recordName',
      dataType: 'string'
    },
    {
      label: '校验状态',
      variable: 'valid',
      dataType: 'boolean'
    }
  ];
}
</script>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import {
  PreviewBlockRuntimeKey,
  type BlockMethodInvocation
} from '@/runtime/previewBlockRuntime';

const props = defineProps<MJsonEditorProps & {
  onChange?: (payload: MJsonEditorProps) => void;
  onToolChange?: (payload: MJsonEditorProps) => void;
}>();

const previewRuntime = inject(PreviewBlockRuntimeKey, null);
const editorText = ref(formatJsonValue(props.value));
const validationError = ref('');
const editorRows = computed(() => {
  const rows = Number(props.rows);
  return Number.isFinite(rows) && rows > 0 ? rows : jsonEditorDefaults.rows;
});
const editorLabel = computed(() => props.label || jsonEditorDefaults.label);
const editorPlaceholder = computed(() => props.placeholder || jsonEditorDefaults.placeholder);
const requiresObjectRoot = computed(() => props.requireObject !== false);
const allowsArrayRoot = computed(() => props.allowArray === true);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rootValidationError(value: unknown) {
  if (requiresObjectRoot.value && !isRecord(value)) {
    return 'JSON 必须是对象。';
  }

  if (Array.isArray(value) && !allowsArrayRoot.value) {
    return 'JSON 不允许使用数组作为根节点。';
  }

  return '';
}

function parseEditorText(reportError: boolean) {
  try {
    const parsed = JSON.parse(editorText.value) as unknown;
    const rootError = rootValidationError(parsed);
    if (rootError) {
      throw new Error(rootError);
    }
    if (reportError) {
      validationError.value = '';
    }
    return {
      ok: true as const,
      value: parsed
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON 无效。';
    if (reportError) {
      validationError.value = message;
    }
    return {
      ok: false as const,
      error: message
    };
  }
}

function normalizePatch(value: unknown) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function emitChange() {
  const payload = normalizeJsonEditorProps({
    edit: props.edit,
    currentBlockId: props.currentBlockId,
    label: props.label,
    value: editorText.value,
    placeholder: props.placeholder,
    rows: props.rows,
    readonly: props.readonly,
    recordUuid: props.recordUuid,
    recordName: props.recordName,
    schema: props.schema,
    requireObject: props.requireObject,
    allowArray: props.allowArray
  });
  props.onToolChange?.(payload);
  props.onChange?.(payload);
  if (props.currentBlockId) {
    previewRuntime?.notifyBlockDataChange(props.currentBlockId);
  }
}

function handleInput(event: Event) {
  editorText.value = (event.target as HTMLTextAreaElement).value;
  parseEditorText(true);
  emitChange();
}

function getData() {
  const parsed = parseEditorText(false);
  const json = parsed.ok ? parsed.value : null;
  const objectJson = isRecord(json) ? json : null;

  return {
    value: editorText.value,
    layoutJson: objectJson,
    json,
    valid: parsed.ok,
    error: parsed.ok ? '' : parsed.error || validationError.value || 'JSON 无效。',
    recordUuid: props.recordUuid || readString(objectJson?.uuid),
    recordName: props.recordName || readString(objectJson?.name)
  };
}

function getLayoutJson(invocation?: BlockMethodInvocation) {
  const parsed = parseEditorText(true);
  if (!parsed.ok) {
    throw new Error(validationError.value || 'JSON 无效。');
  }

  if (!isRecord(parsed.value)) {
    validationError.value = 'JSON 必须是对象。';
    throw new Error(validationError.value);
  }

  return {
    ...parsed.value,
    ...normalizePatch(readInvocationValue(invocation, 'patch'))
  };
}

function getJson(invocation?: BlockMethodInvocation) {
  const parsed = parseEditorText(true);
  const strictValue = readInvocationValue(invocation, 'strict');
  const strict = strictValue === undefined ? true : strictValue !== false;

  if (!parsed.ok) {
    if (!strict) return null;
    throw new Error(validationError.value || parsed.error || 'JSON 无效。');
  }

  return cloneValue(parsed.value);
}

function readInvocationValue(invocation: unknown, key: string) {
  if (!isRecord(invocation)) return undefined;

  if (isRecord(invocation.args) && Object.prototype.hasOwnProperty.call(invocation.args, key)) {
    return invocation.args[key];
  }

  if (isRecord(invocation.inputs) && Object.prototype.hasOwnProperty.call(invocation.inputs, key)) {
    return invocation.inputs[key];
  }

  if (Object.prototype.hasOwnProperty.call(invocation, key)) {
    return invocation[key];
  }

  return undefined;
}

function readSetValueInput(invocation: unknown) {
  if (!isRecord(invocation)) return invocation;

  if (isRecord(invocation.args) && Object.prototype.hasOwnProperty.call(invocation.args, 'value')) {
    return invocation.args.value;
  }

  if (isRecord(invocation.inputs) && Object.prototype.hasOwnProperty.call(invocation.inputs, 'value')) {
    return invocation.inputs.value;
  }

  return invocation;
}

function ensureWritable() {
  if (props.readonly) {
    throw new Error('JSON 编辑器为只读状态，不能修改。');
  }
}

function setEditorText(value: unknown) {
  editorText.value = formatJsonValue(value);
  parseEditorText(true);
  emitChange();
  return getData();
}

function setValue(invocation?: unknown) {
  ensureWritable();
  return setEditorText(readSetValueInput(invocation));
}

function clear() {
  ensureWritable();
  return setEditorText(jsonEditorDefaults.value);
}

function format() {
  const parsed = parseEditorText(true);
  if (!parsed.ok) {
    throw new Error(validationError.value || parsed.error || 'JSON 无效。');
  }

  editorText.value = formatJsonValue(parsed.value);
  emitChange();
  return {
    value: editorText.value
  };
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

defineExpose({
  getData,
  getJson,
  getLayoutJson,
  setValue,
  clear,
  format
});

watch(
  () => props.value,
  (value) => {
    const nextText = formatJsonValue(value);
    if (nextText !== editorText.value) {
      editorText.value = nextText;
      validationError.value = '';
      if (props.currentBlockId) {
        previewRuntime?.notifyBlockDataChange(props.currentBlockId);
      }
    }
  },
  { deep: true }
);
</script>

<template>
  <PageDslBlock block-type="MJsonEditor">
    <div class="m-json-editor" data-testid="m-json-editor">
      <label class="m-json-editor__label">
        <span class="m-json-editor__title">{{ editorLabel }}</span>
        <textarea
          data-testid="m-json-editor-control"
          class="m-json-editor__control"
          spellcheck="false"
          :readonly="readonly"
          :rows="editorRows"
          :placeholder="editorPlaceholder"
          :value="editorText"
          @input="handleInput"
        ></textarea>
      </label>
      <p v-if="validationError" data-testid="m-json-editor-error" class="m-json-editor__error">{{ validationError }}</p>
    </div>
  </PageDslBlock>
</template>

<style scoped>
.m-json-editor {
  display: grid;
  gap: 8px;
  width: 100%;
}

.m-json-editor__label {
  display: grid;
  gap: 8px;
}

.m-json-editor__title {
  color: rgb(51 65 85);
  font-size: 14px;
  font-weight: 700;
}

.m-json-editor__control {
  width: 100%;
  min-height: 320px;
  resize: vertical;
  border: 1px solid rgb(148 163 184 / 0.65);
  border-radius: 8px;
  background: rgb(255 255 255);
  color: rgb(15 23 42);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 18px;
  padding: 10px 12px;
  tab-size: 2;
}

.m-json-editor__control:focus {
  outline: none;
  border-color: rgb(99 102 241);
  box-shadow: 0 0 0 2px rgb(99 102 241 / 0.14);
}

.m-json-editor__control:read-only {
  background: rgb(248 250 252);
  color: rgb(71 85 105);
}

.m-json-editor__error {
  margin: 0;
  border: 1px solid rgb(251 191 36 / 0.62);
  border-radius: 8px;
  background: rgb(254 243 199 / 0.74);
  color: rgb(146 64 14);
  font-size: 13px;
  line-height: 18px;
  padding: 8px 10px;
}

.dark .m-json-editor__title {
  color: rgb(226 232 240);
}

.dark .m-json-editor__control {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

.dark .m-json-editor__control:read-only {
  background: rgb(15 23 42 / 0.7);
  color: rgb(148 163 184);
}

.dark .m-json-editor__error {
  border-color: rgb(180 83 9 / 0.72);
  background: rgb(146 64 14 / 0.22);
  color: rgb(254 215 170);
}
</style>
