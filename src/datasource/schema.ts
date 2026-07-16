import { normalizeProcessors } from '@/processors/runner';
import type { ProcessorConfig } from '@/processors/types';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type JSONSchemaType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
export type JSONSchemaNodeType = JSONSchemaType | 'union';

export type JSONSchema =
  | {
      type: 'object';
      properties: Record<string, JSONSchema>;
      required?: string[];
      description?: string;
    }
  | {
      type: 'array';
      items: JSONSchema;
      description?: string;
    }
  | {
      type: 'string';
      enum?: string[];
      description?: string;
    }
  | {
      type: 'number';
      minimum?: number;
      maximum?: number;
      description?: string;
    }
  | {
      type: 'boolean';
      description?: string;
    }
  | {
      type: 'null';
    }
  | {
      anyOf: JSONSchema[];
      description?: string;
    };

export type SchemaComponentHint = 'text' | 'number' | 'switch' | 'object' | 'array';

export interface DatasourceSchemaSelection {
  path: string;
  label: string;
  type: JSONSchemaType;
  processors?: ProcessorConfig[];
}

export type DatasourceSchemaSelections = DatasourceSchemaSelection[];

export interface SchemaSelectionField extends DatasourceSchemaSelection {
  required: boolean;
  enabled: boolean;
  componentHint: SchemaComponentHint;
}

export interface SchemaTreeNode {
  path: string;
  displayPath: string;
  name: string;
  type: JSONSchemaNodeType;
  selectionType?: JSONSchemaType;
  required: boolean;
  selectable: boolean;
  componentHint: SchemaComponentHint;
  depth: number;
  children: SchemaTreeNode[];
}

export interface ArrayRecordPathOption {
  path: string;
  label: string;
}

export type JSONSchemaInferenceResult = {
  ok: true;
  schema: JSONSchema;
} | {
  ok: false;
  reason: 'emptyArray' | 'mixedArray';
};

type UnknownJSONSchema = {
  type: 'unknown';
};

type InferredJSONSchema =
  | UnknownJSONSchema
  | {
      type: 'object';
      properties: Record<string, InferredJSONSchema>;
      required?: string[];
      description?: string;
    }
  | {
      type: 'array';
      items: InferredJSONSchema;
      description?: string;
    }
  | {
      anyOf: InferredJSONSchema[];
      description?: string;
    }
  | Exclude<JSONSchema, { type: 'object' } | { type: 'array' } | { anyOf: JSONSchema[] }>;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every((item) => isJsonValue(item));
  }

  if (isRecord(value)) {
    return Object.values(value).every((item) => isJsonValue(item));
  }

  return false;
}

export function isJsonObjectValue(value: unknown): value is { [key: string]: JsonValue } {
  return isRecord(value) && isJsonValue(value);
}

export function cloneJsonValue<T extends JsonValue>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function cloneJsonSchema<T extends JSONSchema>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function clonePlainValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: string[]) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function assignDescription<T extends JSONSchema>(schema: T, description: unknown): T | undefined {
  if (description === undefined) {
    return schema;
  }

  if (typeof description !== 'string') {
    return undefined;
  }

  return {
    ...schema,
    description
  };
}

