<script lang="ts">
import type { MokelayBlockComponentProps } from "@/blocks/types";
import { cloneActions } from '@/actions';
import {
  cloneBlockEvents,
  normalizeBlockEvents,
  type BlockEvent
} from '@/blocks/blockEvents';
import { stringValue } from '@/blocks/pageDslRuntime';
import {
  normalizeButtonProps,
  type MButtonProps
} from '@/blocks/MButton.vue';

export type MActionToolbarAlign = 'left' | 'right' | 'space-between';
export type MActionToolbarSize = 'small' | 'medium' | 'large';
export type MActionToolbarMode = 'inline' | 'grouped' | 'dropdown';

export type ToolbarButton = Omit<MButtonProps, 'edit' | 'currentBlockId' | 'bare'> & {
  id: string;
  showLoading?: boolean;
  loadingLabel?: string;
  events?: BlockEvent[];
  children?: ToolbarButton[];
};

export interface MActionToolbarProps extends MokelayBlockComponentProps {
  align?: MActionToolbarAlign | string;
  size?: MActionToolbarSize | string;
  mode?: MActionToolbarMode | string;
  buttons?: ToolbarButton[];
  actions?: unknown;
}

const alignValues = ['left', 'right', 'space-between'] as const;
const sizeValues = ['small', 'medium', 'large'] as const;
const modeValues = ['inline', 'grouped', 'dropdown'] as const;

const toolbarDefaults = {
  align: 'left',
  size: 'medium',
  mode: 'inline',
  buttons: [
    {
      id: 'search',
      label: '搜索',
      variant: 'primary',
      align: 'left',
      events: []
    },
    {
      id: 'reset',
      label: '重置',
      variant: 'secondary',
      align: 'left',
      events: []
    }
  ]
} satisfies Omit<MActionToolbarProps, 'edit' | 'actions'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneJsonValue<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeSelectValue<TValue extends string>(
  value: unknown,
  values: readonly TValue[],
  fallback: TValue
) {
  const normalized = normalizeString(value);
  return values.includes(normalized as TValue) ? normalized as TValue : fallback;
}

function getButtonRecord(item: Record<string, unknown>) {
  return isRecord(item.data) ? item.data : item;
}

function normalizeButtonEvents(item: Record<string, unknown>, buttonRecord: Record<string, unknown>) {
  const events = normalizeBlockEvents(buttonRecord.events ?? item.events);
  if (events.length) return events;

  if (Array.isArray(item.action)) {
    return [{
      event: 'click',
      actions: cloneActions(item.action)
    }];
  }

  if (Array.isArray(buttonRecord.action)) {
    return [{
      event: 'click',
      actions: cloneActions(buttonRecord.action)
    }];
  }

  return [];
}

function normalizeToolbarButtons(value: unknown, legacyActions?: unknown): ToolbarButton[] {
  const source = Array.isArray(value)
    ? value
    : Array.isArray(legacyActions)
      ? legacyActions
      : [];

  return source.flatMap((item, index): ToolbarButton[] => {
    if (!isRecord(item)) return [];

    const buttonRecord = getButtonRecord(item);
    const id = normalizeString(item.id ?? buttonRecord.id, `button_${index + 1}`);
    if (!id) return [];

    const normalizedButton = normalizeButtonProps({
      ...buttonRecord,
      edit: false
    });
    const events = normalizeButtonEvents(item, buttonRecord);
    const children = normalizeToolbarButtons(item.children ?? buttonRecord.children);

    return [{
      id,
      label: normalizedButton.label,
      variant: normalizedButton.variant,
      align: normalizedButton.align,
      ...(normalizedButton.disabled ? { disabled: true } : {}),
      ...(normalizedButton.visible ? {} : { visible: false }),
      ...(normalizedButton.hidden ? { hidden: true } : {}),
      ...(buttonRecord.showLoading === false ? { showLoading: false } : {}),
      ...(typeof buttonRecord.loadingLabel === 'string' ? { loadingLabel: buttonRecord.loadingLabel } : {}),
      events,
      ...(children.length ? { children } : {})
    }];
  });
}

