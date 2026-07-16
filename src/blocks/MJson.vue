<script lang="ts">
import { valueBlockDataField } from '@/blocks/blockDataFields';
import { normalizeValue, numberValue, stringValue } from '@/blocks/pageDslRuntime';

export interface MJsonProps {
  edit: boolean;
  currentBlockId?: string;
  label?: string;
  value?: unknown;
  height?: number;
  expandDepth?: number;
  emptyText?: string;
}

const jsonDefaults = {
  label: 'JSON',
  value: {},
  height: 360,
  expandDepth: 1,
  emptyText: '暂无 JSON 数据。'
} as const;

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = numberValue(value, fallback);
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function cloneJsonValue(value: unknown, fallback: unknown = jsonDefaults.value) {
  return normalizeValue(value, fallback);
}

export function normalizeMJsonProps(props: Partial<MJsonProps>): MJsonProps {
  const merged = {
    ...jsonDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    currentBlockId: stringValue(props.currentBlockId),
    label: stringValue(merged.label, jsonDefaults.label),
    value: cloneJsonValue(props.value, jsonDefaults.value),
    height: clampInteger(merged.height, jsonDefaults.height, 240, 900),
    expandDepth: clampInteger(merged.expandDepth, jsonDefaults.expandDepth, 0, 8),
    emptyText: stringValue(merged.emptyText, jsonDefaults.emptyText)
  };
}
</script>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import JsonEditorVue from 'json-editor-vue';
import { Mode } from 'vanilla-jsoneditor';
import 'vanilla-jsoneditor/themes/jse-theme-dark.css';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import { themeValue } from '@/runtime/globalSettingsRuntime';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';
import { PreviewBlockRuntimeKey } from '@/runtime/previewBlockRuntime';

type JsonPath = Array<string | number>;

type JsonEditorInstance = {
  expand: (path: JsonPath, callback?: (relativePath: JsonPath) => boolean) => void;
  collapse: (path: JsonPath, recursive?: boolean) => void;
  scrollTo: (path: JsonPath) => Promise<void>;
  findElement: (path: JsonPath) => Element | undefined;
};

type JsonEditorVueInstance = {
  jsonEditor?: JsonEditorInstance;
};

type SearchMatch = {
  path: JsonPath;
  label: string;
};

const props = defineProps<MJsonProps & PageDslCallbacks<MJsonProps>>();

const previewRuntime = inject(PreviewBlockRuntimeKey, null);
const jsonEditorRef = ref<JsonEditorVueInstance | null>(null);
const viewerValue = ref<unknown>({});
const displayedValue = ref<unknown>(cloneJsonValue(props.value, null));
const runtimeValue = ref<unknown>(undefined);
const hasRuntimeValue = ref(false);
const hasValue = ref(false);
const valueError = ref('');
const formattedJson = ref('');
const searchQuery = ref('');
const activeSearchIndex = ref(0);
const copyState = ref('');
let copyTimer: number | undefined;
let highlightTimer: number | undefined;
let highlightedElement: Element | undefined;

const viewerLabel = computed(() => props.label || jsonDefaults.label);
const viewerHeight = computed(() => clampInteger(props.height, jsonDefaults.height, 240, 900));
const viewerExpandDepth = computed(() => clampInteger(props.expandDepth, jsonDefaults.expandDepth, 0, 8));
const viewerEmptyText = computed(() => props.emptyText || jsonDefaults.emptyText);
const isDark = computed(() => themeValue.value === 'dark');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serializeJson(value: unknown) {
  if (value === undefined || value === null) {
    return { value: '', error: '' };
  }

  try {
    return { value: JSON.stringify(value, null, 2), error: '' };
  } catch {
    return { value: '', error: '当前数据无法序列化为 JSON。' };
  }
}

function updateViewerValue(value: unknown) {
  displayedValue.value = cloneJsonValue(value, null);
  const serialized = serializeJson(value);
  formattedJson.value = serialized.value;
  valueError.value = serialized.error;
  hasValue.value = value !== undefined && value !== null && !serialized.error;

  if (!hasValue.value) {
    viewerValue.value = {};
    return;
  }

  try {
    viewerValue.value = JSON.parse(serialized.value) as unknown;
  } catch {
    valueError.value = '当前数据无法解析为 JSON。';
    hasValue.value = false;
    viewerValue.value = {};
  }
}

