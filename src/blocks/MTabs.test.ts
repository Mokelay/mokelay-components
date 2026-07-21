// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MTabs, { normalizeTabs } from './MTabs.vue';

describe('MTabs', () => {
  it('preserves localized names and renders the active runtime language', () => {
    const tabs = normalizeTabs([{
      id: 'localized',
      name: { $i18n: { 'zh-CN': '账户', 'en-US': 'Account' } },
      pageUUID: 'account-page'
    }]);
    expect(tabs[0]?.name).toEqual({ $i18n: { 'zh-CN': '账户', 'en-US': 'Account' } });

    const wrapper = mount(MTabs, { props: { edit: false, tabs } });
    expect(wrapper.get('[data-testid="editor-tabs-tab-localized"]').text()).toBe('账户');
  });

  it('keeps the tab header visible when only one tab is configured', () => {
    const wrapper = mount(MTabs, {
      props: {
        edit: false,
        activeTabId: 'only-tab',
        tabs: [{
          id: 'only-tab',
          name: '唯一页签',
          pageUUID: 'single-tab-page',
          pageSource: 'system'
        }]
      }
    });

    expect(wrapper.get('[data-testid="editor-tabs-list"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="editor-tabs-tab-only-tab"]').text()).toBe('唯一页签');
    expect(wrapper.get('[data-testid="editor-tabs-tab-only-tab"]').attributes('aria-selected')).toBe('true');
  });
});
