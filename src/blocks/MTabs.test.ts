// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MTabs from './MTabs.vue';

describe('MTabs', () => {
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
