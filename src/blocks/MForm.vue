<script lang="ts">
export {
  normalizeMFormProps,
  serializeMFormProps
} from '@/blocks/mFormRuntime';
export type { MFormItemData, MFormProps } from '@/blocks/mFormRuntime';
</script>

<script setup lang="ts">
import { computed, inject, nextTick, ref, watch } from 'vue';
import MFormItem from '@/blocks/MFormItem.vue';
import MActionToolbar from '@/blocks/MActionToolbar.vue';
import {
  cloneFormItemData,
  normalizeMFormActionBar,
  normalizeMFormItemWidthMode,
  normalizeMFormItems,
  normalizeMFormLayout,
  normalizeMFormProcessors,
  normalizeMFormSubmit,
  normalizeMFormValues,
  type MFormItemData,
  type MFormProps,
  type MFormSubmitData
} from '@/blocks/mFormRuntime';
import { cloneSelectorBlock } from '@/blocks/storedBlocks';
import { cloneBlockEvents, normalizeBlockEvents } from '@/blocks/blockEvents';
import { PreviewBlockRuntimeKey, type PreviewRuntimeBlock } from '@/runtime/previewBlockRuntime';
import { PageReferenceAncestryKey } from '@/pages/referenceRuntime';
import type { ProcessorConfig } from '@/processors/types';

const props = withDefaults(defineProps<MFormProps & {
  onChange?: (payload: MFormProps) => void;
  onToolChange?: (payload: MFormProps) => void;
}>(), {
  edit: false,
  items: () => []
});

const emit = defineEmits<{
  (event: 'change', items: MFormItemData[]): void;
  (event: 'reset', payload: { values: Record<string, unknown> }): void;
  (event: 'submit', payload: { values: Record<string, unknown>; valid: boolean; errors: unknown[] }): void;
}>();

const rootRef = ref<HTMLElement | null>(null);
const previewItems = computed(() => normalizeMFormItems(props.items));
const formValues = computed(() => normalizeMFormValues(props.values));
const formDefaultValues = computed(() => normalizeMFormValues(props.defaultValues));
const formSubmitOptions = computed(() => normalizeMFormSubmit(props.submit));
const formProcessors = computed(() => normalizeMFormProcessors(props.processors));
const formLayout = computed(() => normalizeMFormLayout(props.layout));
const formItemWidthMode = computed(() => normalizeMFormItemWidthMode(props.itemWidthMode));
const formActionBar = computed(() => normalizeMFormActionBar(props.actionBar ?? props.toolbar));
const runtimeValues = ref<Record<string, unknown>>({});
const initialRuntimeValues = ref<Record<string, unknown>>({});
const previewRuntime = inject(PreviewBlockRuntimeKey, null);
const pageReferenceAncestry = inject(PageReferenceAncestryKey, computed<readonly string[]>(() => []));
let isReadingRuntimeData = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? JSON.parse(JSON.stringify(value)) as Record<string, unknown> : {};
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isMethodInvocation(value: Record<string, unknown>) {
  return hasOwn(value, 'inputs') || hasOwn(value, 'args') || hasOwn(value, 'methodName');
}

function readEditorValue(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return hasOwn(value, 'value') ? value.value : value;
}

function setRuntimeValues(values: Record<string, unknown>) {
  runtimeValues.value = cloneRecord(values);
  return runtimeValues.value;
}

function readValuesPayload(value: unknown) {
  if (!isRecord(value)) return { hasValues: false, values: {} as Record<string, unknown> };
  if (hasOwn(value, 'args') && isRecord(value.args)) return { hasValues: true, values: cloneRecord(value.args) };
  if (hasOwn(value, 'inputs') && isRecord(value.inputs)) {
    const inputs = value.inputs;
    if (hasOwn(inputs, 'values')) return { hasValues: isRecord(inputs.values), values: cloneRecord(inputs.values) };
  }
  if (hasOwn(value, 'values')) return { hasValues: isRecord(value.values), values: cloneRecord(value.values) };
  if (isMethodInvocation(value)) return { hasValues: false, values: {} as Record<string, unknown> };
  return { hasValues: true, values: cloneRecord(value) };
}

