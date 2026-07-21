<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { LayoutRuntimeContext } from '@/layouts/runtime';
import {
  isRecord,
  normalizeHref,
  readString
} from '@/layouts/topNavRuntime';
import { resolveLayoutText } from '@/layouts/localization';
import { useI18n } from '@/i18n';

defineOptions({
  name: 'MInternalAdminShell'
});

type AdminMenuItem = {
  label: string;
  href: string;
  active?: boolean;
  icon?: string;
  favorite?: boolean;
  expanded?: boolean;
  count?: string;
  children?: AdminMenuItem[];
};

type HeaderTool = {
  id?: string;
  label: string;
  icon: string;
  href: string;
};

type HeaderUser = {
  name: string;
  avatarText?: string;
};

type HeaderConfig = {
  breadcrumb: string[];
  tutorialLabel: string;
  tutorialUrl: string;
  tools: HeaderTool[];
  user: HeaderUser;
};

type AdminTab = {
  label: string;
  href: string;
  active: boolean;
  closable: boolean;
};

const iconPaths: Record<string, string> = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  search: 'M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z',
  star: 'm12 3 2.8 5.67 6.25.91-4.52 4.4 1.07 6.22L12 17.8 6.4 20.92l1.07-6.22-4.52-4.4 6.25-.91L12 3Z',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M8 13h8M8 17h6',
  home: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8.92 4.6 1.65 1.65 0 0 0 9.92 3.1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.23.61.8 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  asset: 'M3 7h18M5 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2M6 7l1 14h10l1-14M10 11v6M14 11v6',
  gift: 'M20 12v10H4V12M22 7H2v5h20ZM12 22V7M12 7H7.5a2.5 2.5 0 1 1 2.5-2.5c0 1.38 2 2.5 2 2.5ZM12 7h4.5A2.5 2.5 0 1 0 14 4.5C14 5.88 12 7 12 7Z',
  card: 'M3 6h18v12H3zM3 10h18M7 15h3',
  image: 'M3 5h18v14H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM21 16l-5-5L5 19',
  chevron: 'm9 18 6-6-6-6',
  fullscreen: 'M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3',
  type: 'M4 7V5h16v2M9 19h6M12 5v14',
  translate: 'M5 8h8M9 4v4c0 4.8-1.8 7.6-5 10M5 12c3.2 0 5.6-2 6.7-5M14 19l4-8 4 8M15.5 16h5',
  user: 'M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  close: 'M18 6 6 18M6 6l12 12'
};

const props = withDefaults(defineProps<{
  data?: Record<string, unknown>;
  context?: LayoutRuntimeContext;
}>(), {
  data: () => ({})
});

const { t } = useI18n();
const defaultHeaderTools = computed<HeaderTool[]>(() => [
  { id: 'fullscreen', label: t('layout.internalAdmin.fullscreen'), icon: 'fullscreen', href: '#' },
  { id: 'type-scale', label: t('layout.internalAdmin.typeScale'), icon: 'type', href: '#' },
  { id: 'translate', label: t('layout.internalAdmin.translate'), icon: 'translate', href: '#' }
]);

const shellData = computed(() => props.data ?? {});
const environmentLabel = computed(() => readLayoutText(shellData.value.environmentLabel) || t('layout.internalAdmin.testEnvironment'));
const searchPlaceholder = computed(() => readLayoutText(shellData.value.searchPlaceholder) || t('layout.internalAdmin.searchMenu'));
const favoriteMenuTitle = computed(() => readLayoutText(shellData.value.favoriteMenuTitle) || t('layout.internalAdmin.favoriteMenu'));
const sidebarItems = computed(() => readMenuResource('sidebarMenu', 'sidebarMenu'));
const favoriteItems = computed(() => readMenuResource('favoriteMenu', 'favoriteMenu'));
const quickItems = computed(() => readMenuResource('quickMenu', 'quickMenu'));
const tabs = computed(() => normalizeTabs(shellData.value.tabs));
const header = computed<HeaderConfig>(() => normalizeHeader(shellData.value.header));
const expandedMenuState = ref<Record<string, boolean>>({});
const userInitial = computed(() => {
  const source = header.value.user.avatarText || header.value.user.name || 'U';
  return source.trim().slice(0, 1).toUpperCase();
});

