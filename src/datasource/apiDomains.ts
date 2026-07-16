import { apiClient } from '@/composables/useApi';

export const DEFAULT_API_DOMAIN_UUID = 'mokelay';

export type ApiDomainRecord = {
  uuid: string;
  alias: string;
  host: string;
};

export type ApiDomainErrorCode =
  | 'missingApiDomain'
  | 'apiDomainNotFound'
  | 'invalidApiDomainList';

export class ApiDomainError extends Error {
  readonly code: ApiDomainErrorCode;

  constructor(code: ApiDomainErrorCode, message: string) {
    super(message);
    this.name = 'ApiDomainError';
    this.code = code;
  }
}

type ApiDomainsResponse = {
  domains?: unknown;
};

type MokelaySuccessResponse<T> = {
  ok: true;
  data: T;
};

type MokelayErrorResponse = {
  ok: false;
  error?: {
    code?: unknown;
    message?: unknown;
  };
};

type MokelayApiResponse<T> = MokelaySuccessResponse<T> | MokelayErrorResponse;

let cachedApiDomains: ApiDomainRecord[] | undefined;
let pendingApiDomains: Promise<ApiDomainRecord[]> | undefined;

export async function listApiDomains(force = false) {
  if (!force && cachedApiDomains) {
    return cachedApiDomains;
  }

  if (!force && pendingApiDomains) {
    return await pendingApiDomains;
  }

  pendingApiDomains = fetchApiDomains();

  try {
    cachedApiDomains = await pendingApiDomains;
    return cachedApiDomains;
  } finally {
    pendingApiDomains = undefined;
  }
}

export function getCachedApiDomains() {
  return cachedApiDomains ?? [];
}

export function normalizeApiDomainHost(value: string) {
  const host = value.trim().replace(/\/+$/, '');

  try {
    const url = new URL(host);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Unsupported protocol.');
    }
  } catch {
    throw new ApiDomainError('invalidApiDomainList', `API domain host must be an http(s) URL: ${value}`);
  }

  return host;
}

export function findApiDomainByUuid(uuid: string, list: ApiDomainRecord[] = getCachedApiDomains()) {
  const normalizedUuid = uuid.trim();
  return list.find((item) => item.uuid === normalizedUuid);
}

export function findApiDomainUuidByHost(host: string, list: ApiDomainRecord[] = getCachedApiDomains()) {
  const normalizedHost = normalizeApiDomainHostSafe(host);
  if (!normalizedHost) {
    return '';
  }

  return list.find((item) => item.host === normalizedHost)?.uuid ?? '';
}

export function normalizeApiDomainUuid(value: unknown, list: ApiDomainRecord[] = getCachedApiDomains()) {
  if (typeof value !== 'string') {
    return '';
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return '';
  }

  return findApiDomainByUuid(normalizedValue, list)?.uuid ||
    findApiDomainUuidByHost(normalizedValue, list);
}

export function getDefaultApiDomainUuid(list: ApiDomainRecord[] = getCachedApiDomains()) {
  return findApiDomainByUuid(DEFAULT_API_DOMAIN_UUID, list)?.uuid ?? list[0]?.uuid ?? '';
}

export async function resolveApiDomainHost(value: string) {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    throw new ApiDomainError('missingApiDomain', 'API domain is required.');
  }

  const directHost = normalizeApiDomainHostSafe(normalizedValue);
  if (directHost) {
    return directHost;
  }

  const list = await listApiDomains();
  const matchedByUuid = findApiDomainByUuid(normalizedValue, list);
  if (matchedByUuid) {
    return matchedByUuid.host;
  }

  const matchedUuid = findApiDomainUuidByHost(normalizedValue, list);
  if (matchedUuid) {
    return findApiDomainByUuid(matchedUuid, list)?.host ?? '';
  }

  throw new ApiDomainError('apiDomainNotFound', `API domain not found: ${value}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeApiDomainHostSafe(value: string) {
  try {
    return normalizeApiDomainHost(value);
  } catch {
    return '';
  }
}

function normalizeApiDomainRecord(value: unknown): ApiDomainRecord | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const uuid = readString(value.uuid);
  const alias = readString(value.alias);
  const host = normalizeApiDomainHostSafe(readString(value.host));

  if (!uuid || !alias || !host) {
    return undefined;
  }

  return {
    uuid,
    alias,
    host
  };
}

function normalizeApiDomainsResponse(value: ApiDomainsResponse) {
  if (!Array.isArray(value.domains)) {
    throw new ApiDomainError('invalidApiDomainList', 'API domain list must be an array.');
  }

  const seenUuids = new Set<string>();
  const seenHosts = new Set<string>();
  const domains: ApiDomainRecord[] = [];

  value.domains.forEach((item) => {
    const domain = normalizeApiDomainRecord(item);
    if (!domain || seenUuids.has(domain.uuid) || seenHosts.has(domain.host)) {
      return;
    }

    seenUuids.add(domain.uuid);
    seenHosts.add(domain.host);
    domains.push(domain);
  });

  if (!domains.length) {
    throw new ApiDomainError('invalidApiDomainList', 'API domain list must include at least one item.');
  }

  return domains;
}

function unwrapApiResponse<T>(value: MokelayApiResponse<T>): T {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid API response.');
  }

  if (value.ok === true) {
    return value.data;
  }

  if (value.ok === false) {
    const code = typeof value.error?.code === 'string' ? value.error.code : '';
    const message = typeof value.error?.message === 'string' ? value.error.message : '';
    throw new Error(message || code || 'API request failed.');
  }

  throw new Error('Invalid API response.');
}

async function fetchApiDomains() {
  const response = await apiClient.get<MokelayApiResponse<ApiDomainsResponse>>('/api/mokelay/list_api_domains');
  return normalizeApiDomainsResponse(unwrapApiResponse(response.data));
}
