import type { MokelayBlock } from '@/blocks/types';
import { normalizePageDataSources, type PageDataSourceConfig } from '@/pages/runtimeContext';
import {
  normalizeLocalizedTextValue,
  normalizePageLocaleConfig,
  type LocalizedTextValue,
  type PageLocaleConfig
} from '@/runtime/localization';

export type LocalizedLayoutText = LocalizedTextValue;

export type LayoutMenuItem = {
  label: LocalizedLayoutText;
  href: string;
  active?: boolean;
  badge?: LocalizedLayoutText;
  caret?: boolean;
  highlight?: boolean;
  tone?: string;
  children?: LayoutMenuItem[];
  [key: string]: unknown;
};

export type ResolvedLayoutMenuItem = {
  label: string;
  href: string;
  active?: boolean;
  badge?: string;
  caret?: boolean;
  highlight?: boolean;
  tone?: string;
  children?: ResolvedLayoutMenuItem[];
};

export type StaticMenuResource = {
  type: 'static';
  items: LayoutMenuItem[];
};

export type ApiDatasourceMenuResource = {
  type: 'api';
  ds?: Record<string, unknown>;
  itemsPath?: string;
};

export type LayoutResource = StaticMenuResource | ApiDatasourceMenuResource;

export type LayoutBlock = {
  id?: string;
  type: string;
  data?: Record<string, unknown>;
  events?: unknown[];
  slots?: Record<string, LayoutBlock[]>;
};

export type MokelayLayout = {
  schemaVersion: 1;
  uuid: string;
  name: string;
  localeConfig?: PageLocaleConfig;
  resources?: {
    mainMenu?: LayoutResource;
    [key: string]: LayoutResource | undefined;
  };
  auth?: {
    enabled: boolean;
    endpoint?: string;
  };
  blocks: LayoutBlock[];
  createdAt?: string;
  updatedAt?: string;
};

export type RenderBundlePage = {
  uuid: string;
  name: string;
  blocks: MokelayBlock[];
  dataSources?: PageDataSourceConfig[];
  localeConfig?: PageLocaleConfig;
  appUuid?: string | null;
  layoutUuid?: string | null;
  subPage: boolean;
  quotes: string[];
  dependencies: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type PageRenderBundle = {
  page: RenderBundlePage | null;
  layout: MokelayLayout | null;
};

export function normalizeLayoutJson(value: unknown, fallbackUuid = '', fallbackName = ''): MokelayLayout {
  const source = isRecord(value) ? value : {};
  const uuid = readString(source.uuid) || fallbackUuid;
  const name = readString(source.name) || fallbackName;

  return {
    schemaVersion: 1,
    ...cloneRecord(source),
    uuid,
    name,
    localeConfig: normalizePageLocaleConfig(source.localeConfig ?? source.locale_config),
    resources: normalizeResources(source.resources),
    auth: normalizeAuth(source.auth),
    blocks: normalizeLayoutBlocks(source.blocks)
  };
}

export function normalizeSystemLayout(value: unknown): MokelayLayout {
  if (isRecord(value) && (isRecord(value.layoutJson) || isRecord(value.layout_json))) {
    const uuid = readString(value.uuid) ?? '';
    const name = readString(value.name) ?? '';
    const createdAt = readString(value.createdAt) ?? readString(value.created_at);
    const updatedAt = readString(value.updatedAt) ?? readString(value.updated_at);
    return {
      ...normalizeLayoutJson(value.layoutJson ?? value.layout_json, uuid, name),
      createdAt,
      updatedAt
    };
  }

  return normalizeLayoutJson(value);
}

export function normalizeMenuItems(value: unknown): LayoutMenuItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => {
      const normalized: LayoutMenuItem = {
        ...cloneRecord(item),
        label: normalizeLocalizedTextValue(item.label ?? item.name),
        href: readString(item.href) || readString(item.url) || '#',
        active: item.active === true,
        children: normalizeMenuItems(item.children)
      };
      const badge = normalizeLocalizedTextValue(item.badge);
      const tone = readString(item.tone);

      if (badge) normalized.badge = badge;
      if (typeof item.caret === 'boolean') normalized.caret = item.caret;
      if (item.highlight === true) normalized.highlight = true;
      if (tone) normalized.tone = tone;

      return normalized;
    })
    .filter((item) => typeof item.label !== 'string' || Boolean(item.label));
}