function getJsonEditor() {
  return jsonEditorRef.value?.jsonEditor;
}

function notifyRuntimeDataChange() {
  if (props.currentBlockId) {
    previewRuntime?.notifyBlockDataChange(props.currentBlockId);
  }
}

function applyExpandDepth() {
  if (!hasValue.value || valueError.value) return;

  const editor = getJsonEditor();
  if (!editor) return;

  editor.collapse([], true);
  if (viewerExpandDepth.value > 0) {
    editor.expand([], (relativePath) => relativePath.length < viewerExpandDepth.value);
  }
}

function scheduleExpandDepth() {
  void nextTick(() => {
    window.requestAnimationFrame(applyExpandDepth);
  });
}

function pathLabel(path: JsonPath) {
  if (!path.length) return '$';

  return path.reduce<string>((label, part) => (
    typeof part === 'number' || /^\d+$/.test(String(part))
      ? `${label}[${part}]`
      : `${label}.${String(part)}`
  ), '$');
}

function scalarSearchText(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return String(value);
  return '';
}

function findSearchMatches(value: unknown, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [] as SearchMatch[];

  const matches: SearchMatch[] = [];
  const seen = new Set<string>();
  const visit = (current: unknown, path: JsonPath) => {
    if (matches.length >= 200) return;

    const addMatch = () => {
      const label = pathLabel(path);
      if (seen.has(label)) return;
      seen.add(label);
      matches.push({ path, label });
    };

    if (scalarSearchText(current).toLocaleLowerCase().includes(normalizedQuery)) {
      addMatch();
    }

    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, [...path, index]));
      return;
    }

    if (typeof current !== 'object' || current === null) return;

    Object.entries(current).forEach(([key, item]) => {
      const childPath = [...path, key];
      if (key.toLocaleLowerCase().includes(normalizedQuery)) {
        const label = pathLabel(childPath);
        if (!seen.has(label) && matches.length < 200) {
          seen.add(label);
          matches.push({ path: childPath, label });
        }
      }
      visit(item, childPath);
    });
  };

  visit(viewerValue.value, []);
  return matches;
}

const searchMatches = computed(() => findSearchMatches(viewerValue.value, searchQuery.value));
const activeSearchMatch = computed(() => searchMatches.value[activeSearchIndex.value]);

function clearHighlight() {
  if (highlightTimer !== undefined) {
    window.clearTimeout(highlightTimer);
    highlightTimer = undefined;
  }
  highlightedElement?.classList.remove('m-json__search-hit');
  highlightedElement = undefined;
}

async function focusSearchMatch(index: number) {
  const matches = searchMatches.value;
  if (!matches.length) return;

  activeSearchIndex.value = (index + matches.length) % matches.length;
  const match = activeSearchMatch.value;
  const editor = getJsonEditor();
  if (!match || !editor) return;

  editor.expand(match.path);
  await editor.scrollTo(match.path);
  clearHighlight();
  highlightedElement = editor.findElement(match.path);
  highlightedElement?.classList.add('m-json__search-hit');
  highlightTimer = window.setTimeout(clearHighlight, 2400);
}

function nextSearchMatch() {
  void focusSearchMatch(activeSearchIndex.value + 1);
}

function previousSearchMatch() {
  void focusSearchMatch(activeSearchIndex.value - 1);
}

function expandAll() {
  getJsonEditor()?.expand([], () => true);
}

function collapseAll() {
  getJsonEditor()?.collapse([], true);
}

function setCopyState(message: string) {
  if (copyTimer !== undefined) {
    window.clearTimeout(copyTimer);
  }

  copyState.value = message;
  copyTimer = window.setTimeout(() => {
    copyState.value = '';
    copyTimer = undefined;
  }, 2200);
}

function fallbackCopy(text: string) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) {
    throw new Error('copy failed');
  }
}

