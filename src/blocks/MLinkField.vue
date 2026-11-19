<script lang="ts">
import { createPageDslFieldId, normalizeValue, stringValue } from '@/blocks/pageDslRuntime';
import { valueBlockDataField } from '@/blocks/blockDataFields';

export interface MLinkFieldProps {
  edit: boolean;
  id?: string;
  placeholder?: string;
  value?: unknown;
}

const linkFieldDefaults = {
  placeholder: 'https://example.com',
  value: ''
} as const;

export function normalizeLinkFieldProps(props: Partial<MLinkFieldProps>): MLinkFieldProps {
  const merged = {
    ...linkFieldDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    id: stringValue(merged.id),
    placeholder: stringValue(merged.placeholder),
    value: normalizeValue(merged.value, linkFieldDefaults.value)
  };
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';

const props = defineProps<MLinkFieldProps & PageDslCallbacks<MLinkFieldProps>>();

const localFieldId = createPageDslFieldId();
const fieldId = computed(() => props.id || localFieldId);
const fieldPlaceholder = computed(() => props.placeholder || '');
const stringInputValue = computed(() => {
  if (typeof props.value === 'string' || typeof props.value === 'number') {
    return String(props.value);
  }
  return '';
});

function emitChange(payload: Partial<MLinkFieldProps>) {
  const nextPayload = normalizeLinkFieldProps({
    edit: props.edit,
    id: props.id,
    placeholder: props.placeholder,
    value: props.value,
    ...payload
  });
  props.onToolChange?.(nextPayload);
  props.onChange?.(nextPayload);
}
</script>

<template>
  <PageDslBlock block-type="MLinkField">
    <div class="page-dsl-field">
      <input
        :id="fieldId"
        class="page-dsl-control mk-form-control"
        type="url"
        :placeholder="fieldPlaceholder"
        :value="stringInputValue"
        @input="emitChange({ value: ($event.target as HTMLInputElement).value })"
      />
    </div>
  </PageDslBlock>
</template>

<style scoped>
.page-dsl-field {
  display: grid;
  gap: 8px;
}
</style>
