import type { ComputedRef, InjectionKey } from 'vue';

export const PageReferenceAncestryKey: InjectionKey<ComputedRef<readonly string[]>> = Symbol('PageReferenceAncestry');

export function appendPageReferenceAncestry(ancestry: readonly string[], pageUuid: unknown) {
  const uuid = typeof pageUuid === 'string' ? pageUuid.trim() : '';
  if (!uuid || ancestry.includes(uuid)) return [...ancestry];
  return [...ancestry, uuid];
}
