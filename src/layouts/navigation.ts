export type LayoutNavigationRequest = {
  href: string;
  route: string;
};

export type LayoutNavigateHandler = (request: LayoutNavigationRequest) => void;

export function resolveLayoutNavigation(anchor: HTMLAnchorElement): LayoutNavigationRequest | null {
  const href = anchor.getAttribute('href')?.trim() ?? '';
  if (!href || href === '#' || anchor.hasAttribute('download')) return null;
  if (href.startsWith('#') && !href.startsWith('#/')) return null;

  const target = anchor.getAttribute('target')?.trim().toLowerCase();
  if (target && target !== '_self') return null;
  if (/^(?:mailto|tel|javascript|data):/i.test(href)) return null;

  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return null;

    const route = url.hash.startsWith('#/')
      ? url.hash.slice(1)
      : `${url.pathname}${url.search}`;

    return route ? { href, route } : null;
  } catch {
    return null;
  }
}

export function shouldHandleLayoutNavigation(event: MouseEvent) {
  return event.button === 0
    && !event.defaultPrevented
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
    && !event.altKey;
}
