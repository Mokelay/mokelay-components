import { i18n } from '@/i18n';
import {
  cloneSelectorBlock,
  normalizeSelectorBlock,
  type StoredBlock
} from '@/blocks/storedBlocks';

export type MFormItemLayout = 'Vertical' | 'Horizontal';

export interface MFormItemProps {
  edit: boolean;
  labelName?: string;
  variableName?: string;
  editor?: StoredBlock;
  layout?: MFormItemLayout;
}

export type NormalizedMFormItemProps = Omit<MFormItemProps, 'labelName' | 'variableName' | 'layout'> & {
  labelName: string;
  variableName: string;
  layout: MFormItemLayout;
};

export function generateFormItemVariableName() {
  const suffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

  return `field_${suffix}`;
}

export function getDefaultFormItemLabelName() {
  return i18n.t('formItem.defaultLabelName');
}

export function normalizeLayout(value?: unknown): MFormItemLayout {
  return value === 'Horizontal' ? 'Horizontal' : 'Vertical';
}

function normalizeLabelName(value?: unknown) {
  return typeof value === 'string' && value.trim() ? value : getDefaultFormItemLabelName();
}

function normalizeVariableName(value?: unknown, fallback?: string) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return fallback || generateFormItemVariableName();
}

export function cloneEditorBlock(block?: StoredBlock) {
  return block ? cloneSelectorBlock(block) : undefined;
}

export function normalizeFormItemProps(props: Partial<MFormItemProps>, fallbackVariableName?: string): NormalizedMFormItemProps {
  return {
    edit: props.edit ?? false,
    labelName: normalizeLabelName(props.labelName),
    variableName: normalizeVariableName(props.variableName, fallbackVariableName),
    editor: normalizeSelectorBlock(props.editor),
    layout: normalizeLayout(props.layout)
  };
}

export function serializeFormItemProps(props: Partial<MFormItemProps>) {
  const normalized = normalizeFormItemProps(props);
  return {
    labelName: normalized.labelName,
    variableName: normalized.variableName,
    ...(normalized.editor ? { editor: cloneEditorBlock(normalized.editor) } : {}),
    layout: normalized.layout
  };
}
