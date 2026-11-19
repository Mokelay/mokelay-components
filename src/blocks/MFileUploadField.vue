<script lang="ts">
import { booleanValue, createPageDslFieldId, normalizeValue, numberValue, stringValue } from '@/blocks/pageDslRuntime';

export interface MFileUploadFieldProps {
  edit: boolean;
  id?: string;
  value?: unknown;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
}

const fileUploadFieldDefaults = {
  value: [] as unknown[],
  accept: '.pdf,.doc,.docx',
  multiple: false,
  maxFiles: 1
};

export function normalizeFileUploadFieldProps(props: Partial<MFileUploadFieldProps>): MFileUploadFieldProps {
  const merged = {
    ...fileUploadFieldDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    id: stringValue(merged.id),
    value: normalizeValue(merged.value, fileUploadFieldDefaults.value),
    accept: stringValue(merged.accept),
    multiple: booleanValue(merged.multiple),
    maxFiles: numberValue(merged.maxFiles, fileUploadFieldDefaults.maxFiles)
  };
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';

const props = defineProps<MFileUploadFieldProps & PageDslCallbacks<MFileUploadFieldProps>>();

const localFieldId = createPageDslFieldId();
const fieldId = computed(() => props.id || localFieldId);

function emitChange(payload: Partial<MFileUploadFieldProps>) {
  const nextPayload = normalizeFileUploadFieldProps({
    edit: props.edit,
    id: props.id,
    value: props.value,
    accept: props.accept,
    multiple: props.multiple,
    maxFiles: props.maxFiles,
    ...payload
  });
  props.onToolChange?.(nextPayload);
  props.onChange?.(nextPayload);
}

function emitFileValue(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []).map((file) => ({
    name: file.name,
    size: file.size,
    type: file.type
  }));
  emitChange({ value: files });
}
</script>

<template>
  <PageDslBlock block-type="MFileUploadField">
    <div class="page-dsl-field">
      <input
        :id="fieldId"
        class="page-dsl-control mk-form-control"
        type="file"
        :accept="accept"
        :multiple="multiple"
        @change="emitFileValue"
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
