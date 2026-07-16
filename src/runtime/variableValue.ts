import { applyProcessors, normalizeProcessors } from '@/processors';
import type { ProcessorConfig } from '@/processors';

export type VariableValueDataType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export type VariableOption = {
  name: string;
  label: string;
  type: VariableValueDataType;
};

export type BlockDataField = {
  label: string;
  variable: string;
  dataType: VariableValueDataType;
};

export type BlockDataSource = {
  blockId: string;
  blockType: string;
  blockLabel: string;
  fields: BlockDataField[];
};

export type GetAvailableBlockDataSources = (excludeBlockId?: string) => BlockDataSource[];

export type PageVariableSource = {
  pageId: string;
  pageLabel: string;
};

export type GetAvailablePageVariableSources = () => PageVariableSource[];

export type VariableValueInputConfig = {
  mode: 'input';
  value: string;
};

export type VariableValueSource = 'Block' | 'MPage' | 'Cookie' | 'localStorage' | 'sessionStorage';

export type VariableValueVariableConfig = {
  mode: 'variable';
  source?: VariableValueSource;
  blockId?: string;
  blockType?: string;
  pageId?: string;
  variable: string;
  processors?: ProcessorConfig[];
};

export type VariableFlowConditionOperator = 'EQ' | 'NEQ' | 'GT' | 'GE' | 'LT' | 'LE' | 'IN' | 'NOTIN';

export type VariableFlowConditionOperand =
  | { kind: 'variable'; variable: string }
  | { kind: 'constant'; value: unknown };

export type VariableFlowCondition = {
  left: VariableFlowConditionOperand;
  operator: VariableFlowConditionOperator;
  right: VariableFlowConditionOperand;
};

export type VariableFlowNode =
  | {
      id: string;
      type: 'variable';
      source?: VariableValueSource;
      blockId?: string;
      blockType?: string;
      pageId?: string;
      variable: string;
      processors?: ProcessorConfig[];
    }
  | {
      id: string;
      type: 'constant';
      value: unknown;
    }
  | {
      id: string;
      type: 'processor';
      processors: ProcessorConfig[];
    }
  | {
      id: string;
      type: 'if';
      condition: VariableFlowCondition;
    }
  | {
      id: string;
      type: 'output';
    };

export type VariableFlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
};

export type VariableFlowConfig = {
  version: 1;
  nodes: VariableFlowNode[];
  edges: VariableFlowEdge[];
  layout: Record<string, { x: number; y: number }>;
  outputNodeId: string;
};

export type VariableValueFlowConfig = {
  mode: 'flow';
  flow: VariableFlowConfig;
};

export type VariableValueConfig = VariableValueInputConfig | VariableValueVariableConfig | VariableValueFlowConfig;

export type LegacyVariableValueTextPart = {
  text: string;
};

export type LegacyVariableValueVariablePart = {
  variable: string;
  processors?: ProcessorConfig[];
};

export type LegacyVariableValuePart = LegacyVariableValueTextPart | LegacyVariableValueVariablePart;

export type LegacyVariableValueConfig = {
  type: 'template';
  parts: LegacyVariableValuePart[];
};

export type PageVariableRuntimeData = {
  context?: Record<string, unknown>;
  dataSources?: Record<string, unknown>;
  pageData?: Record<string, unknown>;
};

export type VariableValueResolveContext = Record<string, unknown> & {
  blocks?: Record<string, Record<string, unknown>>;
  pages?: Record<string, PageVariableRuntimeData>;
  pageId?: string;
  context?: Record<string, unknown>;
  dataSources?: Record<string, unknown>;
  pageData?: Record<string, unknown>;
};

