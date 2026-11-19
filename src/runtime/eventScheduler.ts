import type { BlockEvent } from '@/blocks/blockEvents';
import type { ActionContext } from '@/actions/types';
import { ActionGraphFailure, type ActionCheckpoint } from '@/actions/runner';
import type { PreviewRuntimeBlock } from './previewBlockRuntime';

type Result = ActionContext | undefined;
type Waiter = { resolve: (result: Result) => void; reject: (error: unknown) => void };
type Job = { config: BlockEvent; source: PreviewRuntimeBlock; event: unknown; waiters: Waiter[] };
type Entry = {
  active?: Promise<Result>;
  control?: Promise<Result>;
  running: Set<Promise<Result>>;
  pending?: Job;
  failed?: { job: Job; error: unknown };
  timer?: ReturnType<typeof setTimeout>;
  flushing: boolean;
  disposed: boolean;
};
type Execute = (actions: unknown, source: PreviewRuntimeBlock, event: unknown, checkpoint?: ActionCheckpoint, eventConfig?: BlockEvent) => Promise<Result>;
const keyOf = (blockId: string, event: string, identity: string) => JSON.stringify([blockId, event, identity]);

/** Page-local event queues. Only explicitly replayable events resume uncertain requests. */
export function createEventScheduler(execute: Execute, report: (error: unknown) => void) {
  const entries = new Map<string, Entry>();
  const keyFor = (source: PreviewRuntimeBlock, config: BlockEvent) => keyOf(source.id ?? '', config.event, config.actions[0]?.uuid ?? '');

  function snapshot(value: unknown, seen = new WeakMap<object, unknown>()): unknown {
    if (!value || typeof value !== 'object') return value;
    if (seen.has(value)) return seen.get(value);
    // Browser events expose non-enumerable properties. Keep those instances intact.
    if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return value;
    const copy: Record<string, unknown> | unknown[] = Array.isArray(value) ? [] : {};
    seen.set(value, copy);
    Object.entries(value).forEach(([key, entry]) => { (copy as Record<string, unknown>)[key] = snapshot(entry, seen); });
    return copy;
  }
  function resumable(entry: Entry) {
    return entry.failed?.job.config.execution?.retry === 'resumeUnconfirmed'
      && entry.failed.error instanceof ActionGraphFailure && entry.failed.error.unconfirmed;
  }
  async function perform(entry: Entry, job: Job, checkpoint?: ActionCheckpoint): Promise<Result> {
    let result: Result;
    let failure: unknown;
    try {
      result = await execute(job.config.actions, job.source, job.event, checkpoint, job.config);
      entry.failed = undefined;
    } catch (error) {
      failure = error;
      entry.failed = { job, error };
      const payload = { originalEvent: job.event, error: {
        message: error instanceof Error ? error.message : String(error),
        unconfirmed: error instanceof ActionGraphFailure && error.unconfirmed,
        actionUuid: error instanceof ActionGraphFailure ? error.checkpoint.cursor : ''
      } };
      if (!entry.disposed && job.config.onError?.length) {
        try { await execute(job.config.onError, job.source, payload, undefined, job.config); } catch (handlerError) { report(handlerError); }
      } else if (!entry.disposed) report(error);
    } finally {
      if (!entry.disposed && job.config.onFinally?.length) {
        try { await execute(job.config.onFinally, job.source, { originalEvent: job.event }, undefined, job.config); }
        catch (error) { report(error); if (!failure) failure = error; }
      }
    }
    if (failure) throw failure;
    return result;
  }

  function start(entry: Entry, job: Job, retry = false): Promise<Result> {
    clearTimeout(entry.timer); entry.timer = undefined;
    const failed = entry.failed;
    const shouldResume = resumable(entry);
    const active = (async () => {
      if (failed && shouldResume) {
        let result: Result;
        try { result = await perform(entry, failed.job, (failed.error as ActionGraphFailure).checkpoint); }
        catch (error) {
          if (job !== failed.job && !entry.pending) entry.pending = job;
          throw error;
        }
        if (retry || job === failed.job) return result;
      }
      return perform(entry, job);
    })();
    entry.active = active;
    entry.running.add(active);
    active.then(result => job.waiters.splice(0).forEach(waiter => waiter.resolve(result)),
      error => job.waiters.splice(0).forEach(waiter => waiter.reject(error)))
      .finally(() => {
        entry.running.delete(active);
        if (entry.active === active) entry.active = undefined;
        if (entry.disposed) return;
        // A failed uncertain write is held until an explicit retry, flush, or new change.
        if (entry.pending && !entry.flushing && !entry.timer && !entry.failed) {
          const next = entry.pending; entry.pending = undefined; start(entry, next);
        }
      });
    return active;
  }

  function invoke(config: BlockEvent, source: PreviewRuntimeBlock, event: unknown): Promise<Result> {
    const key = keyFor(source, config);
    let entry = entries.get(key);
    if (!entry || entry.disposed) {
      entry = { flushing: false, disposed: false, running: new Set() }; entries.set(key, entry);
    }
    const policy = config.execution?.concurrency ?? 'parallel';
    if (policy === 'drop' && entry.active) return entry.active;
    const current = entry;
    const job: Job = { config, source, event: snapshot(event), waiters: [] };
    const promise = new Promise<Result>((resolve, reject) => job.waiters.push({ resolve, reject }));
    if (current.pending) job.waiters.push(...current.pending.waiters.splice(0));
    const delay = config.execution?.debounceMs ?? 0;
    if (delay || (policy !== 'parallel' && current.active)) {
      current.pending = job;
      clearTimeout(current.timer);
      if (delay && !current.flushing) current.timer = setTimeout(() => {
        current.timer = undefined;
        if ((!current.active || policy === 'parallel') && current.pending) {
          const pending = current.pending; current.pending = undefined; start(current, pending);
        }
      }, delay);
    } else {
      current.pending = undefined;
      start(current, job);
    }
    return promise;
  }

  function controlEntry(operation: 'flush' | 'retry', entry: Entry): Promise<Result> {
    if (entry.control) return entry.control;
    const pending = drainEntry(operation, entry);
    entry.control = pending;
    void pending.finally(() => { if (entry.control === pending) entry.control = undefined; }).catch(() => undefined);
    return pending;
  }

  async function drainEntry(operation: 'flush' | 'retry', entry: Entry): Promise<Result> {
    if (entry.disposed) return undefined;
    clearTimeout(entry.timer); entry.timer = undefined;
    entry.flushing = true;
    let result: Result;
    try {
      if (entry.running.size) {
        const finished = await Promise.allSettled([...entry.running]);
        const last = finished[finished.length - 1];
        if (last.status === 'fulfilled') result = last.value;
      }
      if (entry.failed && (operation === 'retry' || resumable(entry))) {
        result = await start(entry, entry.failed.job, true);
      } else if (entry.failed && !entry.pending) {
        throw entry.failed.error;
      }
      while (entry.pending) {
        const job = entry.pending; entry.pending = undefined;
        result = await start(entry, job);
      }
      return result;
    } finally { entry.flushing = false; }
  }

  async function control(operation: 'flush' | 'retry', blockId: string, event: string): Promise<Result> {
    let result: Result;
    for (const [key, entry] of entries) {
      const [owner, name] = JSON.parse(key);
      if (owner === blockId && name === event) result = await controlEntry(operation, entry);
    }
    return result;
  }

  function flushLifecycle(trigger: 'hidden' | 'unmount', blockId?: string) {
    for (const [key, entry] of entries) {
      const [owner, event] = JSON.parse(key) as [string, string];
      if (blockId && owner !== blockId) continue;
      const job = entry.pending ?? entry.failed?.job;
      if (job?.config.execution?.flushOn?.includes(trigger)) void controlEntry('flush', entry).catch(() => undefined);
      if (trigger === 'unmount') {
        entry.disposed = true;
        clearTimeout(entry.timer);
        // A requested lifecycle flush retains its captured job, never its live view.
        if (!job?.config.execution?.flushOn?.includes(trigger)) {
          entry.pending?.waiters.splice(0).forEach(waiter => waiter.resolve(undefined));
          entry.pending = undefined;
        }
        entries.delete(key);
      }
    }
  }
  return { invoke, control, flushLifecycle };
}
