<script lang="ts">
import { i18n } from '@/i18n';

export interface MTagProps {
  edit: boolean;
  tagName?: string;
  closable?: boolean;
  size?: '' | 'large' | 'default' | 'small';
  color?: string;
  type?: '' | 'primary' | 'success' | 'info' | 'warning' | 'danger';
}
</script>

<script setup lang="ts">
import { ref } from 'vue';
import { ElTag } from 'element-ui/es/components/tag/index.mjs';
import 'element-ui/es/components/tag/style/css';

const props = defineProps<MTagProps & {
  onChange?: (payload: MTagProps) => void;
  onToolChange?: (payload: MTagProps) => void;
}>();
const rootRef = ref<HTMLElement | null>(null);


function emitChange(payload: Partial<MTagProps>) {
  const nextPayload = {
    edit: props.edit,
    tagName: props.tagName ?? '',
    closable: props.closable ?? false,
    size: props.size ?? '',
    color: props.color ?? '',
    type: props.type ?? '',
    ...payload
  };
  props.onToolChange?.(nextPayload);
  props.onChange?.(nextPayload);
}

function handleClose() {
  emitChange({
    closable: props.closable ?? false
  });
}
</script>

<template>
  <div ref="rootRef" class="ce-tag-tool" data-testid="editor-tag-tool">
    <ElTag
      data-testid="editor-tag-value"
      :closable="closable"
      :size="size || undefined"
      :color="color || undefined"
      :type="type || undefined"
      @close="handleClose"
    >
      {{ tagName }}
    </ElTag>
  </div>
</template>

<style scoped>
.ce-tag-tool {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  max-width: 100%;
}

.ce-tag-tool :deep(.el-tag) {
  max-width: 100%;
  line-height: 20px;
}

.ce-tag-tool :deep(.el-tag__content) {
  display: inline-flex;
  align-items: center;
  min-width: 0;
}
</style>
