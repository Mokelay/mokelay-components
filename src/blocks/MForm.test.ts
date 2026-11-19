// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { defineComponent, h, markRaw } from 'vue';
import axios from 'axios';
import { configureMokelayComponents } from '@/runtime/adapter';
import MForm from './MForm.vue';
import { preloadMokelayBlocks, registerMokelayBlock } from './runtimeRegistry';
import { serializeMFormProps } from './mFormRuntime';
import { normalizeFormItemProps, serializeFormItemProps } from './mFormItemProps';
import { i18n } from '@/i18n';

afterEach(() => configureMokelayComponents({}));

it('saves and preserves field rules only on the corresponding items', () => {
  const fields = { note: { description: '旧说明', hint: '提示', visibleWhen: { field: 'kind', equals: '' } } };
  const saved = serializeMFormProps({
    items: [
      { variableName: 'kind', labelName: '类别', layout: 'Vertical' },
      { variableName: 'note', labelName: '备注', layout: 'Vertical', rules: { ...fields.note, description: '新说明' } }
    ]
  });
  expect(saved.items[0]).not.toHaveProperty('rules');
  expect(saved.items[1].rules).toEqual({ ...fields.note, description: '新说明' });
  expect(serializeMFormProps(saved)).toEqual(saved);
  const renamed = serializeFormItemProps({ ...normalizeFormItemProps(saved.items[1]), variableName: 'memo' });
  expect(renamed.rules).toEqual(saved.items[1].rules);
  expect(serializeFormItemProps({ ...renamed, rules: {} })).not.toHaveProperty('rules');
});

it('uses item-level visibility, hints, validation and read-only values without calling an API', async () => {
  await preloadMokelayBlocks(['MInput']);
  const wrapper = mount(MForm, { props: {
    edit: false, defaultValues: { total: '12.50' },
    items: [
      { variableName: 'kind', labelName: '类别', layout: 'Vertical', editor: { id: 'kind', type: 'MInput', data: {} } },
      { variableName: 'note', labelName: '备注', layout: 'Vertical', editor: { id: 'note', type: 'MInput', data: {} },
        rules: { visibleWhen: { field: 'kind', equals: 'travel' }, hint: '请填写备注', pattern: '^OK$', invalidMessage: '格式错误' } },
      { variableName: 'total', labelName: '合计', layout: 'Vertical', rules: { readOnly: true } }
    ]
  } });
  try {
    await flushPromises();
    expect(wrapper.findAll('input')).toHaveLength(1);
    expect(wrapper.get('output').text()).toBe('12.50');
    await wrapper.get('input').setValue('travel');
    await flushPromises();
    expect(wrapper.findAll('input')).toHaveLength(2);
    expect(wrapper.text()).toContain('请填写备注');
    await wrapper.vm.setValues({ note: 'bad' });
    expect(await wrapper.vm.submit()).toMatchObject({ valid: false, errors: [{ field: 'note', message: '格式错误' }] });
    await wrapper.vm.setValues({ note: 'OK' });
    expect(await wrapper.vm.submit()).toMatchObject({ valid: true, values: { total: '12.50', note: 'OK' } });
  } finally {
    wrapper.unmount();
  }
});

it('runs ordinary forms and the form editor without calling an API', async () => {
  const client = axios.create();
  const request = vi.spyOn(client, 'request');
  configureMokelayComponents({ apiClient: client });
  const wrapper = mount(MForm, { props: {
    edit: false, defaultValues: { note: 'initial' },
    items: [{ variableName: 'note', labelName: '备注', layout: 'Vertical',
      editor: { id: 'note', type: 'MInput', data: { required: true } } }]
  } });
  try {
    await wrapper.vm.setValues({ note: '' });
    expect((await wrapper.vm.submit()).valid).toBe(false);
    await wrapper.vm.reset();
    expect(await wrapper.vm.submit()).toMatchObject({ valid: true, values: { note: 'initial' } });
    await wrapper.setProps({ edit: true });
    await flushPromises();
    expect(wrapper.find('footer, header, h1').exists()).toBe(false);
    expect(request).not.toHaveBeenCalled();
  } finally {
    wrapper.unmount();
  }
});

it('renders only configured actions in both editor and preview', async () => {
  const client = axios.create();
  const request = vi.spyOn(client, 'request').mockResolvedValue({ data: { ok: true, data: { record: { id: 'doc', version: 0 } } } });
  configureMokelayComponents({ apiClient: client });
  const wrapper = mount(MForm, { props: {
    edit: true,
    actionBar: { buttons: [{ id: 'custom', label: '确认申请', events: [] }] }
  } });
  try {
    expect(wrapper.get('button').text()).toBe('确认申请');
    await wrapper.get('button').trigger('click');
    expect(request).not.toHaveBeenCalled();
    await wrapper.setProps({ edit: false });
    await flushPromises();
    expect(wrapper.get('button').text()).toBe('确认申请');
    await wrapper.get('button').trigger('click');
    expect(request).not.toHaveBeenCalled();
    await wrapper.setProps({ actionBar: { buttons: [{ id: 'custom', label: '' }] } });
    expect(wrapper.get('button').text()).toBe('');
    await wrapper.setProps({ actionBar: { buttons: [] } });
    expect(wrapper.find('button').exists()).toBe(false);
    await wrapper.setProps({ edit: true });
    expect(wrapper.find('button').exists()).toBe(false);
  } finally {
    wrapper.unmount();
  }
});

