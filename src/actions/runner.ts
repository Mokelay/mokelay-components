import { actionExecutors } from '@/actions/executors';
import { selectControllerNode } from '@/actions/controllers';
import { normalizeActions } from '@/actions/normalizer';
import { resolveActionTemplates } from '@/actions/template';
import type { ActionConfig, ActionContext } from '@/actions/types';

type RuntimeBlock = ActionContext['sourceBlock'];

export type RunActionGraphOptions = {
  actions: unknown;
  sourceBlock: RuntimeBlock;
  event: unknown;
  getBlockDataContext: () => Promise<Record<string, Record<string, unknown>>>;
  callBlockMethod: (blockId: string, methodName: string, invocation: unknown) => Promise<unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeInputs(value: unknown) {
  return isRecord(value) ? value : {};
}

function normalizeOutputs(value: unknown, declaredOutputs: string[] | undefined) {
  const outputs = normalizeInputs(value);
  if (!declaredOutputs?.length) return outputs;

  return Object.fromEntries(
    declaredOutputs
      .filter((key) => Object.prototype.hasOwnProperty.call(outputs, key))
      .map((key) => [key, outputs[key]])
  );
}

function nextActionValue(value: string | null | undefined) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isControllerAction(config: ActionConfig) {
  return config.type === 'controller' || config.action === 'if_controller' || config.action === 'switch_controller';
}

function createBaseContext(
  sourceBlock: RuntimeBlock,
  event: unknown,
  blocks: Record<string, Record<string, unknown>>
): ActionContext {
  return {
    actions: {},
    blocks,
    event,
    sourceBlock,
    now: new Date().toISOString()
  };
}

export async function runActionGraph(options: RunActionGraphOptions) {
  const actions = normalizeActions(options.actions);
  if (!actions.length) return undefined;

  const actionMap = new Map(actions.map((action) => [action.uuid, action]));
  const state = createBaseContext(
    options.sourceBlock,
    options.event,
    await options.getBlockDataContext()
  );
  const visited = new Set<string>();
  let currentActionUuid: string | null = actions[0].uuid;

  while (currentActionUuid) {
    if (visited.has(currentActionUuid)) {
      throw new Error(`Action graph contains a loop at ${currentActionUuid}.`);
    }
    visited.add(currentActionUuid);

    const config = actionMap.get(currentActionUuid);
    if (!config) {
      throw new Error(`Action graph points to missing action: ${currentActionUuid}.`);
    }

    state.blocks = await options.getBlockDataContext();
    const inputs = normalizeInputs(resolveActionTemplates(config.inputs ?? {}, state));
    state.actions[config.uuid] = {
      inputs,
      outputs: {}
    };

    if (isControllerAction(config)) {
      const node = selectControllerNode(config, inputs);
      currentActionUuid = nextActionValue(node.nextAction);
      continue;
    }

    const executor = actionExecutors[config.action];
    if (!executor) {
      throw new Error(`Unsupported action: ${config.action}`);
    }

    const outputs = await executor({
      config,
      inputs,
      state,
      callBlockMethod: options.callBlockMethod
    });
    state.actions[config.uuid].outputs = normalizeOutputs(outputs, config.outputs);
    currentActionUuid = nextActionValue(config.nextAction);
  }

  return state;
}
