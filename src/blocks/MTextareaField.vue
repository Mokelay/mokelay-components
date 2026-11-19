<script lang="ts">
import { createPageDslFieldId, normalizeValue, numberValue, stringValue } from '@/blocks/pageDslRuntime';
import { valueBlockDataField } from '@/blocks/blockDataFields';

export interface MTextareaFieldProps {
  edit: boolean;
  currentBlockId?: string;
  id?: string;
  placeholder?: string;
  value?: unknown;
  rows?: number;
  required?: boolean;
  maxLength?: number;
  disabled?: boolean;
}

const textareaFieldDefaults = {
  placeholder: '请输入详细说明',
  value: '',
  rows: 4
} as const;

export function normalizeTextareaFieldProps(props: Partial<MTextareaFieldProps>): MTextareaFieldProps {
  const merged = {
    ...textareaFieldDefaults,
    ...props
  };
  const maxLength = numberValue(merged.maxLength, 0);

  return {
    edit: props.edit ?? false,
    currentBlockId: stringValue(merged.currentBlockId),
    id: stringValue(merged.id),
    placeholder: stringValue(merged.placeholder),
    value: normalizeValue(merged.value, textareaFieldDefaults.value),
    rows: numberValue(merged.rows, textareaFieldDefaults.rows),
    required: merged.required === true,
    maxLength: maxLength > 0 ? maxLength : undefined,
    disabled: merged.disabled === true
  };
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';

const props = defineProps<MTextareaFieldProps & PageDslCallbacks<MTextareaFieldProps>>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const localFieldId = createPageDslFieldId();
const fieldId = computed(() => props.id || props.currentBlockId || localFieldId);
const fieldPlaceholder = computed(() => props.placeholder || '');
const textareaRows = computed(() => {
  const rows = Number(props.rows);
  return Number.isFinite(rows) && rows > 0 ? rows : 4;
});
const stringInputValue = computed(() => {
  if (typeof props.value === 'string' || typeof props.value === 'number') {
    return String(props.value);
  }
  return '';
});

function emitChange(payload: Partial<MTextareaFieldProps>) {
  const nextPayload = normalizeTextareaFieldProps({
    edit: props.edit,
    currentBlockId: props.currentBlockId,
    id: props.id,
    placeholder: props.placeholder,
    value: props.value,
    rows: props.rows,
    required: props.required,
    maxLength: props.maxLength,
    disabled: props.disabled,
    ...payload
  });
  props.onToolChange?.(nextPayload);
  props.onChange?.(nextPayload);
}

function focus() {
  textareaRef.value?.focus();
}

function getData() {
  return {
    value: textareaRef.value?.value ?? stringInputValue.value
  };
}

defineExpose({
  focus,
  getData
});
</script>

<template>
  <PageDslBlock block-type="MTextareaField">
    <div class="page-dsl-field">
      <textarea
        ref="textareaRef"
        :id="fieldId"
        :data-testid="fieldId"
        class="page-dsl-control mk-form-control"
        :rows="textareaRows"
        :placeholder="fieldPlaceholder"
        :value="stringInputValue"
        :required="required"
        :maxlength="maxLength"
        :disabled="disabled"
        @input="emitChange({ value: ($event.target as HTMLTextAreaElement).value })"
      ></textarea>
    </div>
  </PageDslBlock>
</template>

<style scoped>
.page-dsl-field {
  display: grid;
  gap: 8px;
}

.page-dsl-control:disabled {
  cursor: not-allowed;
}
</style>