export function normalizeJSONSchema(value: unknown): JSONSchema | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (value.anyOf !== undefined) {
    if (!hasOnlyKeys(value, ['anyOf', 'description']) || !Array.isArray(value.anyOf) || !value.anyOf.length) {
      return undefined;
    }

    const anyOf: JSONSchema[] = [];
    for (const item of value.anyOf) {
      const normalizedItem = normalizeJSONSchema(item);
      if (!normalizedItem) {
        return undefined;
      }

      anyOf.push(normalizedItem);
    }

    return assignDescription({
      anyOf
    }, value.description);
  }

  if (typeof value.type !== 'string') {
    return undefined;
  }

  if (value.type === 'object') {
    if (!hasOnlyKeys(value, ['type', 'properties', 'required', 'description']) || !isRecord(value.properties)) {
      return undefined;
    }

    const properties: Record<string, JSONSchema> = {};
    for (const [key, propertyValue] of Object.entries(value.properties)) {
      const normalizedProperty = normalizeJSONSchema(propertyValue);
      if (!normalizedProperty) {
        return undefined;
      }

      properties[key] = normalizedProperty;
    }

    const schema: Extract<JSONSchema, { type: 'object' }> = {
      type: 'object',
      properties
    };

    if (value.required !== undefined) {
      if (!Array.isArray(value.required) || !value.required.every((item) => typeof item === 'string')) {
        return undefined;
      }

      schema.required = [...value.required];
    }

    return assignDescription(schema, value.description);
  }

  if (value.type === 'array') {
    if (!hasOnlyKeys(value, ['type', 'items', 'description'])) {
      return undefined;
    }

    const items = normalizeJSONSchema(value.items);
    if (!items) {
      return undefined;
    }

    return assignDescription({
      type: 'array',
      items
    }, value.description);
  }

  if (value.type === 'string') {
    if (!hasOnlyKeys(value, ['type', 'enum', 'description'])) {
      return undefined;
    }

    const schema: Extract<JSONSchema, { type: 'string' }> = {
      type: 'string'
    };

    if (value.enum !== undefined) {
      if (!Array.isArray(value.enum) || !value.enum.every((item) => typeof item === 'string')) {
        return undefined;
      }

      schema.enum = [...value.enum];
    }

    return assignDescription(schema, value.description);
  }

  if (value.type === 'number') {
    if (!hasOnlyKeys(value, ['type', 'minimum', 'maximum', 'description'])) {
      return undefined;
    }

    const schema: Extract<JSONSchema, { type: 'number' }> = {
      type: 'number'
    };

    if (value.minimum !== undefined) {
      if (typeof value.minimum !== 'number' || !Number.isFinite(value.minimum)) {
        return undefined;
      }

      schema.minimum = value.minimum;
    }

    if (value.maximum !== undefined) {
      if (typeof value.maximum !== 'number' || !Number.isFinite(value.maximum)) {
        return undefined;
      }

      schema.maximum = value.maximum;
    }

    return assignDescription(schema, value.description);
  }

  if (value.type === 'boolean') {
    if (!hasOnlyKeys(value, ['type', 'description'])) {
      return undefined;
    }

    return assignDescription({
      type: 'boolean'
    }, value.description);
  }

  if (value.type === 'null' && hasOnlyKeys(value, ['type'])) {
    return {
      type: 'null'
    };
  }

  return undefined;
}

function isUnknownJSONSchema(value: InferredJSONSchema): value is UnknownJSONSchema {
  return 'type' in value && value.type === 'unknown';
}

function isAnyOfJSONSchema(value: JSONSchema): value is Extract<JSONSchema, { anyOf: JSONSchema[] }> {
  return 'anyOf' in value;
}

function isAnyOfInferredJSONSchema(
  value: InferredJSONSchema
): value is Extract<InferredJSONSchema, { anyOf: InferredJSONSchema[] }> {
  return 'anyOf' in value;
}

function cloneInferredJSONSchema(value: InferredJSONSchema): InferredJSONSchema {
  return clonePlainValue(value);
}

function createUnknownArrayItemSchema(): UnknownJSONSchema {
  return {
    type: 'unknown'
  };
}

function createEmptyObjectSchema(): Extract<JSONSchema, { type: 'object' }> {
  return {
    type: 'object',
    properties: {}
  };
}

