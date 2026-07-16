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
        class="page-dsl-control"
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

.page-dsl-control {
  width: 100%;
  border: 1px solid rgb(148 163 184 / 0.65);
  border-radius: 8px;
  padding: 9px 11px;
  background: rgb(255 255 255);
  color: rgb(15 23 42);
  font-size: 14px;
  line-height: 20px;
}

.page-dsl-control:focus {
  outline: none;
  border-color: rgb(99 102 241);
  box-shadow: 0 0 0 2px rgb(99 102 241 / 0.14);
}

.dark .page-dsl-control {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}
</style>