const variableDataTypes: VariableValueDataType[] = ['string', 'number', 'boolean', 'object', 'array'];
const variableValueSources: VariableValueSource[] = ['Block', 'MPage', 'Cookie', 'localStorage', 'sessionStorage'];
const conditionOperators: VariableFlowConditionOperator[] = ['EQ', 'NEQ', 'GT', 'GE', 'LT', 'LE', 'IN', 'NOTIN'];
const pageVariableRegistry = new Map<string, PageVariableRuntimeData>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function registerPageVariableRuntime(pageId: string, data: PageVariableRuntimeData) {
  const normalizedPageId = normalizeOptionalString(pageId);
  if (!normalizedPageId) return;
  pageVariableRegistry.set(normalizedPageId, {
    context: clonePlainRecord(data.context),
    dataSources: clonePlainRecord(data.dataSources ?? data.pageData),
    pageData: clonePlainRecord(data.pageData ?? data.dataSources)
  });
}

export function unregisterPageVariableRuntime(pageId: string) {
  const normalizedPageId = normalizeOptionalString(pageId);
  if (!normalizedPageId) return;
  pageVariableRegistry.delete(normalizedPageId);
}

export function getRegisteredPageVariableRuntimes(): Record<string, PageVariableRuntimeData> {
  return Object.fromEntries(
    [...pageVariableRegistry.entries()].map(([pageId, data]) => [pageId, {
      context: clonePlainRecord(data.context),
      dataSources: clonePlainRecord(data.dataSources ?? data.pageData),
      pageData: clonePlainRecord(data.pageData ?? data.dataSources)
    }])
  );
}

export function normalizeVariableDataType(value: unknown, fallback: VariableValueDataType = 'string') {
  return variableDataTypes.includes(value as VariableValueDataType)
    ? value as VariableValueDataType
    : fallback;
}

export function isVariableValueConfig(value: unknown): value is VariableValueConfig {
  return isRecord(value) && (
    value.mode === 'input' ||
    value.mode === 'variable' ||
    value.mode === 'flow' ||
    (value.type === 'template' && Array.isArray(value.parts))
  );
}

export function isStructuredVariableValueConfig(value: unknown): value is VariableValueConfig {
  return isRecord(value) && (value.mode === 'input' || value.mode === 'variable' || value.mode === 'flow');
}

export function normalizeVariableOptions(value: unknown): VariableOption[] {
  if (!Array.isArray(value)) return [];

  const optionsByName = new Map<string, VariableOption>();
  value.forEach((item) => {
    if (!isRecord(item)) return;
    const name = typeof item.name === 'string'
      ? item.name.trim()
      : typeof item.variable === 'string'
        ? item.variable.trim()
        : '';
    if (!name || optionsByName.has(name)) return;

    const label = typeof item.label === 'string' && item.label.trim()
      ? item.label.trim()
      : name;
    optionsByName.set(name, {
      name,
      label,
      type: normalizeVariableDataType(item.type)
    });
  });

  return [...optionsByName.values()];
}

export function normalizeBlockDataFields(value: unknown): BlockDataField[] {
  if (!Array.isArray(value)) return [];
  const fieldsByVariable = new Map<string, BlockDataField>();
  value.forEach((item) => {
    if (!isRecord(item) || typeof item.variable !== 'string') return;
    const variable = item.variable.trim();
    if (!variable || fieldsByVariable.has(variable)) return;
    fieldsByVariable.set(variable, {
      label: typeof item.label === 'string' && item.label.trim() ? item.label.trim() : variable,
      variable,
      dataType: normalizeVariableDataType(item.dataType ?? item.type)
    });
  });
  return [...fieldsByVariable.values()];
}

export function normalizeBlockDataSources(value: unknown): BlockDataSource[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): BlockDataSource[] => {
    if (!isRecord(item)) return [];
    const blockId = typeof item.blockId === 'string' ? item.blockId.trim() : '';
    const blockType = typeof item.blockType === 'string' ? item.blockType.trim() : '';
    if (!blockId || !blockType) return [];
    const fields = normalizeBlockDataFields(item.fields);
    return [{
      blockId,
      blockType,
      blockLabel: typeof item.blockLabel === 'string' && item.blockLabel.trim()
        ? item.blockLabel.trim()
        : `${blockType} ${blockId}`,
      fields
    }];
  });
}

export function normalizePageVariableSources(value: unknown): PageVariableSource[] {
  if (!Array.isArray(value)) return [];
  const sourcesByPageId = new Map<string, PageVariableSource>();

  value.forEach((item) => {
    const source = normalizePageVariableSource(item);
    if (!source || sourcesByPageId.has(source.pageId)) return;
    sourcesByPageId.set(source.pageId, source);
  });

  return [...sourcesByPageId.values()];
}

