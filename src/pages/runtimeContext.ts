import type { ComputedRef, InjectionKey } from 'vue';
import type { MDatasourceApiObject } from '@/datasource/datasource';
import {
  resolveDatasourceRuntimeData,
  type DatasourceRuntimeData
} from '@/datasource/runtime';
import { readRuntimePath, type VariableValueResolveContext } from '@/runtime/variableValue';
import type { PageLocaleConfig } from '@/runtime/localization';

export type PageRuntimeContext = Record<string, unknown>;
export type PageRuntimeData = Record<string, unknown>;

export type PageContextDataSourceConfig = {
  key: string;
  type: 'context';
  path?: string;
  defaultValue?: unknown;
};

export type PageStaticDataSourceConfig = {
  key: string;
  type: 'static';
  value?: unknown;
  defaultValue?: unknown;
};

export type PageDatasourceDataSourceConfig = {
  key: string;
  type: 'datasource';
  ds: MDatasourceApiObject;
  defaultValue?: unknown;
};

export type PageDataSourceConfig =
  | PageContextDataSourceConfig
  | PageStaticDataSourceConfig
  | PageDatasourceDataSourceConfig;

export const PageRuntimeContextKey: InjectionKey<ComputedRef<PageRuntimeContext>> = Symbol('PageRuntimeContext');
export const PageRuntimeDataKey: InjectionKey<ComputedRef<PageRuntimeData>> = Symbol('PageRuntimeData');
export const PageRuntimeVariableContextKey: InjectionKey<ComputedRef<VariableValueResolveContext>> = Symbol('PageRuntimeVariableContext');
export const PageLocaleConfigKey: InjectionKey<ComputedRef<PageLocaleConfig>> = Symbol('PageLocaleConfig');

export function isPageRuntimeRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizePageDataSources(value: unknown): PageDataSourceConfig[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): PageDataSourceConfig[] => {
    if (!isPageRuntimeRecord(item)) return [];

    const key = normalizeOptionalString(item.key);
    if (!key) return [];

    const type = normalizePageDataSourceType(item);
    const base = {
      key,
      ...(Object.prototype.hasOwnProperty.call(item, 'defaultValue')
        ? { defaultValue: cloneRuntimeValue(item.defaultValue) }
        : {})
    };

    if (type === 'context') {
      return [{
        ...base,
        type,
        ...(normalizeOptionalString(item.path) ? { path: normalizeOptionalString(item.path) } : {})
      }];
    }

    if (type === 'static') {
      return [{
        ...base,
        type,
        value: cloneRuntimeValue(item.value)
      }];
    }

    const datasource = isPageRuntimeRecord(item.ds)
      ? item.ds
      : isPageRuntimeRecord(item.datasource)
        ? item.datasource
        : undefined;
    if (!datasource) return [];

    return [{
      ...base,
      type,
      ds: cloneRuntimeValue(datasource) as unknown as MDatasourceApiObject
    }];
  });
}

export async function resolvePageDataSources(
  dataSources: PageDataSourceConfig[],
  context: PageRuntimeContext,
  options?: {
    variableContext?: VariableValueResolveContext;
  }
): Promise<PageRuntimeData> {
  const pageData: PageRuntimeData = {};

  for (const source of dataSources) {
    try {
      const value = await resolvePageDataSource(source, context, pageData, options?.variableContext);
      pageData[source.key] = cloneRuntimeValue(value === undefined ? source.defaultValue : value);
    } catch (error) {
      if (source.defaultValue !== undefined) {
        pageData[source.key] = cloneRuntimeValue(source.defaultValue);
        continue;
      }

      const message = error instanceof Error && error.message ? error.message : '数据源加载失败';
      throw new Error(`页面数据源 "${source.key}" 加载失败：${message}`);
    }
  }

  return pageData;
}

export function readPageRuntimePath(source: unknown, path?: string): unknown {
  return readRuntimePath(source, path);
}

function normalizePageDataSourceType(value: Record<string, unknown>): PageDataSourceConfig['type'] {
  if (value.type === 'context' || value.type === 'static' || value.type === 'datasource') {
    return value.type;
  }

  if (isPageRuntimeRecord(value.ds) || isPageRuntimeRecord(value.datasource)) {
    return 'datasource';
  }

  if (Object.prototype.hasOwnProperty.call(value, 'value')) {
    return 'static';
  }

  return 'context';
}

async function resolvePageDataSource(
  source: PageDataSourceConfig,
  context: PageRuntimeContext,
  pageData: PageRuntimeData,
  variableContext?: VariableValueResolveContext
): Promise<unknown> {
  if (source.type === 'context') {
    return readPageRuntimePath(context, source.path);
  }

  if (source.type === 'static') {
    return source.value;
  }

  const runtimeData = await resolveDatasourceRuntimeData(source.ds, {
    variableContext: {
      ...(variableContext ?? {}),
      context,
      pageData,
      dataSources: pageData,
      ...pageData
    }
  });
  return buildDatasourcePageData(runtimeData);
}

function buildDatasourcePageData(runtimeData: DatasourceRuntimeData) {
  const selectionsByPath = Object.fromEntries(
    runtimeData.schemaSelectionData.map((field) => [field.path, field.value])
  );
  const selectionsByLabel = Object.fromEntries(
    runtimeData.schemaSelectionData.flatMap((field): Array<[string, unknown]> => (
      field.label ? [[field.label, field.value]] : []
    ))
  );
  const matched = Object.fromEntries(
    runtimeData.matchingExternalFieldData.flatMap((field): Array<[string, unknown]> => (
      field.variable ? [[field.variable, field.value]] : []
    ))
  );

  return {
    rawResponse: runtimeData.rawResponse,
    schemaSelections: runtimeData.schemaSelectionData,
    selectionsByPath,
    selectionsByLabel,
    matchingExternalFields: runtimeData.matchingExternalFieldData,
    matched,
    ...matched
  };
}

function normalizeOptionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function cloneRuntimeValue<T>(value: T): T {
  if (value === undefined || value === null || typeof value !== 'object') return value;

  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}