it('emits init after async controls are ready and emits value changes only when requested', async () => {
  await preloadMokelayBlocks(['MInput', 'MSelectField']);
  const wrapper = mount(MForm, { props: { edit: false,
    items: [
      { variableName: 'name', labelName: 'Name', layout: 'Vertical', editor: { id: 'name', type: 'MInput', data: { value: 'initial' } } },
      { variableName: 'kind', labelName: 'Kind', layout: 'Vertical', editor: { id: 'kind', type: 'MSelectField', data: { options: [{ value: 'a', label: 'A' }] } } }
    ]
  } });
  try {
    expect(wrapper.emitted('init')).toBeUndefined();
    await flushPromises();
    expect(wrapper.emitted('init')).toHaveLength(1);
    expect(wrapper.emitted('init')![0][0]).toEqual({ values: { name: 'initial', kind: '' } });
    await wrapper.get('input').setValue('typed');
    expect(wrapper.emitted('change')![0][0]).toMatchObject({ values: { name: 'typed' }, changedFields: ['name'], source: 'user' });
    await wrapper.vm.setValues({ values: { name: 'restored' } });
    await wrapper.vm.setValues({ inputs: { values: { name: 'restored' }, emitChange: true } });
    expect(wrapper.emitted('change')).toHaveLength(1);
    await wrapper.vm.setValues({ inputs: { values: { name: 'explicit' }, emitChange: true } });
    expect(wrapper.emitted('change')).toHaveLength(2);
    wrapper.vm.setFieldOptions({ args: { options: { kind: [{ value: 'b', label: 'B' }] } } });
    await flushPromises();
    expect(wrapper.get('select').text()).toContain('B');
    expect(wrapper.emitted('init')).toHaveLength(1);
    await wrapper.vm.reset({ args: { emitChange: true } });
    expect(wrapper.emitted('change')!.at(-1)![0]).toMatchObject({ values: { name: 'initial', kind: '' }, source: 'programmatic' });
    wrapper.vm.setStatus({ args: { disabled: true } });
    await flushPromises();
    expect(wrapper.get('input').attributes('disabled')).toBeDefined();
  } finally { wrapper.unmount(); }
});

it('waits for a delayed field renderer and never initializes a disposed form', async () => {
  let resolveField!: (definition: { component: ReturnType<typeof defineComponent> }) => void;
  registerMokelayBlock('DelayedField', () => new Promise(resolve => { resolveField = resolve; }));
  const props = { edit: false, items: [{ variableName: 'delayed', labelName: 'Delayed', layout: 'Vertical' as const,
    editor: { id: 'delayed', type: 'DelayedField', data: {} } }] };
  const removed = mount(MForm, { props });
  const visible = mount(MForm, { props });
  await flushPromises();
  expect(visible.emitted('init')).toBeUndefined();
  removed.unmount();
  resolveField({ component: markRaw(defineComponent({ render: () => h('input', { 'data-testid': 'delayed' }) })) });
  await flushPromises();
  expect(visible.find('[data-testid="delayed"]').exists()).toBe(true);
  expect(visible.emitted('init')).toHaveLength(1);
  expect(removed.emitted('init')).toBeUndefined();
  visible.unmount();
});

it('controls hints through presentation status without emitting form changes or hiding descriptions', async () => {
  const wrapper = mount(MForm, { props: { edit: false, items: [
    { variableName: 'note', labelName: 'Note', layout: 'Vertical', rules: { hint: 'Hint', description: 'Always visible' } }
  ] } });
  try {
    await flushPromises();
    expect(wrapper.find('.ce-form-tool__hint').exists()).toBe(true);
    wrapper.vm.setStatus({ args: { showHints: true } });
    await flushPromises();
    expect(wrapper.get('.ce-form-tool__hint').text()).toBe('Hint');
    await wrapper.vm.setValues({ note: 'silent' });
    await wrapper.vm.reset();
    expect(wrapper.get('.ce-form-tool__hint').text()).toBe('Hint');
    wrapper.vm.setStatus({ inputs: { showHints: false } });
    await flushPromises();
    expect(wrapper.find('.ce-form-tool__hint').exists()).toBe(false);
    expect(wrapper.get('.ce-form-tool__description').text()).toBe('Always visible');
    expect(wrapper.emitted('change')).toBeUndefined();
  } finally { wrapper.unmount(); }
});

it('localizes required labels and validation without a presentation mode', async () => {
  await preloadMokelayBlocks(['MInput']);
  const locale = i18n.locale;
  const wrapper = mount(MForm, { props: { edit: false, items: [
    { variableName: 'name', labelName: { $i18n: { 'zh-CN': '姓名', 'en-US': 'Name' } }, layout: 'Vertical',
      editor: { id: 'name', type: 'MInput', data: { required: true } } }
  ] } });
  try {
    await flushPromises();
    for (const [language, message] of [['zh', '请填写姓名。'], ['en', 'Name is required.']] as const) {
      i18n.setLocale(language);
      expect(await wrapper.vm.submit()).toMatchObject({ valid: false, errors: [{ message }] });
      await flushPromises();
      expect(wrapper.get('.ce-form-tool__required').text()).toBe('*');
      expect(wrapper.get('[role=alert]').text()).toBe(message);
    }
    expect(wrapper.find('header, h1').exists()).toBe(false);
  } finally { wrapper.unmount(); i18n.setLocale(locale); }
});
