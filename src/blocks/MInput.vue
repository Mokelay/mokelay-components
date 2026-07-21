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
      class="ce-input-tool__control"
      type="text"
      :placeholder="fieldPlaceholder"
      :value="value"
      :required="required"
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

.ce-input-tool__control {
  width: 100%;
  border: 1px solid rgb(148 163 184 / 0.6);
  border-radius: 8px;
  padding: 8px 10px;
  background-color: rgb(255 255 255);
  color: rgb(15 23 42);
  font-size: 14px;
  line-height: 20px;
}

.ce-input-tool__control:focus {
  outline: none;
  border-color: rgb(99 102 241);
  box-shadow: 0 0 0 2px rgb(99 102 241 / 0.15);
}

.ce-input-tool__control:disabled {
  cursor: not-allowed;
  background-color: rgb(241 245 249);
  color: rgb(100 116 139);
}

.dark .ce-input-tool__control {
  background-color: rgb(15 23 42);
  color: rgb(226 232 240);
  border-color: rgb(71 85 105 / 0.9);
}

.dark .ce-input-tool__control:disabled {
  background-color: rgb(30 41 59);
  color: rgb(148 163 184);
}
</style>
