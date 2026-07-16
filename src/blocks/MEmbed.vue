<script lang="ts">
import { stringValue } from '@/blocks/pageDslRuntime';

export interface MEmbedProps {
  edit: boolean;
  title?: string;
  url?: string;
}

const embedDefaults = {
  title: '外部资料',
  url: 'https://www.mokelay.com/'
} as const;

export function normalizeEmbedProps(props: Partial<MEmbedProps>): MEmbedProps {
  const merged = {
    ...embedDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    title: stringValue(merged.title),
    url: stringValue(merged.url)
  };
}
</script>

<script setup lang="ts">
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';

defineProps<MEmbedProps & PageDslCallbacks<MEmbedProps>>();
</script>

<template>
  <PageDslBlock block-type="MEmbed">
    <a
      class="page-dsl-embed"
      :href="url || 'https://www.mokelay.com/'"
      target="_blank"
      rel="noreferrer"
    >
      <span>{{ title || '外部资料' }}</span>
      <small>{{ url || 'https://www.mokelay.com/' }}</small>
    </a>
  </PageDslBlock>
</template>

<style scoped>
.page-dsl-embed {
  display: block;
  border: 1px solid rgb(226 232 240);
  border-radius: 8px;
  padding: 14px;
  color: rgb(15 23 42);
  text-decoration: none;
}

.page-dsl-embed span,
.page-dsl-embed small {
  display: block;
}

.page-dsl-embed span {
  font-weight: 700;
}

.page-dsl-embed small {
  margin-top: 4px;
  color: rgb(100 116 139);
  word-break: break-all;
}

.dark .page-dsl-embed {
  border-color: rgb(51 65 85);
}
</style>
