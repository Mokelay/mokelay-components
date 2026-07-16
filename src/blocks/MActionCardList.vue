<script lang="ts">
import type { MokelayBlockComponentProps } from "@/blocks/types";
import { booleanValue, normalizeSelectValue, normalizeValue, stringValue } from '@/blocks/pageDslRuntime';
import type { BlockDataField } from '@/runtime/variableValue';

export type MActionCardListVariant = 'card' | 'compact';
export type MActionCardListSize = 'sm' | 'md';
export type MActionCardListKey = string | number;

export type MActionCardListEventPayload = {
  item: unknown;
  itemKey: MActionCardListKey;
  index: number;
};

export interface MActionCardListProps extends MokelayBlockComponentProps {
  items?: unknown;
  itemKey?: string;
  titlePath?: string;
  descriptionPath?: string;
  activeKey?: MActionCardListKey | null;
  variant?: MActionCardListVariant | string;
  size?: MActionCardListSize | string;
  emptyText?: string;
  disabled?: boolean;
}

type NormalizedActionCardItem = {
  key: MActionCardListKey;
  title: string;
  description: string;
  disabled: boolean;
  raw: unknown;
  index: number;
};

const defaultActionCardItems: unknown[] = [
  {
    key: 'login',
    title: '登录接口',
    description: '读取用户、校验密码、写入 Session。'
  },
  {
    key: 'register',
    title: '注册接口',
    description: '校验重复邮箱、创建用户、写入 Session。'
  }
];

const actionCardListDefaults = {
  itemKey: 'key',
  titlePath: 'title',
  descriptionPath: 'description',
  variant: 'card',
  size: 'md',
  emptyText: '暂无数据',
  disabled: false
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeActiveKey(value: unknown): MActionCardListKey | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return null;
}

function normalizeItemsConfig(value: unknown, fallback: unknown[] = []) {
  if (Array.isArray(value)) return cloneValue(value);

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return Array.isArray(parsed) ? cloneValue(parsed) : value;
    } catch {
      return value;
    }
  }

  return value === undefined ? cloneValue(fallback) : normalizeValue(value, fallback);
}

export function normalizeActionCardListProps(props: Partial<MActionCardListProps>): MActionCardListProps {
  return {
    edit: props.edit ?? false,
    currentBlockId: stringValue(props.currentBlockId),
    items: normalizeItemsConfig(props.items, []),
    itemKey: stringValue(props.itemKey, actionCardListDefaults.itemKey),
    titlePath: stringValue(props.titlePath, actionCardListDefaults.titlePath),
    descriptionPath: stringValue(props.descriptionPath, actionCardListDefaults.descriptionPath),
    activeKey: normalizeActiveKey(props.activeKey),
    variant: normalizeSelectValue(props.variant, ['card', 'compact'] as const, actionCardListDefaults.variant),
    size: normalizeSelectValue(props.size, ['sm', 'md'] as const, actionCardListDefaults.size),
    emptyText: stringValue(props.emptyText, actionCardListDefaults.emptyText),
    disabled: booleanValue(props.disabled, actionCardListDefaults.disabled)
  };
}

function getActionCardListDataFields(): BlockDataField[] {
  return [
    {
      label: '选中项',
      variable: 'selectedItem',
      dataType: 'object'
    },
    {
      label: '选中标识',
      variable: 'activeKey',
      dataType: 'string'
    },
    {
      label: '列表数据',
      variable: 'items',
      dataType: 'array'
    }
  ];
}
</script>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';
import { PageRuntimeVariableContextKey } from '@/pages/runtimeContext';
import { resolveRuntimeValue, type VariableValueResolveContext } from '@/runtime/variableValue';

const props = defineProps<MActionCardListProps & PageDslCallbacks<MActionCardListProps>>();
const emit = defineEmits<{
  (event: 'select', payload: MActionCardListEventPayload): void;
  (event: 'click', payload: MActionCardListEventPayload): void;
}>();

const pageVariableContext = inject(PageRuntimeVariableContextKey, computed<VariableValueResolveContext>(() => ({})));
const runtimeItems = ref<unknown[] | null>(null);
const runtimeActiveKey = ref<MActionCardListKey | null>(normalizeActiveKey(props.activeKey));

const normalizedProps = computed(() => normalizeActionCardListProps(props));

watch(
  () => props.activeKey,
  (value) => {
    runtimeActiveKey.value = normalizeActiveKey(value);
  }
);

watch(
  () => props.items,
  () => {
    runtimeItems.value = null;
  },
  { deep: true }
);

const sourceItems = computed(() => {
  if (runtimeItems.value) return runtimeItems.value;

  const resolved = resolveRuntimeValue(normalizedProps.value.items, pageVariableContext.value);
  return normalizeRuntimeItems(resolved);
});

const actionItems = computed<NormalizedActionCardItem[]>(() =>
  sourceItems.value.map((item, index) => normalizeActionItem(item, index, normalizedProps.value))
);

const selectedItem = computed(() => {
  const key = runtimeActiveKey.value;
  return actionItems.value.find((item) => item.key === key) ?? null;
});

const rootClass = computed(() => [
  'm-action-card-list',
  `m-action-card-list--${normalizedProps.value.variant}`,
  `m-action-card-list--${normalizedProps.value.size}`,
  {
    'm-action-card-list--disabled': normalizedProps.value.disabled
  }
]);

function normalizeRuntimeItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function readPath(value: unknown, path: string): unknown {
  if (!path.trim()) return undefined;
  return path
    .replace(/\[(\w+)\]/g, '.$1')
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<unknown>((current, part) => {
      if (isRecord(current)) return current[part];
      if (Array.isArray(current) && /^\d+$/.test(part)) return current[Number(part)];
      return undefined;
    }, value);
}

function valueToText(value: unknown, fallback = '') {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function valueToKey(value: unknown, fallback: MActionCardListKey): MActionCardListKey {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return fallback;
}

function normalizeActionItem(
  item: unknown,
  index: number,
  config: MActionCardListProps
): NormalizedActionCardItem {
  const key = valueToKey(
    readPath(item, config.itemKey ?? actionCardListDefaults.itemKey),
    isRecord(item)
      ? valueToKey(item.uuid ?? item.id ?? item.key, index)
      : index
  );
  const title = valueToText(readPath(item, config.titlePath ?? actionCardListDefaults.titlePath), `项目 ${index + 1}`);
  const description = valueToText(readPath(item, config.descriptionPath ?? actionCardListDefaults.descriptionPath));
  const disabled = isRecord(item) ? booleanValue(item.disabled) : false;

  return {
    key,
    title,
    description,
    disabled,
    raw: item,
    index
  };
}

function emitStateChange() {
  const payload = {
    ...normalizedProps.value,
    activeKey: runtimeActiveKey.value
  };
  props.onToolChange?.(payload);
  props.onChange?.(payload);
}

function buildEventPayload(item: NormalizedActionCardItem): MActionCardListEventPayload {
  return {
    item: item.raw,
    itemKey: item.key,
    index: item.index
  };
}

function handleItemClick(item: NormalizedActionCardItem) {
  if (normalizedProps.value.disabled || item.disabled) return;

  runtimeActiveKey.value = item.key;
  emitStateChange();

  if (normalizedProps.value.edit) return;

  const payload = buildEventPayload(item);
  emit('select', payload);
  emit('click', payload);
}

function getData() {
  return {
    items: sourceItems.value,
    activeKey: runtimeActiveKey.value,
    selectedItem: selectedItem.value?.raw ?? null
  };
}

function setItems(items: unknown) {
  runtimeItems.value = normalizeRuntimeItems(items);
  emitStateChange();
  return getData();
}

function setActive(key: unknown) {
  runtimeActiveKey.value = normalizeActiveKey(key);
  emitStateChange();
  return getData();
}

function clearActive() {
  runtimeActiveKey.value = null;
  emitStateChange();
  return getData();
}

defineExpose({
  getData,
  setItems,
  setActive,
  clearActive
});
</script>

<template>
  <PageDslBlock block-type="MActionCardList">
    <div :class="rootClass" data-testid="m-action-card-list" :data-block-id="currentBlockId || undefined">
      <p v-if="!actionItems.length" class="m-action-card-list__empty">
        {{ normalizedProps.emptyText }}
      </p>

      <button
        v-for="item in actionItems"
        :key="String(item.key)"
        type="button"
        class="m-action-card-list__item"
        :class="{ 'm-action-card-list__item--active': runtimeActiveKey === item.key }"
        :disabled="normalizedProps.disabled || item.disabled"
        :aria-pressed="runtimeActiveKey === item.key"
        data-testid="m-action-card-list-item"
        @click="handleItemClick(item)"
      >
        <span class="m-action-card-list__title">{{ item.title }}</span>
        <span v-if="item.description" class="m-action-card-list__description">{{ item.description }}</span>
      </button>
    </div>
  </PageDslBlock>
</template>

<style scoped>
.m-action-card-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.m-action-card-list__item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  min-height: 64px;
  padding: 12px 14px;
  color: #0f172a;
  text-align: left;
  cursor: pointer;
  background: #ffffff;
  border: 1px solid #d9e2ef;
  border-radius: 8px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.m-action-card-list__item:hover:not(:disabled),
.m-action-card-list__item:focus-visible {
  border-color: #35d0b6;
  box-shadow: 0 0 0 3px rgb(45 212 191 / 16%);
  outline: none;
}

.m-action-card-list__item--active {
  background: #effdf8;
  border-color: #2dd4bf;
}

.m-action-card-list__item:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.m-action-card-list__title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
}

.m-action-card-list__description {
  display: block;
  color: #53657f;
  font-size: 13px;
  line-height: 1.45;
}

.m-action-card-list--compact {
  gap: 6px;
}

.m-action-card-list--compact .m-action-card-list__item {
  min-height: 48px;
  padding: 9px 12px;
}

.m-action-card-list--sm .m-action-card-list__item {
  min-height: 52px;
  padding: 10px 12px;
}

.m-action-card-list--sm .m-action-card-list__title {
  font-size: 13px;
}

.m-action-card-list--sm .m-action-card-list__description {
  font-size: 12px;
}

.m-action-card-list--disabled {
  opacity: 0.8;
}

.m-action-card-list__empty {
  margin: 0;
  padding: 16px;
  color: #64748b;
  font-size: 13px;
  text-align: center;
  border: 1px dashed #d9e2ef;
  border-radius: 8px;
}

:global(.dark) .m-action-card-list__item {
  color: #e5e7eb;
  background: #0f172a;
  border-color: #253247;
}

:global(.dark) .m-action-card-list__item--active {
  background: rgb(20 184 166 / 12%);
  border-color: #2dd4bf;
}

:global(.dark) .m-action-card-list__description,
:global(.dark) .m-action-card-list__empty {
  color: #94a3b8;
}
</style>
