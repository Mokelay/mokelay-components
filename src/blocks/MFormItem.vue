<script lang="ts">
import {
  cloneEditorBlock,
  normalizeFormItemProps,
  normalizeLayout,
  type MFormItemProps
} from '@/blocks/mFormItemProps';

export {
  generateFormItemVariableName,
  getDefaultFormItemLabelName,
  normalizeFormItemProps,
  serializeFormItemProps
} from '@/blocks/mFormItemProps';
export type {
  MFormItemLayout,
  MFormItemProps,
  NormalizedMFormItemProps
} from '@/blocks/mFormItemProps';

</script>

<script setup lang="ts">
import { computed, inject, reactive, watch } from 'vue';
import MokelayBlockRenderer from '@/blocks/MokelayBlockRenderer.vue';
import { useI18n } from '@/i18n';
import {
  normalizeSelectorBlock,
} from '@/blocks/storedBlocks';
import { PageLocaleConfigKey } from '@/pages/runtimeContext';
import { languageValue } from '@/runtime/globalSettingsRuntime';
import { normalizePageLocaleConfig, resolveLocalizedValue } from '@/runtime/localization';

const props = withDefaults(defineProps<MFormItemProps & {
  onChange?: (payload: MFormItemProps) => void;
  onToolChange?: (payload: MFormItemProps) => void;
}>(), {
  edit: false,
  editor: undefined,
  layout: 'Vertical'
});
const emit = defineEmits<{
  (event: 'click', payload: MouseEvent): void;
  (event: 'value-change', value: unknown): void;
  (event: 'ready'): void;
}>();

const { t } = useI18n();
const formItem = reactive(normalizeFormItemProps(props));
const pageLocaleConfig = inject(PageLocaleConfigKey, computed(() => normalizePageLocaleConfig(undefined)));
const displayLabelName = computed(() => typeof formItem.labelName === 'string'
  ? formItem.labelName
  : resolveLocalizedValue(formItem.labelName, languageValue.value === 'en' ? 'en-US' : 'zh-CN', pageLocaleConfig.value));

function emitChange() {
  const payload: MFormItemProps = {
    edit: props.edit,
    labelName: formItem.labelName,
    variableName: formItem.variableName,
    editor: cloneEditorBlock(formItem.editor),
    layout: normalizeLayout(formItem.layout)
  };

  props.onToolChange?.(payload);
  props.onChange?.(payload);
}

function updateFormItem(payload: Partial<MFormItemProps>) {
  if (payload.labelName !== undefined) {
    formItem.labelName = payload.labelName;
  }

  if (payload.variableName !== undefined) {
    formItem.variableName = payload.variableName;
  }

  if ('editor' in payload) {
    formItem.editor = normalizeSelectorBlock(payload.editor);
  }

  if (payload.layout !== undefined) {
    formItem.layout = normalizeLayout(payload.layout);
  }

  emitChange();
}

function handlePreviewClick(event: MouseEvent) {
  if (!props.edit) {
    emit('click', event);
  }
}

watch(
  () => ({
    labelName: props.labelName,
    variableName: props.variableName,
    editor: props.editor,
    layout: props.layout,
    edit: props.edit
  }),
  (value) => {
    Object.assign(formItem, normalizeFormItemProps(value, formItem.variableName));
  },
  { deep: true }
);
</script>

<template>
  <div
    class="ce-form-item-tool mk-form-scope"
    :class="{
      'ce-form-item-tool--edit': edit,
      'ce-form-item-tool--horizontal': formItem.layout === 'Horizontal'
    }"
    data-testid="editor-form-item-tool"
    @click="handlePreviewClick"
  >
    <div class="ce-form-item-tool__body">
      <div
        class="ce-form-item-tool__label mk-form-label"
        :data-testid="edit ? 'form-item-label-preview' : 'preview-form-item-label'"
      >
        <slot name="label" :text="displayLabelName">{{ displayLabelName }}</slot>
      </div>
      <div
        class="ce-form-item-tool__editor"
        :data-testid="edit ? 'form-item-editor-field' : 'preview-form-item-editor'"
      >
        <slot name="control" :form-item="formItem">
          <MokelayBlockRenderer v-if="formItem.editor" :block="formItem.editor" @value-change="emit('value-change', $event)" @ready="emit('ready')" />
          <span v-else class="ce-form-item-tool__empty">{{ t('formItem.emptyEditor') }}</span>
        </slot>
      </div>
    </div>
    <slot name="help" />
  </div>
</template>

<style scoped>
.ce-form-item-tool {
  width: 100%;
  color: rgb(15 23 42);
}

.ce-form-item-tool__edit-shell {
  width: 100%;
  border: 1px dashed rgb(148 163 184 / 0.7);
  border-radius: 8px;
  padding: 8px;
}


.ce-form-item-tool__body {
  display: flex;
  flex-direction: column;
  gap: var(--mk-form-label-gap);
}

.ce-form-item-tool--horizontal .ce-form-item-tool__body {
  display: grid;
  grid-template-columns: minmax(96px, 30%) minmax(0, 1fr);
  align-items: start;
  gap: 12px;
}

.ce-form-item-tool__label {
  word-break: break-word;
}

.ce-form-item-tool__editor {
  min-width: 0;
}

.ce-form-item-tool__empty {
  display: inline-flex;
  min-height: var(--mk-form-control-height);
  align-items: center;
  color: rgb(100 116 139);
  font-size: 14px;
  line-height: 20px;
}

.ce-form-item-tool--horizontal .ce-form-item-tool__label { padding-top: 10px; }

@container (max-width: 420px) {
  .ce-form-item-tool--horizontal .ce-form-item-tool__body {
    display: flex;
    flex-direction: column;
    gap: var(--mk-form-label-gap);
  }
  .ce-form-item-tool--horizontal .ce-form-item-tool__label { padding-top: 0; }
}

.dark .ce-form-item-tool {
  color: rgb(226 232 240);
}

.dark .ce-form-item-tool__edit-shell {
  border-color: rgb(71 85 105 / 0.9);
}

.dark .ce-form-item-tool__label {
  color: rgb(203 213 225);
}

.dark .ce-form-item-tool__empty {
  color: rgb(148 163 184);
}
</style>
