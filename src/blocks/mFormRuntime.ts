import {
  cloneSelectorBlock,
  normalizeSelectorBlock,
  type StoredBlock
} from '@/blocks/storedBlocks';
import { cloneBlockEvents, type BlockEvent } from '@/blocks/blockEvents';
import { normalizeProcessorConfig } from '@/processors/shared';
import type { ProcessorConfig } from '@/processors/types';
import {
  normalizeMActionToolbarProps,
  serializeMActionToolbarProps,
  type MActionToolbarProps
} from './MActionToolbar.vue';

export interface MFormItemData {
  labelName: string;
  variableName: string;
  fieldDataType?: string;
  editor?: StoredBlock;
  layout: MFormItemLayout;
  hidden?: boolean;
  events?: BlockEvent[];
}

export interface MFormProps {
  edit: boolean;
  currentBlockId?: string;
  layout?: MFormLayout;
  itemWidthMode?: MFormItemWidthMode;
  items?: MFormItemData[];
  actionBar?: MFormActionBarData;
  toolbar?: MFormActionBarData;
  values?: Record<string, unknown>;
  defaultValues?: Record<string, unknown>;
  submit?: MFormSubmitData;
  processors?: MFormProcessorsData;
}

export type MFormLayout = 'Vertical' | 'Horizontal';
export type MFormItemLayout = 'Vertical' | 'Horizontal';
export type MFormItemWidthMode = 'stretch' | 'compact';
export type MFormActionBarData = Pick<MActionToolbarProps, 'align' | 'size' | 'mode' | 'buttons'>;

export interface MFormSubmitData {
  filterEmpty?: boolean;
  includeDisabled?: boolean;
  includeHidden?: boolean;
}

export interface MFormProcessorsData {
  beforeSetValues?: ProcessorConfig[];
  beforeSubmit?: ProcessorConfig[];
  beforeReset?: ProcessorConfig[];
}

type MFormItemDataInput = Partial<MFormItemData> & {
  visible?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneValue<T>(value: T): T {
  if (value === undefined || value === null || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeOptionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeProcessorConfigs(value: unknown): ProcessorConfig[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const normalized = normalizeProcessorConfig(item);
    return normalized ? [normalized] : [];
  });
}

export function generateFormItemVariableName() {
  const suffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `field_${suffix}`;
}

export function cloneFormItemData(item: MFormItemDataInput): MFormItemData {
  const labelName = typeof item.labelName === 'string' && item.labelName.trim() ? item.labelName : '字段';
  const variableName = typeof item.variableName === 'string' && item.variableName.trim()
    ? item.variableName.trim()
    : generateFormItemVariableName();
  const editor = normalizeSelectorBlock(item.editor);
  const events = cloneBlockEvents(item.events);
  const fieldDataType = normalizeOptionalString(item.fieldDataType);

  return {
    labelName,
    variableName,
    ...(fieldDataType ? { fieldDataType } : {}),
    ...(editor ? { editor: cloneSelectorBlock(editor) } : {}),
    layout: item.layout === 'Horizontal' ? 'Horizontal' : 'Vertical',
    ...(item.hidden === true || item.visible === false ? { hidden: true } : {}),
    events
  };
}

export function normalizeMFormItem(value: unknown): MFormItemData | undefined {
  return isRecord(value) ? cloneFormItemData(value as MFormItemDataInput) : undefined;
}

export function normalizeMFormItems(value: unknown): MFormItemData[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeMFormItem).filter((item): item is MFormItemData => Boolean(item));
}

export function normalizeMFormValues(value: unknown): Record<string, unknown> {
  return isRecord(value) ? cloneValue(value) : {};
}

export function normalizeMFormSubmit(value: unknown): MFormSubmitData {
  if (!isRecord(value)) return {};
  return {
    ...(value.filterEmpty === true ? { filterEmpty: true } : {}),
    ...(value.includeDisabled === false ? { includeDisabled: false } : {}),
    ...(value.includeHidden === true ? { includeHidden: true } : {})
  };
}

export function normalizeMFormProcessors(value: unknown): MFormProcessorsData {
  if (!isRecord(value)) return {};
  const beforeSetValues = normalizeProcessorConfigs(value.beforeSetValues);
  const beforeSubmit = normalizeProcessorConfigs(value.beforeSubmit);
  const beforeReset = normalizeProcessorConfigs(value.beforeReset);
  return {
    ...(beforeSetValues.length ? { beforeSetValues } : {}),
    ...(beforeSubmit.length ? { beforeSubmit } : {}),
    ...(beforeReset.length ? { beforeReset } : {})
  };
}

export function normalizeMFormLayout(value: unknown): MFormLayout {
  return value === 'Horizontal' ? 'Horizontal' : 'Vertical';
}

export function normalizeMFormItemWidthMode(value: unknown): MFormItemWidthMode {
  return value === 'compact' ? 'compact' : 'stretch';
}

export function normalizeMFormActionBar(value: unknown): MFormActionBarData | undefined {
  if (!isRecord(value)) return undefined;
  const normalized = normalizeMActionToolbarProps({
    ...value,
    edit: false,
    buttons: Array.isArray(value.buttons) ? value.buttons : []
  });
  return normalized.buttons?.length ? serializeMActionToolbarProps(normalized) : undefined;
}

export function normalizeMFormProps(props: Partial<MFormProps>): MFormProps {
  return {
    edit: props.edit ?? false,
    currentBlockId: props.currentBlockId,
    layout: normalizeMFormLayout(props.layout),
    itemWidthMode: normalizeMFormItemWidthMode(props.itemWidthMode),
    items: normalizeMFormItems(props.items),
    actionBar: normalizeMFormActionBar(props.actionBar ?? props.toolbar),
    values: normalizeMFormValues(props.values),
    defaultValues: normalizeMFormValues(props.defaultValues),
    submit: normalizeMFormSubmit(props.submit),
    processors: normalizeMFormProcessors(props.processors)
  };
}

export function serializeMFormProps(props: Partial<MFormProps>) {
  const normalized = normalizeMFormProps(props);
  return {
    ...(normalized.layout === 'Horizontal' ? { layout: normalized.layout } : {}),
    ...(normalized.itemWidthMode === 'compact' ? { itemWidthMode: normalized.itemWidthMode } : {}),
    items: normalizeMFormItems(normalized.items).map(cloneFormItemData),
    ...(normalized.actionBar ? { actionBar: normalized.actionBar } : {}),
    ...(Object.keys(normalized.values ?? {}).length ? { values: normalized.values } : {}),
    ...(Object.keys(normalized.defaultValues ?? {}).length ? { defaultValues: normalized.defaultValues } : {}),
    ...(Object.keys(normalized.submit ?? {}).length ? { submit: normalized.submit } : {}),
    ...(Object.keys(normalized.processors ?? {}).length ? { processors: normalized.processors } : {})
  };
}