function toConcreteJSONSchema(value: InferredJSONSchema): JSONSchema {
  if (isUnknownJSONSchema(value)) {
    return createEmptyObjectSchema();
  }

  if (isAnyOfInferredJSONSchema(value)) {
    return {
      anyOf: value.anyOf.map((item) => toConcreteJSONSchema(item))
    };
  }

  if (value.type === 'array') {
    return {
      ...value,
      items: toConcreteJSONSchema(value.items)
    };
  }

  if (value.type === 'object') {
    const properties: Record<string, JSONSchema> = {};
    Object.entries(value.properties).forEach(([key, property]) => {
      properties[key] = toConcreteJSONSchema(property);
    });

    return {
      ...value,
      properties
    };
  }

  return cloneJsonSchema(value);
}

function flattenInferredAnyOf(value: InferredJSONSchema): InferredJSONSchema[] {
  if (isAnyOfInferredJSONSchema(value)) {
    return value.anyOf.flatMap((item) => flattenInferredAnyOf(item));
  }

  return [value];
}

function mergeSameTypeInferredJSONSchemas(
  left: InferredJSONSchema,
  right: InferredJSONSchema
): InferredJSONSchema | undefined {
  if (isUnknownJSONSchema(left)) {
    return cloneInferredJSONSchema(right);
  }

  if (isUnknownJSONSchema(right)) {
    return cloneInferredJSONSchema(left);
  }

  if (isAnyOfInferredJSONSchema(left) || isAnyOfInferredJSONSchema(right)) {
    return undefined;
  }

  if (left.type !== right.type) {
    return undefined;
  }

  if (left.type === 'object' && right.type === 'object') {
    const properties: Record<string, InferredJSONSchema> = {};
    const propertyKeys = new Set([
      ...Object.keys(left.properties),
      ...Object.keys(right.properties)
    ]);

    for (const key of propertyKeys) {
      const leftProperty = left.properties[key];
      const rightProperty = right.properties[key];

      if (leftProperty && rightProperty) {
        const mergedProperty = mergeInferredJSONSchemas(leftProperty, rightProperty);
        properties[key] = mergedProperty;
        continue;
      }

      properties[key] = cloneInferredJSONSchema((leftProperty ?? rightProperty)!);
    }

    return {
      type: 'object',
      properties
    };
  }

  if (left.type === 'array' && right.type === 'array') {
    const items = mergeInferredJSONSchemas(left.items, right.items);
    return {
      type: 'array',
      items
    };
  }

  return cloneInferredJSONSchema(left);
}

function mergeInferredAnyOfCandidates(candidates: InferredJSONSchema[]): InferredJSONSchema {
  const anyOf: InferredJSONSchema[] = [];

  candidates.flatMap((item) => flattenInferredAnyOf(item)).forEach((candidate) => {
    const mergeIndex = anyOf.findIndex((item) => mergeSameTypeInferredJSONSchemas(item, candidate) !== undefined);
    if (mergeIndex >= 0) {
      anyOf[mergeIndex] = mergeSameTypeInferredJSONSchemas(anyOf[mergeIndex], candidate)!;
      return;
    }

    anyOf.push(cloneInferredJSONSchema(candidate));
  });

  return anyOf.length === 1
    ? anyOf[0]
    : {
        anyOf
      };
}

function mergeInferredJSONSchemas(left: InferredJSONSchema, right: InferredJSONSchema): InferredJSONSchema {
  const mergedSchema = mergeSameTypeInferredJSONSchemas(left, right);
  if (mergedSchema) {
    return mergedSchema;
  }

  return mergeInferredAnyOfCandidates([left, right]);
}

