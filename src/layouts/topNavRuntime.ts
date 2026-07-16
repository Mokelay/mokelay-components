import {
  resolveLayoutTemplates,
  type LayoutRuntimeContext
} from '@/layouts/runtime';
import {
  getGlobalSettingValue,
  setGlobalSettingValue
} from '@/runtime/globalSettingsRuntime';
import type { LayoutBlock, LayoutMenuItem } from '@/layouts/domain';
import type { TopNavBrand, TopNavControl, TopNavProps } from '@/layouts/topNavTypes';

const actionVariants = new Set(['primary', 'secondary', 'ghost', 'teal', 'success', 'web-primary']);
const actionShapes = new Set(['default', 'icon', 'avatar']);

export const topNavIconPaths: Record<string, string> = {
  search: 'M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  user: 'M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  download: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.6 9h16.8M3.6 15h16.8M12 3c2.2 2.4 3.3 5.4 3.3 9s-1.1 6.6-3.3 9c-2.2-2.4-3.3-5.4-3.3-9s1.1-6.6 3.3-9Z'
};

export function normalizeHref(value: string) {
  const href = value.trim();
  return href || '#';
}

export function readBlockData(block: LayoutBlock) {
  return block.data && typeof block.data === 'object' ? block.data : {};
}

export function getActionLabel(block: LayoutBlock) {
  const data = readBlockData(block);
  if (block.type === 'MLink') return readString(data.text) || readString(data.label) || '';
  return readString(data.label) || readString(data.text) || '';
}

export function getActionHref(block: LayoutBlock) {
  const data = readBlockData(block);
  const action = data.action;

  if (block.type === 'MLink') {
    return normalizeHref(readString(data.url) || readString(data.href) || '#');
  }

  if (isRecord(action) && action.type === 'link') {
    return normalizeHref(readString(action.url) || readString(action.href) || '#');
  }

  return '';
}

export function getActionVariant(block: LayoutBlock) {
  const rawVariant = readString(readBlockData(block).variant);
  return actionVariants.has(rawVariant) ? rawVariant : 'primary';
}

export function getActionShape(block: LayoutBlock) {
  const rawShape = readString(readBlockData(block).shape);
  return actionShapes.has(rawShape) ? rawShape : 'default';
}

export function getActionIcon(block: LayoutBlock) {
  return readString(readBlockData(block).icon);
}

export function getActionBadge(block: LayoutBlock) {
  return readString(readBlockData(block).badge);
}

export function getActionAriaLabel(block: LayoutBlock) {
  return getActionLabel(block) || getActionIcon(block) || block.id || block.type;
}

export function getMenuItemBadge(item: LayoutMenuItem) {
  return readString(item.badge);
}

export function getMenuItemTone(item: LayoutMenuItem) {
  return readString(item.tone);
}

export function getVisibleTopNavActions(props: Pick<TopNavProps, 'actions' | 'guestActions' | 'userActions' | 'auth'>) {
  const directActions = props.actions ?? [];
  const authActions = props.auth?.loggedIn ? props.userActions ?? [] : props.guestActions ?? [];
  return [...directActions, ...authActions];
}

export function controlValue(control: TopNavControl) {
  const globalSettingValue = readGlobalSettingControlValue(control);
  if (globalSettingValue) return globalSettingValue;

  return control.value || control.options?.[0]?.value || '';
}

export function controlLabel(control: TopNavControl) {
  return control.label || control.id || 'Navigation option';
}

export function handleControlChange(control: TopNavControl, value: string) {
  const key = readGlobalSettingControlKey(control);
  if (key) {
    setGlobalSettingValue(key, value);
  }
}

export function resolveTopNavBlockData(data: unknown, context: LayoutRuntimeContext) {
  const source = isRecord(data) ? data : {};
  const activeActionKey = context.auth.loggedIn ? 'userActions' : 'guestActions';
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if ((key === 'guestActions' || key === 'userActions') && key !== activeActionKey) {
      result[key] = [];
      continue;
    }

    result[key] = resolveLayoutTemplates(value, context);
  }

  return result;
}

export function normalizeTopNavProps(data: unknown, context: LayoutRuntimeContext): TopNavProps {
  const source = isRecord(data) ? data : {};

  return {
    variant: readString(source.variant),
    brand: normalizeTopNavBrand(source.brand),
    homeAction: normalizeLayoutBlock(source.homeAction),
    utilityControls: normalizeTopNavControls(source.utilityControls),
    items: Array.isArray(source.items) ? source.items as LayoutMenuItem[] : [],
    actions: normalizeLayoutBlocks(source.actions),
    guestActions: normalizeLayoutBlocks(source.guestActions),
    userActions: normalizeLayoutBlocks(source.userActions),
    auth: context.auth
  };
}

export function normalizeLayoutBlocks(value: unknown): LayoutBlock[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((block): block is Record<string, unknown> => isRecord(block))
    .map((block) => normalizeLayoutBlock(block))
    .filter((block): block is LayoutBlock => Boolean(block));
}

export function normalizeLayoutBlock(value: unknown): LayoutBlock | undefined {
  if (!isRecord(value)) return undefined;

  return {
    id: readString(value.id),
    type: readString(value.type) || 'unknown',
    data: isRecord(value.data) ? value.data : {},
    events: Array.isArray(value.events) ? value.events : undefined,
    slots: normalizeLayoutBlockSlots(value.slots)
  };
}

export function readString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeTopNavBrand(value: unknown): TopNavBrand | undefined {
  if (!isRecord(value)) return undefined;

  return {
    text: readString(value.text) || undefined,
    href: readString(value.href) || undefined,
    showMark: typeof value.showMark === 'boolean' ? value.showMark : undefined
  };
}

function normalizeTopNavControls(value: unknown): TopNavControl[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((control): control is Record<string, unknown> => isRecord(control))
    .map((control) => ({
      id: readString(control.id) || undefined,
      type: readString(control.type) || 'select',
      label: readString(control.label) || undefined,
      value: readString(control.value) || undefined,
      binding: normalizeTopNavControlBinding(control.binding),
      options: Array.isArray(control.options)
        ? control.options
            .filter((option): option is Record<string, unknown> => isRecord(option))
            .map((option) => ({
              label: readString(option.label),
              value: readString(option.value)
            }))
            .filter((option) => option.label && option.value)
        : []
    }));
}

function readGlobalSettingControlValue(control: TopNavControl) {
  return getGlobalSettingValue(readGlobalSettingControlKey(control));
}

function readGlobalSettingControlKey(control: TopNavControl) {
  if (control.binding?.source !== 'globalSetting') return '';

  const key = control.binding.key;
  return key === 'theme' || key === 'language' ? key : '';
}

function normalizeTopNavControlBinding(value: unknown): TopNavControl['binding'] {
  if (!isRecord(value)) return undefined;

  const source = readString(value.source);
  const key = readString(value.key);

  if (!source || !key) return undefined;

  return {
    source,
    key
  };
}

function normalizeLayoutBlockSlots(value: unknown): Record<string, LayoutBlock[]> | undefined {
  if (!isRecord(value)) return undefined;

  const entries = Object.entries(value)
    .map(([slotName, blocks]) => [slotName, normalizeLayoutBlocks(blocks)] as const)
    .filter((entry): entry is readonly [string, LayoutBlock[]] => entry[1].length > 0);

  return entries.length ? Object.fromEntries(entries) : undefined;
}