function normalizePageVariableSource(value: unknown): PageVariableSource | undefined {
  if (typeof value === 'string') {
    const pageId = value.trim();
    return pageId ? { pageId, pageLabel: pageId } : undefined;
  }

  if (!isRecord(value)) return undefined;
  const pageId = typeof value.pageId === 'string'
    ? value.pageId.trim()
    : typeof value.uuid === 'string'
      ? value.uuid.trim()
      : '';
  if (!pageId) return undefined;

  return {
    pageId,
    pageLabel: typeof value.pageLabel === 'string' && value.pageLabel.trim()
      ? value.pageLabel.trim()
      : typeof value.label === 'string' && value.label.trim()
        ? value.label.trim()
        : pageId
  };
}

export function normalizeVariableValueConfig(value: unknown): VariableValueConfig {
  if (!isRecord(value)) {
    return { mode: 'input', value: stringifyPlainValue(value) };
  }

  if (value.mode === 'input') {
    return {
      mode: 'input',
      value: stringifyPlainValue(value.value)
    };
  }

  if (value.mode === 'variable') {
    const variable = typeof value.variable === 'string' ? value.variable.trim() : '';
    return {
      mode: 'variable',
      ...normalizeVariableReference(value),
      variable,
      ...normalizeProcessorsProp(value.processors)
    };
  }

  if (value.mode === 'flow') {
    return {
      mode: 'flow',
      flow: normalizeVariableFlowConfig(value.flow)
    };
  }

  if (value.type === 'template' && Array.isArray(value.parts)) {
    return normalizeLegacyTemplateConfig(value as LegacyVariableValueConfig);
  }

  return { mode: 'input', value: stringifyPlainValue(value) };
}

export function serializeVariableValueConfig(config: VariableValueConfig) {
  const normalized = normalizeVariableValueConfig(config);
  if (normalized.mode === 'input') {
    return normalized.value;
  }
  return normalized;
}

export function stringifyVariableValue(value: unknown) {
  const config = isVariableValueConfig(value) ? normalizeVariableValueConfig(value) : undefined;
  if (!config) return stringifyPlainValue(value);

  if (config.mode === 'input') return config.value;
  if (config.mode === 'variable') {
    const processors = config.processors?.length ? ` | ${config.processors.map(processorConfigName).join(', ')}` : '';
    const source = normalizeVariableSource(config.source);
    const variablePath = stringifyVariableReference(source, config);
    return `{{${variablePath}${processors}}}`;
  }

  return `[flow:${config.flow.outputNodeId || 'output'}]`;
}

export function resolveVariableValueConfig(value: unknown, context: VariableValueResolveContext = {}) {
  const config = normalizeVariableValueConfig(value);
  if (config.mode === 'input') return config.value;
  if (config.mode === 'variable') {
    return applyProcessors(readContextVariable(context, config), config.processors ?? []);
  }

  return resolveVariableFlow(config.flow, context);
}

export function resolveRuntimeValue(value: unknown, context: VariableValueResolveContext = {}): unknown {
  if (isStructuredVariableValueConfig(value) || (isRecord(value) && value.type === 'template' && Array.isArray(value.parts))) {
    return resolveVariableValueConfig(value, context);
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveRuntimeValue(item, context));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveRuntimeValue(item, context)])
    );
  }

  return value;
}

export function createFlowFromInput(value: string): VariableFlowConfig {
  return {
    version: 1,
    nodes: [
      { id: 'constant_1', type: 'constant', value },
      { id: 'output_1', type: 'output' }
    ],
    edges: [{ id: 'constant_1-output_1', source: 'constant_1', target: 'output_1' }],
    layout: {
      constant_1: { x: 80, y: 120 },
      output_1: { x: 360, y: 120 }
    },
    outputNodeId: 'output_1'
  };
}