function inferJSONSchemaValue(value: JsonValue): {
  ok: true;
  schema: InferredJSONSchema;
} | {
  ok: false;
  reason: 'mixedArray';
} {
  if (value === null) {
    return {
      ok: true,
      schema: {
        type: 'null'
      }
    };
  }

  if (typeof value === 'string') {
    return {
      ok: true,
      schema: {
        type: 'string'
      }
    };
  }

  if (typeof value === 'number') {
    return {
      ok: true,
      schema: {
        type: 'number'
      }
    };
  }

  if (typeof value === 'boolean') {
    return {
      ok: true,
      schema: {
        type: 'boolean'
      }
    };
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return {
        ok: true,
        schema: {
          type: 'array',
          items: createUnknownArrayItemSchema()
        }
      };
    }

    let items: InferredJSONSchema | undefined;
    for (const item of value) {
      const inferredItem = inferJSONSchemaValue(item);
      if (!inferredItem.ok) {
        return inferredItem;
      }

      if (!items) {
        items = inferredItem.schema;
        continue;
      }

      items = mergeInferredJSONSchemas(items, inferredItem.schema);
    }

    return {
      ok: true,
      schema: {
        type: 'array',
        items: items!
      }
    };
  }

  const properties: Record<string, InferredJSONSchema> = {};
  for (const [key, propertyValue] of Object.entries(value)) {
    const inferredProperty = inferJSONSchemaValue(propertyValue);
    if (!inferredProperty.ok) {
      return inferredProperty;
    }

    properties[key] = inferredProperty.schema;
  }

  return {
    ok: true,
    schema: {
      type: 'object',
      properties
    }
  };
}

export function inferJSONSchema(value: JsonValue): JSONSchemaInferenceResult {
  if (Array.isArray(value) && !value.length) {
    return {
      ok: false,
      reason: 'emptyArray'
    };
  }

  const inferredSchema = inferJSONSchemaValue(value);
  if (!inferredSchema.ok) {
    return inferredSchema;
  }

  return {
    ok: true,
    schema: toConcreteJSONSchema(inferredSchema.schema)
  };
}

function getPathWithSegment(parentPath: string, segment: string) {
  return parentPath ? `${parentPath}.${segment}` : segment;
}

function getArrayItemPath(arrayPath: string) {
  return arrayPath ? `${arrayPath}[]` : '[]';
}

export function getSchemaFieldLabel(path: string) {
  const normalizedPath = path.replace(/\[\]/g, '');
  const lastSegment = normalizedPath.split('.').filter(Boolean).pop();
  return lastSegment || path || 'root';
}

function getComponentHint(type: JSONSchemaType): SchemaComponentHint {
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'switch';
  if (type === 'object') return 'object';
  if (type === 'array') return 'array';
  return 'text';
}

function isSelectableSchemaType(type: JSONSchemaType) {
  return type === 'string' || type === 'number' || type === 'boolean' || type === 'null';
}

function getSchemaNodeType(schema: JSONSchema): JSONSchemaNodeType {
  return isAnyOfJSONSchema(schema) ? 'union' : schema.type;
}

function getNullableSchemaType(schema: JSONSchema, type: JSONSchemaType): JSONSchema | undefined {
  if (!isAnyOfJSONSchema(schema)) {
    return schema.type === type ? schema : undefined;
  }

  const nonNullSchemas = schema.anyOf.filter((item) => !(!isAnyOfJSONSchema(item) && item.type === 'null'));
  if (nonNullSchemas.length !== 1) {
    return undefined;
  }

  const [nonNullSchema] = nonNullSchemas;
  return !isAnyOfJSONSchema(nonNullSchema) && nonNullSchema.type === type ? nonNullSchema : undefined;
}

function getObjectSchema(schema: JSONSchema | undefined): Extract<JSONSchema, { type: 'object' }> | undefined {
  if (!schema) {
    return undefined;
  }

  const objectSchema = getNullableSchemaType(schema, 'object');
  return objectSchema && !isAnyOfJSONSchema(objectSchema) && objectSchema.type === 'object'
    ? objectSchema
    : undefined;
}

function getArraySchema(schema: JSONSchema | undefined): Extract<JSONSchema, { type: 'array' }> | undefined {
  if (!schema) {
    return undefined;
  }

  const arraySchema = getNullableSchemaType(schema, 'array');
  return arraySchema && !isAnyOfJSONSchema(arraySchema) && arraySchema.type === 'array'
    ? arraySchema
    : undefined;
}

