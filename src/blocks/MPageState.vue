<script lang="ts">
import { booleanValue, stringValue } from '@/blocks/pageDslRuntime';
import type { BlockDataField, VariableValueDataType } from '@/runtime/variableValue';

export interface MPageStateProps {
  edit: boolean;
  currentBlockId?: string;
  initialState?: Record<string, unknown>;
  visibleInPreview?: boolean;
  readonly?: boolean;
  debugLabel?: string;
}

const pageStateDefaults = {
  initialState: {},
  visibleInPreview: false,
  readonly: false,
  debugLabel: 'Page State'
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function warnInvalidInitialState(value: unknown) {
  if (!import.meta.env.DEV || value === undefined) return;
  console.warn('[MPageState] initialState must be a JSON-serializable object.', value);
}

function cloneJsonValue<T>(value: T): T {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new Error('Value must be JSON serializable.');
  }
  return JSON.parse(serialized) as T;
}

function normalizeInitialState(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    warnInvalidInitialState(value);
    return {};
  }

  try {
    const cloned = cloneJsonValue(value);
    if (isRecord(cloned)) return cloned;
  } catch {
    warnInvalidInitialState(value);
  }

  return {};
}

export function normalizePageStateProps(props: Partial<MPageStateProps>): MPageStateProps {
  const merged = {
    ...pageStateDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    currentBlockId: stringValue(props.currentBlockId),
    initialState: normalizeInitialState(merged.initialState),
    visibleInPreview: booleanValue(merged.visibleInPreview, pageStateDefaults.visibleInPreview),
    readonly: booleanValue(merged.readonly, pageStateDefaults.readonly),
    debugLabel: stringValue(merged.debugLabel, pageStateDefaults.debugLabel)
  };
}

function inferDataType(value: unknown): VariableValueDataType {
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') return 'string';
  return 'object';
}

function getPageStateDataFields(data: Record<string, unknown>): BlockDataField[] {
  const initialState = normalizeInitialState(data.initialState);
  return Object.entries(initialState).map(([key, value]) => ({
    label: key,
    variable: key,
    dataType: inferDataType(value)
  }));
}
</script>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';
import { useI18n } from '@/i18n';
import {
  PreviewBlockRuntimeKey,
  type BlockMethodInvocation
} from '@/runtime/previewBlockRuntime';

type StateChangePayload = {
  value: Record<string, unknown>;
  path?: string;
  oldValue?: unknown;
};

type StateMethodResult = {
  ok: boolean;
  value: Record<string, unknown>;
  message?: string;
};

const forbiddenPathSegments = new Set(['__proto__', 'prototype', 'constructor']);
const props = defineProps<MPageStateProps & PageDslCallbacks<MPageStateProps>>();
const emit = defineEmits<{
  (event: 'change', payload: StateChangePayload): void;
  (event: 'clear', payload: StateChangePayload): void;
}>();
const { t } = useI18n();
const previewRuntime = inject(PreviewBlockRuntimeKey, null);
const state = ref<Record<string, unknown>>(normalizeInitialState(props.initialState));

const normalized = computed(() => normalizePageStateProps(props));
const shouldRender = computed(() => normalized.value.edit || normalized.value.visibleInPreview);
const keyCount = computed(() => Object.keys(state.value).length);
const keyCountLabel = computed(() => t('pageState.keyCount').replace('{count}', String(keyCount.value)));
const prettyState = computed(() => JSON.stringify(state.value, null, 2));

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function cloneRuntimeValue<T>(value: T): T {
  if (value === undefined) return value;
  return cloneJsonValue(value);
}

function readInvocationValue(invocation: unknown, key: string) {
  if (!isRecord(invocation)) return undefined;

  if (isRecord(invocation.args) && hasOwn(invocation.args, key)) {
    return invocation.args[key];
  }

  if (isRecord(invocation.inputs) && hasOwn(invocation.inputs, key)) {
    return invocation.inputs[key];
  }

  return hasOwn(invocation, key) ? invocation[key] : undefined;
}