export function createFlowFromVariable(
  variable: string,
  processors: ProcessorConfig[] = [],
  sourceReference?: { source?: VariableValueSource; blockId?: string; blockType?: string; pageId?: string }
): VariableFlowConfig {
  const nodes: VariableFlowNode[] = [
    {
      id: 'variable_1',
      type: 'variable',
      ...normalizeVariableReference(sourceReference ?? {}),
      variable
    }
  ];
  const edges: VariableFlowEdge[] = [];
  const layout: VariableFlowConfig['layout'] = {
    variable_1: { x: 80, y: 120 }
  };

  if (processors.length) {
    nodes.push({ id: 'processor_1', type: 'processor', processors });
    nodes.push({ id: 'output_1', type: 'output' });
    edges.push({ id: 'variable_1-processor_1', source: 'variable_1', target: 'processor_1' });
    edges.push({ id: 'processor_1-output_1', source: 'processor_1', target: 'output_1' });
    layout.processor_1 = { x: 330, y: 120 };
    layout.output_1 = { x: 590, y: 120 };
  } else {
    nodes.push({ id: 'output_1', type: 'output' });
    edges.push({ id: 'variable_1-output_1', source: 'variable_1', target: 'output_1' });
    layout.output_1 = { x: 360, y: 120 };
  }

  return {
    version: 1,
    nodes,
    edges,
    layout,
    outputNodeId: 'output_1'
  };
}

export function validateVariableFlowConfig(flow: VariableFlowConfig) {
  const outputNodes = flow.nodes.filter((node) => node.type === 'output');
  if (outputNodes.length !== 1) {
    throw new Error('高级流程必须且只能有一个输出节点。');
  }

  if (outputNodes[0].id !== flow.outputNodeId) {
    throw new Error('输出节点 ID 与 outputNodeId 不一致。');
  }

  const nodeIds = new Set(flow.nodes.map((node) => node.id));
  for (const edge of flow.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new Error('高级流程存在无效连线。');
    }
  }

  if (!canReachOutput(flow)) {
    throw new Error('高级流程所有路径必须最终连接到输出节点。');
  }
}

function normalizeProcessorsProp(value: unknown) {
  const processors = normalizeProcessors(value);
  return processors.length ? { processors } : {};
}

function normalizeVariableSource(value: unknown): VariableValueSource {
  return variableValueSources.includes(value as VariableValueSource)
    ? value as VariableValueSource
    : 'Block';
}

function normalizeVariableReference(value: unknown) {
  if (!isRecord(value)) return {};
  const source = normalizeVariableSource(value.source);
  const blockId = typeof value.blockId === 'string' ? value.blockId.trim() : '';
  const blockType = typeof value.blockType === 'string' ? value.blockType.trim() : '';
  const pageId = typeof value.pageId === 'string' ? value.pageId.trim() : '';

  if (source === 'MPage') {
    return {
      source,
      ...(pageId ? { pageId } : {})
    };
  }

  if (source === 'Cookie' || source === 'localStorage' || source === 'sessionStorage') {
    return { source };
  }

  return {
    source,
    ...(blockId ? { blockId } : {}),
    ...(blockType ? { blockType } : {})
  };
}

function stringifyVariableReference(
  source: VariableValueSource,
  reference: { blockId?: string; blockType?: string; pageId?: string; variable: string }
) {
  if (source === 'MPage') {
    return `${reference.pageId || 'MPage'}.${reference.variable}`;
  }

  if (source === 'Cookie') {
    return `Cookie.${reference.variable}`;
  }

  if (source === 'localStorage' || source === 'sessionStorage') {
    return `${source}.${reference.variable}`;
  }

  if (reference.blockId) {
    return `${reference.blockId}.${reference.variable}`;
  }

  if (reference.blockType) {
    return `${reference.blockType}.${reference.variable}`;
  }

  return `Block.${reference.variable}`;
}

