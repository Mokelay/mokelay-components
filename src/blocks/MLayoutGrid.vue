<script lang="ts">
import type { MokelayBlock } from '@/blocks/types';
import { normalizeValue, stringValue } from '@/blocks/pageDslRuntime';

export type MLayoutGridTrack = string | number;
export type MLayoutGridResponsiveConfig = {
  columns?: MLayoutGridTrack | MLayoutGridTrack[];
  gap?: number | string;
  areaOrder?: string[];
};
export type MLayoutGridArea = {
  id: string;
  name?: string;
  width?: MLayoutGridTrack;
  blocks: MokelayBlock[];
};
export interface MLayoutGridProps {
  edit?: boolean;
  currentBlockId?: string;
  columns?: MLayoutGridTrack | MLayoutGridTrack[];
  gap?: number | string;
  rowGap?: number | string;
  minColumnWidth?: number | string;
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  justifyItems?: 'start' | 'center' | 'end' | 'stretch';
  hideEmptyAreas?: boolean;
  responsive?: {
    mobile?: MLayoutGridResponsiveConfig;
    tablet?: MLayoutGridResponsiveConfig;
    desktop?: MLayoutGridResponsiveConfig;
  };
  areas?: MLayoutGridArea[];
}

const defaultAreas: MLayoutGridArea[] = [
  { id: 'main', name: '主区域', blocks: [] }
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function cloneValue<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function normalizeTrack(value: unknown): MLayoutGridTrack | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.min(Math.trunc(value), 24);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed && /^[a-zA-Z0-9_#%(),.\-\s/]+$/.test(trimmed)) return trimmed;
  }
  return undefined;
}
function normalizeCssLength(value: unknown, fallback: number | string = 16): number | string {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.min(value, 1000);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
    if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(trimmed)) return trimmed;
  }
  return fallback;
}
function normalizeBlocks(value: unknown): MokelayBlock[] {
  return Array.isArray(value)
    ? value.filter((block): block is MokelayBlock => isRecord(block) && typeof block.type === 'string' && isRecord(block.data)).map(cloneValue)
    : [];
}
function normalizeAreas(value: unknown): MLayoutGridArea[] {
  const source = Array.isArray(value) && value.length ? value : defaultAreas;
  const seen = new Set<string>();
  const areas = source.filter(isRecord).slice(0, 4).map((area, index) => {
    const rawId = typeof area.id === 'string' && /^[a-zA-Z0-9_-]+$/.test(area.id.trim()) ? area.id.trim() : `area_${index + 1}`;
    let id = rawId;
    let suffix = 2;
    while (seen.has(id)) id = `${rawId}_${suffix++}`;
    seen.add(id);
    return {
      id,
      name: stringValue(area.name, `区域 ${index + 1}`),
      width: normalizeTrack(area.width),
      blocks: normalizeBlocks(area.blocks)
    };
  });
  return areas.length ? areas : cloneValue(defaultAreas);
}
export function cssTrackValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return `${value}fr`;
  return typeof value === 'string' && value.trim() ? value.trim() : 'minmax(0, 1fr)';
}
export function deriveColumnsFromAreas(areas: MLayoutGridArea[]) {
  return areas.map((area) => cssTrackValue(area.width)).join(' ');
}
function normalizeColumns(value: unknown, areas: MLayoutGridArea[]): MLayoutGridTrack | MLayoutGridTrack[] {
  if (Array.isArray(value)) {
    const tracks = value.map(normalizeTrack).filter((track): track is MLayoutGridTrack => track !== undefined);
    return tracks.length ? tracks : deriveColumnsFromAreas(areas);
  }
  return normalizeTrack(value) ?? (areas.length === 1 ? 1 : deriveColumnsFromAreas(areas));
}
function normalizeResponsiveConfig(value: unknown): MLayoutGridResponsiveConfig | undefined {
  if (!isRecord(value)) return undefined;
  const areaOrder = Array.isArray(value.areaOrder) ? value.areaOrder.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim()) : [];
  return {
    ...(value.columns !== undefined ? { columns: normalizeColumns(value.columns, defaultAreas) } : {}),
    ...(value.gap !== undefined ? { gap: normalizeCssLength(value.gap) } : {}),
    ...(areaOrder.length ? { areaOrder } : {})
  };
}
function normalizeResponsive(value: unknown): MLayoutGridProps['responsive'] {
  if (!isRecord(value)) return { mobile: { columns: 1 } };
  return {
    mobile: normalizeResponsiveConfig(value.mobile) ?? { columns: 1 },
    ...(normalizeResponsiveConfig(value.tablet) ? { tablet: normalizeResponsiveConfig(value.tablet) } : {}),
    ...(normalizeResponsiveConfig(value.desktop) ? { desktop: normalizeResponsiveConfig(value.desktop) } : {})
  };
}
function normalizeItemAlignment(value: unknown) {
  return value === 'start' || value === 'center' || value === 'end' || value === 'stretch'
    ? value
    : 'stretch';
}
export function normalizeMLayoutGridProps(props: Partial<MLayoutGridProps>): MLayoutGridProps {
  const areas = normalizeAreas(props.areas);
  return {
    edit: props.edit ?? false,
    currentBlockId: stringValue(props.currentBlockId),
    columns: normalizeColumns(props.columns, areas),
    gap: normalizeCssLength(props.gap),
    rowGap: normalizeCssLength(props.rowGap, normalizeCssLength(props.gap)),
    minColumnWidth: normalizeCssLength(props.minColumnWidth, 0),
    alignItems: normalizeItemAlignment(props.alignItems),
    justifyItems: normalizeItemAlignment(props.justifyItems),
    hideEmptyAreas: props.hideEmptyAreas === true,
    responsive: normalizeResponsive(props.responsive),
    areas
  };
}
export function serializeMLayoutGridProps(props: Partial<MLayoutGridProps>) {
  const normalized = normalizeMLayoutGridProps(props);
  return {
    columns: normalizeValue(normalized.columns, deriveColumnsFromAreas(normalized.areas ?? defaultAreas)),
    gap: normalizeValue(normalized.gap, 16),
    rowGap: normalizeValue(normalized.rowGap, normalized.gap ?? 16),
    minColumnWidth: normalizeValue(normalized.minColumnWidth, 0),
    alignItems: normalized.alignItems ?? 'stretch',
    justifyItems: normalized.justifyItems ?? 'stretch',
    ...(normalized.hideEmptyAreas ? { hideEmptyAreas: true } : {}),
    ...(Object.keys(normalized.responsive ?? {}).length ? { responsive: cloneValue(normalized.responsive) } : {}),
    areas: (normalized.areas ?? []).map((area) => ({
      id: area.id,
      ...(area.name ? { name: area.name } : {}),
      ...(area.width !== undefined ? { width: area.width } : {}),
      blocks: cloneValue(area.blocks)
    }))
  };
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import MokelayBlockRenderer from '@/blocks/MokelayBlockRenderer.vue';
const props = defineProps<MLayoutGridProps>();
const gridState = computed(() => normalizeMLayoutGridProps(props));
const viewportWidth = ref(typeof window === 'undefined' ? 1024 : window.innerWidth);
const activeResponsiveConfig = computed(() => viewportWidth.value < 640
  ? gridState.value.responsive?.mobile
  : viewportWidth.value < 1024
    ? gridState.value.responsive?.tablet
    : gridState.value.responsive?.desktop);
const orderedAreas = computed(() => {
  const areas = gridState.value.areas ?? [];
  const order = activeResponsiveConfig.value?.areaOrder ?? [];
  return [...areas].sort((left, right) => {
    const leftIndex = order.indexOf(left.id);
    const rightIndex = order.indexOf(right.id);
    return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });
});
const visibleAreas = computed(() => orderedAreas.value.filter((area) => (
  props.edit || !gridState.value.hideEmptyAreas || area.blocks.length > 0
)));
function columnsValue(config?: MLayoutGridResponsiveConfig) {
  const columns = config?.columns ?? gridState.value.columns;
  return Array.isArray(columns) ? columns.map(cssTrackValue).join(' ') : typeof columns === 'number' ? `repeat(${columns}, minmax(0, 1fr))` : cssTrackValue(columns);
}
const gridStyle = computed(() => ({
  '--m-layout-grid-columns': columnsValue(activeResponsiveConfig.value),
  '--m-layout-grid-gap': typeof (activeResponsiveConfig.value?.gap ?? gridState.value.gap) === 'number'
    ? `${activeResponsiveConfig.value?.gap ?? gridState.value.gap}px`
    : String(activeResponsiveConfig.value?.gap ?? gridState.value.gap ?? '16px'),
  '--m-layout-grid-row-gap': typeof gridState.value.rowGap === 'number'
    ? `${gridState.value.rowGap}px`
    : String(gridState.value.rowGap ?? gridState.value.gap ?? '16px'),
  '--m-layout-grid-align-items': gridState.value.alignItems ?? 'stretch',
  '--m-layout-grid-justify-items': gridState.value.justifyItems ?? 'stretch'
}));
function updateViewportWidth() { viewportWidth.value = window.innerWidth; }
function getData() { return serializeMLayoutGridProps(gridState.value); }
defineExpose({ getData });
onMounted(() => window.addEventListener('resize', updateViewportWidth));
onBeforeUnmount(() => window.removeEventListener('resize', updateViewportWidth));
</script>

<template>
  <div
    class="m-layout-grid"
    :class="{ 'm-layout-grid--edit': edit }"
    :style="gridStyle"
    data-testid="m-layout-grid"
    :data-block-id="currentBlockId || undefined"
    :data-edit-context="edit ? 'true' : undefined"
  >
    <section
      v-for="(area, areaIndex) in visibleAreas"
      :key="area.id"
      class="m-layout-grid__area"
      :data-area-id="area.id"
      :data-testid="`m-layout-grid-area-${area.id}`"
    >
      <slot name="area" :area="area" :index="areaIndex">
        <MokelayBlockRenderer v-for="block in area.blocks" :key="block.id ?? `${area.id}-${block.type}`" :block="block" />
        <p v-if="!area.blocks.length" class="m-layout-grid__empty">暂无内容</p>
      </slot>
    </section>
  </div>
</template>

<style scoped>
.m-layout-grid {
  display: grid;
  grid-template-columns: var(--m-layout-grid-columns);
  column-gap: var(--m-layout-grid-gap);
  row-gap: var(--m-layout-grid-row-gap);
  align-items: var(--m-layout-grid-align-items);
  justify-items: var(--m-layout-grid-justify-items);
  width: 100%;
}
.m-layout-grid__area { min-width: 0; border-radius: 8px; }
.m-layout-grid__empty { margin: 0; padding: 12px; color: #94a3b8; font-size: 13px; text-align: center; }
</style>