async function copyJson() {
  if (!formattedJson.value) {
    setCopyState('没有可复制的 JSON 数据。');
    return false;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(formattedJson.value);
    } else {
      fallbackCopy(formattedJson.value);
    }
    setCopyState('JSON 已复制。');
    return true;
  } catch {
    try {
      fallbackCopy(formattedJson.value);
      setCopyState('JSON 已复制。');
      return true;
    } catch {
      setCopyState('复制 JSON 失败。');
      return false;
    }
  }
}

function getData() {
  const value = cloneJsonValue(displayedValue.value, null);
  return {
    value,
    json: cloneJsonValue(value, null)
  };
}

function readMethodValue(invocation: unknown) {
  if (!isRecord(invocation)) return invocation;

  if (isRecord(invocation.args) && Object.prototype.hasOwnProperty.call(invocation.args, 'value')) {
    return invocation.args.value;
  }

  if (isRecord(invocation.inputs) && Object.prototype.hasOwnProperty.call(invocation.inputs, 'value')) {
    return invocation.inputs.value;
  }

  return invocation;
}

function setValue(invocation?: unknown) {
  const nextValue = readMethodValue(invocation);
  runtimeValue.value = cloneJsonValue(nextValue, null);
  hasRuntimeValue.value = true;
  updateViewerValue(runtimeValue.value);
  activeSearchIndex.value = 0;
  searchQuery.value = '';
  clearHighlight();
  scheduleExpandDepth();
  notifyRuntimeDataChange();
  return getData();
}

function clear() {
  runtimeValue.value = null;
  hasRuntimeValue.value = true;
  updateViewerValue(null);
  activeSearchIndex.value = 0;
  searchQuery.value = '';
  clearHighlight();
  notifyRuntimeDataChange();
  return getData();
}

async function copy() {
  const copied = await copyJson();
  return { copied };
}

defineExpose({
  getData,
  setValue,
  clear,
  copy
});

watch(
  () => props.value,
  (value) => {
    if (hasRuntimeValue.value) return;
    updateViewerValue(value);
    activeSearchIndex.value = 0;
    clearHighlight();
    scheduleExpandDepth();
  },
  { deep: true, immediate: true }
);

watch(searchMatches, (matches) => {
  if (!matches.length) {
    activeSearchIndex.value = 0;
    clearHighlight();
    return;
  }

  if (activeSearchIndex.value >= matches.length) {
    activeSearchIndex.value = 0;
  }
});

watch(viewerExpandDepth, scheduleExpandDepth);

onMounted(scheduleExpandDepth);

onBeforeUnmount(() => {
  clearHighlight();
  if (copyTimer !== undefined) {
    window.clearTimeout(copyTimer);
  }
});
</script>

<template>
  <PageDslBlock block-type="MJson">
    <section
      class="m-json"
      :class="{ 'jse-theme-dark': isDark }"
      :style="{ '--m-json-height': `${viewerHeight}px` }"
      data-testid="m-json-viewer"
    >
      <header class="m-json__header">
        <div class="m-json__heading">
          <h3 class="m-json__title">{{ viewerLabel }}</h3>
          <span v-if="copyState" class="m-json__status" aria-live="polite">{{ copyState }}</span>
        </div>
        <div v-if="hasValue && !valueError" class="m-json__controls">
          <label class="m-json__search-label">
            <span class="sr-only">搜索 JSON</span>
            <input
              v-model="searchQuery"
              data-testid="m-json-search"
              class="m-json__search"
              type="search"
              placeholder="搜索键或值"
            >
          </label>
          <span v-if="searchQuery.trim()" class="m-json__match-count" data-testid="m-json-search-count">
            {{ searchMatches.length ? `${activeSearchIndex + 1} / ${searchMatches.length}` : '无结果' }}
          </span>
          <button
            class="m-json__button"
            type="button"
            title="上一个匹配项"
            aria-label="上一个匹配项"
            :disabled="!searchMatches.length"
            @click="previousSearchMatch"
          >上一个</button>
          <button
            class="m-json__button"
            type="button"
            title="下一个匹配项"
            aria-label="下一个匹配项"
            :disabled="!searchMatches.length"
            @click="nextSearchMatch"
          >下一个</button>
          <button class="m-json__button" type="button" title="全部展开" @click="expandAll">展开</button>
          <button class="m-json__button" type="button" title="全部收起" @click="collapseAll">收起</button>
          <button class="m-json__button" type="button" title="复制格式化 JSON" @click="copyJson">复制</button>
        </div>
      </header>

      <p v-if="valueError" class="m-json__state m-json__state--error" data-testid="m-json-viewer-error">{{ valueError }}</p>
      <p v-else-if="!hasValue" class="m-json__state" data-testid="m-json-viewer-empty">{{ viewerEmptyText }}</p>
      <div v-else class="m-json__content" data-testid="m-json-viewer-content">
        <JsonEditorVue
          ref="jsonEditorRef"
          :model-value="viewerValue"
          :mode="Mode.tree"
          :read-only="true"
          :main-menu-bar="false"
          :navigation-bar="false"
          :status-bar="false"
        />
      </div>
    </section>
  </PageDslBlock>
