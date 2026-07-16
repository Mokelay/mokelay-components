<script lang="ts">
import { createPageDslFieldId, normalizeOptions, normalizeValue, stringValue, type PageDslOption } from '@/blocks/pageDslRuntime';
import { valueBlockDataField } from '@/blocks/blockDataFields';
import { isVariableValueConfig } from '@/runtime/variableValue';

export interface MSelectFieldProps {
  edit: boolean;
  id?: string;
  placeholder?: string;
  value?: unknown;
  options?: unknown;
  optionLabelField?: string;
  optionValueField?: string;
  required?: boolean;
  disabled?: boolean;
}

const selectFieldDefaults = {
  placeholder: '请选择',
  value: '',
  options: [
    { label: '选项 A', value: 'a' },
    { label: '选项 B', value: 'b' }
  ] as PageDslOption[]
};

export function normalizeSelectFieldProps(props: Partial<MSelectFieldProps>): MSelectFieldProps {
  const merged = {
    ...selectFieldDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    id: stringValue(merged.id),
    placeholder: stringValue(merged.placeholder, selectFieldDefaults.placeholder),
    value: normalizeValue(merged.value, selectFieldDefaults.value),
    options: isVariableValueConfig(merged.options)
      ? JSON.parse(JSON.stringify(merged.options)) as unknown
      : normalizeOptions(merged.options, selectFieldDefaults.options, {
          labelField: stringValue(merged.optionLabelField, 'label'),
          valueField: stringValue(merged.optionValueField, 'value')
        }),
    optionLabelField: stringValue(merged.optionLabelField, 'label'),
    optionValueField: stringValue(merged.optionValueField, 'value'),
    required: merged.required === true,
    disabled: merged.disabled === true
  };
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';

const props = defineProps<MSelectFieldProps & PageDslCallbacks<MSelectFieldProps>>();

const localFieldId = createPageDslFieldId();
const selectRef = ref<HTMLSelectElement | null>(null);
const fieldId = computed(() => props.id || localFieldId);
const options = computed(() => Array.isArray(props.options) ? props.options : []);
const hasEmptyOption = computed(() => options.value.some((option) => option.value === ''));
const fieldPlaceholder = computed(() => props.placeholder || selectFieldDefaults.placeholder);
const stringInputValue = computed(() => {
  if (typeof props.value === 'string' || typeof props.value === 'number') {
    return String(props.value);
  }
  return '';
});

function optionValue(index: number) {
  const value = options.value[index]?.value;
  return typeof value === 'string' ? value : `option_${index + 1}`;
}

function emitChange(payload: Partial<MSelectFieldProps>) {
  const nextPayload = normalizeSelectFieldProps({
    edit: props.edit,
    id: props.id,
    placeholder: props.placeholder,
    value: props.value,
    options: props.options,
    optionLabelField: props.optionLabelField,
    optionValueField: props.optionValueField,
    required: props.required,
    disabled: props.disabled,
    ...payload
  });
  props.onToolChange?.(nextPayload);
  props.onChange?.(nextPayload);
}

function getData() {
  return {
    value: selectRef.value?.value ?? stringInputValue.value
  };
}

defineExpose({
  getData
});
</script>

<template>
  <PageDslBlock block-type="MSelectField">
    <div class="page-dsl-field">
      <select
        ref="selectRef"
        :id="fieldId"
        class="page-dsl-control"
        :value="stringInputValue"
        :required="required"
        :disabled="disabled"
        @change="emitChange({ value: ($event.target as HTMLSelectElement).value })"
      >
        <option v-if="!hasEmptyOption" value="">{{ fieldPlaceholder }}</option>
        <option v-for="(option, index) in options" :key="optionValue(index)" :value="optionValue(index)">
          {{ option.label }}
        </option>
      </select>
    </div>
  </PageDslBlock>
</template>

<style scoped>
.page-dsl-field {
  display: grid;
  gap: 8px;
}

.page-dsl-control {
  width: 100%;
  border: 1px solid rgb(148 163 184 / 0.65);
  border-radius: 8px;
  padding: 9px 11px;
  background: rgb(255 255 255);
  color: rgb(15 23 42);
  font-size: 14px;
  line-height: 20px;
}

.page-dsl-control:focus {
  outline: none;
  border-color: rgb(99 102 241);
  box-shadow: 0 0 0 2px rgb(99 102 241 / 0.14);
}

.dark .page-dsl-control {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}
</style>
