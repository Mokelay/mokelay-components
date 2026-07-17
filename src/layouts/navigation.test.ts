// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import { resolveLayoutNavigation, shouldHandleLayoutNavigation } from './navigation';

function anchor(href: string, attributes: Record<string, string> = {}) {
  const element = document.createElement('a');
  element.setAttribute('href', href);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

describe('layout navigation', () => {
  it('normalizes same-origin hash and path links', () => {
    expect(resolveLayoutNavigation(anchor('#/docs'))).toEqual({ href: '#/docs', route: '/docs' });
    expect(resolveLayoutNavigation(anchor('/setting?tab=profile'))).toEqual({
      href: '/setting?tab=profile',
      route: '/setting?tab=profile'
    });
  });

  it('leaves non-client navigation links to the browser', () => {
    expect(resolveLayoutNavigation(anchor('#'))).toBeNull();
    expect(resolveLayoutNavigation(anchor('#features'))).toBeNull();
    expect(resolveLayoutNavigation(anchor('https://example.com/docs'))).toBeNull();
    expect(resolveLayoutNavigation(anchor('/download', { download: '' }))).toBeNull();
    expect(resolveLayoutNavigation(anchor('/docs', { target: '_blank' }))).toBeNull();
    expect(resolveLayoutNavigation(anchor('mailto:hello@example.com'))).toBeNull();
  });

  it('only handles an unmodified primary-button click', () => {
    expect(shouldHandleLayoutNavigation(new MouseEvent('click', { button: 0 }))).toBe(true);
    expect(shouldHandleLayoutNavigation(new MouseEvent('click', { button: 1 }))).toBe(false);
    expect(shouldHandleLayoutNavigation(new MouseEvent('click', { ctrlKey: true }))).toBe(false);
  });
});
