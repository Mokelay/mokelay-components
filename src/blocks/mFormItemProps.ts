import { i18n } from '@/i18n';
import {
  cloneSelectorBlock,
  normalizeSelectorBlock,
  type StoredBlock
} from '@/blocks/storedBlocks';
import { normalizeLocalizedTextValue, type LocalizedTextValue } from '@/runtime/localization';

export type MFormItemLayout = 'Vertical' | 'Horizontal';

export interface MFormItemRules {
  visibleWhen?: { field: string; equals?: string };
  hint?: string;
  description?: string;
  pattern?: string;
  invalidMessage?: string;
  readOnly?: boolean;
}

export function cloneFormItemRules(rules?: MFormItemRules): MFormItemRules | undefined {
  if (!rules || !Object.keys(rules).length) return undefined;
  return { ...rules, ...(rules.visibleWhen ? { visibleWhen: { ...rules.visibleWhen } } : {}) };
}

export interface MFormItemProps {
  edit: boolean;
  labelName?: LocalizedTextValue;
  variableName?: string;
  editor?: StoredBlock;
  layout?: MFormItemLayout;
  rules?: MFormItemRules;
}

export type NormalizedMFormItemProps = Omit<MFormItemProps, 'labelName' | 'variableName' | 'layout'> & {
  labelName: LocalizedTextValue;
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
  return normalizeLocalizedTextValue(value, getDefaultFormItemLabelName());
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
    rules: cloneFormItemRules(props.rules),
    layout: normalizeLayout(props.layout)
  };
}

export function serializeFormItemProps(props: Partial<MFormItemProps>) {
  const normalized = normalizeFormItemProps(props);
  return {
    labelName: normalized.labelName,
    variableName: normalized.variableName,
    ...(normalized.editor ? { editor: cloneEditorBlock(normalized.editor) } : {}),
    ...(normalized.rules ? { rules: normalized.rules } : {}),
    layout: normalized.layout
  };
}
