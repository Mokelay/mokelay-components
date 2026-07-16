import type { MokelayBlock } from '@/blocks/types';
import { requireMokelayCapability } from '@/runtime/adapter';
import {
  normalizePageDataSources,
  type PageDataSourceConfig
} from '@/pages/runtimeContext';

export type PageSource = 'user' | 'system';

export type MokelayPage = {
  uuid: string;
  name: string;
  blocks: MokelayBlock[];
  dataSources?: PageDataSourceConfig[];
  appUuid?: string | null;
  layoutUuid?: string | null;
  subPage: boolean;
  quotes: string[];
  dependencies: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type MokelayPageLoader = (uuid: string) => Promise<unknown>;

export async function loadMokelayPage(uuid: string, source: PageSource = 'user'): Promise<MokelayPage> {
  const loader = source === 'system'
    ? requireMokelayCapability('getSystemPage')
    : requireMokelayCapability('getPage');
  return normalizeMokelayPage(await loader(uuid));
}

export function normalizeMokelayPage(page: unknown): MokelayPage {
  if (!isRecord(page)) {
    throw new Error('Invalid page response.');
  }

  const uuid = readString(page.uuid) ?? '';
  if (!uuid) {
    throw new Error('Invalid page response.');
  }

  return {
    uuid,
    name: readString(page.name) ?? '',
    blocks: Array.isArray(page.blocks) ? page.blocks as MokelayBlock[] : [],
    dataSources: normalizePageDataSources(page.dataSources ?? page.data_sources),
    appUuid: readString(page.appUuid) ?? readString(page.app_uuid) ?? null,
    layoutUuid: readString(page.layoutUuid) ?? readString(page.layout_uuid) ?? null,
    subPage: readBoolean(page.subPage ?? page.sub_page),
    quotes: normalizePageUuidList(page.quotes),
    dependencies: normalizePageUuidList(page.dependencies),
    createdAt: readString(page.createdAt) ?? readString(page.created_at),
    updatedAt: readString(page.updatedAt) ?? readString(page.updated_at)
  };
}

export function normalizePageUuidList(value: unknown): string[] {
  const parsed = typeof value === 'string' ? parseJsonArray(value) : value;
  if (!Array.isArray(parsed)) return [];

  return [...new Set(parsed
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean))];
}

function parseJsonArray(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function readBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    return ['1', 'true', 'yes'].includes(value.trim().toLowerCase());
  }
  return false;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
