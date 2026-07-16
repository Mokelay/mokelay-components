<script lang="ts">
import { stringValue } from '@/blocks/pageDslRuntime';

export interface MThankYouPageProps {
  edit: boolean;
  title?: string;
  description?: string;
}

const thankYouPageDefaults = {
  title: '提交成功',
  description: '谢谢你的提交，我们已经收到。'
} as const;

export function normalizeThankYouPageProps(props: Partial<MThankYouPageProps>): MThankYouPageProps {
  const merged = {
    ...thankYouPageDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    title: stringValue(merged.title),
    description: stringValue(merged.description)
  };
}
</script>

<script setup lang="ts">
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';

defineProps<MThankYouPageProps & PageDslCallbacks<MThankYouPageProps>>();
</script>

<template>
  <PageDslBlock block-type="MThankYouPage">
    <div class="page-dsl-flow page-dsl-flow--thanks">
      <span>感谢页</span>
      <strong>{{ title || '提交成功' }}</strong>
      <p>{{ description || '谢谢你的提交，我们已经收到。' }}</p>
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

.page-dsl-flow--thanks {
  border-color: rgb(110 231 183);
  background: rgb(236 253 245);
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