watch(sidebarItems, (items) => {
  const nextState = { ...expandedMenuState.value };

  applyInitialExpandedState(items, nextState);
  expandedMenuState.value = nextState;
}, { immediate: true });

function readMenuResource(resourceName: string, fallbackDataKey: string) {
  const resource = props.context?.resources?.[resourceName];

  if (isRecord(resource) && Array.isArray(resource.items)) {
    return normalizeAdminMenuItems(resource.items);
  }

  return normalizeAdminMenuItems(shellData.value[fallbackDataKey]);
}

function normalizeAdminMenuItems(value: unknown): AdminMenuItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => {
      const children = normalizeAdminMenuItems(item.children);
      const label = readLayoutText(item.label) || readLayoutText(item.name);
      const href = normalizeHref(readString(item.href) || readString(item.url) || '#');
      const expanded = typeof item.expanded === 'boolean'
        ? item.expanded
        : children.some((child) => child.active === true);

      return {
        label,
        href,
        active: item.active === true,
        icon: readString(item.icon) || undefined,
        favorite: item.favorite === true,
        expanded,
        count: readTextValue(item.count) || readTextValue(item.badge) || undefined,
        children
      };
    })
    .filter((item) => item.label);
}

function normalizeHeader(value: unknown): HeaderConfig {
  const source = isRecord(value) ? value : {};
  const breadcrumb = normalizeStringList(source.breadcrumb);
  const authUser = props.context?.auth.user;
  const authUserName = isRecord(authUser) ? readString(authUser.name) : '';

  return {
    breadcrumb: breadcrumb.length ? breadcrumb : [t('layout.internalAdmin.home')],
    tutorialLabel: readLayoutText(source.tutorialLabel) || t('layout.internalAdmin.permissionGuide'),
    tutorialUrl: normalizeHref(readString(source.tutorialUrl) || '#'),
    tools: normalizeHeaderTools(source.tools),
    user: normalizeHeaderUser(source.user, authUserName || t('layout.internalAdmin.administrator'))
  };
}

function normalizeHeaderTools(value: unknown): HeaderTool[] {
  if (!Array.isArray(value)) return defaultHeaderTools.value;

  const tools = value
    .filter((tool): tool is Record<string, unknown> => isRecord(tool))
    .map((tool) => ({
      id: readString(tool.id) || undefined,
      label: readLayoutText(tool.label) || readString(tool.id) || t('layout.internalAdmin.tool'),
      icon: readString(tool.icon) || readString(tool.id) || 'settings',
      href: normalizeHref(readString(tool.href) || readString(tool.url) || '#')
    }))
    .filter((tool) => tool.label);

  return tools.length ? tools : defaultHeaderTools.value;
}

function normalizeHeaderUser(value: unknown, fallbackName: string): HeaderUser {
  const source = isRecord(value) ? value : {};

  return {
    name: readLayoutText(source.name) || fallbackName,
    avatarText: readString(source.avatarText) || undefined
  };
}

function normalizeTabs(value: unknown): AdminTab[] {
  if (!Array.isArray(value)) {
    return [{ label: t('layout.internalAdmin.home'), href: '#', active: true, closable: true }];
  }

  const normalized = value
    .filter((tab): tab is Record<string, unknown> => isRecord(tab))
    .map((tab) => ({
      label: readLayoutText(tab.label) || readLayoutText(tab.name),
      href: normalizeHref(readString(tab.href) || readString(tab.url) || '#'),
      active: tab.active === true,
      closable: tab.closable !== false
    }))
    .filter((tab) => tab.label);

  return normalized.length ? normalized : [{ label: t('layout.internalAdmin.home'), href: '#', active: true, closable: true }];
}