function getSelectableSchemaType(schema: JSONSchema): JSONSchemaType | undefined {
  if (!isAnyOfJSONSchema(schema)) {
    return isSelectableSchemaType(schema.type) ? schema.type : undefined;
  }

  const nonNullSchemas = schema.anyOf.filter((item) => !(!isAnyOfJSONSchema(item) && item.type === 'null'));
  if (nonNullSchemas.length !== 1) {
    return undefined;
  }

  const [nonNullSchema] = nonNullSchemas;
  return !isAnyOfJSONSchema(nonNullSchema) && isSelectableSchemaType(nonNullSchema.type)
    ? nonNullSchema.type
    : undefined;
}

function createSelectionField(node: SchemaTreeNode, enabled: boolean, label = getSchemaFieldLabel(node.path)): SchemaSelectionField {
  const selectionType = node.selectionType ?? (node.type === 'union' ? undefined : node.type);
  if (!selectionType) {
    throw new TypeError('Schema tree node is not selectable.');
  }

  return {
    path: node.path,
    label,
    type: selectionType,
    required: node.required,
    enabled,
    componentHint: node.componentHint
  };
}

function createContainerSelectionField(
  path: string,
  type: Extract<JSONSchemaType, 'object' | 'array'>,
  required = false
): SchemaSelectionField {
  return {
    path,
    label: getSchemaFieldLabel(path),
    type,
    required,
    enabled: false,
    componentHint: getComponentHint(type)
  };
}

function markSchemaTreeNodeUnselectable(node: SchemaTreeNode): SchemaTreeNode {
  return {
    ...node,
    selectable: false,
    selectionType: undefined,
    children: node.children.map((child) => markSchemaTreeNodeUnselectable(child))
  };
}

export function getSchemaTreeNodes(schema?: JSONSchema, rootPath = '', depth = 0, required = false): SchemaTreeNode[] {
  if (!schema) {
    return [];
  }

  const selectionType = getSelectableSchemaType(schema);
  const nodeType = getSchemaNodeType(schema);
  const name = rootPath ? getSchemaFieldLabel(rootPath) : 'root';
  const node: SchemaTreeNode = {
    path: rootPath,
    displayPath: rootPath || 'root',
    name,
    type: nodeType,
    ...(selectionType ? { selectionType } : {}),
    required,
    selectable: Boolean(selectionType),
    componentHint: getComponentHint(selectionType ?? (nodeType === 'union' ? 'string' : nodeType)),
    depth,
    children: []
  };

  if (isAnyOfJSONSchema(schema)) {
    node.children = schema.anyOf.flatMap((item, index) =>
      getSchemaTreeNodes(item, `${rootPath || 'root'}.anyOf[${index}]`, depth + 1, required)
        .map((child) => markSchemaTreeNodeUnselectable(child))
    );
  } else if (schema.type === 'object') {
    const requiredFields = new Set(schema.required ?? []);
    node.children = Object.entries(schema.properties).flatMap(([key, value]) =>
      getSchemaTreeNodes(value, getPathWithSegment(rootPath, key), depth + 1, requiredFields.has(key))
    );
  } else if (schema.type === 'array') {
    const itemPath = getArrayItemPath(rootPath);
    node.children = getSchemaTreeNodes(schema.items, itemPath, depth + 1, required);
  }

  return [node];
}

export function flattenSchemaTree(nodes: SchemaTreeNode[]): SchemaTreeNode[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenSchemaTree(node.children)
  ]);
}

