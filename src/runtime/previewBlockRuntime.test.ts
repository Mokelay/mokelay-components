// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createPreviewBlockRuntime, type PreviewBlockRuntime } from './previewBlockRuntime';
import type { BlockEvent } from '@/blocks/blockEvents';
import { actionExecutors } from '@/actions/executors';

vi.mock('@/components/global-calls/globalCalls', () => ({ $message: async () => undefined }));
afterEach(() => vi.restoreAllMocks());

function registerEvents(runtime: PreviewBlockRuntime, id: string, events: BlockEvent[], instance: object = {}) {
  runtime.registerBlock(id, { id, type: 'Test', instance,
    getEventSource: () => ({ id, type: 'Test', data: {}, events, _variableContext: { context: { owner: id } } }) });
}

it('triggers all configured handlers with the supplied payload and target context, awaiting completion', async () => {
  const runtime = createPreviewBlockRuntime();
  const record = vi.fn();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const instance = { getData: () => ({ value: 'unchanged' }), record: async ({ inputs }: { inputs: unknown }) => { record(inputs); await gate; } };
  registerEvents(runtime, 'field', ['first', 'second'].map(uuid => ({ event: 'change', actions: [
    { uuid, action: 'call_block_method', inputs: { blockId: 'field', method: 'record', value: { template: '{{event.value}}' }, owner: { template: '{{context.owner}}' } } }
  ] })), instance);
  try {
    let finished = false;
    const execution = runtime.runActions([{ uuid: 'trigger', action: 'trigger_event', inputs: {
      blockId: 'field', event: 'change', payload: { value: { template: '{{event.value}}' } }
    } }], { id: 'caller', type: 'Test', data: {} }, { value: 'yes' }).then(result => { finished = true; return result; });
    await flushPromises();
    expect(record).toHaveBeenCalledTimes(2);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ value: 'yes', owner: 'field' }));
    expect(finished).toBe(false);
    release();
    expect((await execution)?.actions.trigger.outputs.result).toHaveLength(2);
    expect(instance.getData()).toEqual({ value: 'unchanged' });
  } finally { runtime.unregisterBlock('field'); }
});

it('uses current registered events, defaults payload to {}, and isolates targets by page', async () => {
  const first = createPreviewBlockRuntime(), second = createPreviewBlockRuntime();
  const firstRecord = vi.fn(), secondRecord = vi.fn();
  const events: BlockEvent[] = [{ event: 'change', actions: [
    { uuid: 'record', action: 'call_block_method', inputs: { blockId: 'field', method: 'record', payload: { template: '{{event}}' } } }
  ] }];
  registerEvents(first, 'field', events, { record: firstRecord });
  registerEvents(second, 'field', events, { record: secondRecord });
  try {
    await first.triggerBlockEvent('field', 'change');
    expect(firstRecord.mock.calls[0][0].inputs.payload).toEqual({});
    expect(secondRecord).not.toHaveBeenCalled();
    events[0].event = 'updated';
    await expect(first.triggerBlockEvent('field', 'change')).rejects.toThrow('Configured event was not found');
    await first.triggerBlockEvent('field', 'updated', { value: 'latest' });
    first.unregisterBlock('field');
    await expect(first.triggerBlockEvent('field', 'updated')).rejects.toThrow('target block was not found');
  } finally { first.unregisterBlock('field'); second.unregisterBlock('field'); }
});

it.each(['trigger_event', 'flush_event', 'retry_event'])('rejects indirect cycles through %s without waiting indefinitely', async action => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const runtime = createPreviewBlockRuntime();
  registerEvents(runtime, 'a', [{ event: 'change', execution: { concurrency: 'serialLatest' }, actions: [
    { uuid: 'to_b', action: 'trigger_event', inputs: { blockId: 'b', event: 'change' } }
  ] }]);
  registerEvents(runtime, 'b', [{ event: 'change', execution: { concurrency: 'drop' }, actions: [
    { uuid: 'to_a', action, inputs: { blockId: 'a', event: 'change' } }
  ] }]);
  try { await expect(runtime.triggerBlockEvent('a', 'change')).rejects.toThrow('Circular event dependency'); }
  finally { runtime.unregisterBlock('a'); runtime.unregisterBlock('b'); }
});

