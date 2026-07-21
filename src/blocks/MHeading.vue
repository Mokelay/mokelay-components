<script lang="ts">
import { normalizeAlign, normalizeSelectValue, type PageDslAlign } from '@/blocks/pageDslRuntime';
import { normalizeLocalizedTextValue, type LocalizedTextValue } from '@/runtime/localization';

export interface MHeadingProps {
  edit: boolean;
  text?: LocalizedTextValue;
  level?: string;
  align?: PageDslAlign | string;
}

const headingDefaults = {
  text: '页面标题',
  level: '1',
  align: 'left'
} as const;

export function normalizeHeadingProps(props: Partial<MHeadingProps>): MHeadingProps {
  const merged = {
    ...headingDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    text: normalizeLocalizedTextValue(merged.text, headingDefaults.text),
    level: normalizeSelectValue(merged.level, ['1', '2', '3'] as const, '1'),
    align: normalizeAlign(merged.align)
  };
}
</script>

<script setup lang="ts">
import { computed, inject } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';
import { useI18n } from '@/i18n';
import { PageLocaleConfigKey } from '@/pages/runtimeContext';
import { normalizePageLocaleConfig, resolveLocalizedValue } from '@/runtime/localization';

const props = defineProps<MHeadingProps & PageDslCallbacks<MHeadingProps>>();
const { localeValue } = useI18n();
const pageLocaleConfig = inject(PageLocaleConfigKey, computed(() => normalizePageLocaleConfig(undefined, localeValue.value)));
const headingText = computed(() => typeof props.text === 'string'
  ? props.text
  : resolveLocalizedValue(
      props.text,
      localeValue.value === 'en' ? 'en-US' : 'zh-CN',
      pageLocaleConfig.value
    ));

const headingTag = computed(() => {
  if (props.level === '2') return 'h2';
  if (props.level === '3') return 'h3';
  return 'h1';
});

const headingClass = computed(() => {
  const alignClass = props.align === 'center' ? 'page-dsl-block--center' : props.align === 'right' ? 'page-dsl-block--right' : '';
  return ['page-dsl-heading', `page-dsl-heading--${props.level || '1'}`, alignClass].filter(Boolean).join(' ');
});
</script>

<template>
  <PageDslBlock block-type="MHeading">
    <component :is="headingTag" :class="headingClass">
      {{ headingText || '页面标题' }}
    </component>
  </PageDslBlock>
</template>

<style scoped>
.page-dsl-heading {
  margin: 0;
  color: rgb(15 23 42);
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.18;
}

.page-dsl-heading--1 {
  font-size: 30px;
}

.page-dsl-heading--2 {
  font-size: 24px;
}

.page-dsl-heading--3 {
  font-size: 18px;
}

.page-dsl-block--center {
  text-align: center;
}

.page-dsl-block--right {
  text-align: right;
}

.dark .page-dsl-heading {
  color: rgb(241 245 249);
}
</style>