export function normalizeMActionToolbarProps(props: Partial<MActionToolbarProps>): MActionToolbarProps {
  const merged = {
    ...toolbarDefaults,
    ...props
  };

  return {
    edit: props.edit ?? false,
    currentBlockId: props.currentBlockId,
    align: normalizeSelectValue(merged.align, alignValues, 'left'),
    size: normalizeSelectValue(merged.size, sizeValues, 'medium'),
    mode: normalizeSelectValue(merged.mode, modeValues, 'inline'),
    buttons: normalizeToolbarButtons(merged.buttons, props.actions)
  };
}

export function serializeMActionToolbarProps(props: Partial<MActionToolbarProps>) {
  const normalized = normalizeMActionToolbarProps(props);

  return {
    align: normalized.align,
    size: normalized.size,
    mode: normalized.mode,
    buttons: normalizeToolbarButtons(normalized.buttons)
  };
}
</script>

<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import MButton from '@/blocks/MButton.vue';
import {
  PreviewBlockRuntimeKey,
  type PreviewRuntimeBlock
} from '@/runtime/previewBlockRuntime';
import { PageReferenceAncestryKey } from '@/pages/referenceRuntime';
import { $message } from '@/components/global-calls/globalCalls';
import type { PageDslCallbacks } from '@/blocks/pageDslRuntime';

type ButtonEventPayload = {
  buttonId: string;
  button: ToolbarButton;
};

const props = defineProps<MActionToolbarProps & PageDslCallbacks<MActionToolbarProps>>();
const emit = defineEmits<{
  (event: 'click', payload: ButtonEventPayload & { nativeEvent?: MouseEvent }): void;
  (event: 'before-execute', payload: ButtonEventPayload): void;
  (event: 'execute-success', payload: ButtonEventPayload & { result?: unknown }): void;
  (event: 'execute-error', payload: ButtonEventPayload & { error: unknown }): void;
}>();

const rootRef = ref<HTMLElement | null>(null);
const previewRuntime = inject(PreviewBlockRuntimeKey, null);
const pageReferenceAncestry = inject(PageReferenceAncestryKey, computed<readonly string[]>(() => []));
const loadingState = ref<Record<string, boolean>>({});
const disabledState = ref<Record<string, boolean>>({});
const openMenuId = ref('');


const normalizedToolbar = computed(() => normalizeMActionToolbarProps(props));
const normalizedButtons = computed(() => normalizedToolbar.value.buttons ?? []);
const buttonMap = computed(() => new Map(flattenButtons(normalizedButtons.value).map((button) => [button.id, button])));
const toolbarClass = computed(() => [
  'm-action-toolbar',
  `m-action-toolbar--${normalizedToolbar.value.align}`,
  `m-action-toolbar--${normalizedToolbar.value.size}`,
  `m-action-toolbar--${normalizedToolbar.value.mode}`
]);

function flattenButtons(buttons: ToolbarButton[]): ToolbarButton[] {
  return buttons.flatMap((button) => [
    button,
    ...flattenButtons(button.children ?? [])
  ]);
}

function getButton(buttonId: string) {
  return buttonMap.value.get(buttonId);
}

function readInvocationInputs(value: unknown) {
  if (!isRecord(value)) return {};
  return isRecord(value.inputs) ? value.inputs : {};
}

function readButtonId(value: unknown) {
  if (typeof value === 'string') return value.trim();
  const inputs = readInvocationInputs(value);
  const args = isRecord(inputs.args) ? inputs.args : {};
  return stringValue(inputs.buttonId ?? inputs.actionId ?? inputs.id ?? args.buttonId ?? args.actionId ?? args.id);
}

function getButtonLoadingKey(button: ToolbarButton) {
  return button.id;
}

function isButtonLoading(button: ToolbarButton) {
  return loadingState.value[getButtonLoadingKey(button)] === true;
}

function shouldShowButtonLoading(button: ToolbarButton) {
  return button.showLoading !== false && isButtonLoading(button);
}

function isButtonDisabled(button: ToolbarButton) {
  const hasManualState = Object.prototype.hasOwnProperty.call(disabledState.value, button.id);
  const disabled = hasManualState ? disabledState.value[button.id] === true : button.disabled === true;
  return disabled || isButtonLoading(button);
}

function setLoading(buttonId: string, loading: boolean) {
  loadingState.value = {
    ...loadingState.value,
    [buttonId]: loading
  };
}

function setDisabled(buttonId: string, disabled: boolean) {
  disabledState.value = {
    ...disabledState.value,
    [buttonId]: disabled
  };
}

function enable(buttonIdOrInvocation: unknown) {
  const buttonId = readButtonId(buttonIdOrInvocation);
  if (!buttonId) return;
  setDisabled(buttonId, false);
}