it('propagates handler failures after running error/finally actions and rejects direct recursion', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const runtime = createPreviewBlockRuntime();
  const record = vi.fn();
  const events: BlockEvent[] = [{ event: 'change', actions: [
    { uuid: 'fail', action: 'call_block_method', inputs: { blockId: 'field', method: 'fail' } }
  ], onError: [{ uuid: 'error', action: 'call_block_method', inputs: { blockId: 'field', method: 'record', message: { template: '{{event.error.message}}' } } }],
  onFinally: [{ uuid: 'done', action: 'call_block_method', inputs: { blockId: 'field', method: 'record', message: 'done' } }] }];
  registerEvents(runtime, 'field', events, { record, fail: () => { throw new Error('Rejected'); } });
  try {
    await expect(runtime.triggerBlockEvent('field', 'change')).rejects.toThrow('Rejected');
    expect(record.mock.calls.map(([invocation]) => invocation.inputs.message)).toEqual(['Rejected', 'done']);
    events[0].actions = [{ uuid: 'self', action: 'trigger_event', inputs: { blockId: 'field', event: 'change' } }];
    await expect(runtime.triggerBlockEvent('field', 'change')).rejects.toThrow('Circular event dependency');
  } finally { runtime.unregisterBlock('field'); }
});

it('finishes an in-flight save and the latest change on unmount without updating replacement blocks', async () => {
  vi.useFakeTimers();
  const runtime = createPreviewBlockRuntime();
  const source = () => ({ id: 'form', type: 'MForm', data: {} });
  let version = 0;
  const state = { getData: () => ({ version }), merge: ({ inputs }: { inputs: { version: number } }) => { version = inputs.version; } };
  runtime.registerBlock('state', { id: 'state', type: 'MPageState', instance: state });
  runtime.registerBlock('form', { id: 'form', type: 'MForm', instance: {} });
  let release!: () => void;
  const writes: unknown[] = [];
  actionExecutors.test_lifecycle_write = async ({ inputs }) => {
    writes.push({ ...inputs });
    if (writes.length === 1) await new Promise<void>(resolve => { release = resolve; });
    return { version: Number(inputs.version) + 1 };
  };
  const config = { event: 'change', execution: { debounceMs: 400, concurrency: 'serialLatest' as const, flushOn: ['unmount' as const] }, actions: [
    { uuid: 'save', action: 'test_lifecycle_write', inputs: { version: { template: '{{blocks.state.version}}' }, note: { template: '{{event.note}}' } }, nextAction: 'ack' },
    { uuid: 'ack', action: 'call_block_method', inputs: { blockId: 'state', method: 'merge', version: { template: '{{actions.save.outputs.version}}' } } }
  ] };
  try {
    const first = runtime.invokeBlockActions(config, source(), { note: 'first' });
    await vi.advanceTimersByTimeAsync(400);
    const latest = runtime.invokeBlockActions(config, source(), { note: 'latest' });
    runtime.unregisterBlock('state');
    runtime.unregisterBlock('form');
    const replacement = { getData: () => ({ version: 100 }), merge: vi.fn() };
    runtime.registerBlock('state', { id: 'state', type: 'MPageState', instance: replacement });
    runtime.registerBlock('form', { id: 'form', type: 'MForm', instance: {} });
    release();
    await Promise.all([first, latest]);
    expect(writes).toEqual([{ version: 0, note: 'first' }, { version: 1, note: 'latest' }]);
    expect(version).toBe(2);
    expect(replacement.merge).not.toHaveBeenCalled();
  } finally {
    runtime.unregisterBlock('state'); runtime.unregisterBlock('form');
    delete actionExecutors.test_lifecycle_write;
    vi.useRealTimers();
  }
});
