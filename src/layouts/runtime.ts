import { apiClient } from '@/composables/useApi';
import {
  normalizeMenuItems,
  type LayoutMenuItem,
  type LayoutResource,
  type MokelayLayout,
  type RenderBundlePage
} from '@/layouts/domain';
import {
  resolveDatasourceRuntimeData
} from '@/datasource/runtime';
import { normalizeDatasource, type MDatasourceApiObject } from '@/datasource/datasource';
import type { PageRuntimeContext } from '@/pages/runtimeContext';

export type LayoutAuthState = {
  loggedIn: boolean;
  user: Record<string, unknown> | null;
  pending: boolean;
};

export type LayoutRuntimeContext = {
  page: RenderBundlePage;
  layout: MokelayLayout;
  resources: {
    mainMenu?: {
      items: LayoutMenuItem[];
    };
    [key: string]: unknown;
  };
  auth: LayoutAuthState;
  pageContext: PageRuntimeContext;
  route: {
    path: string;
    hash: string;
    href: string;
  };
};

const wholeTemplatePattern = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
const templatePattern = /\{\{\s*([^}]+?)\s*\}\}/g;

export function createEmptyAuthState(): LayoutAuthState {
  return {
    loggedIn: false,
    user: null,
    pending: false
  };
}

export function getCurrentLayoutRoute() {
  return {
    path: window.location.pathname,
    hash: window.location.hash,
    href: window.location.href
  };
}

export async function resolveLayoutAuth(layout: MokelayLayout): Promise<LayoutAuthState> {
  if (layout.auth?.enabled !== true) {
    return createEmptyAuthState();
  }

  const endpoint = layout.auth.endpoint || '/api/mokelay/me';

  try {
    const response = await apiClient.get(endpoint);
    const data = unwrapMokelayData(response.data);
    const record = isRecord(data) ? data : {};
    const user = isRecord(record.user) ? record.user : null;

    return {
      loggedIn: record.loggedIn === true,
      user,
      pending: false
    };
  } catch {
    return createEmptyAuthState();
  }
}

export async function resolveLayoutResources(layout: MokelayLayout): Promise<LayoutRuntimeContext['resources']> {
  const resources = layout.resources ?? {};
  const entries = await Promise.all(Object.entries(resources).map(async ([key, resource]) => {
    if (!resource) return [key, undefined] as const;
    return [key, await resolveLayoutResource(resource)] as const;
  }));

  return Object.fromEntries(entries.filter((entry) => entry[1] !== undefined)) as LayoutRuntimeContext['resources'];
}

export function resolveLayoutTemplates(value: unknown, context: LayoutRuntimeContext): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => resolveLayoutTemplates(item, context));
  }

  if (isTemplateObject(value)) {
    const wholeMatch = value.template.match(wholeTemplatePattern);
    const rendered = wholeMatch
      ? readTemplatePath(context, wholeMatch[1])
      : value.template.replace(templatePattern, (_match, path) => stringifyTemplateValue(readTemplatePath(context, String(path))));

    return resolveLayoutTemplates(rendered, context);
  }

  if (typeof value === 'string' && templatePattern.test(value)) {
    templatePattern.lastIndex = 0;
    return value.replace(templatePattern, (_match, path) => stringifyTemplateValue(readTemplatePath(context, String(path))));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveLayoutTemplates(item, context)])
    );
  }

  return value;
}

async function resolveLayoutResource(resource: LayoutResource) {
  if (resource.type === 'static') {
    return {
      items: normalizeMenuItems(resource.items)
    };
  }

  if (resource.type === 'api' && resource.ds) {
    const datasource = normalizeDatasource(resource.ds);
    if (datasource.type !== 'API') {
      return { items: [] };
    }

    return {
      items: await resolveApiMenuItems(datasource, resource.itemsPath)
    };
  }

  return { items: [] };
}

async function resolveApiMenuItems(datasource: MDatasourceApiObject, itemsPath?: string) {
  const runtimeData = await resolveDatasourceRuntimeData(datasource);
  const matchedItems = runtimeData.matchingExternalFieldData.find((field) => field.variable === 'items')?.value;
  const rawItems = matchedItems ?? (itemsPath ? readOptionalPath(runtimeData.rawResponse, itemsPath) : undefined);

  return normalizeMenuItems(rawItems);
}

function unwrapMokelayData(value: unknown) {
  if (!isRecord(value)) return value;
  if (value.ok === true && Object.prototype.hasOwnProperty.call(value, 'data')) {
    return value.data;
  }
  return value;
}

function isTemplateObject(value: unknown): value is { template: string } {
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
        throw new Error(`Layout template path is invalid: ${path}`);
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

function readTemplatePath(context: LayoutRuntimeContext, path: string): unknown {
  const value = readOptionalPath(context, path);
  if (value === undefined) {
    throw new Error(`Layout template variable was not found: ${path}`);
  }

  return value;
}

function readOptionalPath(source: unknown, path: string) {
  const segments = tokenizePath(path.trim());
  let cursor: unknown = source;

  for (const segment of segments) {
    if (isRecord(cursor) && Object.prototype.hasOwnProperty.call(cursor, segment)) {
      cursor = cursor[segment];
      continue;
    }
    if (Array.isArray(cursor) && /^\d+$/.test(segment)) {
      cursor = cursor[Number(segment)];
      continue;
    }
    return undefined;
  }

  return cursor;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