function normalizeStringList(value: unknown) {
  if (typeof value === 'string' || isRecord(value)) {
    const text = readLayoutText(value);
    return text ? [text] : [];
  }
  if (!Array.isArray(value)) return [];

  return value.map((item) => readLayoutText(item)).filter(Boolean);
}

function readLayoutText(value: unknown) {
  return resolveLayoutText(value, props.context?.layout);
}

function getIconPath(icon: unknown) {
  return iconPaths[readString(icon)] || iconPaths.file;
}

function menuItemIcon(item: AdminMenuItem) {
  if (item.icon) return item.icon;
  return item.children?.length ? 'settings' : 'file';
}

function menuItemKey(item: AdminMenuItem) {
  return `${item.label}::${item.href}`;
}

function isMenuItemExpanded(item: AdminMenuItem) {
  return expandedMenuState.value[menuItemKey(item)] ?? item.expanded === true;
}

function toggleMenuItem(item: AdminMenuItem) {
  if (!item.children?.length) return;

  expandedMenuState.value = {
    ...expandedMenuState.value,
    [menuItemKey(item)]: !isMenuItemExpanded(item)
  };
}

function applyInitialExpandedState(items: AdminMenuItem[], state: Record<string, boolean>) {
  for (const item of items) {
    if (item.children?.length) {
      const key = menuItemKey(item);
      if (!Object.prototype.hasOwnProperty.call(state, key)) {
        state[key] = item.expanded === true;
      }

      applyInitialExpandedState(item.children, state);
    }
  }
}

function readTextValue(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}
</script>

