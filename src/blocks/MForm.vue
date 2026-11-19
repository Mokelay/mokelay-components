<script lang="ts">
export {
  normalizeMFormProps,
  serializeMFormProps
} from '@/blocks/mFormRuntime';
export type { MFormItemData, MFormProps } from '@/blocks/mFormRuntime';
</script>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
import { useI18n } from '@/i18n';
import { PageLocaleConfigKey } from '@/pages/runtimeContext';
import { normalizePageLocaleConfig, resolveLocalizedValue } from '@/runtime/localization';

const props = withDefaults(defineProps<MFormProps>(), {
  edit: false,
  items: () => []
});

const emit = defineEmits<{
  (event: 'init', payload: { values: Record<string, unknown> }): void;
  (event: 'change', payload: { values: Record<string, unknown>; changedFields: string[]; source: 'user' | 'programmatic'; valid: boolean; errors: unknown[] }): void;
  (event: 'reset', payload: { values: Record<string, unknown> }): void;
  (event: 'submit', payload: { values: Record<string, unknown>; valid: boolean; errors: unknown[] }): void;
}>();

const { t, localeValue } = useI18n();
const pageLocaleConfig = inject(PageLocaleConfigKey, computed(() => normalizePageLocaleConfig(undefined)));
const status = ref({ disabled: false, loading: false, showHints: true, errors: [] as { field?: string; message: string }[] });
const fieldOptions = ref<Record<string, unknown[]>>({});
const readyFields = ref(new Set<string>());
let initialized = false;
let mounted = false;
let disposed = false;
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
  if (hasOwn(value, 'args') && isRecord(value.args)) return readValuesPayload(value.args);
  if (hasOwn(value, 'inputs') && isRecord(value.inputs)) {
    const inputs = value.inputs;
    if (hasOwn(inputs, 'values')) return { hasValues: isRecord(inputs.values), values: cloneRecord(inputs.values) };
  }
  if (hasOwn(value, 'values')) return { hasValues: isRecord(value.values), values: cloneRecord(value.values) };
  if (isMethodInvocation(value)) return { hasValues: false, values: {} as Record<string, unknown> };
  const values = cloneRecord(value);
  delete values.emitChange;
  return { hasValues: Object.keys(values).length > 0, values };
}

async function applyFormProcessors(values: Record<string, unknown>, processors?: ProcessorConfig[]) {
  if (!processors?.length) return cloneRecord(values);
  const { applyProcessors } = await import('@/processors/runner');
  return cloneRecord(applyProcessors(cloneRecord(values), processors));
}

function syncRuntimeValuesFromProps() {
  const itemDefaults = Object.fromEntries(previewItems.value.map(item => [item.variableName, item.editor?.data.value ?? '']));
  const values = { ...itemDefaults, ...formDefaultValues.value, ...formValues.value };
  setRuntimeValues(values);
  initialRuntimeValues.value = cloneRecord(values);
}

function notifyRuntimeDataChange() {
  if (props.currentBlockId) previewRuntime?.notifyBlockDataChange(props.currentBlockId);
}