function parsePath(value: unknown, required = false) {
  if (value === undefined || value === null || value === '') {
    return required
      ? { ok: false as const, message: t('pageState.errors.pathRequired') }
      : { ok: true as const, segments: [] as string[], path: '' };
  }

  if (typeof value !== 'string') {
    return { ok: false as const, message: t('pageState.errors.invalidPath') };
  }

  const path = value.trim();
  const segments = path.split('.').map((segment) => segment.trim());
  if (!path || segments.some((segment) => !segment || forbiddenPathSegments.has(segment))) {
    return { ok: false as const, message: t('pageState.errors.invalidPath') };
  }

  return { ok: true as const, segments, path };
}

function readPathValue(source: unknown, segments: string[]) {
  let current = source;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      if (!/^\d+$/.test(segment)) return undefined;
      current = current[Number(segment)];
      continue;
    }

    if (!isRecord(current) || !hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function isArrayIndex(value: string) {
  return /^\d+$/.test(value);
}

function setPathValue(target: Record<string, unknown>, segments: string[], value: unknown) {
  let current: Record<string, unknown> | unknown[] = target;

  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;
    if (isLast) {
      if (Array.isArray(current)) {
        if (!isArrayIndex(segment)) throw new Error(t('pageState.errors.invalidPath'));
        current[Number(segment)] = value;
      } else {
        current[segment] = value;
      }
      return;
    }

    const nextSegment = segments[index + 1];
    const currentValue = Array.isArray(current)
      ? (isArrayIndex(segment) ? current[Number(segment)] : undefined)
      : current[segment];
    const nextContainer = Array.isArray(currentValue) || isRecord(currentValue)
      ? currentValue
      : isArrayIndex(nextSegment) ? [] : {};

    if (Array.isArray(current)) {
      if (!isArrayIndex(segment)) throw new Error(t('pageState.errors.invalidPath'));
      current[Number(segment)] = nextContainer;
    } else {
      current[segment] = nextContainer;
    }
    current = nextContainer;
  });
}

function currentValue() {
  return cloneJsonValue(state.value);
}

function methodFailure(message: string): StateMethodResult {
  return {
    ok: false,
    value: currentValue(),
    message
  };
}

function writableFailure() {
  return normalized.value.readonly ? methodFailure(t('pageState.errors.readonly')) : null;
}

function notifyChange(payload: StateChangePayload, event: 'change' | 'clear' = 'change') {
  if (props.currentBlockId) {
    previewRuntime?.notifyBlockDataChange(props.currentBlockId);
  }
  if (event === 'clear') {
    emit('clear', payload);
    return;
  }
  emit('change', payload);
}

function commit(nextState: Record<string, unknown>, payload: Omit<StateChangePayload, 'value'> = {}) {
  state.value = nextState;
  const value = currentValue();
  notifyChange({ value, ...payload });
  return { ok: true, value } satisfies StateMethodResult;
}

function getData() {
  return currentValue();
}

function getValue(invocation?: BlockMethodInvocation | { path?: string }) {
  const parsedPath = parsePath(readInvocationValue(invocation, 'path'));
  if (!parsedPath.ok) {
    throw new Error(parsedPath.message);
  }

  return cloneRuntimeValue(readPathValue(state.value, parsedPath.segments));
}

function setValue(invocation?: BlockMethodInvocation | { path?: string; value?: unknown }) {
  const readonlyResult = writableFailure();
  if (readonlyResult) return readonlyResult;

  const parsedPath = parsePath(readInvocationValue(invocation, 'path'));
  if (!parsedPath.ok) return methodFailure(parsedPath.message);

  const inputValue = readInvocationValue(invocation, 'value');
  let nextValue: unknown;
  try {
    nextValue = cloneJsonValue(inputValue);
  } catch {
    return methodFailure(t('pageState.errors.invalidValue'));
  }

  if (!parsedPath.segments.length) {
    if (!isRecord(nextValue)) return methodFailure(t('pageState.errors.objectRequired'));
    return commit(nextValue, { oldValue: currentValue() });
  }

  const nextState = currentValue();
  const oldValue = cloneRuntimeValue(readPathValue(nextState, parsedPath.segments));
  try {
    setPathValue(nextState, parsedPath.segments, nextValue);
  } catch (error) {
    return methodFailure(error instanceof Error ? error.message : t('pageState.errors.invalidPath'));
  }
  return commit(nextState, {
    path: parsedPath.path,
    ...(oldValue === undefined ? {} : { oldValue })
  });
}