function disable(buttonIdOrInvocation: unknown) {
  const buttonId = readButtonId(buttonIdOrInvocation);
  if (!buttonId) return;
  setDisabled(buttonId, true);
}

function getButtonEvents(button: ToolbarButton, eventName: string) {
  return normalizeBlockEvents(button.events).filter((eventConfig) => eventConfig.event === eventName);
}

function getButtonData(button: ToolbarButton) {
  const normalized = normalizeButtonProps({
    ...button,
    edit: false
  });

  return {
    label: normalized.label,
    variant: normalized.variant,
    align: normalized.align,
    ...(button.disabled ? { disabled: true } : {}),
    ...(button.visible === false ? { visible: false } : {}),
    ...(button.hidden === true ? { hidden: true } : {})
  };
}

function createButtonSourceBlock(button: ToolbarButton): PreviewRuntimeBlock {
  return {
    id: button.id,
    type: 'MButton',
    data: getButtonData(button),
    events: cloneBlockEvents(button.events),
    _pageAncestry: [...pageReferenceAncestry.value]
  };
}

async function runButtonEvent(button: ToolbarButton, eventName: string, event: unknown) {
  const eventConfigs = getButtonEvents(button, eventName);
  if (!eventConfigs.length) return;

  const payload = { buttonId: button.id, button };
  setLoading(button.id, true);
  emit('before-execute', payload);

  try {
    for (const eventConfig of eventConfigs) {
      await previewRuntime?.runActions(eventConfig.actions, createButtonSourceBlock(button), event);
    }
    emit('execute-success', { ...payload });
  } catch (error) {
    emit('execute-error', { ...payload, error });
    throw error;
  } finally {
    setLoading(button.id, false);
  }
}

async function trigger(buttonIdOrInvocation: unknown) {
  const buttonId = readButtonId(buttonIdOrInvocation);
  const button = getButton(buttonId);
  if (!button || isButtonDisabled(button)) return;

  await runButtonEvent(button, 'click', {
    buttonId,
    button,
    triggered: true
  });
}

async function handleButtonClick(button: ToolbarButton, event: MouseEvent) {
  if (props.edit || isButtonDisabled(button)) return;
  emit('click', { buttonId: button.id, button, nativeEvent: event });
  try {
    await runButtonEvent(button, 'click', {
      buttonId: button.id,
      button,
      nativeEvent: event
    });
  } catch (error) {
    const message = error instanceof Error && error.message
      ? error.message
      : '操作失败。';
    void $message({ type: 'error', content: message }).catch(() => undefined);
  }
  closeMenus();
}

function toggleMenu(menuId: string) {
  openMenuId.value = openMenuId.value === menuId ? '' : menuId;
}

function closeMenus() {
  openMenuId.value = '';
}

function getDropdownId(button: ToolbarButton, prefix = 'group') {
  return `${prefix}:${button.id}`;
}

function getRenderedButtonProps(button: ToolbarButton) {
  const data = getButtonData(button);
  return {
    ...data,
    edit: props.edit,
    currentBlockId: `m-action-toolbar-action-${button.id}`,
    disabled: isButtonDisabled(button),
    label: shouldShowButtonLoading(button) ? button.loadingLabel || '执行中...' : data.label,
    bare: true
  };
}

function refreshVisibility() {
  return undefined;
}

defineExpose({
  trigger,
  enable,
  disable,
  setLoading,
  setDisabled,
  getButton,
  getAction: getButton,
  refreshVisibility
});
</script>