async function applyFormProcessors(values: Record<string, unknown>, processors?: ProcessorConfig[]) {
  if (!processors?.length) return cloneRecord(values);
  const { applyProcessors } = await import('@/processors/runner');
  return cloneRecord(applyProcessors(cloneRecord(values), processors));
}

function syncRuntimeValuesFromProps() {
  const values = { ...formDefaultValues.value, ...formValues.value };
  setRuntimeValues(values);
  initialRuntimeValues.value = cloneRecord(values);
}

function notifyRuntimeDataChange() {
  if (props.currentBlockId) previewRuntime?.notifyBlockDataChange(props.currentBlockId);
}

function isFormItemHidden(item: MFormItemData) {
  return item.hidden === true;
}

function isFormItemDisabled(item: MFormItemData) {
  return isRecord(item.editor?.data) && item.editor.data.disabled === true;
}

function isFormItemRequired(item: MFormItemData) {
  return isRecord(item.editor?.data) && item.editor.data.required === true;
}

function isEmptySubmitValue(value: unknown) {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  return isRecord(value) && Object.keys(value).length === 0;
}

function getSubmitOptions(): Required<MFormSubmitData> {
  return { filterEmpty: false, includeDisabled: true, includeHidden: false, ...formSubmitOptions.value };
}

function applySubmitOptions(values: Record<string, unknown>, options: Required<MFormSubmitData>) {
  const nextValues = cloneRecord(values);
  previewItems.value.forEach((item) => {
    if (!item.variableName) return;
    if (!options.includeDisabled && isFormItemDisabled(item)) delete nextValues[item.variableName];
    if (!options.includeHidden && isFormItemHidden(item)) delete nextValues[item.variableName];
  });
  return options.filterEmpty
    ? Object.fromEntries(Object.entries(nextValues).filter(([, value]) => !isEmptySubmitValue(value)))
    : nextValues;
}

function validateSubmitValues(values: Record<string, unknown>) {
  return previewItems.value.flatMap((item) => {
    if (!item.variableName || !isFormItemRequired(item) || isFormItemHidden(item) || isFormItemDisabled(item)) return [];
    if (!isEmptySubmitValue(values[item.variableName])) return [];
    return [{ field: item.variableName, label: item.labelName, type: 'required', message: `${item.labelName} is required.` }];
  });
}

function reportFirstInvalidControl() {
  const controls = rootRef.value?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select');
  [...(controls ?? [])].find((control) => !control.checkValidity())?.reportValidity();
}

function getFormItemEventListeners(item: MFormItemData, index: number) {
  const listeners: Record<string, (event: unknown) => void> = {};
  const sourceBlock: PreviewRuntimeBlock = {
    id: `form-item-${item.variableName || index}`,
    type: 'MFormItem',
    data: cloneFormItemData(item) as unknown as Record<string, unknown>,
    events: cloneBlockEvents(item.events),
    _pageAncestry: [...pageReferenceAncestry.value]
  };
  normalizeBlockEvents(item.events).forEach((eventConfig) => {
    if (!eventConfig.event) return;
    listeners[eventConfig.event] = (event: unknown) => previewRuntime?.invokeBlockActions(eventConfig, sourceBlock, event);
  });
  return listeners;
}

function getPreviewFormItemEditor(item: MFormItemData) {
  const editor = item.editor ? cloneSelectorBlock(item.editor) : undefined;
  if (!editor || !item.variableName || !hasOwn(runtimeValues.value, item.variableName)) return editor;
  return { ...editor, data: { ...editor.data, value: runtimeValues.value[item.variableName] } };
}

async function readCurrentFormValues() {
  if (isReadingRuntimeData) return cloneRecord(runtimeValues.value);
  isReadingRuntimeData = true;
  try {
    await nextTick();
    const blockData = await previewRuntime?.getBlockDataContext(props.currentBlockId) ?? {};
    const itemValues = Object.fromEntries(previewItems.value.flatMap((item) => {
      if (!item.variableName) return [];
      const runtimeValue = item.editor?.id ? blockData[item.editor.id] : undefined;
      const value = readEditorValue(runtimeValue) ?? runtimeValues.value[item.variableName] ?? readEditorValue(item.editor?.data) ?? '';
      return [[item.variableName, value]];
    }));
    return setRuntimeValues({ ...runtimeValues.value, ...itemValues });
  } finally {
    isReadingRuntimeData = false;
  }
}

