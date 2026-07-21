<script lang="ts">
import { i18n } from '@/i18n';
import type { BlockDataField } from '@/runtime/variableValue';
import { normalizeLocalizedTextValue, type LocalizedTextValue } from '@/runtime/localization';

export type MTabsTab = {
  id: string;
  name: LocalizedTextValue;
  pageUUID: string;
  /** Preserved only when both aliases exist so validation can block ambiguity. */
  pageUuid?: string;
  pageSource?: 'user' | 'system';
  /**
   * Optional route-query mapping used to select this tab. The first value is
   * written when the tab is clicked; `null` removes the query parameter. Extra
   * values are accepted aliases, for example `[null, 'false']`.
   */
  query?: Record<string, string | null | Array<string | null>>;
};

export interface MTabsProps {
  edit: boolean;
  currentBlockId?: string;
  tabs?: MTabsTab[];
  activeTabId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePageSource(value: unknown): MTabsTab['pageSource'] {
  if (value === 'system') return 'system';
  if (value === 'user') return 'user';
  return undefined;
}

function normalizeQueryMapping(value: unknown): MTabsTab['query'] {
  if (!isRecord(value)) return undefined;

  const query: NonNullable<MTabsTab['query']> = {};
  Object.entries(value).forEach(([rawKey, rawValue]) => {
    const key = rawKey.trim();
    if (!key) return;

    if (rawValue === null) {
      query[key] = null;
      return;
    }

    if (typeof rawValue === 'string') {
      query[key] = rawValue.trim();
      return;
    }

    if (!Array.isArray(rawValue)) return;
    const values: Array<string | null> = [];
    rawValue.forEach((item) => {
      const normalized = item === null
        ? null
        : typeof item === 'string' ? item.trim() : undefined;
      if (normalized === undefined || values.includes(normalized)) return;
      values.push(normalized);
    });
    if (values.length) query[key] = values;
  });

  return Object.keys(query).length ? query : undefined;
}

export function normalizeTabs(value: unknown): MTabsTab[] {
  if (!Array.isArray(value)) return [];

  const seenIds = new Set<string>();
  const tabs: MTabsTab[] = [];

  value.forEach((item) => {
    if (!isRecord(item)) return;

    const id = readString(item.id);
    const name = normalizeLocalizedTextValue(item.name);
    const hasCanonical = Object.prototype.hasOwnProperty.call(item, 'pageUUID');
    const hasLegacy = Object.prototype.hasOwnProperty.call(item, 'pageUuid');
    const canonicalPageUUID = readString(item.pageUUID);
    const legacyPageUuid = readString(item.pageUuid);
    const pageUUID = canonicalPageUUID || legacyPageUuid;
    const query = normalizeQueryMapping(item.query);
    if (!id || (typeof name === 'string' && !name) || !pageUUID || seenIds.has(id)) return;

    seenIds.add(id);
    tabs.push({
      id,
      name,
      pageUUID,
      ...(hasCanonical && hasLegacy ? { pageUuid: legacyPageUuid } : {}),
      ...(normalizePageSource(item.pageSource) ? { pageSource: normalizePageSource(item.pageSource) } : {}),
      ...(query ? { query } : {})
    });
  });

  return tabs;
}

function normalizeActiveTabId(value: unknown, tabs: MTabsTab[]) {
  const activeTabId = readString(value);
  if (activeTabId && tabs.some((tab) => tab.id === activeTabId)) {
    return activeTabId;
  }
  return tabs[0]?.id ?? '';
}

function getTabsDataFields(): BlockDataField[] {
  return [
    {
      label: i18n.t('tabs.dataFields.activeTabId'),
      variable: 'activeTabId',
      dataType: 'string'
    },
    {
      label: i18n.t('tabs.dataFields.activeTab'),
      variable: 'activeTab',
      dataType: 'object'
    },
    {
      label: i18n.t('tabs.dataFields.tabs'),
      variable: 'tabs',
      dataType: 'array'
    }
  ];
}
</script>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import MPage from '@/blocks/MPage.vue';
import { i18n as runtimeI18n } from '@/i18n';
import { loadMokelayPage, type MokelayPage } from '@/pages/domain';
import {
  PageRuntimeContextKey,
  PageLocaleConfigKey,
  type PageRuntimeContext
} from '@/pages/runtimeContext';
import { languageValue } from '@/runtime/globalSettingsRuntime';
import { normalizePageLocaleConfig, resolveLocalizedValue } from '@/runtime/localization';
import {
  PreviewBlockRuntimeKey
} from '@/runtime/previewBlockRuntime';
import { PageReferenceAncestryKey } from '@/pages/referenceRuntime';

const props = defineProps<MTabsProps & {
  onChange?: (payload: MTabsProps) => void;
  onToolChange?: (payload: MTabsProps) => void;
}>();

const previewRuntime = inject(PreviewBlockRuntimeKey, null);
const parentRuntimeContext = inject(PageRuntimeContextKey, computed<PageRuntimeContext>(() => ({})));
const pageLocaleConfig = inject(PageLocaleConfigKey, computed(() => normalizePageLocaleConfig(undefined)));
const pageReferenceAncestry = inject(PageReferenceAncestryKey, computed<readonly string[]>(() => []));
const normalizedTabs = computed(() => normalizeTabs(props.tabs));
const internalActiveTabId = ref('');
const activePage = shallowRef<MokelayPage | null>(null);
const pageLoading = ref(false);
const pageError = ref('');
let pageLoadId = 0;

const activeTabId = computed(() => normalizeActiveTabId(internalActiveTabId.value, normalizedTabs.value));
const activeTab = computed(() => normalizedTabs.value.find((tab) => tab.id === activeTabId.value));
const hasActivePageBlocks = computed(() => Boolean(activePage.value?.blocks.length));

function displayTabName(name: MTabsTab['name']) {
  return typeof name === 'string'
    ? name
    : resolveLocalizedValue(name, languageValue.value === 'en' ? 'en-US' : 'zh-CN', pageLocaleConfig.value);
}

function getTabsSignature() {
  return JSON.stringify(normalizedTabs.value);
}

function emitChange() {
  const payload = {
    edit: props.edit,
    currentBlockId: props.currentBlockId,
    tabs: normalizedTabs.value,
    activeTabId: activeTabId.value
  };
  props.onToolChange?.(payload);
  props.onChange?.(payload);
  if (props.currentBlockId) {
    previewRuntime?.notifyBlockDataChange(props.currentBlockId);
  }
}

function readHashLocation() {
  const rawHash = window.location.hash.replace(/^#/, '') || '/';
  const queryIndex = rawHash.indexOf('?');
  return {
    path: queryIndex >= 0 ? rawHash.slice(0, queryIndex) : rawHash,
    searchParams: new URLSearchParams(queryIndex >= 0 ? rawHash.slice(queryIndex + 1) : '')
  };
}

function acceptedQueryValues(value: NonNullable<MTabsTab['query']>[string]) {
  return Array.isArray(value) ? value : [value];
}

function findQuerySelectedTab() {
  const { searchParams } = readHashLocation();
  return normalizedTabs.value.find((tab) => {
    if (!tab.query || !Object.keys(tab.query).length) return false;
    return Object.entries(tab.query).every(([key, value]) => {
      const currentValue = searchParams.has(key) ? searchParams.get(key) : null;
      return acceptedQueryValues(value).includes(currentValue);
    });
  });
}

function syncActiveTabFromQuery() {
  if (!normalizedTabs.value.some((tab) => tab.query && Object.keys(tab.query).length)) {
    return;
  }
  const querySelectedTab = findQuerySelectedTab();
  const nextTabId = querySelectedTab?.id
    ?? normalizeActiveTabId(props.activeTabId, normalizedTabs.value);
  setActiveTabId(nextTabId, false, false);
}

function syncHashQuery(tab: MTabsTab) {
  if (!tab.query || !Object.keys(tab.query).length) return;

  const { path, searchParams } = readHashLocation();
  Object.entries(tab.query).forEach(([key, value]) => {
    const canonicalValue = acceptedQueryValues(value)[0] ?? null;
    if (canonicalValue === null) {
      searchParams.delete(key);
    } else {
      searchParams.set(key, canonicalValue);
    }
  });

  const query = searchParams.toString();
  const nextHash = `${path}${query ? `?${query}` : ''}`;
  if (nextHash !== window.location.hash.replace(/^#/, '')) {
    window.location.hash = nextHash;
  }
}

function setActiveTabId(tabId: unknown, notify = true, updateQuery = notify) {
  const nextTabId = typeof tabId === 'string' ? tabId.trim() : '';
  const nextTab = normalizedTabs.value.find((tab) => tab.id === nextTabId);
  if (!nextTabId || !nextTab) {
    return false;
  }

  if (internalActiveTabId.value !== nextTabId) {
    internalActiveTabId.value = nextTabId;
    if (notify) {
      emitChange();
    }
  }

  if (updateQuery) {
    syncHashQuery(nextTab);
  }

  return true;
}

function readTabIdFromRecord(value: Record<string, unknown>) {
  const ownValue = readString(value.args) ||
    readString(value.activeTabId) ||
    readString(value.tabId) ||
    readString(value.id);
  if (ownValue) return ownValue;

  const inputs = typeof value.inputs === 'object' && value.inputs !== null && !Array.isArray(value.inputs)
    ? value.inputs as Record<string, unknown>
    : undefined;
  if (!inputs) return '';

  return readString(inputs.args) ||
    readString(inputs.activeTabId) ||
    readString(inputs.tabId) ||
    readString(inputs.id);
}

function readTabIdFromInvocation(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (!isRecord(value)) return '';

  const tabId = readTabIdFromRecord(value);
  if (tabId) return tabId;

  if (isRecord(value.args)) {
    return readTabIdFromRecord(value.args);
  }

  const inputs = isRecord(value.inputs) ? value.inputs : undefined;
  if (inputs && isRecord(inputs.args)) {
    return readTabIdFromRecord(inputs.args);
  }

  return '';
}

function getData() {
  const currentTab = activeTab.value;
  return {
    activeTabId: activeTabId.value,
    activeTab: currentTab ? { ...currentTab } : null,
    tabs: normalizedTabs.value.map((tab) => ({ ...tab }))
  };
}

function setActiviTabId(value: unknown) {
  setActiveTabId(readTabIdFromInvocation(value), true);
  return getData();
}

async function loadActivePage() {
  const tab = activeTab.value;
  const loadId = ++pageLoadId;
  activePage.value = null;
  pageError.value = '';

  if (!tab) {
    pageLoading.value = false;
    return;
  }

  if (pageReferenceAncestry.value.includes(tab.pageUUID)) {
    pageLoading.value = false;
    pageError.value = `检测到循环页面引用：${tab.pageUUID}`;
    return;
  }

  pageLoading.value = true;
  try {
    const page = await loadMokelayPage(tab.pageUUID, tab.pageSource);
    if (loadId !== pageLoadId) return;
    activePage.value = page;
  } catch (error) {
    if (loadId !== pageLoadId) return;
    pageError.value = error instanceof Error && error.message
      ? error.message
      : i18n.t('tabs.states.loadFailed');
  } finally {
    if (loadId === pageLoadId) {
      pageLoading.value = false;
    }
  }
}

defineExpose({
  getData,
  setActiviTabId
});

watch(
  () => [props.activeTabId, getTabsSignature()],
  () => {
    internalActiveTabId.value = normalizeActiveTabId(props.activeTabId, normalizedTabs.value);
    syncActiveTabFromQuery();
  },
  { immediate: true }
);

watch(
  () => [
    activeTab.value?.pageUUID ?? '',
    activeTab.value?.pageSource ?? 'user',
    pageReferenceAncestry.value.join('|')
  ],
  () => {
    void loadActivePage();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  pageLoadId += 1;
  window.removeEventListener('hashchange', syncActiveTabFromQuery);
});

onMounted(() => {
  window.addEventListener('hashchange', syncActiveTabFromQuery);
  syncActiveTabFromQuery();
});
</script>

<template>
  <PageDslBlock block-type="MTabs">
    <div class="m-tabs" data-testid="editor-tabs-tool">
      <div v-if="normalizedTabs.length" class="m-tabs__bar-wrap">
        <div class="m-tabs__bar" data-testid="editor-tabs-list" role="tablist">
          <button
            v-for="tab in normalizedTabs"
            :key="tab.id"
            type="button"
            class="m-tabs__tab"
            :class="{ 'm-tabs__tab--active': tab.id === activeTabId }"
            :aria-selected="tab.id === activeTabId"
            :data-testid="`editor-tabs-tab-${tab.id}`"
            role="tab"
            @click="setActiveTabId(tab.id)"
          >
            {{ displayTabName(tab.name) }}
          </button>
        </div>
      </div>

      <div class="m-tabs__panel" data-testid="editor-tabs-active-panel" role="tabpanel">
        <p v-if="!normalizedTabs.length" class="m-tabs__state" data-testid="editor-tabs-empty-state">
          {{ runtimeI18n.t('tabs.states.empty') }}
        </p>
        <p v-else-if="pageLoading" class="m-tabs__state" data-testid="editor-tabs-loading-state">
          {{ runtimeI18n.t('tabs.states.loading') }}
        </p>
        <p v-else-if="pageError" class="m-tabs__state m-tabs__state--error" data-testid="editor-tabs-error-state">
          {{ pageError }}
        </p>
        <p v-else-if="!hasActivePageBlocks" class="m-tabs__state" data-testid="editor-tabs-empty-page-state">
          {{ runtimeI18n.t('tabs.states.emptyPage') }}
        </p>
        <MPage
          v-else-if="activePage"
          :edit="false"
          :value="activePage.blocks"
          :page-id="activePage.uuid"
          :data-sources="activePage.dataSources"
          :runtime-context="parentRuntimeContext"
        />
      </div>
    </div>
  </PageDslBlock>
</template>

<style scoped>
.m-tabs {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 12px;
}

.m-tabs__bar-wrap {
  max-width: 100%;
  overflow-x: auto;
  padding-bottom: 2px;
}

.m-tabs__bar {
  display: inline-flex;
  min-width: max-content;
  gap: 4px;
  border: 1px solid rgb(203 213 225);
  border-radius: 14px;
  background: rgb(248 250 252);
  padding: 8px;
}

.m-tabs__tab {
  flex: 0 0 auto;
  min-width: 0;
  max-width: min(240px, 58vw);
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: rgb(71 85 105);
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
  overflow: hidden;
  padding: 8px 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m-tabs__tab--active {
  border-color: rgb(226 232 240);
  background: rgb(255 255 255);
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.12);
  color: rgb(2 6 23);
}

.m-tabs__panel {
  min-width: 0;
}

.m-tabs__state {
  margin: 0;
  border: 1px solid rgb(203 213 225);
  border-radius: 8px;
  background: rgb(248 250 252);
  color: rgb(71 85 105);
  font-size: 14px;
  line-height: 20px;
  padding: 12px;
}

.m-tabs__state--error {
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

.dark .m-tabs__bar {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
}

.dark .m-tabs__tab {
  color: rgb(203 213 225);
}

.dark .m-tabs__tab--active {
  border-color: rgb(71 85 105);
  background: rgb(30 41 59);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.28);
  color: rgb(248 250 252);
}

.dark .m-tabs__state {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .m-tabs__state--error {
  border-color: rgb(127 29 29);
  background: rgb(127 29 29 / 0.24);
  color: rgb(254 202 202);
}
</style>
