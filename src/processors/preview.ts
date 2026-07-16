import { applyProcessors } from '@/processors/runner';
import type { ProcessorConfig } from '@/processors/types';
import {
  cloneJsonValue,
  isJsonValue,
  type DatasourceSchemaSelection,
  type JsonValue
} from '@/datasource/schema';

export type SchemaSelectionPreviewErrorCode =
  | 'FIELD_PREVIEW_INVALID_PATH'
  | 'FIELD_PREVIEW_PATH_NOT_FOUND'
  | 'FIELD_PREVIEW_INVALID_RESULT';

export class SchemaSelectionPreviewError extends Error {
  constructor(
    public readonly code: SchemaSelectionPreviewErrorCode,
    message: string,
    public readonly path: string
  ) {
    super(message);
    this.name = 'SchemaSelectionPreviewError';
  }
}

export type SchemaSelectionPreviewResult = {
  extractedValue: JsonValue;
  finalValue: JsonValue;
};

type PathSegment = {
  key: string;
  array: boolean;
};

type ResolvedValue = SchemaSelectionPreviewResult & {
  found: boolean;
};

function parseSelectionPath(path: string): PathSegment[] {
  const normalizedPath = path.trim();
  if (!normalizedPath) {
    throw new SchemaSelectionPreviewError('FIELD_PREVIEW_INVALID_PATH', 'Field path is empty.', path);
  }

  return normalizedPath.split('.').map((rawSegment) => {
    const array = rawSegment.endsWith('[]');
    const key = array ? rawSegment.slice(0, -2) : rawSegment;
    if ((!key && !array) || key.includes('[') || key.includes(']')) {
      throw new SchemaSelectionPreviewError('FIELD_PREVIEW_INVALID_PATH', `Invalid field path: ${path}`, path);
    }
    return { key, array };
  });
}

function readSegment(value: JsonValue, key: string): { found: boolean; value: JsonValue } {
  if (!key) return { found: true, value };
  if (typeof value !== 'object' || value === null || Array.isArray(value) ||
    !Object.prototype.hasOwnProperty.call(value, key)) {
    return { found: false, value: null };
  }
  return { found: true, value: value[key] };
}

function applyPreviewProcessors(value: JsonValue, processors: ProcessorConfig[], path: string): JsonValue {
  const result = applyProcessors(cloneJsonValue(value), processors);
  if (!isJsonValue(result)) {
    throw new SchemaSelectionPreviewError(
      'FIELD_PREVIEW_INVALID_RESULT',
      `Processors returned a non-JSON value for field path: ${path}`,
      path
    );
  }
  return cloneJsonValue(result);
}

function resolveSelectionValue(
  current: JsonValue,
  segments: PathSegment[],
  index: number,
  processors: ProcessorConfig[],
  path: string
): ResolvedValue {
  const segment = segments[index];
  const selected = readSegment(current, segment.key);
  if (!selected.found) {
    return { found: false, extractedValue: null, finalValue: null };
  }

  const isLast = index === segments.length - 1;
  if (segment.array) {
    if (!Array.isArray(selected.value)) {
      return { found: false, extractedValue: null, finalValue: null };
    }

    if (isLast) {
      const extractedValue = cloneJsonValue(selected.value);
      return {
        found: true,
        extractedValue,
        finalValue: applyPreviewProcessors(extractedValue, processors, path)
      };
    }

    if (!selected.value.length) {
      return { found: true, extractedValue: [], finalValue: [] };
    }

    const children = selected.value.map((item) => (
      resolveSelectionValue(item, segments, index + 1, processors, path)
    ));
    return {
      found: children.some((child) => child.found),
      extractedValue: children.map((child) => child.found ? child.extractedValue : null),
      finalValue: children.map((child) => child.found ? child.finalValue : null)
    };
  }

  if (isLast) {
    const extractedValue = cloneJsonValue(selected.value);
    return {
      found: true,
      extractedValue,
      finalValue: applyPreviewProcessors(extractedValue, processors, path)
    };
  }

  return resolveSelectionValue(selected.value, segments, index + 1, processors, path);
}

function resolveOrThrow(value: JsonValue, path: string, processors: ProcessorConfig[]) {
  const resolved = resolveSelectionValue(value, parseSelectionPath(path), 0, processors, path);
  if (!resolved.found) {
    throw new SchemaSelectionPreviewError(
      'FIELD_PREVIEW_PATH_NOT_FOUND',
      `Field path was not found in the response example: ${path}`,
      path
    );
  }
  return resolved;
}

export function extractSchemaSelectionValue(value: JsonValue, path: string): JsonValue {
  return resolveOrThrow(value, path, []).extractedValue;
}

export function previewSchemaSelection(
  value: JsonValue,
  selection: Pick<DatasourceSchemaSelection, 'path' | 'processors'>
): SchemaSelectionPreviewResult {
  const { extractedValue, finalValue } = resolveOrThrow(value, selection.path, selection.processors ?? []);
  return { extractedValue, finalValue };
}