function normalizeLegacyTemplateConfig(value: LegacyVariableValueConfig): VariableValueConfig {
  const parts = value.parts.flatMap((part): LegacyVariableValuePart[] => {
    if (!isRecord(part)) return [];
    if ('text' in part && typeof part.text === 'string') return [{ text: part.text }];
    if (!('variable' in part) || typeof part.variable !== 'string' || !part.variable.trim()) return [];
    return [{
      variable: part.variable.trim(),
      ...normalizeProcessorsProp(part.processors)
    }];
  });

  const textParts = parts.filter((part): part is LegacyVariableValueTextPart => 'text' in part && part.text.length > 0);
  const variableParts = parts.filter((part): part is LegacyVariableValueVariablePart => 'variable' in part);
  if (!textParts.length && variableParts.length === 1) {
    return {
      mode: 'variable',
      source: 'Block',
      variable: variableParts[0].variable,
      ...normalizeProcessorsProp(variableParts[0].processors)
    };
  }

  const text = parts.map((part) => 'text' in part ? part.text : `{{${part.variable}}}`).join('');
  return { mode: 'input', value: text };
}

function normalizeVariableFlowConfig(value: unknown): VariableFlowConfig {
  if (!isRecord(value)) return createFlowFromInput('');
  const nodes = Array.isArray(value.nodes) ? value.nodes.flatMap(normalizeFlowNode) : [];
  const edges = Array.isArray(value.edges) ? value.edges.flatMap(normalizeFlowEdge) : [];
  const outputNode = nodes.find((node) => node.type === 'output') ?? { id: 'output_1', type: 'output' as const };
  const normalizedNodes = nodes.some((node) => node.id === outputNode.id) ? nodes : [...nodes, outputNode];
  return {
    version: 1,
    nodes: normalizedNodes.length ? normalizedNodes : createFlowFromInput('').nodes,
    edges,
    layout: normalizeFlowLayout(value.layout),
    outputNodeId: typeof value.outputNodeId === 'string' && value.outputNodeId.trim()
      ? value.outputNodeId.trim()
      : outputNode.id
  };
}

function normalizeFlowNode(value: unknown): VariableFlowNode[] {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim()) return [];
  const id = value.id.trim();
  if (value.type === 'variable') {
    return [{
      id,
      type: 'variable',
      ...normalizeVariableReference(value),
      variable: typeof value.variable === 'string' ? value.variable.trim() : '',
      ...normalizeProcessorsProp(value.processors)
    }];
  }
  if (value.type === 'constant') {
    return [{ id, type: 'constant', value: cloneValue(value.value) }];
  }
  if (value.type === 'processor') {
    return [{ id, type: 'processor', processors: normalizeProcessors(value.processors) }];
  }
  if (value.type === 'if') {
    return [{ id, type: 'if', condition: normalizeFlowCondition(value.condition) }];
  }
  if (value.type === 'output') {
    return [{ id, type: 'output' }];
  }
  return [];
}

function normalizeFlowEdge(value: unknown): VariableFlowEdge[] {
  if (!isRecord(value) || typeof value.source !== 'string' || typeof value.target !== 'string') return [];
  const source = value.source.trim();
  const target = value.target.trim();
  if (!source || !target) return [];
  return [{
    id: typeof value.id === 'string' && value.id.trim()
      ? value.id.trim()
      : `${source}-${String(value.sourceHandle ?? 'next')}-${target}`,
    source,
    target,
    ...(typeof value.sourceHandle === 'string' && value.sourceHandle.trim()
      ? { sourceHandle: value.sourceHandle.trim() }
      : {})
  }];
}

function normalizeFlowLayout(value: unknown): VariableFlowConfig['layout'] {
  if (!isRecord(value)) return {};
  return Object.entries(value).reduce<VariableFlowConfig['layout']>((result, [id, position]) => {
    if (!isRecord(position)) return result;
    const x = typeof position.x === 'number' && Number.isFinite(position.x) ? position.x : 0;
    const y = typeof position.y === 'number' && Number.isFinite(position.y) ? position.y : 0;
    result[id] = { x, y };
    return result;
  }, {});
}

function normalizeFlowCondition(value: unknown): VariableFlowCondition {
  if (!isRecord(value)) {
    return {
      left: { kind: 'constant', value: true },
      operator: 'EQ',
      right: { kind: 'constant', value: true }
    };
  }
  return {
    left: normalizeOperand(value.left),
    operator: conditionOperators.includes(value.operator as VariableFlowConditionOperator)
      ? value.operator as VariableFlowConditionOperator
      : 'EQ',
    right: normalizeOperand(value.right)
  };
}