<template>
  <div
    ref="rootRef"
    :class="toolbarClass"
    data-testid="m-action-toolbar"
  >
    <template v-if="normalizedToolbar.mode === 'dropdown'">
      <div class="m-action-toolbar__dropdown">
        <button
          type="button"
          class="m-action-toolbar__menu-trigger"
          data-testid="m-action-toolbar-more"
          :aria-expanded="openMenuId === 'more'"
          @click="toggleMenu('more')"
        >
          更多
        </button>
        <div
          v-if="openMenuId === 'more'"
          class="m-action-toolbar__menu"
          data-testid="m-action-toolbar-menu-more"
        >
          <template v-for="button in normalizedButtons" :key="button.id">
            <MButton
              v-bind="getRenderedButtonProps(button)"
              @click="handleButtonClick(button, $event)"
            />
            <MButton
              v-for="child in button.children ?? []"
              :key="`${button.id}-${child.id}`"
              v-bind="getRenderedButtonProps(child)"
              @click="handleButtonClick(child, $event)"
            />
          </template>
        </div>
      </div>
    </template>

    <template v-else>
      <template v-for="button in normalizedButtons" :key="button.id">
        <div
          v-if="normalizedToolbar.mode === 'grouped' && button.children?.length"
          class="m-action-toolbar__dropdown"
        >
          <MButton
            v-bind="getRenderedButtonProps(button)"
            :aria-expanded="openMenuId === getDropdownId(button)"
            @click="toggleMenu(getDropdownId(button))"
          />
          <div
            v-if="openMenuId === getDropdownId(button)"
            class="m-action-toolbar__menu"
            :data-testid="`m-action-toolbar-menu-${button.id}`"
          >
            <MButton
              v-for="child in button.children"
              :key="child.id"
              v-bind="getRenderedButtonProps(child)"
              @click="handleButtonClick(child, $event)"
            />
          </div>
        </div>

        <MButton
          v-else
          v-bind="getRenderedButtonProps(button)"
          @click="handleButtonClick(button, $event)"
        />
      </template>
    </template>
  </div>
</template>

<style scoped>
.m-action-toolbar {
  display: flex;
  width: 100%;
  min-height: 40px;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  color: rgb(15 23 42);
}

.m-action-toolbar--left {
  justify-content: flex-start;
}

.m-action-toolbar--right {
  justify-content: flex-end;
}

.m-action-toolbar--space-between {
  justify-content: space-between;
}

.m-action-toolbar :deep(.page-dsl-button-wrap) {
  display: inline-flex;
}

.m-action-toolbar :deep(.page-dsl-button) {
  min-width: 0;
  white-space: nowrap;
  cursor: pointer;
}

.m-action-toolbar--small :deep(.page-dsl-button),
.m-action-toolbar--small .m-action-toolbar__menu-trigger {
  min-height: 32px;
  padding: 7px 11px;
  border-radius: 7px;
  font-size: 12px;
}

.m-action-toolbar--medium :deep(.page-dsl-button),
.m-action-toolbar--medium .m-action-toolbar__menu-trigger {
  min-height: 38px;
  padding: 9px 14px;
  border-radius: 7px;
  font-size: 14px;
}

.m-action-toolbar--large :deep(.page-dsl-button),
.m-action-toolbar--large .m-action-toolbar__menu-trigger {
  min-height: 44px;
  padding: 11px 18px;
  border-radius: 8px;
  font-size: 15px;
}

.m-action-toolbar__dropdown {
  position: relative;
  display: inline-flex;
}

.m-action-toolbar__menu-trigger {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(203 213 225);
  background: rgb(255 255 255);
  color: rgb(51 65 85);
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
}

.m-action-toolbar__menu-trigger:hover {
  border-color: rgb(148 163 184);
  background: rgb(248 250 252);
}

.m-action-toolbar__menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  display: flex;
  min-width: 156px;
  flex-direction: column;
  gap: 4px;
  border: 1px solid rgb(226 232 240);
  border-radius: 8px;
  background: rgb(255 255 255);
  padding: 6px;
  box-shadow: 0 18px 48px rgb(15 23 42 / 0.18);
}

.m-action-toolbar__menu :deep(.page-dsl-button-wrap),
.m-action-toolbar__menu :deep(.page-dsl-button) {
  width: 100%;
}

.m-action-toolbar__menu :deep(.page-dsl-button) {
  justify-content: flex-start;
}

.dark .m-action-toolbar {
  color: rgb(226 232 240);
}

.dark .m-action-toolbar__menu-trigger {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

.dark .m-action-toolbar__menu-trigger:hover {
  border-color: rgb(100 116 139);
  background: rgb(30 41 59);
}

.dark .m-action-toolbar__menu {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  box-shadow: 0 18px 48px rgb(0 0 0 / 0.32);
}

@media (max-width: 640px) {
  .m-action-toolbar {
    align-items: stretch;
  }

  .m-action-toolbar :deep(.page-dsl-button-wrap),
  .m-action-toolbar__dropdown {
    flex: 1 1 auto;
  }

  .m-action-toolbar :deep(.page-dsl-button),
  .m-action-toolbar__menu-trigger {
    width: 100%;
  }
}
</style>
