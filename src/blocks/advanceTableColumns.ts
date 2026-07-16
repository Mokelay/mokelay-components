import { i18n } from '@/i18n';
import {
  createParagraphBlock,
  getParagraphText,
  normalizeStoredBlocks,
  type StoredBlock
} from '@/blocks/storedBlocks';

export type MAdvanceTableFixed = 'left' | 'right' | '' | null;

export interface MAdvanceTableColumnConfig {
  columnName?: string;
  columnContent?: StoredBlock[];
  width?: number | null;
  fixed?: MAdvanceTableFixed;
  wrap?: boolean;
  fieldVariable?: string;
  fieldDataType?: string;
}

export interface AdvanceTableColumnField {
  label: string;
  variable: string;
  dataType: string;
}

function getTextValue(text: string, id?: string) {
  return [createParagraphBlock(text, id)] satisfies StoredBlock[];
}

export function normalizeAdvanceTableFixed(fixed?: MAdvanceTableFixed) {
  return fixed === 'left' || fixed === 'right' ? fixed : null;
}

export function normalizeAdvanceTableWidth(width?: unknown) {
  if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) {
    return null;
  }

  return Math.round(width);
}

function normalizeOptionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function getDefaultAdvanceTableFieldTemplate(variable: string) {
  return variable ? `{{${variable}}}` : '';
}

export function inferAdvanceTableColumnVariable(columnContent?: StoredBlock[]) {
  const normalizedContent = normalizeStoredBlocks(columnContent);

  for (const block of normalizedContent) {
    const variable = inferTemplateVariable(block.type === 'paragraph' ? getParagraphText(block) : block.data);
    if (variable) return variable;
  }

  return '';
}

function inferTemplateVariable(value: unknown): string {
  if (typeof value === 'string') {
    const match = value.match(/\{\{\s*([A-Za-z0-9_.\[\]-]+)\s*\}\}/);
    return match?.[1]?.trim() ?? '';
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const variable = inferTemplateVariable(item);
      if (variable) return variable;
    }
    return '';
  }

  if (typeof value === 'object' && value !== null) {
    for (const item of Object.values(value)) {
      const variable = inferTemplateVariable(item);
      if (variable) return variable;
    }
  }

  return '';
}

export function getSingleParagraphColumnTemplate(column: MAdvanceTableColumnConfig) {
  const content = normalizeStoredBlocks(column.columnContent);
  if (content.length !== 1 || content[0]?.type !== 'paragraph') {
    return undefined;
  }

  return getParagraphText(content[0]);
}

export function setSingleParagraphColumnTemplate(
  column: MAdvanceTableColumnConfig,
  template: string
): MAdvanceTableColumnConfig {
  const content = normalizeStoredBlocks(column.columnContent);
  const existingParagraph = content.length === 1 && content[0]?.type === 'paragraph'
    ? content[0]
    : undefined;

  return {
    ...column,
    columnContent: [createParagraphBlock(template, existingParagraph?.id)]
  };
}

export function createAdvanceTableColumnFromField(field: AdvanceTableColumnField): MAdvanceTableColumnConfig {
  return {
    columnName: field.label,
    fieldVariable: field.variable,
    fieldDataType: field.dataType,
    columnContent: getTextValue(getDefaultAdvanceTableFieldTemplate(field.variable)),
    width: null,
    fixed: null
  };
}

export function normalizeAdvanceTableColumns(columns?: MAdvanceTableColumnConfig[]) {
  if (!Array.isArray(columns) || !columns.length) {
    return [];
  }

  const normalized = columns
    .filter((column): column is MAdvanceTableColumnConfig => typeof column === 'object' && column !== null)
    .map((column, index) => {
      const columnContent = normalizeStoredBlocks(column.columnContent);
      const inferredVariable = inferAdvanceTableColumnVariable(columnContent);
      const fieldVariable = normalizeOptionalString(column.fieldVariable) || inferredVariable;
      const fieldDataType = normalizeOptionalString(column.fieldDataType);

      return {
        columnName: normalizeOptionalString(column.columnName) || `${i18n.t('advanceTable.defaultColumnName')}${index + 1}`,
        columnContent,
        width: normalizeAdvanceTableWidth(column.width),
        fixed: normalizeAdvanceTableFixed(column.fixed),
        ...(column.wrap === true ? { wrap: true } : {}),
        ...(fieldVariable ? { fieldVariable } : {}),
        ...(fieldDataType ? { fieldDataType } : {})
      };
    });

  return normalized;
}

export function getAdvanceTableFieldsFromColumns(columns?: MAdvanceTableColumnConfig[]): AdvanceTableColumnField[] {
  const normalizedColumns = normalizeAdvanceTableColumns(columns);
  const fieldsByVariable = new Map<string, AdvanceTableColumnField>();

  normalizedColumns.forEach((column) => {
    const variable = normalizeOptionalString(column.fieldVariable) || inferAdvanceTableColumnVariable(column.columnContent);
    if (!variable || fieldsByVariable.has(variable)) {
      return;
    }

    fieldsByVariable.set(variable, {
      label: normalizeOptionalString(column.columnName) || variable,
      variable,
      dataType: normalizeOptionalString(column.fieldDataType) || 'string'
    });
  });

  return [...fieldsByVariable.values()];
}
