import type { ActionConfig, ActionNode } from '@/actions/types';

type PlainRecord = Record<string, unknown>;

function isRecord(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOutputs(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const outputs = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return outputs.length ? outputs : undefined;
}

function normalizeInputs(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? cloneJsonValue(value) : undefined;
}

function normalizeNextAction(value: unknown): string | null | undefined {
  if (value === null) return null;
  const nextAction = normalizeString(value);
  return nextAction ? nextAction : undefined;
}

function normalizeActionNode(value: unknown): ActionNode | undefined {
  if (!isRecord(value)) return undefined;
  const uuid = normalizeString(value.uuid);
  if (!uuid) return undefined;

  const nextAction = normalizeNextAction(value.nextAction);
  return {
    uuid,
    ...(normalizeString(value.alias) ? { alias: normalizeString(value.alias) } : {}),
    ...(value.type === 'DEFAULT' ? { type: 'DEFAULT' as const } : {}),
    ...(typeof value.value === 'string' || typeof value.value === 'number' || typeof value.value === 'boolean'
      ? { value: value.value }
      : {}),
    ...(nextAction !== undefined ? { nextAction } : {})
  };
}

function normalizeActionNodes(value: unknown): ActionNode[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const nodes = value.flatMap((item) => {
    const node = normalizeActionNode(item);
    return node ? [node] : [];
  });
  return nodes.length ? nodes : undefined;
}

export function normalizeActionConfig(value: unknown): ActionConfig | undefined {
  if (!isRecord(value)) return undefined;
  const uuid = normalizeString(value.uuid);
  const action = normalizeString(value.action);
  if (!uuid || !action) return undefined;

  const nextAction = normalizeNextAction(value.nextAction);
  const inputs = normalizeInputs(value.inputs);
  const outputs = normalizeOutputs(value.outputs);
  const nodes = normalizeActionNodes(value.nodes);

  return {
    uuid,
    action,
    ...(normalizeString(value.alias) ? { alias: normalizeString(value.alias) } : {}),
    ...(value.type === 'controller' ? { type: 'controller' as const } : {}),
    ...(inputs ? { inputs } : {}),
    ...(outputs ? { outputs } : {}),
    ...(nextAction !== undefined ? { nextAction } : {}),
    ...(nodes ? { nodes } : {})
  };
}

export function normalizeActions(value: unknown): ActionConfig[] {
  if (!Array.isArray(value)) return [];
  const actions: ActionConfig[] = [];
  const seen = new Set<string>();

  value.forEach((item) => {
    const action = normalizeActionConfig(item);
    if (!action || seen.has(action.uuid)) return;
    seen.add(action.uuid);
    actions.push(action);
  });

  return actions;
}

export function cloneActions(value: unknown): ActionConfig[] {
  return normalizeActions(value).map((action) => cloneJsonValue(action));
}

export function createEmptyAction(): ActionConfig {
  return {
    uuid: createActionUuid('action'),
    action: 'confirm',
    alias: 'Action',
    inputs: {
      title: '',
      content: ''
    },
    outputs: ['result'],
    nextAction: null
  };
}

export function createActionUuid(prefix: string) {
  const suffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${suffix}`;
}