export function normalizeRenderBundlePage(value: unknown): RenderBundlePage | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) {
    throw new Error('Invalid page bundle response.');
  }

  const uuid = readString(value.uuid);
  if (!uuid) {
    throw new Error('Invalid page bundle response.');
  }

  return {
    uuid,
    name: readString(value.name) || '',
    blocks: Array.isArray(value.blocks) ? value.blocks as MokelayBlock[] : [],
    dataSources: normalizePageDataSources(value.dataSources ?? value.data_sources),
    localeConfig: normalizePageLocaleConfig(value.localeConfig ?? value.locale_config),
    appUuid: readString(value.appUuid) ?? readString(value.app_uuid) ?? null,
    layoutUuid: readString(value.layoutUuid) ?? readString(value.layout_uuid) ?? null,
    subPage: readBoolean(value.subPage ?? value.sub_page),
    quotes: normalizeStringArray(value.quotes),
    dependencies: normalizeStringArray(value.dependencies),
    createdAt: readString(value.createdAt) ?? readString(value.created_at),
    updatedAt: readString(value.updatedAt) ?? readString(value.updated_at)
  };
}

export function normalizePageRenderBundle(value: unknown): PageRenderBundle {
  if (!isRecord(value)) {
    throw new Error('Invalid page render bundle response.');
  }

  return {
    page: normalizeRenderBundlePage(value.page),
    layout: value.layout === null || value.layout === undefined
      ? null
      : normalizeLayoutJson(value.layout)
  };
}

function normalizeResources(value: unknown): MokelayLayout['resources'] | undefined {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value)
    .map(([key, resource]) => [key, normalizeResource(resource)] as const)
    .filter((entry): entry is readonly [string, LayoutResource] => Boolean(entry[1]));

  return entries.length ? Object.fromEntries(entries) : undefined;
}

function normalizeResource(value: unknown): LayoutResource | undefined {
  if (!isRecord(value)) return undefined;

  if (value.type === 'static') {
    return {
      type: 'static',
      items: normalizeMenuItems(value.items)
    };
  }

  if (value.type === 'api') {
    return {
      type: 'api',
      ds: isRecord(value.ds) ? cloneRecord(value.ds) : undefined,
      itemsPath: readString(value.itemsPath)
    };
  }

  return undefined;
}

function normalizeAuth(value: unknown): MokelayLayout['auth'] | undefined {
  if (!isRecord(value)) return undefined;

  return {
    enabled: value.enabled === true,
    endpoint: readString(value.endpoint) || '/api/mokelay/me'
  };
}

function normalizeLayoutBlocks(value: unknown): LayoutBlock[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((block): block is Record<string, unknown> => isRecord(block))
    .map((block) => ({
      id: readString(block.id),
      type: readString(block.type) || 'unknown',
      data: isRecord(block.data) ? cloneRecord(block.data) : {},
      events: Array.isArray(block.events) ? cloneValue(block.events) : undefined,
      slots: normalizeLayoutBlockSlots(block.slots)
    }));
}

function normalizeLayoutBlockSlots(value: unknown): Record<string, LayoutBlock[]> | undefined {
  if (!isRecord(value)) return undefined;

  const entries = Object.entries(value)
    .map(([slotName, blocks]) => [slotName, normalizeLayoutBlocks(blocks)] as const)
    .filter((entry): entry is readonly [string, LayoutBlock[]] => entry[1].length > 0);

  return entries.length ? Object.fromEntries(entries) : undefined;
}

function normalizeStringArray(value: unknown): string[] {
  let source = value;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source) as unknown;
    } catch {
      source = [];
    }
  }
  if (!Array.isArray(source)) return [];
  return [...new Set(source
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean))];
}

function readBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return typeof value === 'string' && ['1', 'true', 'yes'].includes(value.trim().toLowerCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function cloneValue<T>(value: T): T {
  if (value === undefined || value === null || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneRecord(value: Record<string, unknown>) {
  return cloneValue(value);
}