<template>
  <div data-testid="internal-admin-shell" class="internal-admin-shell">
    <aside data-testid="internal-admin-sidebar" class="internal-admin-shell__sidebar">
      <div class="internal-admin-shell__environment">{{ environmentLabel }}</div>

      <label class="internal-admin-shell__search">
        <input
          class="internal-admin-shell__search-input"
          type="search"
          :placeholder="searchPlaceholder"
          :aria-label="searchPlaceholder"
          readonly
        >
        <svg class="internal-admin-shell__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path :d="getIconPath('search')" />
        </svg>
      </label>

      <section v-if="favoriteItems.length" class="internal-admin-shell__favorite">
        <p class="internal-admin-shell__section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path :d="getIconPath('star')" />
          </svg>
          <span>{{ favoriteMenuTitle }}</span>
          <span class="internal-admin-shell__section-count">({{ favoriteItems.length }})</span>
        </p>

        <a
          v-for="item in favoriteItems"
          :key="`${item.label}-${item.href}`"
          class="internal-admin-shell__favorite-link"
          :href="item.href"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path :d="getIconPath(menuItemIcon(item))" />
          </svg>
          <span>{{ item.label }}</span>
        </a>
      </section>

      <nav class="internal-admin-shell__menu" aria-label="Admin navigation">
        <template
          v-for="item in sidebarItems"
          :key="`${item.label}-${item.href}`"
        >
          <div
            class="internal-admin-shell__menu-row"
            :class="{ 'internal-admin-shell__menu-row--active': item.active }"
          >
            <a
              class="internal-admin-shell__menu-link"
              :href="item.href"
            >
              <svg class="internal-admin-shell__menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path :d="getIconPath(menuItemIcon(item))" />
              </svg>
              <span class="internal-admin-shell__menu-label">{{ item.label }}</span>
              <span v-if="item.count" class="internal-admin-shell__menu-count">{{ item.count }}</span>
            </a>

            <button
              v-if="item.children?.length"
              class="internal-admin-shell__menu-toggle"
              type="button"
              :aria-label="`${isMenuItemExpanded(item) ? t('layout.internalAdmin.collapse') : t('layout.internalAdmin.expand')}${item.label}`"
              :aria-expanded="isMenuItemExpanded(item)"
              @click="toggleMenuItem(item)"
            >
              <svg
                class="internal-admin-shell__menu-chevron"
                :class="{ 'internal-admin-shell__menu-chevron--expanded': isMenuItemExpanded(item) }"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path :d="getIconPath('chevron')" />
              </svg>
            </button>

            <svg
              v-else-if="item.favorite"
              class="internal-admin-shell__menu-star"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path :d="getIconPath('star')" />
            </svg>
          </div>

          <div v-if="item.children?.length && isMenuItemExpanded(item)" class="internal-admin-shell__submenu">
            <a
              v-for="child in item.children"
              :key="`${child.label}-${child.href}`"
              class="internal-admin-shell__submenu-link"
              :class="{ 'internal-admin-shell__submenu-link--active': child.active }"
              :href="child.href"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path :d="getIconPath(menuItemIcon(child))" />
              </svg>
              <span>{{ child.label }}</span>
              <svg v-if="child.favorite" class="internal-admin-shell__menu-star" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path :d="getIconPath('star')" />
              </svg>
            </a>
          </div>
        </template>
      </nav>
    </aside>

    <section class="internal-admin-shell__main">
      <header data-testid="internal-admin-header" class="internal-admin-shell__header">
        <button class="internal-admin-shell__icon-button" type="button" :aria-label="t('layout.internalAdmin.toggleMenu')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path :d="getIconPath('menu')" />
          </svg>
        </button>

        <nav class="internal-admin-shell__breadcrumb" aria-label="Breadcrumb">
          <span
            v-for="(item, index) in header.breadcrumb"
            :key="`${item}-${index}`"
            class="internal-admin-shell__breadcrumb-item"
          >
            {{ item }}
          </span>
        </nav>

        <div class="internal-admin-shell__header-spacer"></div>

        <a class="internal-admin-shell__tutorial" :href="header.tutorialUrl">{{ header.tutorialLabel }}</a>

        <div class="internal-admin-shell__tools">
          <a
            v-for="tool in header.tools"
            :key="tool.id || `${tool.label}-${tool.icon}`"
            class="internal-admin-shell__tool"
            :href="tool.href"
            :aria-label="tool.label"
            :title="tool.label"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path :d="getIconPath(tool.icon)" />
            </svg>
          </a>
        </div>

        <a class="internal-admin-shell__avatar" href="#" :aria-label="header.user.name">
          <span class="internal-admin-shell__avatar-icon">{{ userInitial }}</span>
          <svg class="internal-admin-shell__avatar-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path :d="getIconPath('chevron')" />
          </svg>
        </a>
      </header>

      <section data-testid="internal-admin-quick-menu" class="internal-admin-shell__quick-menu">
        <span class="internal-admin-shell__quick-label">{{ t('layout.internalAdmin.quickMenu') }}:</span>
        <a
          v-for="item in quickItems"
          :key="`${item.label}-${item.href}`"
          class="internal-admin-shell__quick-link"
          :href="item.href"
        >
          <span>{{ item.label }}</span>
          <span v-if="item.count" class="internal-admin-shell__quick-count">{{ item.count }}</span>
        </a>
      </section>

      <nav data-testid="internal-admin-tabs" class="internal-admin-shell__tabs" aria-label="Page tabs">
        <a
          v-for="tab in tabs"
          :key="`${tab.label}-${tab.href}`"
          class="internal-admin-shell__tab"
          :class="{ 'internal-admin-shell__tab--active': tab.active }"
          :href="tab.href"
        >
          <span v-if="tab.active" class="internal-admin-shell__tab-dot"></span>
          <span>{{ tab.label }}</span>
          <svg v-if="tab.closable" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path :d="getIconPath('close')" />
          </svg>
        </a>
      </nav>

      <main data-testid="internal-admin-content" class="internal-admin-shell__content">
        <slot />
      </main>
    </section>
  </div>
</template>

<style scoped>
.internal-admin-shell {
  display: grid;
  overflow: hidden;
  min-height: 720px;
  border: 1px solid rgb(226 232 240);
  border-radius: 12px;
  background: rgb(248 250 252);
  color: rgb(15 23 42);
  grid-template-columns: 260px minmax(0, 1fr);
}

