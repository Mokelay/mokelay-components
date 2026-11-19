import { afterEach, expect, it, vi } from 'vitest';
import { createEventScheduler } from './eventScheduler';
import { normalizeBlockEvents } from '@/blocks/blockEvents';
import { runActionGraph } from '@/actions/runner';
import { actionExecutors } from '@/actions/executors';
import { UnconfirmedRequestError } from '@/datasource/datasource';
const source = { id: 'form', type: 'MForm', data: {} };
const config = { event: 'change', actions: [{ uuid: 'save', action: 'save' }], execution: { concurrency: 'serialLatest' as const, debounceMs: 400 } };
afterEach(() => { vi.useRealTimers(); delete actionExecutors.test_write; delete actionExecutors.test_ack; });

it('debounces changes, serializes slow writes, and flushes the latest pending value', async () => {
  vi.useFakeTimers();
  let complete!: () => void;
  const gate = new Promise<void>(resolve => { complete = resolve; });
  const execute = vi.fn().mockImplementationOnce(() => gate).mockResolvedValue(undefined);
  const scheduler = createEventScheduler(execute, vi.fn());
  const first = scheduler.invoke(config, source, { value: 'a' });
  const second = scheduler.invoke(config, source, { value: 'b' });
  await vi.advanceTimersByTimeAsync(400);
  expect(execute).toHaveBeenCalledTimes(1);
  expect(execute.mock.calls[0][2]).toEqual({ value: 'b' });
  const third = scheduler.invoke(config, source, { value: 'c' });
  const fourth = scheduler.invoke(config, source, { value: 'd' });
  const flush = scheduler.control('flush', 'form', 'change');
  expect(execute).toHaveBeenCalledTimes(1);
  complete(); await flush; await Promise.all([first, second, third, fourth]);
  expect(execute.mock.calls.map(call => call[2])).toEqual([{ value: 'b' }, { value: 'd' }]);
});

it('replays the failed node with original inputs before a newer change and refreshes version between jobs', async () => {
  let version = 0;
  const writes: unknown[] = [];
  actionExecutors.test_write = async ({ inputs }) => {
    writes.push(structuredClone(inputs));
    if (writes.length === 1) throw new UnconfirmedRequestError('lost response');
    return { version: Number(inputs.version) + 1 };
  };
  actionExecutors.test_ack = ({ inputs }) => { version = Number(inputs.version); return {}; };
  const execute = (actions: unknown, sourceBlock: Parameters<typeof runActionGraph>[0]['sourceBlock'], event: unknown, checkpoint?: Parameters<typeof runActionGraph>[0]['checkpoint']) => runActionGraph({
    actions, sourceBlock, event, checkpoint, getBlockDataContext: async () => ({ state: { version } }), callBlockMethod: vi.fn()
  });
  const scheduler = createEventScheduler(execute, vi.fn());
  const event = { event: 'change', execution: { concurrency: 'serialLatest' as const, retry: 'resumeUnconfirmed' as const }, actions: [
    { uuid: 'save', action: 'test_write', inputs: { version: { template: '{{blocks.state.version}}' }, value: { template: '{{event.value}}' } }, nextAction: 'ack' },
    { uuid: 'ack', action: 'test_ack', inputs: { version: { template: '{{actions.save.outputs.version}}' } } }
  ] };
  await expect(scheduler.invoke(event, source, { value: 'first' })).rejects.toThrow('lost response');
  await scheduler.invoke(event, source, { value: 'latest' });
  expect(writes).toEqual([{ version: 0, value: 'first' }, { version: 0, value: 'first' }, { version: 1, value: 'latest' }]);
  expect(version).toBe(2);
});

it('drops double clicks, runs error/finally hooks, and never automatically replays a business rejection', async () => {
  const report = vi.fn();
  const execute = vi.fn().mockRejectedValueOnce(new Error('invalid')).mockResolvedValue(undefined);
  const scheduler = createEventScheduler(execute, report);
  const event = { event: 'click', execution: { concurrency: 'drop' as const }, actions: [{ uuid: 'send', action: 'execute_ds' }], onError: [{ uuid: 'error', action: 'call_block_method' }], onFinally: [{ uuid: 'finish', action: 'call_block_method' }] };
  const first = scheduler.invoke(event, source, {});
  const second = scheduler.invoke(event, source, {});
  await expect(first).rejects.toThrow('invalid');
  await expect(second).rejects.toThrow('invalid');
  expect(execute).toHaveBeenCalledTimes(3);
  await expect(scheduler.control('flush', 'form', 'click')).rejects.toThrow('invalid');
  expect(execute).toHaveBeenCalledTimes(3);
  expect(report).not.toHaveBeenCalled();
});

it('preserves execution and lifecycle action configuration through normalization', () => {
  const events = [{ ...config, execution: { ...config.execution, retry: 'resumeUnconfirmed', flushOn: ['hidden', 'unmount'] }, onError: [{ uuid: 'error', action: 'call_block_method' }], onFinally: [{ uuid: 'done', action: 'call_block_method' }] }];
  expect(normalizeBlockEvents(normalizeBlockEvents(events))).toEqual(normalizeBlockEvents(events));
  expect(normalizeBlockEvents(events)[0].execution?.flushOn).toEqual(['hidden', 'unmount']);
});

it('flushes only opted-in hidden events and isolates queues with the same IDs across pages', async () => {
  vi.useFakeTimers();
  const execute = vi.fn().mockResolvedValue(undefined);
  const firstPage = createEventScheduler(execute, vi.fn());
  const secondPage = createEventScheduler(execute, vi.fn());
  const hidden = { ...config, execution: { ...config.execution, flushOn: ['hidden' as const] } };
  const first = firstPage.invoke(hidden, source, { page: 1 });
  const second = secondPage.invoke(config, source, { page: 2 });
  firstPage.flushLifecycle('hidden');
  await first;
  expect(execute.mock.calls.map(call => call[2])).toEqual([{ page: 1 }]);
  secondPage.flushLifecycle('unmount');
  await second;
  await vi.advanceTimersByTimeAsync(500);
  expect(execute).toHaveBeenCalledTimes(1);
});

it('coalesces simultaneous flushes while a failed event is being retried', async () => {
  let finish!: () => void;
  const execute = vi.fn().mockRejectedValueOnce(new Error('rejected'))
    .mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  const scheduler = createEventScheduler(execute, vi.fn());
  await expect(scheduler.invoke({ ...config, execution: {} }, source, {})).rejects.toThrow('rejected');
  const retry = scheduler.control('retry', 'form', 'change');
  const flush = scheduler.control('flush', 'form', 'change');
  finish();
  await Promise.all([retry, flush]);
  expect(execute).toHaveBeenCalledTimes(2);
});

it('snapshots form data without discarding native browser event properties', async () => {
  vi.useFakeTimers();
  const execute = vi.fn().mockResolvedValue(undefined);
  const scheduler = createEventScheduler(execute, vi.fn());
  const nativeEvent = new Event('click');
  const payload = { values: { note: 'original' }, nativeEvent };
  const result = scheduler.invoke(config, source, payload);
  payload.values.note = 'new value';
  await scheduler.control('flush', 'form', 'change');
  await result;
  expect(execute.mock.calls[0][2].values).toEqual({ note: 'original' });
  expect(execute.mock.calls[0][2].nativeEvent.type).toBe('click');
  expect(execute.mock.calls[0][4]).toBe(config);
});
