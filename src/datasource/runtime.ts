import { previewSchemaSelection } from '@/processors';
import {
  $remote as resolveDatasourceRemote,
  normalizeDatasource,
  normalizeDatasourceMatchingExternalFields,
  type DatasourceRequestOptions,
  type DatasourceSchemaSelections,
  type JsonValue,
  type MDatasourceApiObject,
  type MDatasourceMatchingExternalField
} from '@/datasource/datasource';

export type DatasourceRuntimeSchemaSelectionData = DatasourceSchemaSelections[number] & {
  value: JsonValue;
};

export type DatasourceRuntimeMatchingExternalFieldData = MDatasourceMatchingExternalField & {
  value?: JsonValue;
};

export type DatasourceRuntimeData = {
  rawResponse: JsonValue;
  schemaSelectionData: DatasourceRuntimeSchemaSelectionData[];
  matchingExternalFieldData: DatasourceRuntimeMatchingExternalFieldData[];
};

function mokelayFailureMessage(value: unknown) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return '';
  const response = value as Record<string, unknown>;
  if (response.ok !== false) return '';
  const error = typeof response.error === 'object' && response.error !== null && !Array.isArray(response.error)
    ? response.error as Record<string, unknown>
    : {};
  return typeof error.message === 'string' && error.message.trim()
    ? error.message.trim()
    : '接口请求失败。';
}

export async function resolveDatasourceRuntimeData(
  value: MDatasourceApiObject,
  options?: DatasourceRequestOptions
): Promise<DatasourceRuntimeData> {
  const datasource = normalizeDatasource(value);
  const rawResponse = await resolveDatasourceRemote(datasource, options);
  const failureMessage = mokelayFailureMessage(rawResponse);
  if (failureMessage) {
    throw new Error(failureMessage);
  }
  const schemaSelections = datasource.schemaSelections ?? [];
  const schemaSelectionData = schemaSelections.map((selection) => ({
    ...selection,
    value: previewSchemaSelection(rawResponse, selection).finalValue
  }));
  const schemaSelectionDataByPath = new Map(schemaSelectionData.map((field) => [field.path, field.value]));
  const matchingExternalFields = datasource.type === 'API'
    ? normalizeDatasourceMatchingExternalFields(datasource.matchingExternalFields)
    : [];

  return {
    rawResponse,
    schemaSelectionData,
    matchingExternalFieldData: matchingExternalFields.map((field) => ({
      ...field,
      value: field.matchFieldPath ? schemaSelectionDataByPath.get(field.matchFieldPath) : undefined
    }))
  };
}
