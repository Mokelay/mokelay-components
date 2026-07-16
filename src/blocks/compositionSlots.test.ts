// @vitest-environment happy-dom

import { h } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MForm from './MForm.vue';
import MFormItem from './MFormItem.vue';
import MLayoutGrid from './MLayoutGrid.vue';

describe('runtime block composition slots', () => {
  it('lets an editor host replace the form item surface without changing form rendering ownership', () => {
    const wrapper = mount(MForm, {
      props: {
        edit: true,
        items: [{
          labelName: '姓名',
          variableName: 'name',
          layout: 'Vertical',
          editor: { id: 'name-input', type: 'MInput', data: { value: 'Alice' } }
        }]
      },
      slots: {
        items: ({ items }: { items: Array<{ variableName: string }> }) =>
          h('div', { 'data-testid': 'custom-form-items' }, items.map((item) => item.variableName).join(','))
      }
    });

    expect(wrapper.get('[data-testid="custom-form-items"]').text()).toBe('name');
    expect(wrapper.find('input').exists()).toBe(false);
  });

  it('keeps form item label/layout rendering while allowing a custom control surface', () => {
    const wrapper = mount(MFormItem, {
      props: {
        edit: true,
        labelName: '邮箱',
        variableName: 'email',
        layout: 'Horizontal'
      },
      slots: {
        control: () => h('div', { 'data-testid': 'custom-control' }, 'editor control')
      }
    });

    expect(wrapper.get('[data-testid="form-item-label-preview"]').text()).toBe('邮箱');
    expect(wrapper.get('[data-testid="custom-control"]').text()).toBe('editor control');
    expect(wrapper.classes()).toContain('ce-form-item-tool--horizontal');
  });

  it('keeps responsive grid calculation in the runtime package while exposing area contents', () => {
    const wrapper = mount(MLayoutGrid, {
      props: {
        edit: true,
        columns: [1, 2],
        areas: [
          { id: 'left', width: 1, blocks: [] },
          { id: 'right', width: 2, blocks: [] }
        ]
      },
      slots: {
        area: ({ area }: { area: { id: string } }) =>
          h('div', { 'data-testid': `custom-area-${area.id}` }, area.id)
      }
    });

    expect(wrapper.get('[data-testid="custom-area-left"]').text()).toBe('left');
    expect(wrapper.get('[data-testid="custom-area-right"]').text()).toBe('right');
    expect(wrapper.attributes('style')).toContain('--m-layout-grid-columns');
  });
});
