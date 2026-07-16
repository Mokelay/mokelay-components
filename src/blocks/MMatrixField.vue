<script lang="ts">
import { createPageDslFieldId, normalizeMatrixRows, normalizeOptions, normalizeValue, stringValue, type PageDslMatrixRow, type PageDslOption } from '@/blocks/pageDslRuntime';
import { valueBlockDataField } from '@/blocks/blockDataFields';

export interface MMatrixFieldProps {
  edit: boolean;
  id?: string;
  value?: unknown;
  rows?: PageDslMatrixRow[];
  options?: PageDslOption[];
}

const matrixFieldDefaults = {
  value: {},
  rows: [
    { label: '产品体验', value: 'product' },
    { label: '服务响应', value: 'service' }
  ] as PageDslMatrixRow[],
  options: [
    { label: '不满意', value: 'bad' },
    { label: '一般', value: 'neutral' },
    { label: '满意', value: 'good' }
  ] as PageDslOption[]
};

export function normalizeMatrixFieldProps(props: Partial<MMatrixFieldProps>): MMatrixFieldProps {
  const merged = {
    ...matrixFieldDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    id: stringValue(merged.id),
    value: normalizeValue(merged.value, matrixFieldDefaults.value),
    rows: normalizeMatrixRows(merged.rows, matrixFieldDefaults.rows),
    options: normalizeOptions(merged.options, matrixFieldDefaults.options)
  };
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';

const props = defineProps<MMatrixFieldProps & PageDslCallbacks<MMatrixFieldProps>>();

const localFieldId = createPageDslFieldId();
const fieldId = computed(() => props.id || localFieldId);
const options = computed(() => Array.isArray(props.options) ? props.options : []);
const matrixRows = computed(() => Array.isArray(props.rows) ? props.rows : []);
const matrixValue = computed<Record<string, unknown>>(() => (
  typeof props.value === 'object' && props.value !== null && !Array.isArray(props.value)
    ? props.value as Record<string, unknown>
    : {}
));

function optionValue(index: number) {
  return options.value[index]?.value || `option_${index + 1}`;
}

function emitChange(payload: Partial<MMatrixFieldProps>) {
  const nextPayload = normalizeMatrixFieldProps({
    edit: props.edit,
    id: props.id,
    value: props.value,
    rows: props.rows,
    options: props.options,
    ...payload
  });
  props.onToolChange?.(nextPayload);
  props.onChange?.(nextPayload);
}

function updateMatrixValue(rowValue: string, optionValue: string) {
  emitChange({
    value: {
      ...matrixValue.value,
      [rowValue]: optionValue
    }
  });
}

function isMatrixSelected(rowValue: string, optionValue: string) {
  return String(matrixValue.value[rowValue] ?? '') === optionValue;
}
</script>

<template>
  <PageDslBlock block-type="MMatrixField">
    <div class="page-dsl-field">
      <div class="page-dsl-matrix-wrap">
        <table class="page-dsl-matrix">
          <thead>
            <tr>
              <th></th>
              <th v-for="(option, index) in options" :key="optionValue(index)">{{ option.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in matrixRows" :key="row.value">
              <th>{{ row.label }}</th>
              <td v-for="(option, index) in options" :key="`${row.value}-${optionValue(index)}`">
                <input
                  type="radio"
                  :name="`${fieldId}-${row.value}`"
                  :value="optionValue(index)"
                  :checked="isMatrixSelected(row.value, optionValue(index))"
                  @change="updateMatrixValue(row.value, optionValue(index))"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </PageDslBlock>
</template>

<style scoped>
.page-dsl-field {
  display: grid;
  gap: 8px;
}

.page-dsl-matrix-wrap {
  overflow-x: auto;
}

.page-dsl-matrix {
  min-width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.page-dsl-matrix th,
.page-dsl-matrix td {
  border-bottom: 1px solid rgb(226 232 240);
  padding: 8px;
  text-align: center;
}

.page-dsl-matrix th:first-child {
  text-align: left;
}

.dark .page-dsl-matrix th,
.dark .page-dsl-matrix td {
  border-color: rgb(51 65 85);
}
</style>
