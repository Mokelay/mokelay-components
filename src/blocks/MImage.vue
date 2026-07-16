<script lang="ts">
import { stringValue } from '@/blocks/pageDslRuntime';

export interface MImageProps {
  edit: boolean;
  src?: string;
  alt?: string;
  caption?: string;
}

const imageDefaults = {
  src: '',
  alt: '图片',
  caption: ''
} as const;

export function normalizeImageProps(props: Partial<MImageProps>): MImageProps {
  const merged = {
    ...imageDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    src: stringValue(merged.src),
    alt: stringValue(merged.alt),
    caption: stringValue(merged.caption)
  };
}
</script>

<script setup lang="ts">
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';

defineProps<MImageProps & PageDslCallbacks<MImageProps>>();
</script>

<template>
  <PageDslBlock block-type="MImage">
    <figure class="page-dsl-image">
      <img v-if="src" :src="src" :alt="alt || '图片'" />
      <div v-else class="page-dsl-image__empty">图片</div>
      <figcaption v-if="caption">{{ caption }}</figcaption>
    </figure>
  </PageDslBlock>
</template>

<style scoped>
.page-dsl-image {
  margin: 0;
}

.page-dsl-image img {
  display: block;
  width: 100%;
  max-height: 360px;
  border-radius: 8px;
  object-fit: cover;
}

.page-dsl-image__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border: 1px dashed rgb(148 163 184);
  border-radius: 8px;
  background: rgb(248 250 252);
  color: rgb(100 116 139);
  font-size: 13px;
}

.page-dsl-image figcaption {
  margin-top: 6px;
  color: rgb(100 116 139);
  font-size: 12px;
  text-align: center;
}

.dark .page-dsl-image__empty {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(148 163 184);
}
</style>
