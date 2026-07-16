<script lang="ts">
import { booleanValue, normalizeValue, stringValue } from '@/blocks/pageDslRuntime';

export interface MRecordListProps {
  edit: boolean;
  items?: unknown;
  count?: string | number;
  displayName?: string;
  blockType?: string;
  emptyText?: string;
  fieldOrder?: string[];
  hiddenFields?: string[];
  fieldLabels?: Record<string, string>;
  titleFields?: string[];
  showCount?: boolean;
}

const recordListDefaults = {
  emptyText: '暂无数据',
  fieldOrder: [],
  hiddenFields: [],
  fieldLabels: {},
  titleFields: ['key', 'name', 'event', 'method', 'variable', 'id', 'label'],
  showCount: true
} as const;

function stringArrayValue(value: unknown, fallback: string[] = []) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim())
    : fallback;
}

function stringRecordValue(value: unknown, fallback: Record<string, string> = {}) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fallback;
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => (
      typeof item === 'string' ? [[key, item]] : []
    ))
  );
}

export function normalizeRecordListProps(props: Partial<MRecordListProps>): MRecordListProps {
  const merged = {
    ...recordListDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    items: props.items === undefined ? undefined : normalizeValue(props.items, undefined),
    count: typeof props.count === 'number' || typeof props.count === 'string' ? props.count : undefined,
    displayName: stringValue(props.displayName),
    blockType: stringValue(props.blockType),
    emptyText: stringValue(merged.emptyText, recordListDefaults.emptyText),
    fieldOrder: stringArrayValue(normalizeValue(merged.fieldOrder, recordListDefaults.fieldOrder)),
    hiddenFields: stringArrayValue(normalizeValue(merged.hiddenFields, recordListDefaults.hiddenFields)),
    fieldLabels: stringRecordValue(normalizeValue(merged.fieldLabels, recordListDefaults.fieldLabels)),
    titleFields: stringArrayValue(normalizeValue(merged.titleFields, recordListDefaults.titleFields), [...recordListDefaults.titleFields]),
    showCount: booleanValue(merged.showCount, true)
  };
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';

type RecordListField = {
  key: string;
  label: string;
  value: RecordListFieldValue;
};

type RecordListFieldValue =
  | {
      kind: 'text';
      text: string;
    }
  | {
      kind: 'records';
      records: NestedRecordListItem[];
    };

type NestedRecordListItem = {
  id: string;
  title: string;
  details: RecordListField[];
};

type RecordListItem = {
  id: string;
  title: string;
  fields: RecordListField[];
};

const props = defineProps<MRecordListProps & PageDslCallbacks<MRecordListProps>>();
const normalizedProps = computed(() => normalizeRecordListProps(props));
const sourceItems = computed(() => normalizeItems(normalizedProps.value.items));
const listItems = computed(() => sourceItems.value.map((item, index) => buildListItem(item, index)));
const contextTitle = computed(() => {
  const displayName = formatValue(normalizedProps.value.displayName);
  const blockType = formatValue(normalizedProps.value.blockType);
  return [displayName, blockType].filter(Boolean).join(' / ');
});
const countText = computed(() => {
  const rawCount = normalizedProps.value.count !== undefined && normalizedProps.value.count !== ''
    ? normalizedProps.value.count
    : undefined;
  const count = formatValue(rawCount) || String(listItems.value.length);
  return `共 ${count} 项`;
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return parsed;
      if (parsed === null || parsed === undefined) return [];
      return [parsed];
    } catch {
      return [trimmed];
    }
  }

  return value === null || value === undefined ? [] : [value];
}

