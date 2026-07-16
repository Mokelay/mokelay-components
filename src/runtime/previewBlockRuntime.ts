import type { InjectionKey } from 'vue';
import type { MokelayBlock } from '@/blocks/types';
import type { BlockEvent } from '@/blocks/blockEvents';
import type { ActionConfig, ActionContext } from '@/actions/types';
import { runActionGraph } from '@/actions/runner';
import { $message } from '@/components/global-calls/globalCalls';

export type PreviewRuntimeBlock = (MokelayBlock | {
  id?: string;
  type: string;
  data: Record<string, unknown>;
  events?: BlockEvent[];
}) & {
  _pageAncestry?: readonly string[];
};

export type BlockRuntimeHandle = {
  id: string;
  type: string;
  instance: unknown;
  data?: Record<string, unknown>;
};

export type BlockMethodInvocation = {
  sourceBlock: PreviewRuntimeBlock;
  targetBlock: BlockRuntimeHandle;
  event: unknown;
  eventConfig?: BlockEvent;
  actionConfig?: unknown;
  inputs?: Record<string, unknown>;
  args?: unknown;
};

export type PreviewBlockRuntime = {
  registerBlock: (id: string, handle: BlockRuntimeHandle) => void;
  unregisterBlock: (id: string, instance?: unknown) => void;
  invokeBlockActions: (eventConfig: BlockEvent, sourceBlock: PreviewRuntimeBlock, event: unknown) => Promise<ActionContext | undefined>;
  runActions: (actions: unknown, sourceBlock: PreviewRuntimeBlock, event: unknown) => Promise<ActionContext | undefined>;
  getBlockDataContext: (excludeBlockId?: string) => Promise<Record<string, Record<string, unknown>>>;
  notifyBlockDataChange: (blockId: string) => void;
  subscribeBlockDataChange: (blockId: string, listener: () => void) => () => void;
};

export const PreviewBlockRuntimeKey: InjectionKey<PreviewBlockRuntime> = Symbol('PreviewBlockRuntime');

function warnRuntime(message: string, details?: unknown) {
  if (!import.meta.env.DEV) return;
  console.warn(`[Mokelay preview actions] ${message}`, details);
}

function getCallableMethod(instance: unknown, methodName: string) {
  if (typeof instance !== 'object' || instance === null) {
    return undefined;
  }

  const method = (instance as Record<string, unknown>)[methodName];
  return typeof method === 'function' ? method : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function resolveBlockData(handle: BlockRuntimeHandle) {
  const getData = getCallableMethod(handle.instance, 'getData');
  let data: Record<string, unknown>;
  if (getData) {
    const value = await getData.call(handle.instance);
    data = isRecord(value) ? value : {};
  } else {
    data = handle.data ?? {};
  }

  Object.defineProperty(data, '_blockType', {
    value: handle.type,
    enumerable: false,
    configurable: true
  });
  return data;
}

export function createPreviewBlockRuntime(): PreviewBlockRuntime {
  const handles = new Map<string, BlockRuntimeHandle>();
  const dataChangeListeners = new Map<string, Set<() => void>>();

  async function getBlockDataContext(excludeBlockId?: string) {
    const entries = await Promise.all([...handles.values()]
      .filter((handle) => handle.id !== excludeBlockId)
      .map(async (handle) => [handle.id, await resolveBlockData(handle)] as const));
    return Object.fromEntries(entries);
  }

  async function callBlockMethod(
    blockId: string,
    methodName: string,
    invocation: Omit<BlockMethodInvocation, 'targetBlock'>
  ) {
    if (!blockId || !methodName) {
      warnRuntime('Skipped incomplete block method action.', { blockId, methodName, invocation });
      return undefined;
    }

    const targetBlock = handles.get(blockId);
    if (!targetBlock) {
      warnRuntime('Target block was not found.', { blockId, methodName, invocation });
      return undefined;
    }

    const method = getCallableMethod(targetBlock.instance, methodName);
    if (!method) {
      warnRuntime('Target method was not exposed.', { blockId, methodName, targetBlock, invocation });
      return undefined;
    }

    return await method.call(targetBlock.instance, {
      ...invocation,
      targetBlock
    } satisfies BlockMethodInvocation);
  }

  function notifyBlockDataChange(blockId: string) {
    if (!blockId) return;

    dataChangeListeners.get(blockId)?.forEach((listener) => {
      listener();
    });
  }

  async function runActions(actions: unknown, sourceBlock: PreviewRuntimeBlock, event: unknown) {
    await Promise.resolve();
    return await runActionGraph({
      actions: actions as ActionConfig[],
      sourceBlock,
      event,
      getBlockDataContext,
      callBlockMethod: (blockId, methodName, actionInvocation) => callBlockMethod(blockId, methodName, {
        sourceBlock,
        event,
        ...(typeof actionInvocation === 'object' && actionInvocation !== null
          ? actionInvocation as Record<string, unknown>
          : {})
      })
    });
  }

  return {
    registerBlock(id, handle) {
      if (!id) return;
      handles.set(id, handle);
      notifyBlockDataChange(id);
    },

    unregisterBlock(id, instance) {
      const currentHandle = handles.get(id);
      if (!currentHandle) return;

      if (instance !== undefined && currentHandle.instance !== instance) {
        return;
      }

      handles.delete(id);
      notifyBlockDataChange(id);
    },

    async invokeBlockActions(eventConfig, sourceBlock, event) {
      if (!eventConfig.event || !eventConfig.actions.length) {
        warnRuntime('Skipped incomplete event action config.', { eventConfig, sourceBlock });
        return undefined;
      }

      try {
        await Promise.resolve();
        return await runActionGraph({
          actions: eventConfig.actions,
          sourceBlock,
          event,
          getBlockDataContext,
          callBlockMethod: (blockId, methodName, actionInvocation) => callBlockMethod(blockId, methodName, {
            sourceBlock,
            event,
            eventConfig,
            ...(typeof actionInvocation === 'object' && actionInvocation !== null
              ? actionInvocation as Record<string, unknown>
              : {})
          })
        });
      } catch (error) {
        warnRuntime('Action graph failed.', { eventConfig, sourceBlock, error });
        const message = error instanceof Error && error.message ? error.message : '操作失败。';
        void $message({ type: 'error', content: message }).catch(() => undefined);
        return undefined;
      }
    },

    runActions,

    getBlockDataContext,

    notifyBlockDataChange,

    subscribeBlockDataChange(blockId, listener) {
      if (!blockId) return () => undefined;

      const listeners = dataChangeListeners.get(blockId) ?? new Set<() => void>();
      listeners.add(listener);
      dataChangeListeners.set(blockId, listeners);

      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          dataChangeListeners.delete(blockId);
        }
      };
    }
  };
}
