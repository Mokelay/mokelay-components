// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { configureMokelayComponents } from '@/runtime/adapter';
import LayoutRenderer from './LayoutRenderer.vue';

describe('LayoutRenderer runtime loading', () => {
  it('does not resolve resource templates before resources and auth are ready', async () => {
    let resolveAuth!: (value: unknown) => void;
    const authResponse = new Promise((resolve) => {
      resolveAuth = resolve;
    });
    const get = vi.fn(() => authResponse);
    configureMokelayComponents({ apiClient: { get } as never });

    const wrapper = mount(LayoutRenderer, {
      props: {
        layout: {
          schemaVersion: 1,
          uuid: 'editor-layout',
          name: 'Editor layout',
          auth: { enabled: true, endpoint: '/api/mokelay/me' },
          resources: {
            mainMenu: {
              type: 'static',
              items: [{ label: 'Home', href: '#/' }]
            }
          },
          blocks: [{
            id: 'nav',
            type: 'MEditorTopNav',
            data: { items: { template: '{{resources.mainMenu.items}}' } }
          }]
        },
        page: {
          uuid: 'home',
          name: 'Home',
          blocks: [],
          subPage: false,
          quotes: [],
          dependencies: []
        }
      }
    });

    expect(wrapper.find('[data-testid="layout-runtime-loading"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="layout-block-error"]').exists()).toBe(false);

    resolveAuth({ data: { ok: true, data: { loggedIn: false, user: null } } });
    await vi.waitFor(async () => {
      await flushPromises();
      expect(wrapper.find('[data-testid="layout-runtime-loading"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="layout-top-nav"]').exists()).toBe(true);
    });

    expect(wrapper.text()).toContain('Home');
    expect(wrapper.find('[data-testid="layout-block-error"]').exists()).toBe(false);

    await wrapper.setProps({
      page: {
        uuid: 'docs',
        name: 'Docs',
        blocks: [],
        subPage: false,
        quotes: [],
        dependencies: []
      }
    });
    await flushPromises();
    expect(get).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="layout-runtime-loading"]').exists()).toBe(false);
  });

  it('delegates internal layout links when a navigation handler is provided', async () => {
    configureMokelayComponents({});
    const onNavigate = vi.fn();
    const wrapper = mount(LayoutRenderer, {
      props: {
        onNavigate,
        layout: {
          schemaVersion: 1,
          uuid: 'editor-layout',
          name: 'Editor layout',
          resources: {
            mainMenu: {
              type: 'static',
              items: [{ label: 'Docs', href: '#/docs' }]
            }
          },
          blocks: [{
            id: 'nav',
            type: 'MEditorTopNav',
            data: { items: { template: '{{resources.mainMenu.items}}' } }
          }]
        },
        page: {
          uuid: 'home',
          name: 'Home',
          blocks: [],
          subPage: false,
          quotes: [],
          dependencies: []
        }
      }
    });

    await flushPromises();
    await wrapper.get('a[href="#/docs"]').trigger('click');
    expect(onNavigate).toHaveBeenCalledWith({ href: '#/docs', route: '/docs' });
  });

  it('renders layout translations independently from page locale configuration', async () => {
    configureMokelayComponents({ getGlobalSetting: (key) => key === 'language' ? 'en' : 'light' });
    const wrapper = mount(LayoutRenderer, {
      props: {
        layout: {
          schemaVersion: 1,
          uuid: 'localized-layout',
          name: 'Localized layout',
          localeConfig: { defaultLocale: 'zh-CN', supportedLocales: ['zh-CN', 'en-US'] },
          resources: {
            mainMenu: {
              type: 'static',
              items: [{ label: { $i18n: { 'zh-CN': '首页', 'en-US': 'Home' } }, href: '#/' }]
            }
          },
          blocks: [{
            id: 'nav',
            type: 'MEditorTopNav',
            data: {
              brand: { text: { $i18n: { 'zh-CN': '编辑器', 'en-US': 'Editor' } } },
              items: { template: '{{resources.mainMenu.items}}' }
            }
          }]
        },
        page: {
          uuid: 'home',
          name: 'Home',
          blocks: [],
          localeConfig: { defaultLocale: 'zh-CN', supportedLocales: ['zh-CN'] },
          subPage: false,
          quotes: [],
          dependencies: []
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Editor');
    expect(wrapper.text()).toContain('Home');
    expect(wrapper.text()).not.toContain('$i18n');
  });
});