function normalizeOperand(value: unknown): VariableFlowConditionOperand {
  if (isRecord(value) && value.kind === 'variable') {
    return {
      kind: 'variable',
      variable: typeof value.variable === 'string' ? value.variable.trim() : ''
    };
  }
  if (isRecord(value) && value.kind === 'constant') {
    return { kind: 'constant', value: cloneValue(value.value) };
  }
  return { kind: 'constant', value: value ?? '' };
}

function resolveVariableFlow(flow: VariableFlowConfig, context: VariableValueResolveContext) {
  validateVariableFlowConfig(flow);
  return resolveNode(flow, flow.outputNodeId, context, new Set());
}

function resolveNode(flow: VariableFlowConfig, nodeId: string, context: VariableValueResolveContext, visiting: Set<string>): unknown {
  if (visiting.has(nodeId)) {
    throw new Error('高级流程不能包含循环。');
  }
  visiting.add(nodeId);
  const node = flow.nodes.find((item) => item.id === nodeId);
  if (!node) return undefined;

  if (node.type === 'constant') return cloneValue(node.value);
  if (node.type === 'variable') return applyProcessors(readContextVariable(context, node), node.processors ?? []);
  if (node.type === 'processor') {
    return applyProcessors(resolveInputNode(flow, node.id, context, visiting), node.processors);
  }
  if (node.type === 'if') {
    const handle = evaluateCondition(node.condition, context) ? 'true' : 'false';
    const target = flow.edges.find((edge) => edge.source === node.id && edge.sourceHandle === handle)?.target;
    return target ? resolveNode(flow, target, context, visiting) : undefined;
  }
  if (node.type === 'output') {
    return resolveInputNode(flow, node.id, context, visiting);
  }

  return undefined;
}

function resolveInputNode(flow: VariableFlowConfig, nodeId: string, context: VariableValueResolveContext, visiting: Set<string>) {
  const edge = [...flow.edges].reverse().find((item) => item.target === nodeId);
  return edge ? resolveNode(flow, edge.source, context, new Set(visiting)) : undefined;
}

function evaluateCondition(condition: VariableFlowCondition, context: VariableValueResolveContext) {
  const left = readOperand(condition.left, context);
  const right = readOperand(condition.right, context);
  if (condition.operator === 'EQ') return Object.is(left, right);
  if (condition.operator === 'NEQ') return !Object.is(left, right);
  if (condition.operator === 'GT') return Number(left) > Number(right);
  if (condition.operator === 'GE') return Number(left) >= Number(right);
  if (condition.operator === 'LT') return Number(left) < Number(right);
  if (condition.operator === 'LE') return Number(left) <= Number(right);
  if (condition.operator === 'IN') return Array.isArray(right) && right.includes(left);
  if (condition.operator === 'NOTIN') return Array.isArray(right) && !right.includes(left);
  return false;
}

function readOperand(operand: VariableFlowConditionOperand, context: VariableValueResolveContext) {
  return operand.kind === 'variable' ? readRuntimePath(context, operand.variable) : operand.value;
}

function readContextVariable(
  context: VariableValueResolveContext,
  reference: { source?: VariableValueSource; blockId?: string; blockType?: string; pageId?: string; variable: string }
) {
  const source = normalizeVariableSource(reference.source);

  if (source === 'MPage') {
    return readPageVariable(context, reference);
  }

  if (source === 'Cookie') {
    return readCookieValue(reference.variable);
  }

  if (source === 'localStorage' || source === 'sessionStorage') {
    return readStorageValue(source, reference.variable);
  }

  return readBlockVariable(context, reference);
}

function readBlockVariable(
  context: VariableValueResolveContext,
  reference: { blockId?: string; blockType?: string; variable: string }
) {
  const blocks = context.blocks ?? {};
  const blockId = normalizeOptionalString(reference.blockId);
  const blockType = normalizeOptionalString(reference.blockType);
  const blockData = blockId
    ? blocks[blockId]
    : findBlockRuntimeDataByType(blocks, blockType);

  return readRuntimePath(blockData, reference.variable);
}

