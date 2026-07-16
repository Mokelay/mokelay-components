import {
  applyProcessors,
  normalizeProcessors,
  type ProcessorConfig
} from '@/processors';
import type { ActionContext, ActionTemplate } from '@/actions/types';

const wholeTemplatePattern = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
const templatePattern = /\{\{\s*([^}]+?)\s*\}\}/g;

type PlainRecord = Record<string, unknown>;

function isRecord(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneValue<T>(value: T): T {
  if (value === undefined || value === null || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function isActionTemplate(value: unknown): value is ActionTemplate {
  return isRecord(value) && typeof value.template === 'string';
}

function stringifyTemplateValue(value: unknown) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function tokenizePath(path: string) {
  const segments: string[] = [];
  let cursor = '';

  for (let index = 0; index < path.length; index += 1) {
    const char = path[index];
    if (char === '.') {
      if (cursor) segments.push(cursor);
      cursor = '';
      continue;
    }
    if (char === '[') {
      if (cursor) segments.push(cursor);
      cursor = '';
      const end = path.indexOf(']', index);
      if (end === -1) {
        throw new Error(`Action template path is invalid: ${path}`);
      }
      const raw = path.slice(index + 1, end).trim();
      segments.push(raw.replace(/^['"]|['"]$/g, ''));
      index = end;
      continue;
    }
    cursor += char;
  }

  if (cursor) segments.push(cursor);
  return segments;
}

function readTemplatePath(context: ActionContext, path: string): unknown {
  const segments = tokenizePath(path.trim());
  let cursor: unknown = context;

  for (const segment of segments) {
    if (isRecord(cursor) && Object.prototype.hasOwnProperty.call(cursor, segment)) {
      cursor = cursor[segment];
      continue;
    }
    if (Array.isArray(cursor) && /^\d+$/.test(segment)) {
      cursor = cursor[Number(segment)];
      continue;
    }
    throw new Error(`Action template variable was not found: ${path}`);
  }

  return cursor;
}

function resolveProcessorParam(value: unknown, context: ActionContext): unknown {
  return resolveActionTemplates(value, context);
}

function resolveProcessorConfig(config: ProcessorConfig, context: ActionContext): ProcessorConfig {
  if (typeof config === 'string') {
    return config;
  }

  return {
    processor: config.processor,
    ...(config.param === undefined ? {} : { param: resolveProcessorParam(config.param, context) })
  };
}

function applyActionTemplateProcessors(value: unknown, processors: unknown, context: ActionContext) {
  const normalizedProcessors = normalizeProcessors(processors)
    .map((processor) => resolveProcessorConfig(processor, context));
  if (!normalizedProcessors.length) {
    return value;
  }
  return applyProcessors(cloneValue(value), normalizedProcessors);
}

export function resolveActionTemplates(value: unknown, context: ActionContext): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => resolveActionTemplates(item, context));
  }

  if (isActionTemplate(value)) {
    const wholeMatch = value.template.match(wholeTemplatePattern);
    const rendered = wholeMatch
      ? readTemplatePath(context, wholeMatch[1])
      : value.template.replace(templatePattern, (_match, path) => (
        stringifyTemplateValue(readTemplatePath(context, String(path)))
      ));
    return applyActionTemplateProcessors(rendered, value.processors, context);
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveActionTemplates(item, context)])
    );
  }

  return value;
}
