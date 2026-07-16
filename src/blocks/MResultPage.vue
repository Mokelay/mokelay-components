<script lang="ts">
import { stringValue } from '@/blocks/pageDslRuntime';

export interface MResultPageProps {
  edit: boolean;
  title?: string;
  description?: string;
  resultField?: string;
}

const resultPageDefaults = {
  title: '你的结果',
  description: '这里展示测验或问卷结果。',
  resultField: 'score'
} as const;

export function normalizeResultPageProps(props: Partial<MResultPageProps>): MResultPageProps {
  const merged = {
    ...resultPageDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    title: stringValue(merged.title),
    description: stringValue(merged.description),
    resultField: stringValue(merged.resultField, 'score')
  };
}
</script>

<script setup lang="ts">
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';

defineProps<MResultPageProps & PageDslCallbacks<MResultPageProps>>();
</script>

<template>
  <PageDslBlock block-type="MResultPage">
    <div class="page-dsl-flow page-dsl-flow--result">
      <span>结果页</span>
      <strong>{{ title || '你的结果' }}</strong>
      <p>{{ description || '这里展示测验或问卷结果。' }}</p>
    </div>
  </PageDslBlock>
</template>

<style scoped>
.page-dsl-flow {
  display: grid;
  gap: 6px;
  border: 1px dashed rgb(148 163 184);
  border-radius: 8px;
  padding: 14px;
  background: rgb(248 250 252);
}

.page-dsl-flow span {
  color: rgb(100 116 139);
  font-size: 12px;
  font-weight: 700;
}

.page-dsl-flow strong {
  color: rgb(15 23 42);
  font-size: 18px;
}

.page-dsl-flow p {
  margin: 0;
  color: rgb(71 85 105);
  font-size: 13px;
}

.page-dsl-flow--result {
  border-color: rgb(165 180 252);
  background: rgb(238 242 255);
}

.dark .page-dsl-flow {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(148 163 184);
}

.dark .page-dsl-flow strong {
  color: rgb(241 245 249);
}

.dark .page-dsl-flow p {
  color: rgb(203 213 225);
}
</style>