function isFormItemHidden(item: MFormItemData) {
  const when = !props.edit && item.rules?.visibleWhen;
  if (item.hidden || !when) return item.hidden === true;
  const value = hasOwn(runtimeValues.value, when.field) ? runtimeValues.value[when.field]
    : previewItems.value.find(source => source.variableName === when.field)?.editor?.data.value;
  return when.equals === undefined ? !value : value !== when.equals;
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

function validateSubmitValues(values: Record<string, unknown>, requireAll = true) {
  return previewItems.value.flatMap((item) => {
    if (!item.variableName || isFormItemHidden(item) || item.rules?.readOnly || isFormItemDisabled(item)) return [];
    const field = item.variableName;
    const label = typeof item.labelName === 'string' ? item.labelName
      : resolveLocalizedValue(item.labelName, localeValue.value === 'en' ? 'en-US' : 'zh-CN', pageLocaleConfig.value);
    const empty = isEmptySubmitValue(values[field]);
    if (requireAll && empty && isFormItemRequired(item)) {
      const message = t('form.validation.required').replace('{label}', label);
      return [{ field, label, type: 'required', message }];
    }
    const rule = item.rules;
    if (!empty && rule?.pattern && !new RegExp(rule.pattern).test(String(values[field]))) {
      return [{ field, label, type: 'pattern', message: rule.invalidMessage || t('form.validation.pattern').replace('{label}', label) }];
    }
    return [];
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
  if (!editor) return editor;
  const key = item.variableName;
  return { ...editor, data: { ...editor.data,
    ...(hasOwn(runtimeValues.value, key) ? { value: runtimeValues.value[key] } : {}),
    disabled: status.value.disabled || status.value.loading || isFormItemDisabled(item),
    ...(fieldOptions.value[key] ? { options: fieldOptions.value[key] } : {})
  } };
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
  if (isRecord(input) && isMethodInvocation(input)) return readCurrentFormValues();
  return cloneRecord(runtimeValues.value);
}

function invocationInputs(input: unknown): Record<string, unknown> {
  if (!isRecord(input)) return {};
  if (isRecord(input.args)) return input.args;
  return isRecord(input.inputs) ? input.inputs : input;
}

function updateFormValues(incoming: Record<string, unknown>, replace = false, source: 'user' | 'programmatic' = 'programmatic', emitChange = false) {
  if (source === 'user' && (props.edit || status.value.disabled || status.value.loading)) return;
  const updates = source === 'user'
    ? Object.fromEntries(Object.entries(incoming).filter(([key]) => {
      const item = previewItems.value.find(item => item.variableName === key);
      return item && !item.rules?.readOnly && !isFormItemDisabled(item);
    })) : incoming;
  const next = replace ? updates : { ...runtimeValues.value, ...updates };
  const changedFields = [...new Set([...Object.keys(runtimeValues.value), ...Object.keys(next)])]
    .filter(key => JSON.stringify(runtimeValues.value[key]) !== JSON.stringify(next[key]));
  if (!changedFields.length) return;
  setRuntimeValues(next);
  notifyRuntimeDataChange();
  if (!props.edit && (source === 'user' || emitChange)) {
    const errors = validateSubmitValues(runtimeValues.value, false);
    status.value.errors = errors;
    emit('change', { values: cloneRecord(runtimeValues.value), changedFields, source, valid: !errors.length, errors });
  }
}

function setFieldOptions(input: unknown) {
  const options = invocationInputs(input).options;
  if (isRecord(options)) {
    for (const [field, values] of Object.entries(options)) {
      if (Array.isArray(values)) fieldOptions.value[field] = JSON.parse(JSON.stringify(values));
    }
  }
  return { options: fieldOptions.value };
}

function setStatus(input: unknown) {
  const value = invocationInputs(input);
  for (const key of ['disabled', 'loading', 'showHints'] as const) if (typeof value[key] === 'boolean') status.value[key] = value[key];
  if (Array.isArray(value.errors)) status.value.errors = value.errors.filter(isRecord)
    .map(error => ({ ...(typeof error.field === 'string' ? { field: error.field } : {}), message: String(error.message ?? '') }));
  return { ...status.value };
}

async function tryInitialize() {
  if (!mounted || disposed || props.edit || initialized) return;
  const controls = previewItems.value.filter(item => !isFormItemHidden(item) && !item.rules?.readOnly && item.editor);
  if (controls.some(item => !readyFields.value.has(item.variableName))) return;
  await nextTick();
  if (disposed || initialized || props.edit) return;
  initialized = true;
  emit('init', { values: cloneRecord(runtimeValues.value) });
}

function fieldReady(field: string) {
  readyFields.value.add(field);
  void tryInitialize();
}

async function setValues(input: unknown = {}) {
  const payload = readValuesPayload(input);
  const incoming = await applyFormProcessors(payload.values, formProcessors.value.beforeSetValues);
  updateFormValues(incoming, false, 'programmatic', invocationInputs(input).emitChange === true);
  return { values: cloneRecord(runtimeValues.value) };
}

async function reset(input?: unknown) {
  const payload = readValuesPayload(input);
  const base = payload.hasValues ? payload.values : Object.keys(formDefaultValues.value).length ? formDefaultValues.value : initialRuntimeValues.value;
  const resetValues = await applyFormProcessors(base, formProcessors.value.beforeReset);
  updateFormValues(resetValues, true, 'programmatic', invocationInputs(input).emitChange === true);
  const result = { values: cloneRecord(runtimeValues.value) };
  emit('reset', result);
  return result;
}

async function submit() {
  const currentValues = await readCurrentFormValues();
  const errors = validateSubmitValues(currentValues);
  status.value.errors = errors;
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

defineExpose({ getData, setValues, reset, submit, setFieldOptions, setStatus });
watch(() => [props.values, props.defaultValues], syncRuntimeValuesFromProps, { deep: true, immediate: true });
watch(() => props.edit, () => { void tryInitialize(); });
onMounted(() => { mounted = true; void tryInitialize(); });
onBeforeUnmount(() => { disposed = true; });

const showFieldHints = computed(() => !props.edit && status.value.showHints);

</script>

<template>
  <div
    ref="rootRef"
    class="ce-form-tool mk-form-scope"
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
            @value-change="updateFormValues({ [item.variableName]: $event }, false, 'user')"
            @ready="fieldReady(item.variableName)"
          >
            <template v-if="!edit" #label="{ text }">
              <label :for="item.editor?.id">{{ text }}<span v-if="isFormItemRequired(item)" class="ce-form-tool__required"> *</span></label>
            </template>
            <template v-if="!edit && item.rules?.readOnly" #control>
              <output :id="item.editor?.id">{{ runtimeValues[item.variableName] ?? item.editor?.data.value }}</output>
            </template>
            <template #help>
              <small v-if="showFieldHints && item.rules?.hint" class="ce-form-tool__hint mk-form-help">{{ item.rules.hint }}</small>
              <small v-for="(error, errorIndex) in status.errors.filter(error => error.field === item.variableName)" :key="errorIndex" class="ce-form-tool__error mk-form-error" role="alert">{{ error.message }}</small>
            </template>
          </MFormItem>
          <p v-if="!edit && !isFormItemHidden(item) && item.rules?.description" class="ce-form-tool__description mk-form-help">{{ item.rules.description }}</p>
        </template>
      </slot>
      <slot name="actions" :action-bar="formActionBar" :edit="edit">
        <footer
          v-if="formActionBar || status.errors.some(error => !error.field)"
          class="ce-form-tool__actions"
        >
          <p v-for="(error, index) in status.errors.filter(error => !error.field)" :key="index" class="ce-form-tool__error mk-form-error" role="alert">{{ error.message }}</p>
          <fieldset v-if="formActionBar" class="ce-form-tool__buttons" data-testid="form-action-bar"
            :disabled="status.disabled || status.loading">
            <MActionToolbar v-bind="formActionBar" :edit="edit" />
          </fieldset>
        </footer>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.ce-form-tool { width: 100%; color: rgb(15 23 42); }
.ce-form-tool__preview { display: flex; flex-direction: column; gap: var(--mk-form-field-gap); }
.ce-form-tool__actions { margin-top: var(--mk-form-section-gap); }
.ce-form-tool__buttons { min-width: 0; margin: 0; padding: 0; border: 0; }
.ce-form-tool--horizontal .ce-form-tool__preview { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); }
.ce-form-tool--horizontal .ce-form-tool__actions { grid-column: 1 / -1; }
.ce-form-tool--horizontal.ce-form-tool--compact-items .ce-form-tool__preview { display: flex; flex-flow: row wrap; align-items: flex-start; }
.ce-form-tool--horizontal.ce-form-tool--compact-items .ce-form-tool__item { width: auto; min-width: 220px; flex: 1 1 220px; }
.ce-form-tool--horizontal.ce-form-tool--compact-items .ce-form-tool__actions { flex: 0 0 auto; align-self: center; margin-top: 0; }
.dark .ce-form-tool { color: rgb(226 232 240); }

@container (max-width: 520px) {
  .ce-form-tool--horizontal.ce-form-tool--compact-items .ce-form-tool__item,
  .ce-form-tool--horizontal.ce-form-tool--compact-items .ce-form-tool__actions {
    width: 100%;
    min-width: 100%;
    flex-basis: 100%;
  }
}

.ce-form-tool__hint, .ce-form-tool__description { white-space: pre-line; }
.ce-form-tool__hint, .ce-form-tool__error { display: block; margin-top: var(--mk-form-label-gap); }
.ce-form-tool__required { color: var(--mk-form-danger); }
</style>