function findBlockRuntimeDataByType(
  blocks: Record<string, Record<string, unknown>>,
  blockType: string
) {
  if (!blockType) return undefined;
  return Object.values(blocks).find((data) => data?._blockType === blockType);
}

function readPageVariable(
  context: VariableValueResolveContext,
  reference: { pageId?: string; variable: string }
) {
  const pageId = normalizeOptionalString(reference.pageId) || normalizeOptionalString(context.pageId);
  const registryPageData = pageId ? pageVariableRegistry.get(pageId) : undefined;
  const providedPageData = pageId ? context.pages?.[pageId] : undefined;
  const currentPageData: PageVariableRuntimeData = {
    context: context.context,
    dataSources: context.dataSources ?? context.pageData,
    pageData: context.pageData ?? context.dataSources
  };
  const pageData = providedPageData ?? registryPageData ?? currentPageData;
  const dataSources = pageData.dataSources ?? pageData.pageData ?? {};

  return readRuntimePath({
    context: pageData.context ?? {},
    dataSources,
    pageData: pageData.pageData ?? dataSources
  }, reference.variable);
}

function readCookieValue(name: string) {
  const normalizedName = normalizeOptionalString(name);
  if (!normalizedName || typeof document === 'undefined') return undefined;

  return document.cookie
    .split(';')
    .map((item) => item.trim())
    .flatMap((item) => {
      const equalsIndex = item.indexOf('=');
      if (equalsIndex < 0) return [];
      const key = decodeURIComponent(item.slice(0, equalsIndex).trim());
      if (key !== normalizedName) return [];
      return [decodeURIComponent(item.slice(equalsIndex + 1))];
    })[0];
}

function readStorageValue(source: 'localStorage' | 'sessionStorage', key: string) {
  const normalizedKey = normalizeOptionalString(key);
  if (!normalizedKey || typeof window === 'undefined') return undefined;

  try {
    return window[source].getItem(normalizedKey) ?? undefined;
  } catch {
    return undefined;
  }
}

export function readRuntimePath(source: unknown, path?: string): unknown {
  const normalizedPath = normalizeOptionalString(path);
  if (!normalizedPath) return source;

  return tokenizePath(normalizedPath).reduce<unknown>((cursor, segment) => {
    if (isRecord(cursor) && Object.prototype.hasOwnProperty.call(cursor, segment)) {
      return cursor[segment];
    }

    if (Array.isArray(cursor) && /^\d+$/.test(segment)) {
      return cursor[Number(segment)];
    }

    return undefined;
  }, source);
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
      if (cursor) {
        segments.push(cursor);
        cursor = '';
      }
      const end = path.indexOf(']', index);
      if (end === -1) {
        return [...segments, path.slice(index + 1).trim()].filter(Boolean);
      }
      const raw = path.slice(index + 1, end).trim();
      if (raw) {
        segments.push(raw.replace(/^['"]|['"]$/g, ''));
      }
      index = end;
      continue;
    }

    cursor += char;
  }

  if (cursor) segments.push(cursor);
  return segments;
}

function canReachOutput(flow: VariableFlowConfig) {
  const outputId = flow.outputNodeId;
  const visit = (nodeId: string, seen = new Set<string>()): boolean => {
    if (nodeId === outputId) return true;
    if (seen.has(nodeId)) return false;
    seen.add(nodeId);
    const outgoing = flow.edges.filter((edge) => edge.source === nodeId);
    if (!outgoing.length) return false;
    return outgoing.every((edge) => visit(edge.target, new Set(seen)));
  };

  return flow.nodes
    .filter((node) => node.type !== 'output')
    .every((node) => visit(node.id));
}

function processorConfigName(config: ProcessorConfig) {
  return typeof config === 'string' ? config : config.processor;
}

function stringifyPlainValue(value: unknown) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function normalizeOptionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function clonePlainRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  return cloneValue(value);
}

function cloneValue<T>(value: T): T {
  if (value === undefined || value === null || typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}
