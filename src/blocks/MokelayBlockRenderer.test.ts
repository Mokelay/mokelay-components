// @vitest-environment happy-dom

import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MPage from './MPage.vue';
import MokelayBlockRenderer from './MokelayBlockRenderer.vue';
import { registerMokelayBlock } from './runtimeRegistry';

describe('runtime block rendering', () => {
  it('renders an existing page document while edit=true stays preview-only', async () => {
    const wrapper = mount(MPage, {
      props: {
        edit: true,
        value: [
          { id: 'intro', type: 'paragraph', data: { text: 'Runtime only' } },
          { id: 'submit', type: 'MButton', data: { label: 'Continue' } },
          {
            id: 'advanced',
            type: 'MAdvanceInput',
            data: {
              edit: true,
              value: [{ id: 'segment', type: 'paragraph', data: { text: 'Structured value' } }]
            }
          }
        ]
      }
    });

    await vi.waitFor(async () => {
      await flushPromises();
      expect(wrapper.text()).toContain('Structured value');
    });

    expect(wrapper.text()).toContain('Runtime only');
    expect(wrapper.text()).toContain('Continue');
    expect(wrapper.attributes('data-edit-context')).toBe('true');
    expect(wrapper.find('.codex-editor').exists()).toBe(false);
    expect(wrapper.find('.ce-toolbar').exists()).toBe(false);
    expect(wrapper.find('[contenteditable="true"]').exists()).toBe(false);
    expect(wrapper.find('dialog').exists()).toBe(false);
  });

  it('loads a host-registered runtime block without an editor tool definition', async () => {
    const RuntimeCard = defineComponent({
      props: { title: String },
      setup(props) {
        return () => h('article', { 'data-testid': 'runtime-card' }, props.title);
      }
    });

    registerMokelayBlock('TestRuntimeCard', async () => ({ component: RuntimeCard }));
    const wrapper = mount(MokelayBlockRenderer, {
      props: {
        block: { id: 'card', type: 'TestRuntimeCard', data: { title: 'Custom runtime block' } }
      }
    });

    await flushPromises();
    await flushPromises();

    expect(wrapper.get('[data-testid="runtime-card"]').text()).toBe('Custom runtime block');
  });

  it('renders an editor selector DSL value without mounting the editor wrapper', async () => {
    const wrapper = mount(MokelayBlockRenderer, {
      props: {
        block: {
          id: 'selector',
          type: 'MEditorSelector',
          data: {
            value: {
              id: 'input',
              type: 'MInput',
              data: { placeholder: 'Runtime input' }
            }
          }
        }
      }
    });

    await vi.waitFor(async () => {
      await flushPromises();
      expect(wrapper.find('[data-testid="editor-input-tool"]').exists()).toBe(true);
    });

    expect(wrapper.find('[data-testid="preview-editor-selector-value"]').exists()).toBe(true);
    expect(wrapper.find('.codex-editor').exists()).toBe(false);
  });

  it('normalizes variable-backed select options with the configured field mapping', async () => {
    const wrapper = mount(MPage, {
      props: {
        pageId: 'runtime-page',
        dataSources: [{
          key: 'apps',
          type: 'static',
          value: { apps: [{ alias: 'CRM' }] }
        }],
        value: [{
          id: 'app-select',
          type: 'MSelectField',
          data: {
            placeholder: '请选择 APP',
            options: {
              mode: 'variable',
              source: 'MPage',
              pageId: 'runtime-page',
              variable: 'dataSources.apps.apps'
            },
            optionLabelField: 'alias',
            optionValueField: 'alias'
          }
        }]
      }
    });

    await vi.waitFor(async () => {
      await flushPromises();
      expect(wrapper.get('select').text()).toContain('CRM');
    });

    expect(wrapper.get('option[value="CRM"]').text()).toBe('CRM');
  });
});
