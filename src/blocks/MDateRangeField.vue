<script lang="ts">
import { createPageDslFieldId, normalizeValue, stringValue } from '@/blocks/pageDslRuntime';
import { valueBlockDataField } from '@/blocks/blockDataFields';

export type MDateRangeFieldValue = {
  start?: string;
  end?: string;
};

export interface MDateRangeFieldProps {
  edit: boolean;
  id?: string;
  value?: unknown;
}

const dateRangeFieldDefaults = {
  value: {
    start: '',
    end: ''
  } satisfies MDateRangeFieldValue
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeDateRangeValue(value: unknown): MDateRangeFieldValue {
  const normalized = normalizeValue(value, dateRangeFieldDefaults.value);
  if (!isRecord(normalized)) {
    return { ...dateRangeFieldDefaults.value };
  }

  return {
    start: stringValue(normalized.start),
    end: stringValue(normalized.end)
  };
}

export function normalizeDateRangeFieldProps(props: Partial<MDateRangeFieldProps>): MDateRangeFieldProps {
  const merged = {
    ...dateRangeFieldDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    id: stringValue(merged.id),
    value: normalizeDateRangeValue(merged.value)
  };
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElDatePicker } from 'element-ui/es/components/date-picker/index.mjs';
import 'element-ui/es/components/date-picker/style/css';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';

const props = defineProps<MDateRangeFieldProps & PageDslCallbacks<MDateRangeFieldProps>>();

type DateRangePickerValue = Date[] | null;

const localPickerId = createPageDslFieldId();
const pickerFieldId = computed(() => props.id ? `${props.id}-range` : localPickerId);
const pickerInputIds = computed<[string, string]>(() => [
  `${pickerFieldId.value}-start`,
  `${pickerFieldId.value}-end`
]);
const rangeValue = computed(() => normalizeDateRangeValue(props.value));
const currentValue = ref<MDateRangeFieldValue>({ ...dateRangeFieldDefaults.value });
const pickerDefaultTime: [Date, Date] = [
  new Date(2000, 0, 1, 0, 0, 0),
  new Date(2000, 0, 1, 23, 59, 59)
];

const pickerValue = computed<DateRangePickerValue>({
  get() {
    return toPickerValue(currentValue.value);
  },
  set(value) {
    const nextValue = buildDateRangeValue(value);
    currentValue.value = nextValue;
    emitChange(nextValue);
  }
});

watch(
  rangeValue,
  (nextValue) => {
    currentValue.value = { ...nextValue };
  },
  { immediate: true }
);

function isValidDate(value: Date | null | undefined): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function localDateTimeFromMatch(match: RegExpExecArray, boundary: 'start' | 'end') {
  const [, year, month, day] = match;
  const hasTime = match[4] !== undefined;
  const hour = hasTime ? match[4] : boundary === 'end' ? '23' : '0';
  const minute = hasTime ? match[5] : boundary === 'end' ? '59' : '0';
  const second = hasTime ? match[6] ?? '0' : boundary === 'end' ? '59' : '0';
  const millisecond = boundary === 'end' && !hasTime ? 999 : 0;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    millisecond
  );

  return isValidDate(date) ? date : null;
}

function parseDateRangePart(value: unknown, boundary: 'start' | 'end') {
  if (isValidDate(value as Date)) {
    return value as Date;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const normalized = value.trim();
  const localDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (localDateMatch) {
    return localDateTimeFromMatch(localDateMatch, boundary);
  }

  const localDateTimeMatch = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(normalized);
  if (localDateTimeMatch) {
    return localDateTimeFromMatch(localDateTimeMatch, boundary);
  }

  const parsed = new Date(normalized);
  return isValidDate(parsed) ? parsed : null;
}

function toIsoDateRangePart(value: unknown, boundary: 'start' | 'end') {
  const parsed = parseDateRangePart(value, boundary);
  return parsed ? parsed.toISOString() : '';
}

function toPickerValue(value: MDateRangeFieldValue): DateRangePickerValue {
  const start = parseDateRangePart(value.start, 'start');
  const end = parseDateRangePart(value.end, 'end');

  if (!start || !end) {
    return null;
  }

  return [start, end];
}

function buildDateRangeValue(value: DateRangePickerValue): MDateRangeFieldValue {
  const start = value?.[0] ?? null;
  const end = value?.[1] ?? null;

  return {
    start: toIsoDateRangePart(start, 'start'),
    end: toIsoDateRangePart(end, 'end')
  };
}

function serializeDateRangeValue(value: MDateRangeFieldValue): MDateRangeFieldValue {
  return {
    start: toIsoDateRangePart(value.start, 'start'),
    end: toIsoDateRangePart(value.end, 'end')
  };
}

function emitChange(value: MDateRangeFieldValue) {
  const nextPayload = normalizeDateRangeFieldProps({
    edit: props.edit,
    id: props.id,
    value
  });

  props.onToolChange?.(nextPayload);
  props.onChange?.(nextPayload);
}

function getData() {
  return {
    value: serializeDateRangeValue(currentValue.value)
  };
}

defineExpose({
  getData
});
</script>

<template>
  <PageDslBlock block-type="MDateRangeField">
    <div class="page-dsl-date-range" data-testid="date-range-picker">
      <ElDatePicker
        :id="pickerInputIds"
        v-model="pickerValue"
        class="page-dsl-date-range__picker"
        type="datetimerange"
        single-panel
        range-separator="至"
        start-placeholder="开始时间"
        end-placeholder="结束时间"
        format="YYYY-MM-DD HH:mm:ss"
        :default-time="pickerDefaultTime"
        popper-class="page-dsl-date-range-popper"
      />
    </div>
  </PageDslBlock>
</template>

<style scoped>
.page-dsl-date-range {
  width: 100%;
  min-width: 0;
}

:deep(.page-dsl-date-range__picker) {
  width: 100%;
  min-width: 0;
}

:deep(.page-dsl-date-range__picker .el-range-input) {
  font-size: 13px;
}

:deep(.page-dsl-date-range__picker .el-range-separator) {
  color: rgb(100 116 139);
  flex: 0 0 auto;
}

.dark .page-dsl-date-range {
  --el-fill-color-blank: rgb(15 23 42);
  --el-border-color: rgb(71 85 105);
  --el-text-color-regular: rgb(226 232 240);
  --el-text-color-placeholder: rgb(148 163 184);
}

@media (max-width: 520px) {
  :deep(.page-dsl-date-range__picker) {
    height: auto;
    align-items: stretch;
    flex-wrap: wrap;
    gap: 6px;
    padding: 6px 10px;
  }
}
</style>