export function getArrayRecordOptions(schema?: JSONSchema): ArrayRecordPathOption[] {
  if (!schema) {
    return [];
  }

  const options: ArrayRecordPathOption[] = [];
  const seenPaths = new Set<string>();

  function addOption(path: string) {
    if (seenPaths.has(path)) {
      return;
    }

    seenPaths.add(path);
    options.push({
      path,
      label: path ? `${path}[]` : 'root[]'
    });
  }

  function walk(value: JSONSchema, path: string) {
    const arraySchema = getArraySchema(value);
    if (arraySchema) {
      addOption(path);
      walk(arraySchema.items, getArrayItemPath(path));
      return;
    }

    const objectSchema = getObjectSchema(value);
    if (!objectSchema) {
      return;
    }

    Object.entries(objectSchema.properties).forEach(([key, property]) => {
      walk(property, getPathWithSegment(path, key));
    });
  }

  walk(schema, '');
  return options;
}

function readSchemaAtRecordPath(schema: JSONSchema | undefined, recordPath: string): JSONSchema | undefined {
  if (!schema) {
    return undefined;
  }

  if (!recordPath) {
    return getArraySchema(schema)?.items;
  }

  const segments = recordPath.split('.').filter(Boolean);
  let current: JSONSchema | undefined = schema;

  for (const segment of segments) {
    const objectSchema = getObjectSchema(current);
    if (!objectSchema) {
      return undefined;
    }

    current = objectSchema.properties[segment];
  }

  return getArraySchema(current)?.items;
}

function getLeafNodes(schema: JSONSchema | undefined, pathPrefix = '', includeRoot = false) {
  return flattenSchemaTree(getSchemaTreeNodes(schema, pathPrefix))
    .filter((node) => (includeRoot || node.path !== pathPrefix) && node.selectable);
}

function getNestedArraySelectionFields(schema: JSONSchema | undefined, pathPrefix: string) {
  const fields: SchemaSelectionField[] = [];

  function walk(value: JSONSchema, path: string, required: boolean) {
    const arraySchema = getArraySchema(value);
    if (arraySchema) {
      const itemPath = getArrayItemPath(path);
      fields.push(createContainerSelectionField(itemPath, 'array', required));
      walk(arraySchema.items, itemPath, required);
      return;
    }

    const objectSchema = getObjectSchema(value);
    if (!objectSchema) {
      return;
    }

    const requiredFields = new Set(objectSchema.required ?? []);
    Object.entries(objectSchema.properties).forEach(([key, property]) => {
      walk(property, getPathWithSegment(path, key), requiredFields.has(key));
    });
  }

  const objectSchema = getObjectSchema(schema);
  if (objectSchema) {
    const requiredFields = new Set(objectSchema.required ?? []);
    Object.entries(objectSchema.properties).forEach(([key, property]) => {
      walk(property, getPathWithSegment(pathPrefix, key), requiredFields.has(key));
    });
  }

  return fields;
}

export function getSchemaSelectionFieldsForList(schema: JSONSchema | undefined, recordPath: string): SchemaSelectionField[] {
  const recordSchema = readSchemaAtRecordPath(schema, recordPath);
  const pathPrefix = recordPath ? `${recordPath}[]` : '[]';
  const nestedArrayFields = getNestedArraySelectionFields(recordSchema, pathPrefix);
  const nestedArrayPaths = new Set(nestedArrayFields.map((field) => field.path));
  const fields = [
    ...nestedArrayFields,
    ...getLeafNodes(recordSchema, pathPrefix, true)
      .map((node) => createSelectionField(node, false))
      .filter((field) => !nestedArrayPaths.has(field.path))
  ];

  if (!getObjectSchema(recordSchema)) {
    return fields;
  }

  const recordNode = flattenSchemaTree(getSchemaTreeNodes(schema))
    .find((node) => node.path === recordPath);
  return [
    createContainerSelectionField(pathPrefix, 'array', recordNode?.required),
    ...fields
  ];
}

