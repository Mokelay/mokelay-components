import type { ActionConfig, ActionNode } from '@/actions/types';

function truthyControllerValue(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') return value.length > 0;
  return false;
}

function primitiveType(value: unknown): 'string' | 'number' | 'boolean' | undefined {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return undefined;
}

function requireControllerNodes(config: ActionConfig) {
  return Array.isArray(config.nodes) ? config.nodes : [];
}

/**
 * @clientActionDoc {
 *   "version": "1.0",
 *   "actionName": "if_controller",
 *   "displayName": "条件分支",
 *   "actionType": "controller",
 *   "category": "controller",
 *   "description": "根据输入值在 true 和 false 两个节点之间选择下一步 Action。",
 *   "inputs": [{"key":"value","type":"unknown","required":true,"description":"用于判断真值的输入。"}],
 *   "outputs": [{"key":"nextAction","type":"string|null","description":"命中的下一步 Action UUID。"}],
 *   "errors": [{"code":"INVALID_NODES","description":"必须恰好配置一个 true 节点和一个 false 节点。"}],
 *   "config": [{"key":"nodes","type":"ActionNode[]","required":true,"description":"分支节点配置。"}],
 *   "nodeSchema": [{"type":"boolean","description":"节点 value 必须为 true 或 false。"}],
 *   "runtime": [{"key":"sideEffect","value":false},{"key":"async","value":false},{"key":"failureMode","value":"throws"}],
 *   "examples": [{"action":{"uuid":"check","action":"if_controller","type":"controller","inputs":{"value":"{{event.ok}}"},"nodes":[{"uuid":"yes","value":true,"nextAction":"success"},{"uuid":"no","value":false,"nextAction":"failure"}]}}]
 * }
 */
export function selectIfControllerNode(config: ActionConfig, inputs: Record<string, unknown>): ActionNode {
  const nodes = requireControllerNodes(config);
  const trueNodes = nodes.filter((node) => node.value === true);
  const falseNodes = nodes.filter((node) => node.value === false);
  const unsupportedNodes = nodes.filter((node) => node.type === 'DEFAULT' || typeof node.value !== 'boolean');

  if (trueNodes.length !== 1 || falseNodes.length !== 1 || unsupportedNodes.length) {
    throw new Error(`if_controller ${config.uuid} requires exactly one true node and one false node.`);
  }

  return truthyControllerValue(inputs.value) ? trueNodes[0] : falseNodes[0];
}

/**
 * @clientActionDoc {
 *   "version": "1.0",
 *   "actionName": "switch_controller",
 *   "displayName": "条件匹配",
 *   "actionType": "controller",
 *   "category": "controller",
 *   "description": "按 string、number 或 boolean 输入值匹配节点，并支持一个 DEFAULT 节点。",
 *   "inputs": [{"key":"dataType","type":"string|number|boolean","required":true,"description":"匹配值的数据类型。"},{"key":"value","type":"string|number|boolean","required":true,"description":"待匹配的值。"}],
 *   "outputs": [{"key":"nextAction","type":"string|null","description":"命中的下一步 Action UUID。"}],
 *   "errors": [{"code":"INVALID_DATA_TYPE","description":"dataType 或 value 类型不匹配。"},{"code":"NO_MATCHED_NODE","description":"没有命中节点且没有 DEFAULT 节点。"}],
 *   "config": [{"key":"nodes","type":"ActionNode[]","required":true,"description":"case 节点和可选 DEFAULT 节点。"}],
 *   "nodeSchema": [{"type":"primitive|DEFAULT","description":"case value 类型必须与 dataType 一致。"}],
 *   "runtime": [{"key":"sideEffect","value":false},{"key":"async","value":false},{"key":"failureMode","value":"throws"}],
 *   "examples": [{"action":{"uuid":"route","action":"switch_controller","type":"controller","inputs":{"dataType":"string","value":"{{event.status}}"},"nodes":[{"uuid":"active","value":"active","nextAction":"show"},{"uuid":"default","type":"DEFAULT","nextAction":"fallback"}]}}]
 * }
 */
export function selectSwitchControllerNode(config: ActionConfig, inputs: Record<string, unknown>): ActionNode {
  const dataType = inputs.dataType;
  if (dataType !== 'string' && dataType !== 'number' && dataType !== 'boolean') {
    throw new Error(`switch_controller ${config.uuid} inputs.dataType must be string, number, or boolean.`);
  }

  if (primitiveType(inputs.value) !== dataType) {
    throw new Error(`switch_controller ${config.uuid} inputs.value must be ${dataType}.`);
  }

  const nodes = requireControllerNodes(config);
  const defaultNodes = nodes.filter((node) => node.type === 'DEFAULT');
  if (defaultNodes.length > 1) {
    throw new Error(`switch_controller ${config.uuid} can only have one DEFAULT node.`);
  }

  const caseNodes = nodes.filter((node) => node.type !== 'DEFAULT');
  const invalidCase = caseNodes.find((node) => primitiveType(node.value) !== dataType);
  if (invalidCase) {
    throw new Error(`switch_controller ${config.uuid} case node ${invalidCase.uuid} value must be ${dataType}.`);
  }

  const matched = caseNodes.find((node) => node.value === inputs.value);
  if (matched) return matched;

  const defaultNode = defaultNodes[0];
  if (!defaultNode) {
    throw new Error(`switch_controller ${config.uuid} did not match a case and has no DEFAULT node.`);
  }
  return defaultNode;
}

export const controllerActionDefinitions = {
  if_controller: selectIfControllerNode,
  switch_controller: selectSwitchControllerNode
};

export function selectControllerNode(config: ActionConfig, inputs: Record<string, unknown>): ActionNode {
  if (config.action === 'if_controller') {
    return selectIfControllerNode(config, inputs);
  }
  if (config.action === 'switch_controller') {
    return selectSwitchControllerNode(config, inputs);
  }
  throw new Error(`Unsupported controller action: ${config.action}`);
}