.internal-admin-shell__sidebar {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 14px;
  border-right: 1px solid rgb(226 232 240);
  background: rgb(255 255 255);
  padding: 18px;
}

.internal-admin-shell__environment {
  width: fit-content;
  border-radius: 8px;
  background: rgb(13 148 136);
  color: white;
  font-size: 13px;
  font-weight: 700;
  line-height: 18px;
  padding: 7px 12px;
}

.internal-admin-shell__search {
  position: relative;
  display: block;
}

.internal-admin-shell__search-input {
  width: 100%;
  height: 38px;
  border: 1px solid rgb(203 213 225);
  border-radius: 999px;
  background: rgb(248 250 252);
  color: rgb(15 23 42);
  font-size: 13px;
  outline: none;
  padding: 0 38px 0 14px;
}

.internal-admin-shell__search-input::placeholder {
  color: rgb(100 116 139);
}

.internal-admin-shell__search-icon {
  position: absolute;
  top: 50%;
  right: 12px;
  width: 16px;
  height: 16px;
  color: rgb(100 116 139);
  transform: translateY(-50%);
}

.internal-admin-shell__favorite {
  display: grid;
  gap: 8px;
}

.internal-admin-shell__section-title,
.internal-admin-shell__favorite-link,
.internal-admin-shell__menu-row,
.internal-admin-shell__menu-link,
.internal-admin-shell__submenu-link,
.internal-admin-shell__header,
.internal-admin-shell__quick-menu,
.internal-admin-shell__tab,
.internal-admin-shell__avatar {
  display: flex;
  align-items: center;
}

.internal-admin-shell__section-title {
  gap: 8px;
  margin: 0;
  border-left: 3px solid rgb(13 148 136);
  border-radius: 8px;
  background: rgb(241 245 249);
  color: rgb(51 65 85);
  font-size: 13px;
  font-weight: 700;
  line-height: 18px;
  padding: 10px 12px;
}

.internal-admin-shell__section-title svg,
.internal-admin-shell__favorite-link svg,
.internal-admin-shell__menu-icon,
.internal-admin-shell__submenu-link svg,
.internal-admin-shell__menu-toggle svg,
.internal-admin-shell__icon-button svg,
.internal-admin-shell__tool svg,
.internal-admin-shell__tab svg {
  width: 16px;
  height: 16px;
  flex: none;
}

.internal-admin-shell__section-count {
  color: rgb(100 116 139);
  font-weight: 600;
}

.internal-admin-shell__favorite-link,
.internal-admin-shell__menu-row,
.internal-admin-shell__submenu-link {
  gap: 10px;
  min-height: 38px;
  border-radius: 8px;
  color: rgb(71 85 105);
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  padding: 9px 12px;
  text-decoration: none;
}

.internal-admin-shell__favorite-link:hover,
.internal-admin-shell__menu-row:hover,
.internal-admin-shell__submenu-link:hover {
  background: rgb(241 245 249);
  color: rgb(15 23 42);
}

.internal-admin-shell__menu {
  display: grid;
  gap: 4px;
  min-height: 0;
  overflow-y: auto;
  padding-top: 8px;
}

.internal-admin-shell__menu-row {
  overflow: hidden;
  justify-content: flex-start;
  padding: 0;
}

.internal-admin-shell__menu-link {
  display: flex;
  min-width: 0;
  flex: 1;
  align-self: stretch;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
  padding: 9px 0 9px 12px;
}

.internal-admin-shell__menu-row--active,
.internal-admin-shell__submenu-link--active {
  background: rgb(240 253 250);
  color: rgb(15 118 110);
}

.internal-admin-shell__menu-label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.internal-admin-shell__menu-count {
  flex: none;
  border-radius: 999px;
  background: rgb(226 232 240);
  color: rgb(71 85 105);
  font-size: 11px;
  font-weight: 700;
  line-height: 16px;
  padding: 0 6px;
}

.internal-admin-shell__menu-toggle {
  display: inline-grid;
  width: 38px;
  align-self: stretch;
  flex: none;
  place-items: center;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0;
}