export function getSchemaSelectionFieldsForForm(schema: JSONSchema | undefined): SchemaSelectionField[] {
  const sourceSchema = getArraySchema(schema)?.items ?? schema;
  const sourceObjectSchema = getObjectSchema(sourceSchema);
  if (!sourceObjectSchema) {
    return [];
  }

  const fields: SchemaSelectionField[] = [];

  function walk(value: JSONSchema, path: string, required: boolean) {
    const selectionType = getSelectableSchemaType(value);
    if (selectionType) {
      fields.push(createSelectionField({
        path,
        displayPath: path,
        name: getSchemaFieldLabel(path),
        type: isAnyOfJSONSchema(value) ? 'union' : value.type,
        selectionType,
        required,
        selectable: true,
        componentHint: getComponentHint(selectionType),
        depth: 0,
        children: []
      }, false));
      return;
    }

    const objectSchema = getObjectSchema(value);
    if (!objectSchema) {
      return;
    }

    fields.push(createContainerSelectionField(path, 'object', required));

    const requiredFields = new Set(objectSchema.required ?? []);
    Object.entries(objectSchema.properties).forEach(([key, property]) => {
      walk(property, getPathWithSegment(path, key), requiredFields.has(key));
    });
  }

  Object.entries(sourceObjectSchema.properties).forEach(([key, property]) => {
    walk(property, key, (sourceObjectSchema.required ?? []).includes(key));
  });

  return fields;
}

function normalizeSchemaSelection(value: unknown): DatasourceSchemaSelection | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const path = typeof value.path === 'string' ? value.path.trim() : '';
  if (!path) {
    return undefined;
  }

  const type = (
    value.type === 'object' ||
    value.type === 'array' ||
    value.type === 'string' ||
    value.type === 'number' ||
    value.type === 'boolean' ||
    value.type === 'null'
  )
    ? value.type
    : undefined;
  if (!type) {
    return undefined;
  }

  const label = typeof value.label === 'string' && value.label.trim()
    ? value.label.trim()
    : getSchemaFieldLabel(path);

  const processors = normalizeProcessors(value.processors);
  return {
    path,
    label,
    type,
    ...(processors.length ? { processors } : {})
  };
}

function getDefaultRecordPath(schema?: JSONSchema) {
  const options = getArrayRecordOptions(schema);
  const firstOptionWithFields = options.find((option) =>
    getSchemaSelectionFieldsForList(schema, option.path).some((field) => field.type !== 'array')
  );

  return firstOptionWithFields?.path ?? options[0]?.path ?? '';
}

export function getSchemaSelectionFields(schema?: JSONSchema): SchemaSelectionField[] {
  if (!schema) {
    return [];
  }

  const fieldsByPath = new Map<string, SchemaSelectionField>();
  const recordOptions = getArrayRecordOptions(schema);
  if (recordOptions.length) {
    getSchemaSelectionFieldsForList(schema, getDefaultRecordPath(schema)).forEach((field) => {
      fieldsByPath.set(field.path, field);
    });
  }
  getSchemaSelectionFieldsForForm(schema).forEach((field) => {
    if (!fieldsByPath.has(field.path)) {
      fieldsByPath.set(field.path, field);
    }
  });
  return [...fieldsByPath.values()];
}

export function reconcileSchemaSelections(
  schema: JSONSchema | undefined,
  previous: unknown
): DatasourceSchemaSelections {
  if (!schema) {
    return [];
  }

  const availableFields = new Map(getSchemaSelectionFields(schema).map((field) => [field.path, field]));
  return normalizeSchemaSelections(previous).flatMap((selection) => {
    const availableField = availableFields.get(selection.path);
    return availableField
      ? [{ ...selection, type: availableField.type }]
      : [];
  });
}

export function normalizeSchemaSelections(value: unknown): DatasourceSchemaSelections {
  if (!Array.isArray(value)) {
    return [];
  }

  const selectionsByPath = new Map<string, DatasourceSchemaSelection>();
  value.forEach((item) => {
    const selection = normalizeSchemaSelection(item);
    if (selection) {
      selectionsByPath.set(selection.path, selection);
    }
  });
  return [...selectionsByPath.values()];
}
