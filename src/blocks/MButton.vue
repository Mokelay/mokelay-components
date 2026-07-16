<script lang="ts">
import { normalizeAction, normalizeAlign, normalizeButtonVariant, stringValue, booleanValue, type PageDslAlign, type PageDslButtonVariant } from '@/blocks/pageDslRuntime';

export interface MButtonProps {
  edit: boolean;
  currentBlockId?: string;
  label?: string;
  variant?: PageDslButtonVariant | string;
  align?: PageDslAlign | string;
  action?: Record<string, unknown>;
  disabled?: boolean;
  bare?: boolean;
  visible?: boolean;
  hidden?: boolean;
}

const buttonDefaults = {
  label: '提交',
  variant: 'primary',
  align: 'left',
  action: { type: 'submit' },
  disabled: false,
  visible: true,
  hidden: false
} as const;

export function normalizeButtonProps(props: Partial<MButtonProps>): MButtonProps {
  const merged = {
    ...buttonDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    currentBlockId: stringValue(merged.currentBlockId),
    label: stringValue(merged.label),
    variant: normalizeButtonVariant(merged.variant),
    align: normalizeAlign(merged.align),
    action: normalizeAction(merged.action),
    disabled: booleanValue(merged.disabled),
    bare: booleanValue(merged.bare),
    visible: booleanValue(merged.visible, true),
    hidden: booleanValue(merged.hidden)
  };
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import PageDslBlock from '@/blocks/PageDslBlock.vue';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';

const props = withDefaults(defineProps<MButtonProps & PageDslCallbacks<MButtonProps>>(), {
  visible: true,
  hidden: false
});
const emit = defineEmits<{
  (event: 'click', payload: MouseEvent): void;
}>();

const normalizedButton = computed(() => normalizeButtonProps(props));

const buttonClass = computed(() => {
  const variant = normalizedButton.value.variant;
  return `page-dsl-button page-dsl-button--${variant}`;
});

const buttonWrapClass = computed(() => {
  if (normalizedButton.value.align === 'center') return 'page-dsl-button-wrap page-dsl-button-wrap--center';
  if (normalizedButton.value.align === 'right') return 'page-dsl-button-wrap page-dsl-button-wrap--right';
  return 'page-dsl-button-wrap';
});

const buttonTestId = computed(() => props.currentBlockId || undefined);

function handleClick(event: MouseEvent) {
  if (!normalizedButton.value.edit && !normalizedButton.value.disabled) {
    emit('click', event);
  }
}
</script>

<template>
  <template v-if="normalizedButton.visible && !normalizedButton.hidden">
    <PageDslBlock v-if="!normalizedButton.bare" block-type="MButton">
      <div :class="buttonWrapClass">
        <button type="button" :class="buttonClass" :disabled="normalizedButton.disabled" :data-testid="buttonTestId" @click="handleClick">
          {{ normalizedButton.label || '提交' }}
        </button>
      </div>
    </PageDslBlock>
    <div v-else :class="buttonWrapClass">
      <button type="button" :class="buttonClass" :disabled="normalizedButton.disabled" :data-testid="buttonTestId" @click="handleClick">
        {{ normalizedButton.label || '提交' }}
      </button>
    </div>
  </template>
</template>

<style scoped>
.page-dsl-button-wrap {
  display: flex;
  justify-content: flex-start;
}

.page-dsl-button-wrap--center {
  justify-content: center;
}

.page-dsl-button-wrap--right {
  justify-content: flex-end;
}

.page-dsl-button {
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 700;
  cursor: default;
}

.page-dsl-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.page-dsl-button--primary {
  border: 1px solid rgb(79 70 229);
  background: rgb(79 70 229);
  color: white;
}

.page-dsl-button--secondary {
  border: 1px solid rgb(203 213 225);
  background: rgb(255 255 255);
  color: rgb(15 23 42);
}

.page-dsl-button--ghost {
  border: 1px solid transparent;
  background: transparent;
  color: rgb(51 65 85);
}

.page-dsl-button--danger {
  border: 1px solid rgb(254 202 202);
  background: rgb(254 226 226);
  color: rgb(185 28 28);
}

.page-dsl-button--warning {
  border: 1px solid rgb(253 186 116);
  background: rgb(255 247 237);
  color: rgb(194 65 12);
}

.page-dsl-button--text {
  border: 1px solid transparent;
  background: transparent;
  color: rgb(37 99 235);
}

.dark .page-dsl-button--secondary {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

.dark .page-dsl-button--danger {
  border-color: rgb(127 29 29);
  background: rgb(127 29 29 / 0.34);
  color: rgb(254 202 202);
}

.dark .page-dsl-button--warning {
  border-color: rgb(154 52 18);
  background: rgb(154 52 18 / 0.24);
  color: rgb(254 215 170);
}

.dark .page-dsl-button--text {
  border-color: transparent;
  background: transparent;
  color: rgb(147 197 253);
}
</style>
