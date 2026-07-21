import { defineAsyncComponent, markRaw, type Component } from 'vue';
import {
  resolveLayoutTemplates,
  type LayoutRuntimeContext
} from '@/layouts/runtime';
import type { LayoutBlock } from '@/layouts/domain';
import {
  normalizeTopNavProps,
  resolveTopNavBlockData
} from '@/layouts/topNavRuntime';
import { resolveLayoutLocalizedTree } from '@/layouts/localization';

export type LayoutBlockKind = 'component' | 'pageSlot' | 'conditional';

export type LayoutBlockDefinition = {
  type: string;
  kind: LayoutBlockKind;
  component?: Component;
  resolveData?: (data: unknown, context: LayoutRuntimeContext, block: LayoutBlock) => unknown;
  normalizeProps?: (input: {
    block: LayoutBlock;
    data: Record<string, unknown>;
    context: LayoutRuntimeContext;
  }) => Record<string, unknown>;
};

const topNavTypes = new Set(['MSiteTopNav', 'MEditorTopNav', 'MWebTopNav', 'MTopNav']);

const layoutBlockRegistry: Record<string, LayoutBlockDefinition> = {};

registerLayoutBlock({
  type: 'MPageSlot',
  kind: 'pageSlot'
});

registerLayoutBlock({
  type: 'MIf',
  kind: 'conditional'
});

registerTopNavBlock('MSiteTopNav', markRaw(defineAsyncComponent(() => import('@/layouts/MSiteTopNav.vue'))));
registerTopNavBlock('MEditorTopNav', markRaw(defineAsyncComponent(() => import('@/layouts/MEditorTopNav.vue'))));
registerTopNavBlock('MWebTopNav', markRaw(defineAsyncComponent(() => import('@/layouts/MWebTopNav.vue'))));
registerTopNavBlock('MTopNav', markRaw(defineAsyncComponent(() => import('@/layouts/MTopNav.vue'))));

registerLayoutBlock({
  type: 'MInternalAdminShell',
  kind: 'component',
  component: markRaw(defineAsyncComponent(() => import('@/layouts/MInternalAdminShell.vue'))),
  normalizeProps: ({ data, context }) => ({
    data,
    context
  })
});

export function defineLayoutBlock(definition: LayoutBlockDefinition) {
  return definition;
}

export function registerLayoutBlock(definition: LayoutBlockDefinition) {
  if (layoutBlockRegistry[definition.type]) {
    throw new Error(`Layout block "${definition.type}" is already registered.`);
  }

  layoutBlockRegistry[definition.type] = definition;
  return definition;
}

export function getLayoutBlockDefinition(type: string) {
  return layoutBlockRegistry[type];
}

export function isRegisteredLayoutBlock(type: string) {
  return type in layoutBlockRegistry;
}

export function getLayoutBlockRegistry() {
  return layoutBlockRegistry;
}

function registerTopNavBlock(type: string, component: Component) {
  registerLayoutBlock({
    type,
    kind: 'component',
    component,
    resolveData: resolveTopNavBlockData,
    normalizeProps: ({ data, context }) => ({
      ...normalizeTopNavProps(data, context),
      ...(type !== 'MTopNav' ? { variant: readDefaultTopNavVariant(type) } : {})
    })
  });
}

function readDefaultTopNavVariant(type: string) {
  if (!topNavTypes.has(type)) return undefined;
  if (type === 'MEditorTopNav') return 'editor';
  if (type === 'MWebTopNav') return 'web';
  if (type === 'MSiteTopNav') return 'site';
  return undefined;
}

export function defaultResolveLayoutBlockData(data: unknown, context: LayoutRuntimeContext) {
  const value = resolveLayoutLocalizedTree(resolveLayoutTemplates(data ?? {}, context), context.layout);
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