async function getData(input?: unknown) {
  return isRecord(input) && isMethodInvocation(input) ? readCurrentFormValues() : cloneRecord(runtimeValues.value);
}

async function setValues(input: unknown = {}) {
  const payload = readValuesPayload(input);
  const incoming = await applyFormProcessors(payload.values, formProcessors.value.beforeSetValues);
  setRuntimeValues({ ...runtimeValues.value, ...incoming });
  notifyRuntimeDataChange();
  return { values: cloneRecord(runtimeValues.value) };
}

async function reset(input?: unknown) {
  const payload = readValuesPayload(input);
  const base = payload.hasValues ? payload.values : Object.keys(formDefaultValues.value).length ? formDefaultValues.value : initialRuntimeValues.value;
  setRuntimeValues(await applyFormProcessors(base, formProcessors.value.beforeReset));
  notifyRuntimeDataChange();
  const result = { values: cloneRecord(runtimeValues.value) };
  emit('reset', result);
  return result;
}

async function submit() {
  const currentValues = await readCurrentFormValues();
  const errors = validateSubmitValues(currentValues);
  if (errors.length) {
    reportFirstInvalidControl();
    const result = { values: cloneRecord(currentValues), valid: false, errors };
    emit('submit', result);
    return result;
  }
  const values = await applyFormProcessors(applySubmitOptions(currentValues, getSubmitOptions()), formProcessors.value.beforeSubmit);
  const result = { values, valid: true, errors: [] as unknown[] };
  emit('submit', result);
  return result;
}

defineExpose({ getData, setValues, reset, submit });
watch(() => [props.values, props.defaultValues], syncRuntimeValuesFromProps, { deep: true, immediate: true });
</script>

<template>
  <div
    ref="rootRef"
    class="ce-form-tool"
    :class="{
      'ce-form-tool--edit': edit,
      'ce-form-tool--horizontal': formLayout === 'Horizontal',
      'ce-form-tool--compact-items': formLayout === 'Horizontal' && formItemWidthMode === 'compact'
    }"
    data-testid="editor-form-tool"
    :data-edit-context="edit ? 'true' : undefined"
  >
    <div class="ce-form-tool__preview" data-testid="preview-form-items">
      <slot name="items" :items="previewItems" :edit="edit">
        <template v-for="(item, index) in previewItems" :key="`${item.variableName}-${index}`">
          <MFormItem
            v-if="!isFormItemHidden(item)"
            class="ce-form-tool__item"
            :edit="edit"
            :label-name="item.labelName"
            :variable-name="item.variableName"
            :editor="getPreviewFormItemEditor(item)"
            :layout="item.layout"
            v-on="getFormItemEventListeners(item, index)"
          />
        </template>
      </slot>
      <slot name="actions" :action-bar="formActionBar" :edit="edit">
        <div v-if="formActionBar" class="ce-form-tool__actions" data-testid="form-action-bar">
          <MActionToolbar v-bind="formActionBar" :edit="edit" />
        </div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.ce-form-tool { width: 100%; color: rgb(15 23 42); }
.ce-form-tool__preview { display: flex; flex-direction: column; gap: 12px; }
.ce-form-tool__actions { margin-top: 12px; }
.ce-form-tool--horizontal .ce-form-tool__preview { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.ce-form-tool--horizontal .ce-form-tool__actions { grid-column: 1 / -1; }
.ce-form-tool--horizontal.ce-form-tool--compact-items .ce-form-tool__preview { display: flex; flex-flow: row wrap; align-items: flex-start; }
.ce-form-tool--horizontal.ce-form-tool--compact-items .ce-form-tool__item { width: auto; min-width: 220px; flex: 1 1 220px; }
.ce-form-tool--horizontal.ce-form-tool--compact-items .ce-form-tool__actions { flex: 0 0 auto; align-self: center; margin-top: 0; }
.dark .ce-form-tool { color: rgb(226 232 240); }

@media (max-width: 640px) {
  .ce-form-tool--horizontal.ce-form-tool--compact-items .ce-form-tool__item,
  .ce-form-tool--horizontal.ce-form-tool--compact-items .ce-form-tool__actions {
    width: 100%;
    min-width: 100%;
    flex-basis: 100%;
  }
}
</style>