.internal-admin-shell__menu-toggle:hover {
  background: rgb(226 232 240 / 0.65);
}

.internal-admin-shell__menu-chevron,
.internal-admin-shell__menu-star {
  width: 14px;
  height: 14px;
  flex: none;
  color: rgb(100 116 139);
}

.internal-admin-shell__menu-chevron {
  transform: rotate(-90deg);
  transition: transform 0.16s ease;
}

.internal-admin-shell__menu-chevron--expanded {
  transform: rotate(0deg);
}

.internal-admin-shell__menu-star {
  color: rgb(245 158 11);
}

.internal-admin-shell__menu-row > .internal-admin-shell__menu-star {
  margin-right: 12px;
}

.internal-admin-shell__submenu {
  display: grid;
  gap: 2px;
  margin: 0 0 4px 22px;
  padding-left: 10px;
  border-left: 1px solid rgb(226 232 240);
}

.internal-admin-shell__submenu-link {
  min-height: 34px;
  font-size: 12px;
  padding: 8px 10px;
}

.internal-admin-shell__main {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: 52px auto 40px minmax(0, 1fr);
}

.internal-admin-shell__header {
  min-width: 0;
  gap: 12px;
  border-bottom: 1px solid rgb(226 232 240);
  background: rgb(255 255 255);
  padding: 0 16px;
}

.internal-admin-shell__icon-button,
.internal-admin-shell__tool {
  display: inline-grid;
  width: 32px;
  height: 32px;
  flex: none;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgb(71 85 105);
  cursor: pointer;
}

.internal-admin-shell__icon-button:hover,
.internal-admin-shell__tool:hover {
  background: rgb(241 245 249);
  color: rgb(15 23 42);
}

.internal-admin-shell__breadcrumb {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  color: rgb(100 116 139);
  font-size: 13px;
  font-weight: 600;
}

.internal-admin-shell__breadcrumb-item + .internal-admin-shell__breadcrumb-item::before {
  content: '/';
  margin-right: 8px;
  color: rgb(148 163 184);
}

.internal-admin-shell__header-spacer {
  min-width: 20px;
  flex: 1;
}

.internal-admin-shell__tutorial {
  flex: none;
  color: rgb(13 148 136);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.internal-admin-shell__tutorial:hover {
  color: rgb(15 118 110);
}

.internal-admin-shell__tools {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
}

.internal-admin-shell__avatar {
  flex: none;
  gap: 6px;
  color: rgb(71 85 105);
  text-decoration: none;
}

.internal-admin-shell__avatar-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 999px;
  background: rgb(226 232 240);
  color: rgb(51 65 85);
  font-size: 13px;
  font-weight: 800;
}

.internal-admin-shell__avatar-caret {
  width: 12px;
  height: 12px;
}

.internal-admin-shell__quick-menu {
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;
  border-bottom: 1px solid rgb(226 232 240);
  background: rgb(255 255 255);
  padding: 8px 16px;
}

.internal-admin-shell__quick-label {
  flex: none;
  color: rgb(15 23 42);
  font-size: 13px;
  font-weight: 700;
}

.internal-admin-shell__quick-link {
  display: inline-flex;
  max-width: 180px;
  height: 26px;
  align-items: center;
  gap: 4px;
  border: 1px solid rgb(191 219 254);
  border-radius: 7px;
  background: rgb(239 246 255);
  color: rgb(37 99 235);
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  padding: 0 10px;
  text-decoration: none;
  white-space: nowrap;
}

.internal-admin-shell__quick-link span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
}

.internal-admin-shell__quick-count {
  color: rgb(59 130 246);
  font-weight: 700;
}

.internal-admin-shell__tabs {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 5px 16px;
  overflow-x: auto;
}

.internal-admin-shell__tab {
  flex: none;
  gap: 6px;
  height: 28px;
  border: 1px solid rgb(226 232 240);
  border-radius: 7px;
  background: rgb(255 255 255);
  color: rgb(71 85 105);
  font-size: 12px;
  font-weight: 700;
  padding: 0 10px;
  text-decoration: none;
}

