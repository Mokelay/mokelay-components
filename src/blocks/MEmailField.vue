<script lang="ts">
import { createPageDslFieldId, normalizeValue, stringValue } from '@/blocks/pageDslRuntime';
import { valueBlockDataField } from '@/blocks/blockDataFields';

export interface MEmailFieldProps {
  edit: boolean;
  id?: string;
  placeholder?: string;
  value?: unknown;
}

const emailFieldDefaults = {
  placeholder: 'you@example.com',
  value: ''
} as const;

export function normalizeEmailFieldProps(props: Partial<MEmailFieldProps>): MEmailFieldProps {
  const merged = {
    ...emailFieldDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    id: stringValue(merged.id),
    placeholder: stringValue(merged.placeholder),
    value: normalizeValue(merged.value, emailFieldDefaults.value)
  };
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';

const props = defineProps<MEmailFieldProps & PageDslCallbacks<MEmailFieldProps>>();

const localFieldId = createPageDslFieldId();
const fieldId = computed(() => props.id || localFieldId);
const fieldPlaceholder = computed(() => props.placeholder || '');
const stringInputValue = computed(() => {
  if (typeof props.value === 'string' || typeof props.value === 'number') {
    return String(props.value);
  }
  return '';
});

function emitChange(payload: Partial<MEmailFieldProps>) {
  const nextPayload = normalizeEmailFieldProps({
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
  <PageDslBlock block-type="MEmailField">
    <div class="page-dsl-field">
      <input
        :id="fieldId"
        class="page-dsl-control mk-form-control"
        type="email"
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
