<script setup lang="ts">
import { computed, onBeforeUnmount, provide, ref, useSlots, watch } from 'vue';
import {
  createPreviewBlockRuntime,
  PreviewBlockRuntimeKey
} from '@/runtime/previewBlockRuntime';
import {
  createEmptyAuthState,
  getCurrentLayoutRoute,
  resolveLayoutAuth,
  resolveLayoutResources,
  type LayoutAuthState,
  type LayoutRuntimeContext
} from '@/layouts/runtime';
import type { MokelayLayout, RenderBundlePage } from '@/layouts/domain';
import type { PageRuntimeContext } from '@/pages/runtimeContext';
import LayoutBlockRenderer from '@/layouts/LayoutBlockRenderer.vue';

const props = defineProps<{
  layout: MokelayLayout;
  page: RenderBundlePage;
  pageRuntimeContext?: PageRuntimeContext;
}>();

const slots = useSlots();
const previewRuntime = createPreviewBlockRuntime();
const resources = ref<LayoutRuntimeContext['resources']>({});
const auth = ref<LayoutAuthState>(createEmptyAuthState());
const runtimeError = ref('');
const runtimePending = ref(true);
let loadRequestId = 0;

provide(PreviewBlockRuntimeKey, previewRuntime);

const runtimeContext = computed<LayoutRuntimeContext>(() => ({
  page: props.page,
  layout: props.layout,
  resources: resources.value,
  auth: auth.value,
  pageContext: props.pageRuntimeContext ?? {},
  route: getCurrentLayoutRoute()
}));

const topNavBlockTypes = new Set(['MSiteTopNav', 'MEditorTopNav', 'MWebTopNav', 'MTopNav']);
const hasPageSlot = computed(() => Boolean(slots.pageSlot));

function getBlockClass(block: MokelayLayout['blocks'][number]) {
  return [
    'layout-renderer__block',
    topNavBlockTypes.has(block.type) ? 'layout-renderer__block--top-nav' : '',
    block.type === 'MPageSlot' ? 'layout-renderer__block--page-slot' : ''
  ];
}

async function loadRuntimeContext() {
  const requestId = loadRequestId + 1;
  loadRequestId = requestId;
  runtimeError.value = '';
  runtimePending.value = true;
  auth.value = {
    ...createEmptyAuthState(),
    pending: props.layout.auth?.enabled === true
  };

  try {
    const [nextResources, nextAuth] = await Promise.all([
      resolveLayoutResources(props.layout),
      resolveLayoutAuth(props.layout)
    ]);

    if (requestId !== loadRequestId) return;
    resources.value = nextResources;
    auth.value = nextAuth;
    runtimePending.value = false;
  } catch (error) {
    if (requestId !== loadRequestId) return;
    resources.value = {};
    auth.value = createEmptyAuthState();
    runtimeError.value = error instanceof Error ? error.message : 'Layout runtime failed.';
    runtimePending.value = false;
  }
}

watch(
  () => [props.layout.uuid, props.layout.updatedAt, props.page.uuid],
  () => {
    void loadRuntimeContext();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  loadRequestId += 1;
});
</script>

<template>
  <section data-testid="layout-renderer" class="layout-renderer">
    <span v-if="runtimePending" data-testid="layout-runtime-loading" class="layout-renderer__loading" aria-label="Loading layout"></span>
    <p v-if="runtimeError" data-testid="layout-runtime-error" class="layout-renderer__error">{{ runtimeError }}</p>

    <div
      v-for="(block, index) in runtimePending || runtimeError ? [] : layout.blocks"
      :key="block.id || `${block.type}-${index}`"
      :class="getBlockClass(block)"
      :data-layout-block-type="block.type"
    >
      <LayoutBlockRenderer
        :block="block"
        :context="runtimeContext"
      >
        <template v-if="hasPageSlot" #pageSlot>
          <slot name="pageSlot"></slot>
        </template>
      </LayoutBlockRenderer>
    </div>
  </section>
</template>

<style scoped>
.layout-renderer {
  display: flex;
  box-sizing: border-box;
  min-height: 100%;
  flex-direction: column;
  gap: 16px;
  background: rgb(241 245 249);
  color: rgb(15 23 42);
  padding: 12px;
}

.layout-renderer__block {
  min-width: 0;
}

.layout-renderer__block--top-nav {
  position: relative;
  z-index: 20;
}

.layout-renderer__block--page-slot {
  min-width: 0;
}

.layout-renderer__error {
  border: 1px solid rgb(252 165 165);
  background: rgb(254 242 242);
  color: rgb(153 27 27);
  margin: 0;
  padding: 10px 16px;
  font-size: 13px;
}

.layout-renderer__loading {
  display: block;
  min-height: 1px;
}

.dark .layout-renderer {
  background: rgb(2 6 23);
  color: rgb(241 245 249);
}

.dark .layout-renderer__error {
  border-color: rgb(127 29 29);
  background: rgb(127 29 29 / 0.24);
  color: rgb(254 202 202);
}

@media (max-width: 720px) {
  .layout-renderer {
    gap: 12px;
    padding: 8px;
  }
}
</style>
