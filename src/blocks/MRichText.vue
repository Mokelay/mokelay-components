<script lang="ts">
import { stringValue } from '@/blocks/pageDslRuntime';
import { isVariableValueConfig, type VariableValueConfig } from '@/runtime/variableValue';

export interface MRichTextProps {
  edit: boolean;
  content?: string | VariableValueConfig;
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
    content: isVariableValueConfig(merged.content) ? JSON.parse(JSON.stringify(merged.content)) as VariableValueConfig : stringValue(merged.content)
  };
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';
import { useI18n } from '@/i18n';

const props = defineProps<MRichTextProps & PageDslCallbacks<MRichTextProps>>();
const { t } = useI18n();
const displayContent = computed(() => {
  if (isVariableValueConfig(props.content)) {
    if (props.content.mode === 'input') return props.content.value;
    return props.edit ? t('richText.boundContent') : '';
  }
  return props.content ?? richTextDefaults.content;
});
</script>

<template>
  <PageDslBlock block-type="MRichText">
    <div class="page-dsl-rich-text">
      {{ displayContent }}
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
