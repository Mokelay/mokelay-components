// @vitest-environment happy-dom

import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MPage from './MPage.vue';
import MHeading from './MHeading.vue';
import MokelayBlockRenderer from './MokelayBlockRenderer.vue';
import { registerMokelayBlock } from './runtimeRegistry';
import { configureMokelayComponents } from '@/runtime/adapter';

describe('runtime block rendering', () => {
  it('renders localized headings when mounted directly by the editor', async () => {
    configureMokelayComponents({ getGlobalSetting: (key) => key === 'language' ? 'en' : 'light' });
    const wrapper = mount(MHeading, {
      props: {
        edit: true,
        text: { $i18n: { 'zh-CN': '页面标题', 'en-US': 'Page title' } }
      }
    });

    expect(wrapper.get('h1').text()).toBe('Page title');
    expect(wrapper.text()).not.toContain('$i18n');
    configureMokelayComponents({});
  });

  it('resolves localized input placeholders from the host language', async () => {
    configureMokelayComponents({ getGlobalSetting: (key) => key === 'language' ? 'en' : 'light' });
    const wrapper = mount(MPage, {
      props: {
        localeConfig: { defaultLocale: 'zh-CN', supportedLocales: ['zh-CN', 'en-US'] },
        value: [{ id: 'keyword', type: 'MInput', data: { placeholder: { $i18n: { 'zh-CN': '请输入', 'en-US': 'Enter' } } } }]
      }
    });
    await vi.waitFor(async () => {
      await flushPromises();
      expect(wrapper.get('input').attributes('placeholder')).toBe('Enter');
    });
    configureMokelayComponents({});
  });

  it('resolves localized paragraph HTML before inline templates', async () => {
    configureMokelayComponents({ getGlobalSetting: (key) => key === 'language' ? 'en' : 'light' });
    const wrapper = mount(MPage, {
      props: {
        pageId: 'localized-page',
        localeConfig: { defaultLocale: 'zh-CN', supportedLocales: ['zh-CN', 'en-US'] },
        dataSources: [{ key: 'profile', type: 'static', value: { name: 'Ada' } }],
        value: [{
          id: 'intro',
          type: 'paragraph',
          data: {
            text: {
              $i18n: {
                'zh-CN': '<b>你好</b>',
                'en-US': '<strong>Hello {{ dataSources.profile.name }}</strong>'
              }
            }
          }
        }]
      }
    });

    await flushPromises();
    expect(wrapper.get('p').html()).toContain('<strong>Hello Ada</strong>');
    configureMokelayComponents({});
  });

  it('resolves localized blocks nested in advance-table cells', async () => {
    configureMokelayComponents({ getGlobalSetting: (key) => key === 'language' ? 'en' : 'light' });
    const wrapper = mount(MPage, {
      props: {
        localeConfig: { defaultLocale: 'zh-CN', supportedLocales: ['zh-CN', 'en-US'] },
        value: [{
          id: 'docs',
          type: 'MAdvanceTable',
          data: {
            rows: [{}],
            columns: [{
              columnName: { $i18n: { 'zh-CN': '操作', 'en-US': 'Actions' } },
              columnContent: [{
                id: 'enable',
                type: 'MButton',
                data: { label: { $i18n: { 'zh-CN': '启用', 'en-US': 'Enable' } } }
              }]
            }]
          }
        }]
      }
    });

    await vi.waitFor(async () => {
      await flushPromises();
      expect(wrapper.get('button').text()).toBe('Enable');
    });
    expect(wrapper.text()).toContain('Actions');
    configureMokelayComponents({});
  });

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
