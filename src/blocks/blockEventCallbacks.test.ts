// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import { createPreviewBlockRuntime, PreviewBlockRuntimeKey } from '@/runtime/previewBlockRuntime';
import { preloadMokelayBlocks } from './runtimeRegistry';
import MokelayBlockRenderer from './MokelayBlockRenderer.vue';

it.each(['MInput', 'MSelectField'])('chains %s change handlers with field value notifications exactly once', async type => {
  await preloadMokelayBlocks([type]);
  const runtime = createPreviewBlockRuntime();
  const invoke = vi.spyOn(runtime, 'invokeBlockActions').mockResolvedValue(undefined);
  const actions = [{ uuid: 'save', action: 'confirm', inputs: { content: 'test' } }];
  const wrapper = mount(MokelayBlockRenderer, {
    props: { block: { id: 'field', type, data: { value: '', options: [{ label: 'Next', value: 'next' }] }, events: [
      { event: 'change', actions }, { event: 'change', actions }
    ] } },
    global: { provide: { [PreviewBlockRuntimeKey as symbol]: runtime } }
  });
  try {
    await flushPromises();
    await wrapper.get(type === 'MInput' ? 'input' : 'select').setValue('next');
    await flushPromises();
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke.mock.calls.every(call => (call[2] as { value: string }).value === 'next')).toBe(true);
    expect(wrapper.emitted('value-change')).toEqual([['next']]);
  } finally { wrapper.unmount(); }
});
