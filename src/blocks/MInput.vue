<script lang="ts">

import { valueBlockDataField } from '@/blocks/blockDataFields';
import type { LocalizedValue } from '@/runtime/localization';

// 输入框组件在编辑器中的属性定义。
export interface MInputProps {
  edit: boolean;
  currentBlockId?: string;
  id?: string;
  placeholder?: string | LocalizedValue;
  value?: string;
  required?: boolean;
  maxLength?: number;
  inputMode?: 'decimal';
  disabled?: boolean;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function normalizeBoolean(value: unknown) {
  return value === true;
}

function normalizeMaxLength(value: unknown) {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim()
      ? Number(value)
      : 0;
  const normalized = Math.trunc(parsed);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : undefined;
}

export function normalizeInputProps(props: Partial<MInputProps>): MInputProps {
  return {
    edit: props.edit ?? false,
    currentBlockId: normalizeString(props.currentBlockId),
    id: normalizeString(props.id),
    ...(props.inputMode === 'decimal' ? { inputMode: props.inputMode } : {}),
    placeholder: typeof props.placeholder === 'string' || (typeof props.placeholder === 'object' && props.placeholder !== null && '$i18n' in props.placeholder)
      ? props.placeholder
      : '',
    value: normalizeString(props.value),
    required: normalizeBoolean(props.required),
    maxLength: normalizeMaxLength(props.maxLength),
    disabled: normalizeBoolean(props.disabled)
  };
}

// 输入框工具定义：提供工具箱信息、属性面板、默认值和保存规则。
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { languageValue } from '@/runtime/globalSettingsRuntime';
import { resolveLocalizedValue } from '@/runtime/localization';

const props = defineProps<MInputProps & {
  onChange?: (payload: MInputProps) => void;
  onToolChange?: (payload: MInputProps) => void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const inputDomId = computed(() => props.id || props.currentBlockId || '');
const fieldPlaceholder = computed(() => typeof props.placeholder === 'string'
  ? props.placeholder
  : resolveLocalizedValue(props.placeholder, languageValue.value === 'en' ? 'en-US' : 'zh-CN'));

// 组件内任意字段变更后，向外抛出完整 payload，保持工具状态一致。
function emitChange(payload: Partial<MInputProps>) {
  const nextPayload = normalizeInputProps({
    edit: props.edit,
    currentBlockId: props.currentBlockId,
    id: props.id,
    placeholder: props.placeholder,
    value: props.value,
    required: props.required,
    ...(props.inputMode ? { inputMode: props.inputMode } : {}),
    maxLength: props.maxLength,
    disabled: props.disabled,
    ...payload
  });
  props.onToolChange?.(nextPayload);
  props.onChange?.(nextPayload);
}

function focus() {
  inputRef.value?.focus();
}

function getData() {
  return {
    value: inputRef.value?.value ?? props.value ?? ''
  };
}

defineExpose({
  focus,
  getData
});
</script>

<template>
  <div class="ce-input-tool" data-testid="editor-input-tool">
    <input
      ref="inputRef"
      :id="inputDomId || undefined"
      :data-testid="inputDomId || 'editor-input-control'"
      class="ce-input-tool__control mk-form-control"
      type="text"
      :placeholder="fieldPlaceholder"
      :value="value"
      :required="required"
      :inputmode="inputMode"
      :maxlength="maxLength"
      :disabled="disabled"
      @input="emitChange({ value: ($event.target as HTMLInputElement).value })"
    />
  </div>
</template>

<style scoped>
.ce-input-tool {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ce-input-tool__control:disabled {
  cursor: not-allowed;
}
</style>
