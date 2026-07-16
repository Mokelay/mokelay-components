<script lang="ts">
import { booleanValue, createPageDslFieldId, normalizeOptions, normalizeValue, stringValue, type PageDslOption } from '@/blocks/pageDslRuntime';
import { valueBlockDataField } from '@/blocks/blockDataFields';

export interface MImageChoiceFieldProps {
  edit: boolean;
  id?: string;
  value?: unknown;
  multiple?: boolean;
  options?: PageDslOption[];
}

const imageChoiceFieldDefaults = {
  value: [] as unknown[],
  multiple: false,
  options: [
    { label: '简洁', value: 'clean', imageUrl: '' },
    { label: '活泼', value: 'playful', imageUrl: '' }
  ] as PageDslOption[]
};

export function normalizeImageChoiceFieldProps(props: Partial<MImageChoiceFieldProps>): MImageChoiceFieldProps {
  const merged = {
    ...imageChoiceFieldDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    id: stringValue(merged.id),
    value: normalizeValue(merged.value, imageChoiceFieldDefaults.value),
    multiple: booleanValue(merged.multiple),
    options: normalizeOptions(merged.options, imageChoiceFieldDefaults.options)
  };
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';

const props = defineProps<MImageChoiceFieldProps & PageDslCallbacks<MImageChoiceFieldProps>>();

const localFieldId = createPageDslFieldId();
const fieldId = computed(() => props.id || localFieldId);
const options = computed(() => Array.isArray(props.options) ? props.options : []);
const stringInputValue = computed(() => {
  if (typeof props.value === 'string' || typeof props.value === 'number') {
    return String(props.value);
  }
  return '';
});
const selectedValues = computed(() => Array.isArray(props.value) ? props.value.map(String) : []);

function optionValue(index: number) {
  return options.value[index]?.value || `option_${index + 1}`;
}

function isSelected(value: string) {
  if (Array.isArray(props.value)) {
    return selectedValues.value.includes(value);
  }
  return stringInputValue.value === value;
}

function emitChange(payload: Partial<MImageChoiceFieldProps>) {
  const nextPayload = normalizeImageChoiceFieldProps({
    edit: props.edit,
    id: props.id,
    value: props.value,
    multiple: props.multiple,
    options: props.options,
    ...payload
  });
  props.onToolChange?.(nextPayload);
  props.onChange?.(nextPayload);
}

function toggleArrayValue(value: string, checked: boolean) {
  const nextValues = new Set(selectedValues.value);
  if (checked) {
    nextValues.add(value);
  } else {
    nextValues.delete(value);
  }
  emitChange({ value: Array.from(nextValues) });
}
</script>

<template>
  <PageDslBlock block-type="MImageChoiceField">
    <div class="page-dsl-field">
      <div class="page-dsl-image-options">
        <label v-for="(option, index) in options" :key="optionValue(index)" class="page-dsl-image-option">
          <input
            :type="multiple ? 'checkbox' : 'radio'"
            :name="fieldId"
            :value="optionValue(index)"
            :checked="isSelected(optionValue(index))"
            @change="multiple ? toggleArrayValue(optionValue(index), ($event.target as HTMLInputElement).checked) : emitChange({ value: optionValue(index) })"
          />
          <img v-if="option.imageUrl" :src="option.imageUrl" :alt="option.label" />
          <span v-else class="page-dsl-image-option__placeholder">图片</span>
          <strong>{{ option.label }}</strong>
        </label>
      </div>
    </div>
  </PageDslBlock>
</template>

<style scoped>
.page-dsl-field {
  display: grid;
  gap: 8px;
}

.page-dsl-image-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.page-dsl-image-option {
  display: grid;
  gap: 8px;
  border: 1px solid rgb(226 232 240);
  border-radius: 8px;
  padding: 8px;
  font-size: 13px;
}

.page-dsl-image-option input {
  justify-self: start;
}

.page-dsl-image-option img {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 6px;
  object-fit: cover;
}

.page-dsl-image-option__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border: 1px dashed rgb(148 163 184);
  border-radius: 8px;
  background: rgb(248 250 252);
  color: rgb(100 116 139);
  font-size: 13px;
}

.dark .page-dsl-image-option {
  border-color: rgb(51 65 85);
}

.dark .page-dsl-image-option__placeholder {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(148 163 184);
}
</style>
