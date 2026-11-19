import type { InjectionKey } from 'vue';
import type { MokelayBlock } from '@/blocks/types';
import { normalizeBlockEvents, type BlockEvent } from '@/blocks/blockEvents';
import type { ActionConfig, ActionContext } from '@/actions/types';
import { createEventScheduler } from './eventScheduler';
import { runActionGraph, type ActionCheckpoint } from '@/actions/runner';
import { $message } from '@/components/global-calls/globalCalls';
import type { VariableValueResolveContext } from '@/runtime/variableValue';

export type PreviewRuntimeBlock = (MokelayBlock | {
  id?: string;
  type: string;
  data: Record<string, unknown>;
  events?: BlockEvent[];
}) & {
  _pageAncestry?: readonly string[];
  _variableContext?: VariableValueResolveContext;
};

export type BlockRuntimeHandle = {
  id: string;
  type: string;
  instance: unknown;
  data?: Record<string, unknown>;
  getEventSource?: () => PreviewRuntimeBlock;
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
  triggerBlockEvent: (blockId: string, event: string, payload?: unknown) => Promise<Array<ActionContext | undefined>>;
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
  const eventHandles = new WeakMap<PreviewRuntimeBlock, Map<string, BlockRuntimeHandle>>();
  const eventDependencies = new Map<string, Map<string, number>>();
  const eventKey = (id: string, event: string) => JSON.stringify([id, event]);

  function reaches(from: string, target: string, visited = new Set<string>()): boolean {
    if (from === target) return true;
    if (visited.has(from)) return false;
    visited.add(from);
    return [...(eventDependencies.get(from)?.keys() ?? [])].some(next => reaches(next, target, visited));
  }

  async function waitForEvent<T>(source: PreviewRuntimeBlock, config: BlockEvent | undefined, blockId: string, event: string, execute: () => Promise<T>) {
    if (!source.id || !config) return execute();
    const from = eventKey(source.id, config.event);
    const to = eventKey(blockId, event);
    if (reaches(to, from)) throw new Error(`Circular event dependency: ${source.id}.${config.event} -> ${blockId}.${event}`);
    const targets = eventDependencies.get(from) ?? new Map<string, number>();
    targets.set(to, (targets.get(to) ?? 0) + 1);
    eventDependencies.set(from, targets);
    try { return await execute(); }
    finally {
      const count = (targets.get(to) ?? 1) - 1;
      if (count) targets.set(to, count); else targets.delete(to);
      if (!targets.size) eventDependencies.delete(from);
    }
  }

  async function triggerBlockEvent(blockId: string, event: string, payload: unknown = {}, contextHandles = handles) {
    const target = contextHandles.get(blockId);
    if (!target) throw new Error(`Event target block was not found: ${blockId}`);
    const source = target.getEventSource?.();
    const configs = normalizeBlockEvents(source?.events).filter(config => config.event === event);
    if (!source || !configs.length) throw new Error(`Configured event was not found: ${blockId}.${event}`);
    eventHandles.set(source, new Map(contextHandles));
    const results = await Promise.allSettled(configs.map(config => scheduler.invoke(config, source, payload)));
    const failure = results.find(result => result.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
    return results.map(result => result.status === 'fulfilled' ? result.value : undefined);
  }

  async function getBlockDataContext(excludeBlockId?: string, contextHandles = handles) {
    const entries = await Promise.all([...contextHandles.values()]
      .filter((handle) => handle.id !== excludeBlockId)
      .map(async (handle) => [handle.id, await resolveBlockData(handle)] as const));
    return Object.fromEntries(entries);
  }

  async function callBlockMethod(
    blockId: string,
    methodName: string,
    invocation: Omit<BlockMethodInvocation, 'targetBlock'>,
    contextHandles = handles
  ) {
    if (!blockId || !methodName) {
      warnRuntime('Skipped incomplete block method action.', { blockId, methodName, invocation });
      return undefined;
    }

    const targetBlock = contextHandles.get(blockId);
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

  async function runActions(actions: unknown, sourceBlock: PreviewRuntimeBlock, event: unknown, checkpoint?: ActionCheckpoint, eventConfig?: BlockEvent) {
    const capturedHandles = eventHandles.get(sourceBlock) ?? new Map(handles);
    // A lifecycle flush completes against the instances that received the event.
    // A replacement page with the same block IDs must never receive its updates.
    const contextHandles = () => {
      const source = sourceBlock.id && capturedHandles.get(sourceBlock.id);
      return source && handles.get(source.id)?.instance !== source.instance ? capturedHandles : handles;
    };
    return await runActionGraph({
      checkpoint,
      controlEvent: (operation, blockId, eventName) => waitForEvent(sourceBlock, eventConfig, blockId, eventName,
        () => scheduler.control(operation, blockId, eventName)),
      triggerEvent: (blockId, eventName, payload) => waitForEvent(sourceBlock, eventConfig, blockId, eventName,
        () => triggerBlockEvent(blockId, eventName, payload, contextHandles())),
      actions: actions as ActionConfig[],
      sourceBlock,
      event,
      getBlockDataContext: () => getBlockDataContext(undefined, contextHandles()),
      callBlockMethod: (blockId, methodName, actionInvocation) => callBlockMethod(blockId, methodName, {
        sourceBlock,
        event,
        eventConfig,
        ...(typeof actionInvocation === 'object' && actionInvocation !== null
          ? actionInvocation as Record<string, unknown>
          : {})
      }, contextHandles())
    });
  }

  const scheduler = createEventScheduler(runActions, error => {
    warnRuntime('Action graph failed.', error);
    void $message({ type: 'error', content: error instanceof Error ? error.message : '操作失败。' }).catch(() => undefined);
  });
  const visibilityChange = () => { if (document.visibilityState === 'hidden') scheduler.flushLifecycle('hidden'); };
  let listening = false;

  return {
    triggerBlockEvent,
    registerBlock(id, handle) {
      if (!id) return;
      handles.set(id, handle);
      if (!listening && typeof document !== 'undefined') { document.addEventListener('visibilitychange', visibilityChange); listening = true; }
      notifyBlockDataChange(id);
    },

    unregisterBlock(id, instance) {
      const currentHandle = handles.get(id);
      if (!currentHandle) return;

      if (instance !== undefined && currentHandle.instance !== instance) {
        return;
      }

      scheduler.flushLifecycle('unmount', id);
      handles.delete(id);
      if (!handles.size && listening) { document.removeEventListener('visibilitychange', visibilityChange); listening = false; }
      notifyBlockDataChange(id);
    },

    async invokeBlockActions(eventConfig, sourceBlock, event) {
      if (!eventConfig.event || !eventConfig.actions.length) {
        warnRuntime('Skipped incomplete event action config.', { eventConfig, sourceBlock });
        return undefined;
      }

      eventHandles.set(sourceBlock, new Map(handles));
      try { return await scheduler.invoke(eventConfig, sourceBlock, event); }
      catch { return undefined; } // The scheduler executes configured error/finally actions.
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
