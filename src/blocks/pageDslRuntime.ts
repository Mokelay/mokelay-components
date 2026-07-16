export type PageDslAlign = 'left' | 'center' | 'right';
export type PageDslButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning' | 'text';

export type PageDslOption = {
  label: string;
  value: string;
  description?: string;
  imageUrl?: string;
};

export type PageDslOptionFieldMapping = {
  labelField?: string;
  valueField?: string;
  descriptionField?: string;
  imageUrlField?: string;
};

export type PageDslMatrixRow = {
  label: string;
  value: string;
};

export type PageDslCallbacks<TProps extends object> = {
  onChange?: (payload: TProps) => void;
  onToolChange?: (payload: TProps) => void;
};

let nextPageDslFieldId = 0;

export function createPageDslFieldId() {
  return `page-dsl-field-${++nextPageDslFieldId}`;
}

export function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

export function booleanValue(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes'].includes(normalized)) return true;
    if (['0', 'false', 'no'].includes(normalized)) return false;
  }
  return fallback;
}

export function numberValue(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : fallback;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeSelectValue<TValue extends string>(
  value: unknown,
  values: readonly TValue[],
  fallback: TValue
) {
  const stringifiedValue = stringValue(value);
  return values.includes(stringifiedValue as TValue) ? stringifiedValue as TValue : fallback;
}

export function normalizeAlign(value: unknown, fallback: PageDslAlign = 'left') {
  return normalizeSelectValue(value, ['left', 'center', 'right'] as const, fallback);
}

export function normalizeButtonVariant(value: unknown, fallback: PageDslButtonVariant = 'primary') {
  if (value === 'default') return 'secondary';
  return normalizeSelectValue(value, ['primary', 'secondary', 'ghost', 'danger', 'warning', 'text'] as const, fallback);
}

function readOptionField(source: Record<string, unknown>, path: string) {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[segment];
  }, source);
}

function optionText(value: unknown, fallback = '') {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

export function normalizeOptions(
  value: unknown,
  fallback: PageDslOption[],
  fieldMapping: PageDslOptionFieldMapping = {}
) {
  const source = Array.isArray(value) ? value : fallback;
  const labelField = stringValue(fieldMapping.labelField, 'label');
  const valueField = stringValue(fieldMapping.valueField, 'value');
  const descriptionField = stringValue(fieldMapping.descriptionField, 'description');
  const imageUrlField = stringValue(fieldMapping.imageUrlField, 'imageUrl');

  return source
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null && !Array.isArray(item))
    .map((item, index) => ({
      label: optionText(readOptionField(item, labelField), `选项 ${index + 1}`),
      value: optionText(readOptionField(item, valueField), `option_${index + 1}`),
      description: optionText(readOptionField(item, descriptionField)),
      imageUrl: optionText(readOptionField(item, imageUrlField))
    }));
}

export function normalizeMatrixRows(value: unknown, fallback: PageDslMatrixRow[]) {
  const source = Array.isArray(value) ? value : fallback;
  return source
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null && !Array.isArray(item))
    .map((item, index) => ({
      label: stringValue(item.label, `问题 ${index + 1}`),
      value: stringValue(item.value, `row_${index + 1}`)
    }));
}

export function normalizeAction(value: unknown) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? JSON.parse(JSON.stringify(value)) as Record<string, unknown>
    : { type: 'submit' };
}

export function normalizeValue(value: unknown, fallback: unknown) {
  const source = value === undefined ? fallback : value;
  if (
    typeof source === 'string' ||
    typeof source === 'number' ||
    typeof source === 'boolean' ||
    source === null
  ) {
    return source;
  }

  if (typeof source === 'object' && source !== null) {
    return JSON.parse(JSON.stringify(source)) as unknown;
  }

  return fallback;
}