function localizedLabelValue(value: Record<string, unknown>) {
  const zh = typeof value.zh === 'string' ? value.zh.trim() : '';
  const en = typeof value.en === 'string' ? value.en.trim() : '';
  const raw = typeof value.raw === 'string' ? value.raw.trim() : '';
  return [zh, en, raw].filter(Boolean).join(' / ');
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value) && value.every((item) => item === null || ['string', 'number', 'boolean'].includes(typeof item))) {
    return value.map((item) => formatValue(item)).filter(Boolean).join(', ');
  }

  if (isRecord(value)) {
    const localized = localizedLabelValue(value);
    if (localized) return localized;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatFieldValue(value: unknown): RecordListFieldValue | undefined {
  if (Array.isArray(value) && value.every(isRecord)) {
    const records = value.map((item, index) => buildNestedListItem(item, index));
    return records.length ? { kind: 'records', records } : undefined;
  }

  const text = formatValue(value);
  return text ? { kind: 'text', text } : undefined;
}

function getFieldKeys(item: Record<string, unknown>) {
  const fieldOrder = normalizedProps.value.fieldOrder ?? [];
  const hiddenFields = new Set(normalizedProps.value.hiddenFields ?? []);
  const orderedKeys = fieldOrder.filter((key) =>
    !hiddenFields.has(key) && Object.prototype.hasOwnProperty.call(item, key)
  );
  const remainingKeys = Object.keys(item).filter((key) => !hiddenFields.has(key) && !orderedKeys.includes(key));
  return [...orderedKeys, ...remainingKeys];
}

function getItemTitle(item: unknown, index: number) {
  if (!isRecord(item)) {
    return formatValue(item) || `#${index + 1}`;
  }

  for (const key of normalizedProps.value.titleFields ?? []) {
    const value = formatValue(item[key]);
    if (value) return value;
  }

  return `#${index + 1}`;
}

function getNestedTitleKey(item: Record<string, unknown>) {
  const titleKeys = normalizedProps.value.titleFields ?? [];
  return titleKeys.find((key) => formatValue(item[key]))
    ?? ['name', 'key', 'label', 'id'].find((key) => formatValue(item[key]))
    ?? '';
}

function getRecordFieldLabel(key: string) {
  const fieldLabels = normalizedProps.value.fieldLabels ?? {};
  const defaultLabels: Record<string, string> = {
    name: '名称',
    type: '类型',
    dataType: '数据类型'
  };
  return fieldLabels[key] ?? defaultLabels[key] ?? key;
}

function buildNestedListItem(item: Record<string, unknown>, index: number): NestedRecordListItem {
  const titleKey = getNestedTitleKey(item);
  const title = titleKey ? formatValue(item[titleKey]) : '';
  const detailKeys = Object.keys(item).filter((key) => {
    if (key === titleKey) return false;
    if (key === 'dataType' && formatValue(item.dataType) === formatValue(item.type)) return false;
    return true;
  });
  const details = detailKeys.flatMap((key) => {
    const value = formatFieldValue(item[key]);
    return value
      ? [{
          key,
          label: getRecordFieldLabel(key),
          value
        }]
      : [];
  });

  return {
    id: `nested-record-${index}`,
    title: title || `#${index + 1}`,
    details
  };
}

function buildListItem(item: unknown, index: number): RecordListItem {
  const fieldLabels = normalizedProps.value.fieldLabels ?? {};
  const fields: RecordListField[] = isRecord(item)
    ? getFieldKeys(item).flatMap((key) => {
      const value = formatFieldValue(item[key]);
      return value
        ? [{
            key,
            label: fieldLabels[key] ?? key,
            value
          }]
        : [];
    })
    : [{
        key: 'value',
        label: fieldLabels.value ?? '值',
        value: { kind: 'text', text: formatValue(item) }
      }];

  return {
    id: `record-${index}`,
    title: getItemTitle(item, index),
    fields
  };
}
</script>

<template>
  <PageDslBlock block-type="MRecordList">
    <section class="record-list" data-testid="record-list">
      <header v-if="contextTitle || normalizedProps.showCount" class="record-list__summary">
        <p v-if="contextTitle" class="record-list__context">{{ contextTitle }}</p>
        <p v-if="normalizedProps.showCount" class="record-list__count">{{ countText }}</p>
      </header>
      <p v-if="!listItems.length" class="record-list__empty" data-testid="record-list-empty">
        {{ normalizedProps.emptyText }}
      </p>
      <ul v-else class="record-list__items" data-testid="record-list-items">
        <li v-for="(item, itemIndex) in listItems" :key="item.id" class="record-list__item">
          <h3>{{ itemIndex + 1 }}. {{ item.title }}</h3>
          <dl class="record-list__fields">
            <div v-for="field in item.fields" :key="`${item.id}-${field.key}`" class="record-list__field">
              <dt>{{ field.label }}</dt>
              <dd>
                <template v-if="field.value.kind === 'records'">
                  <ul class="record-list__nested-items" data-testid="record-list-nested-items">
                    <li v-for="record in field.value.records" :key="record.id" class="record-list__nested-item">
                      <div class="record-list__nested-title">{{ record.title }}</div>
                      <dl v-if="record.details.length" class="record-list__nested-fields">
                        <div v-for="detail in record.details" :key="`${record.id}-${detail.key}`" class="record-list__nested-field">
                          <dt>{{ detail.label }}</dt>
                          <dd>
                            <template v-if="detail.value.kind === 'records'">
                              <span>{{ detail.value.records.map((nestedRecord) => nestedRecord.title).join(', ') }}</span>
                            </template>
                            <template v-else>{{ detail.value.text }}</template>
                          </dd>
                        </div>
                      </dl>
                    </li>
                  </ul>
                </template>
                <template v-else>{{ field.value.text }}</template>
              </dd>
            </div>
          </dl>
        </li>
      </ul>
    </section>
  </PageDslBlock>
</template>

<style scoped>
.record-list {
  width: 100%;
}

.record-list__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.record-list__context,
.record-list__count {
  margin: 0;
  color: rgb(71 85 105);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}

.record-list__count {
  color: rgb(15 118 110);
}

.record-list__empty {
  margin: 0;
  border: 1px dashed rgb(203 213 225);
  border-radius: 8px;
  padding: 22px;
  color: rgb(100 116 139);
  text-align: center;
}

.record-list__items {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.record-list__item {
  border: 1px solid rgb(226 232 240);
  border-radius: 8px;
  padding: 14px;
  background: rgb(255 255 255);
}

.record-list__item h3 {
  margin: 0 0 12px;
  color: rgb(15 23 42);
  font-size: 15px;
  line-height: 1.4;
}

.record-list__fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 10px;
  margin: 0;
}

.record-list__field {
  min-width: 0;
}

.record-list__field dt {
  margin: 0 0 4px;
  color: rgb(100 116 139);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
}

.record-list__field dd {
  overflow-wrap: anywhere;
  margin: 0;
  border-radius: 6px;
  padding: 7px 9px;
  background: rgb(248 250 252);
  color: rgb(15 23 42);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.record-list__nested-items {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.record-list__nested-item {
  display: grid;
  gap: 6px;
  border: 1px solid rgb(226 232 240);
  border-radius: 6px;
  padding: 8px;
  background: rgb(255 255 255);
}

.record-list__nested-title {
  overflow-wrap: anywhere;
  color: rgb(15 23 42);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
}

.record-list__nested-fields {
  display: grid;
  gap: 4px;
  margin: 0;
}

.record-list__nested-field {
  display: grid;
  grid-template-columns: minmax(54px, max-content) minmax(0, 1fr);
  gap: 8px;
  align-items: start;
}

.record-list__nested-field dt,
.record-list__nested-field dd {
  margin: 0;
  padding: 0;
  background: transparent;
  color: rgb(71 85 105);
  font-size: 12px;
  line-height: 1.45;
  white-space: normal;
}

.record-list__nested-field dt {
  font-family: inherit;
  font-weight: 700;
}

.record-list__nested-field dd {
  overflow-wrap: anywhere;
}

.dark .record-list__context,
.dark .record-list__field dt {
  color: rgb(148 163 184);
}

.dark .record-list__count {
  color: rgb(94 234 212);
}

.dark .record-list__empty,
.dark .record-list__item {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
}

.dark .record-list__item h3,
.dark .record-list__field dd {
  color: rgb(241 245 249);
}

.dark .record-list__field dd {
  background: rgb(30 41 59);
}

.dark .record-list__nested-item {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
}

.dark .record-list__nested-title {
  color: rgb(241 245 249);
}

.dark .record-list__nested-field dt,
.dark .record-list__nested-field dd {
  color: rgb(203 213 225);
}

@media (max-width: 640px) {
  .record-list__fields {
    grid-template-columns: 1fr;
  }
}
</style>
