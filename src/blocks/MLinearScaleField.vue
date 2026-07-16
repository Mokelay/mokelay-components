<script lang="ts">
import { normalizeValue, numberValue, stringValue } from '@/blocks/pageDslRuntime';
import { valueBlockDataField } from '@/blocks/blockDataFields';

export interface MLinearScaleFieldProps {
  edit: boolean;
  value?: unknown;
  min?: number;
  max?: number;
  lowLabel?: string;
  highLabel?: string;
}

const linearScaleFieldDefaults = {
  value: '',
  min: 0,
  max: 10,
  lowLabel: '完全不会',
  highLabel: '非常愿意'
} as const;

export function normalizeLinearScaleFieldProps(props: Partial<MLinearScaleFieldProps>): MLinearScaleFieldProps {
  const merged = {
    ...linearScaleFieldDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    value: normalizeValue(merged.value, linearScaleFieldDefaults.value),
    min: numberValue(merged.min, linearScaleFieldDefaults.min),
    max: numberValue(merged.max, linearScaleFieldDefaults.max),
    lowLabel: stringValue(merged.lowLabel),
    highLabel: stringValue(merged.highLabel)
  };
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';

const props = defineProps<MLinearScaleFieldProps & PageDslCallbacks<MLinearScaleFieldProps>>();

const scaleMin = computed(() => Number.isFinite(Number(props.min)) ? Number(props.min) : 0);
const scaleMax = computed(() => Math.max(scaleMin.value + 1, Number(props.max || 10)));
const scaleValues = computed(() => {
  const values: number[] = [];
  for (let value = scaleMin.value; value <= scaleMax.value; value += 1) {
    values.push(value);
  }
  return values;
});
const stringInputValue = computed(() => {
  if (typeof props.value === 'string' || typeof props.value === 'number') {
    return String(props.value);
  }
  return '';
});

function emitChange(payload: Partial<MLinearScaleFieldProps>) {
  const nextPayload = normalizeLinearScaleFieldProps({
    edit: props.edit,
    value: props.value,
    min: props.min,
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
  <PageDslBlock block-type="MLinearScaleField">
    <div class="page-dsl-field">
      <div class="page-dsl-scale">
        <div>
          <button
            v-for="item in scaleValues"
            :key="item"
            type="button"
            :class="{ 'page-dsl-choice-button--active': Number(stringInputValue) === item }"
            @click="emitChange({ value: String(item) })"
          >
            {{ item }}
          </button>
        </div>
        <p>
          <span>{{ lowLabel }}</span>
          <span>{{ highLabel }}</span>
        </p>
      </div>
    </div>
  </PageDslBlock>
</template>

<style scoped>
.page-dsl-field {
  display: grid;
  gap: 8px;
}

.page-dsl-scale div {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.page-dsl-scale button {
  min-width: 36px;
  height: 36px;
  border: 1px solid rgb(226 232 240);
  border-radius: 8px;
  background: rgb(255 255 255);
  color: rgb(51 65 85);
  font-weight: 700;
}

.page-dsl-scale .page-dsl-choice-button--active {
  border-color: rgb(79 70 229);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.page-dsl-scale p {
  display: flex;
  justify-content: space-between;
  margin: 4px 0 0;
  color: rgb(100 116 139);
  font-size: 12px;
}

.dark .page-dsl-scale button {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}
</style>
