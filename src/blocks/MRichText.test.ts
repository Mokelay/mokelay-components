// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, reactive } from 'vue';
import { expect, it } from 'vitest';
import MRichText, { normalizeRichTextProps } from './MRichText.vue';
import MPageState from './MPageState.vue';
import MokelayBlockRenderer from './MokelayBlockRenderer.vue';
import { preloadMokelayBlocks } from './runtimeRegistry';
import { createPreviewBlockRuntime, PreviewBlockRuntimeKey } from '@/runtime/previewBlockRuntime';

it('preserves empty text, static content and editable variable bindings', async () => {
  const binding = reactive({ mode: 'variable' as const, source: 'Block' as const, blockId: 'state', variable: 'message' });
  expect(normalizeRichTextProps({ content: binding }).content).toEqual(binding);
  const wrapper = mount(MRichText, { props: { edit: false, content: '' } });
  try {
    expect(wrapper.text()).toBe('');
    await wrapper.setProps({ content: 'A\nB' });
    expect(wrapper.text()).toBe('A\nB');
    await wrapper.setProps({ edit: true, content: binding });
    expect(wrapper.text()).not.toContain('[object Object]');
    expect(wrapper.text()).not.toContain('"blockId"');
    expect(wrapper.text()).not.toBe('');
    await wrapper.setProps({ content: { mode: 'input', value: '' } });
    expect(wrapper.text()).toBe('');
  } finally { wrapper.unmount(); }
});

it('updates bound status text from page state without displaying a placeholder for empty values', async () => {
  await preloadMokelayBlocks(['MPageState', 'MRichText']);
  const blocks = [
    { id: 'state', type: 'MPageState', data: { initialState: { message: '' } } },
    { id: 'status', type: 'MRichText', data: { content: { mode: 'variable', source: 'Block', blockId: 'state', variable: 'message' } } }
  ];
  const runtime = createPreviewBlockRuntime();
  const wrapper = mount(defineComponent({ setup: () => () => h('div', blocks.map(block => h(MokelayBlockRenderer, { block }))) }), {
    global: { provide: { [PreviewBlockRuntimeKey as symbol]: runtime } }
  });
  try {
    await flushPromises();
    const text = wrapper.get('[data-testid=page-dsl-block-MRichText]');
    expect(text.text()).toBe('');
    wrapper.getComponent(MPageState).vm.merge({ value: { message: 'Saved' } });
    await flushPromises();
    expect(text.text()).toBe('Saved');
    wrapper.getComponent(MPageState).vm.merge({ value: { message: '' } });
    await flushPromises();
    expect(text.text()).toBe('');
  } finally { wrapper.unmount(); }
});