.internal-admin-shell__tab--active {
  border-color: rgb(20 184 166);
  background: rgb(20 184 166);
  color: white;
}

.internal-admin-shell__tab-dot {
  width: 7px;
  height: 7px;
  flex: none;
  border-radius: 999px;
  background: currentColor;
}

.internal-admin-shell__tab svg {
  width: 13px;
  height: 13px;
  opacity: 0.75;
}

.internal-admin-shell__content {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: rgb(255 255 255);
  padding: 22px;
}

.dark .internal-admin-shell {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23);
  color: rgb(241 245 249);
}

.dark .internal-admin-shell__sidebar,
.dark .internal-admin-shell__header,
.dark .internal-admin-shell__quick-menu,
.dark .internal-admin-shell__content {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
}

.dark .internal-admin-shell__environment {
  background: rgb(20 184 166);
  color: rgb(4 47 46);
}

.dark .internal-admin-shell__search-input,
.dark .internal-admin-shell__section-title,
.dark .internal-admin-shell__tabs,
.dark .internal-admin-shell__tab {
  border-color: rgb(51 65 85);
  background: rgb(30 41 59);
  color: rgb(226 232 240);
}

.dark .internal-admin-shell__search-input::placeholder,
.dark .internal-admin-shell__search-icon,
.dark .internal-admin-shell__section-count,
.dark .internal-admin-shell__breadcrumb,
.dark .internal-admin-shell__menu-chevron,
.dark .internal-admin-shell__avatar {
  color: rgb(148 163 184);
}

.dark .internal-admin-shell__favorite-link,
.dark .internal-admin-shell__menu-row,
.dark .internal-admin-shell__submenu-link,
.dark .internal-admin-shell__icon-button,
.dark .internal-admin-shell__tool {
  color: rgb(203 213 225);
}

.dark .internal-admin-shell__favorite-link:hover,
.dark .internal-admin-shell__menu-row:hover,
.dark .internal-admin-shell__submenu-link:hover,
.dark .internal-admin-shell__icon-button:hover,
.dark .internal-admin-shell__tool:hover {
  background: rgb(30 41 59);
  color: rgb(248 250 252);
}

.dark .internal-admin-shell__menu-toggle:hover {
  background: rgb(51 65 85 / 0.72);
}

.dark .internal-admin-shell__menu-row--active,
.dark .internal-admin-shell__submenu-link--active {
  background: rgb(20 184 166 / 0.14);
  color: rgb(94 234 212);
}

.dark .internal-admin-shell__submenu {
  border-color: rgb(51 65 85);
}

.dark .internal-admin-shell__quick-label {
  color: rgb(241 245 249);
}

.dark .internal-admin-shell__quick-link {
  border-color: rgb(14 116 144 / 0.7);
  background: rgb(8 47 73 / 0.5);
  color: rgb(125 211 252);
}

.dark .internal-admin-shell__quick-count {
  color: rgb(186 230 253);
}

.dark .internal-admin-shell__tab--active {
  border-color: rgb(45 212 191);
  background: rgb(13 148 136);
  color: white;
}

.dark .internal-admin-shell__avatar-icon {
  background: rgb(51 65 85);
  color: rgb(241 245 249);
}

@media (max-width: 960px) {
  .internal-admin-shell {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .internal-admin-shell__sidebar {
    padding: 14px;
  }

  .internal-admin-shell__tutorial {
    display: none;
  }
}

@media (max-width: 720px) {
  .internal-admin-shell {
    grid-template-columns: 1fr;
  }

  .internal-admin-shell__sidebar {
    border-right: 0;
    border-bottom: 1px solid rgb(226 232 240);
  }

  .internal-admin-shell__main {
    grid-template-rows: auto auto auto minmax(0, 1fr);
  }

  .internal-admin-shell__header {
    flex-wrap: wrap;
    min-height: 52px;
    padding: 10px 14px;
  }
}
</style>