function merge(invocation?: BlockMethodInvocation | { value?: unknown }) {
  const readonlyResult = writableFailure();
  if (readonlyResult) return readonlyResult;

  const inputValue = readInvocationValue(invocation, 'value');
  if (!isRecord(inputValue)) return methodFailure(t('pageState.errors.objectRequired'));

  let patch: Record<string, unknown>;
  try {
    patch = cloneJsonValue(inputValue);
  } catch {
    return methodFailure(t('pageState.errors.invalidValue'));
  }

  const oldValue = currentValue();
  return commit({ ...oldValue, ...patch }, { oldValue });
}

function append(invocation?: BlockMethodInvocation | { path?: string; value?: unknown }) {
  const readonlyResult = writableFailure();
  if (readonlyResult) return readonlyResult;

  const parsedPath = parsePath(readInvocationValue(invocation, 'path'), true);
  if (!parsedPath.ok) return methodFailure(parsedPath.message);

  let item: unknown;
  try {
    item = cloneJsonValue(readInvocationValue(invocation, 'value'));
  } catch {
    return methodFailure(t('pageState.errors.invalidValue'));
  }

  const nextState = currentValue();
  const currentArray = readPathValue(nextState, parsedPath.segments);
  const oldValue = Array.isArray(currentArray) ? cloneJsonValue(currentArray) : currentArray;
  try {
    setPathValue(nextState, parsedPath.segments, [
      ...(Array.isArray(currentArray) ? currentArray : []),
      item
    ]);
  } catch (error) {
    return methodFailure(error instanceof Error ? error.message : t('pageState.errors.invalidPath'));
  }
  return commit(nextState, {
    path: parsedPath.path,
    ...(oldValue === undefined ? {} : { oldValue: cloneRuntimeValue(oldValue) })
  });
}

function clear() {
  const readonlyResult = writableFailure();
  if (readonlyResult) return readonlyResult;

  const oldValue = currentValue();
  state.value = normalizeInitialState(props.initialState);
  const value = currentValue();
  const payload = { value, oldValue };
  notifyChange(payload);
  emit('clear', payload);
  return { ok: true, value } satisfies StateMethodResult;
}

defineExpose({
  getData,
  getValue,
  setValue,
  merge,
  append,
  clear
});

watch(
  () => props.initialState,
  (value) => {
    if (props.edit) {
      state.value = normalizeInitialState(value);
    }
  },
  { deep: true }
);
</script>

<template>
  <PageDslBlock v-if="shouldRender" block-type="MPageState">
    <section class="m-page-state" data-testid="m-page-state" :aria-label="normalized.debugLabel">
      <header class="m-page-state__header">
        <strong class="m-page-state__label">{{ normalized.debugLabel }}</strong>
        <span class="m-page-state__meta">{{ keyCountLabel }}</span>
        <span v-if="normalized.readonly" class="m-page-state__badge" data-testid="m-page-state-readonly">{{ t('pageState.readonly') }}</span>
      </header>
      <pre class="m-page-state__json" data-testid="m-page-state-json">{{ prettyState }}</pre>
    </section>
  </PageDslBlock>
</template>

<style scoped>
.m-page-state {
  display: grid;
  gap: 8px;
  width: 100%;
  border: 1px solid rgb(203 213 225);
  border-radius: 8px;
  background: rgb(248 250 252);
  padding: 12px;
}

.m-page-state__header {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.m-page-state__label {
  min-width: 0;
  overflow-wrap: anywhere;
  color: rgb(15 23 42);
  font-size: 13px;
  line-height: 18px;
}

.m-page-state__meta,
.m-page-state__badge {
  flex: none;
  color: rgb(71 85 105);
  font-size: 12px;
  line-height: 18px;
}

.m-page-state__badge {
  margin-left: auto;
  border: 1px solid rgb(148 163 184);
  border-radius: 4px;
  padding: 0 6px;
}

.m-page-state__json {
  max-height: 120px;
  margin: 0;
  overflow: auto;
  border-top: 1px solid rgb(226 232 240);
  color: rgb(51 65 85);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 18px;
  padding-top: 8px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.dark .m-page-state {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
}

.dark .m-page-state__label {
  color: rgb(241 245 249);
}

.dark .m-page-state__meta,
.dark .m-page-state__badge,
.dark .m-page-state__json {
  color: rgb(203 213 225);
}

.dark .m-page-state__json {
  border-top-color: rgb(51 65 85);
}
</style>
