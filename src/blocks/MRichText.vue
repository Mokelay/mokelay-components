<script lang="ts">
import { stringValue } from '@/blocks/pageDslRuntime';

export interface MRichTextProps {
  edit: boolean;
  content?: string;
}

const richTextDefaults = {
  content: '这里填写说明内容。'
} as const;

export function normalizeRichTextProps(props: Partial<MRichTextProps>): MRichTextProps {
  const merged = {
    ...richTextDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    content: stringValue(merged.content)
  };
}
</script>

<script setup lang="ts">
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';

defineProps<MRichTextProps & PageDslCallbacks<MRichTextProps>>();
</script>

<template>
  <PageDslBlock block-type="MRichText">
    <div class="page-dsl-rich-text">
      {{ content || '这里填写说明内容。' }}
    </div>
  </PageDslBlock>
</template>

<style scoped>
.page-dsl-rich-text {
  white-space: pre-line;
  color: rgb(71 85 105);
  font-size: 14px;
  line-height: 1.75;
}

.dark .page-dsl-rich-text {
  color: rgb(203 213 225);
}
</style>