</template>

<style scoped>
.m-json {
  display: grid;
  overflow: hidden;
  width: 100%;
  border: 1px solid rgb(203 213 225);
  border-radius: 8px;
  background: rgb(255 255 255);
}

.m-json__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 48px;
  border-bottom: 1px solid rgb(226 232 240);
  padding: 8px 10px;
}

.m-json__heading,
.m-json__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.m-json__title {
  margin: 0;
  color: rgb(30 41 59);
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
}

.m-json__status,
.m-json__match-count {
  color: rgb(71 85 105);
  font-size: 12px;
  line-height: 18px;
}

.m-json__search-label {
  display: block;
}

.m-json__search {
  width: min(200px, 40vw);
  height: 30px;
  border: 1px solid rgb(203 213 225);
  border-radius: 6px;
  background: rgb(248 250 252);
  color: rgb(30 41 59);
  font: inherit;
  font-size: 12px;
  padding: 0 8px;
}

.m-json__search:focus {
  outline: 2px solid rgb(20 184 166 / 0.28);
  outline-offset: 1px;
  border-color: rgb(13 148 136);
}

.m-json__button {
  min-height: 30px;
  border: 1px solid rgb(203 213 225);
  border-radius: 6px;
  background: rgb(255 255 255);
  color: rgb(51 65 85);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  padding: 6px 8px;
}

.m-json__button:hover:not(:disabled) {
  border-color: rgb(45 212 191);
  color: rgb(15 118 110);
}

.m-json__button:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.m-json__content {
  height: var(--m-json-height);
  min-height: 0;
  overflow: auto;
}

.m-json__state {
  margin: 12px;
  border: 1px dashed rgb(203 213 225);
  border-radius: 6px;
  color: rgb(100 116 139);
  font-size: 13px;
  line-height: 20px;
  padding: 10px;
  text-align: center;
}

.m-json__state--error {
  border-color: rgb(251 146 60 / 0.7);
  background: rgb(255 247 237);
  color: rgb(154 52 18);
}

:deep(.jse-main) {
  min-height: 100%;
  border: 0;
}

:deep(.m-json__search-hit) {
  border-radius: 4px;
  box-shadow: 0 0 0 2px rgb(20 184 166 / 0.5);
}

.dark .m-json {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
}

.dark .m-json__header {
  border-color: rgb(71 85 105);
}

.dark .m-json__title {
  color: rgb(226 232 240);
}

.dark .m-json__status,
.dark .m-json__match-count {
  color: rgb(148 163 184);
}

.dark .m-json__search,
.dark .m-json__button {
  border-color: rgb(71 85 105);
  background: rgb(30 41 59);
  color: rgb(226 232 240);
}

.dark .m-json__button:hover:not(:disabled) {
  border-color: rgb(45 212 191);
  color: rgb(94 234 212);
}

.dark .m-json__state {
  border-color: rgb(71 85 105);
  color: rgb(148 163 184);
}

.dark .m-json__state--error {
  border-color: rgb(194 65 12);
  background: rgb(124 45 18 / 0.28);
  color: rgb(254 215 170);
}

@media (max-width: 640px) {
  .m-json__header {
    align-items: stretch;
  }

  .m-json__controls {
    width: 100%;
  }

  .m-json__search {
    width: min(100%, 260px);
  }
}
</style>
