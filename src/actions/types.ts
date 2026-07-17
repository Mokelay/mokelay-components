import type { MokelayBlock } from '@/blocks/types';
import type { ProcessorConfig } from '@/processors';
import type { VariableValueResolveContext } from '@/runtime/variableValue';

export type CommonActionName =
  | 'execute_ds'
  | 'confirm'
  | 'open_dialog'
  | 'close_dialog'
  | 'jump_url'
  | 'call_block_method'
  | 'upload_file'
  | 'download_blob';

export type ControllerActionName = 'if_controller' | 'switch_controller';

export type ActionName = CommonActionName | ControllerActionName | string;

export type ActionNode = {
  uuid: string;
  alias?: string;
  type?: 'DEFAULT';
  value?: string | number | boolean;
  nextAction?: string | null;
};

export type ActionConfig = {
  uuid: string;
  action: ActionName;
  alias?: string;
  type?: 'controller';
  inputs?: Record<string, unknown>;
  outputs?: string[];
  nextAction?: string | null;
  nodes?: ActionNode[];
};

export type ActionTemplate = {
  template: string;
  processors?: ProcessorConfig[];
};

export type ActionContext = {
  actions: Record<string, {
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
  }>;
  blocks: Record<string, Record<string, unknown>>;
  event: unknown;
  sourceBlock: (MokelayBlock | {
    id?: string;
    type: string;
    data: Record<string, unknown>;
    events?: unknown;
  }) & {
    _pageAncestry?: readonly string[];
    _variableContext?: VariableValueResolveContext;
  };
  context?: Record<string, unknown>;
  data?: Record<string, unknown>;
  now: string;
};

export type ActionExecutorContext = {
  config: ActionConfig;
  inputs: Record<string, unknown>;
  state: ActionContext;
  callBlockMethod: (blockId: string, methodName: string, invocation: unknown) => Promise<unknown>;
};

export type ActionExecutor = (context: ActionExecutorContext) => Promise<Record<string, unknown>> | Record<string, unknown>;
