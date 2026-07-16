<script lang="ts">
import { normalizeValue, numberValue, stringValue } from '@/blocks/pageDslRuntime';
import { valueBlockDataField } from '@/blocks/blockDataFields';

export interface MRatingFieldProps {
  edit: boolean;
  value?: unknown;
  max?: number;
  lowLabel?: string;
  highLabel?: string;
}

const ratingFieldDefaults = {
  value: '',
  max: 5,
  lowLabel: '不满意',
  highLabel: '非常满意'
} as const;

export function normalizeRatingFieldProps(props: Partial<MRatingFieldProps>): MRatingFieldProps {
  const merged = {
    ...ratingFieldDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    value: normalizeValue(merged.value, ratingFieldDefaults.value),
    max: numberValue(merged.max, ratingFieldDefaults.max),
    lowLabel: stringValue(merged.lowLabel),
    highLabel: stringValue(merged.highLabel)
  };
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';

const props = defineProps<MRatingFieldProps & PageDslCallbacks<MRatingFieldProps>>();

const ratingMax = computed(() => Math.max(2, Number(props.max || 5)));
const stringInputValue = computed(() => {
  if (typeof props.value === 'string' || typeof props.value === 'number') {
    return String(props.value);
  }
  return '';
});

function emitChange(payload: Partial<MRatingFieldProps>) {
  const nextPayload = normalizeRatingFieldProps({
    edit: props.edit,
    value: props.value,
    max: props.max,
    lowLabel: props.lowLabel,
    highLabel: props.highLabel,
    ...payload
  });
  props.onToolChange?.(nextPayload);
  props.onChange?.(nextPayload);
}
</script>

<template>
  <PageDslBlock block-type="MRatingField">
    <div class="page-dsl-field">
      <div class="page-dsl-rating">
        <small>{{ lowLabel }}</small>
        <button
          v-for="item in ratingMax"
          :key="item"
          type="button"
          :class="{ 'page-dsl-choice-button--active': Number(stringInputValue) === item }"
          @click="emitChange({ value: String(item) })"
        >
          {{ item }}
        </button>
        <small>{{ highLabel }}</small>
      </div>
    </div>
  </PageDslBlock>
</template>

<style scoped>
.page-dsl-field {
  display: grid;
  gap: 8px;
}

.page-dsl-rating {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.page-dsl-rating button {
  min-width: 36px;
  height: 36px;
  border: 1px solid rgb(226 232 240);
  border-radius: 8px;
  background: rgb(255 255 255);
  color: rgb(51 65 85);
  font-weight: 700;
}

.page-dsl-rating .page-dsl-choice-button--active {
  border-color: rgb(79 70 229);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.page-dsl-rating small {
  color: rgb(100 116 139);
  font-size: 12px;
}

.dark .page-dsl-rating button {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}
</style>
