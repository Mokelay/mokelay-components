<script lang="ts">
import { normalizeValue, stringValue } from '@/blocks/pageDslRuntime';
import type { MokelayLayout, RenderBundlePage } from '@/layouts/domain';

export interface MLayoutPreviewProps {
  edit: boolean;
  layout?: unknown;
  title?: string;
}

export function normalizeLayoutPreviewProps(props: Partial<MLayoutPreviewProps>): MLayoutPreviewProps {
  return {
    edit: props.edit ?? false,
    layout: normalizeValue(props.layout, {}),
    title: stringValue(props.title, '布局预览')
  };
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import LayoutRenderer from '@/layouts/LayoutRenderer.vue';

const props = defineProps<MLayoutPreviewProps>();

const samplePage = computed<RenderBundlePage>(() => ({
  uuid: 'layout-preview-page',
  name: '布局预览页面',
  blocks: [
    {
      id: 'layout-preview-heading',
      type: 'MHeading',
      data: {
        text: '页面主体内容',
        level: 2,
        align: 'left'
      }
    },
    {
      id: 'layout-preview-paragraph',
      type: 'paragraph',
      data: {
        text: '这里会替换成当前页面 DSL 的 blocks。'
      }
    }
  ],
  dataSources: [],
  subPage: false,
  quotes: [],
  dependencies: []
}));
const normalizedLayout = computed(() => normalizeLayout(props.layout));
const previewTitle = computed(() => props.title || '布局预览');

function normalizeLayout(value: unknown): MokelayLayout | null {
  if (typeof value === 'string') {
    try {
      return normalizeLayout(JSON.parse(value) as unknown);
    } catch {
      return null;
    }
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const uuid = typeof source.uuid === 'string' ? source.uuid : '';
  const name = typeof source.name === 'string' ? source.name : uuid;

  if (!uuid || !name || !Array.isArray(source.blocks)) {
    return null;
  }

  return {
    schemaVersion: typeof source.schemaVersion === 'number' ? source.schemaVersion : 1,
    ...source,
    uuid,
    name,
    blocks: source.blocks as MokelayLayout['blocks']
  } as MokelayLayout;
}
</script>

<template>
  <PageDslBlock block-type="MLayoutPreview">
    <section class="m-layout-preview" data-testid="m-layout-preview">
      <div class="m-layout-preview__header">{{ previewTitle }}</div>
      <div class="m-layout-preview__body">
        <LayoutRenderer v-if="normalizedLayout" :layout="normalizedLayout" :page="samplePage" />
        <p v-else data-testid="m-layout-preview-empty" class="m-layout-preview__state">请输入有效布局 JSON 后预览。</p>
      </div>
    </section>
  </PageDslBlock>
</template>

<style scoped>
.m-layout-preview {
  overflow: hidden;
  border: 1px solid rgb(226 232 240);
  border-radius: 8px;
  background: rgb(255 255 255);
}

.m-layout-preview__header {
  border-bottom: 1px solid rgb(226 232 240);
  color: rgb(51 65 85);
  font-size: 14px;
  font-weight: 700;
  padding: 10px 12px;
}

.m-layout-preview__body {
  min-height: 420px;
  max-height: 680px;
  overflow: auto;
  background: rgb(255 255 255);
}

.m-layout-preview__state {
  margin: 12px;
  border: 1px solid rgb(251 191 36 / 0.62);
  border-radius: 8px;
  background: rgb(254 243 199 / 0.74);
  color: rgb(146 64 14);
  font-size: 13px;
  line-height: 18px;
  padding: 10px 12px;
}

.dark .m-layout-preview {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
}

.dark .m-layout-preview__header {
  border-color: rgb(71 85 105);
  color: rgb(226 232 240);
}

.dark .m-layout-preview__body {
  background: rgb(2 6 23);
}

.dark .m-layout-preview__state {
  border-color: rgb(180 83 9 / 0.72);
  background: rgb(146 64 14 / 0.22);
  color: rgb(254 215 170);
}
</style>
