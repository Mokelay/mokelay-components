<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import TopNavAction from '@/layouts/TopNavAction.vue';
import type { LayoutMenuItem } from '@/layouts/domain';
import type { TopNavControl, TopNavProps } from '@/layouts/topNavTypes';
import {
  controlLabel,
  controlValue,
  getActionHref,
  getActionLabel,
  getMenuItemBadge,
  getVisibleTopNavActions,
  handleControlChange,
  normalizeHref
} from '@/layouts/topNavRuntime';

defineOptions({
  name: 'MEditorTopNav'
});

const props = withDefaults(defineProps<TopNavProps>(), {
  variant: 'editor',
  brand: () => ({ text: 'Mokelay Editor', href: '#/', showMark: false }),
  homeAction: undefined,
  utilityControls: () => [],
  items: () => [],
  actions: () => [],
  guestActions: () => [],
  userActions: () => [],
  auth: () => ({ loggedIn: false, user: null, pending: false })
});

const visibleActions = computed(() => getVisibleTopNavActions(props));
const brandText = computed(() => props.brand?.text?.trim() || 'Mokelay Editor');
const brandHref = computed(() => normalizeHref(props.brand?.href || '#/'));
const showBrandMark = computed(() => props.brand?.showMark === true);
const currentHash = ref(readCurrentHash());
const isMobileMenuOpen = ref(false);
const openMobileControlId = ref('');
const mobileMenuRef = ref<HTMLElement | null>(null);
const activeMobileMenuItem = computed(() => props.items.find((item) => isActiveItem(item)) ?? props.items.find((item) => item.active === true) ?? props.items[0]);
const activeMobileMenuLabel = computed(() => activeMobileMenuItem.value ? menuItemOptionLabel(activeMobileMenuItem.value) : '菜单');

function readCurrentHash() {
  if (typeof window === 'undefined') return '#/';
  return normalizeHashPath(window.location.hash || '#/');
}

function syncCurrentHash() {
  currentHash.value = readCurrentHash();
  closeMobileMenu();
  closeMobileControl();
}

function normalizeHashPath(value: string) {
  const [path] = value.split('?', 1);
  const normalized = path.replace(/\/+$/, '');
  if (normalized === '#') return '#/';
  return normalized || '#/';
}

function normalizeItemHash(item: LayoutMenuItem) {
  const href = normalizeHref(item.href);
  if (!href.startsWith('#/')) return '';
  return normalizeHashPath(href);
}

function isActiveItem(item: LayoutMenuItem) {
  const itemHash = normalizeItemHash(item);
  if (!itemHash) return item.active === true;
  const activeHash = currentHash.value;
  if (itemHash === '#/') return activeHash === '#/';
  return activeHash === itemHash || activeHash.startsWith(`${itemHash}/`);
}

function menuItemOptionLabel(item: LayoutMenuItem) {
  const badge = getMenuItemBadge(item);
  return badge ? `${item.label} ${badge}` : item.label;
}

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
  closeMobileControl();
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false;
}

function mobileControlKey(control: TopNavControl) {
  return control.id || control.label || control.value || control.options?.[0]?.value || 'control';
}

function mobileControlLabel(control: TopNavControl) {
  const selectedValue = controlValue(control);
  return control.options?.find((option) => option.value === selectedValue)?.label || controlLabel(control);
}

function mobileControlAriaLabel(control: TopNavControl) {
  return `${controlLabel(control)}: ${mobileControlLabel(control)}`;
}

function mobileControlIconPath(control: TopNavControl) {
  const id = control.id || control.binding?.key || '';
  const value = controlValue(control);

  if (id === 'theme') {
    return value === 'dark'
      ? 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z'
      : 'M12 3v2M12 19v2M5.64 5.64l1.42 1.42M16.94 16.94l1.42 1.42M3 12h2M19 12h2M5.64 18.36l1.42-1.42M16.94 7.06l1.42-1.42M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z';
  }

  if (id === 'language') {
    return 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.6 9h16.8M3.6 15h16.8M12 3c2.2 2.4 3.3 5.4 3.3 9s-1.1 6.6-3.3 9c-2.2-2.4-3.3-5.4-3.3-9s1.1-6.6 3.3-9Z';
  }

  return 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8.92 4.6 1.65 1.65 0 0 0 9.92 3.1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.23.61.8 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z';
}

function toggleMobileControl(control: TopNavControl) {
  const key = mobileControlKey(control);
  openMobileControlId.value = openMobileControlId.value === key ? '' : key;
  closeMobileMenu();
}

function isMobileControlOpen(control: TopNavControl) {
  return openMobileControlId.value === mobileControlKey(control);
}

function handleMobileControlChange(control: TopNavControl, value: string) {
  handleControlChange(control, value);
  closeMobileControl();
}

function closeMobileControl() {
  openMobileControlId.value = '';
}

function handleDocumentClick(event: MouseEvent) {
  if (!isMobileMenuOpen.value && !openMobileControlId.value) return;
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (mobileMenuRef.value?.contains(target)) return;

  closeMobileMenu();
  closeMobileControl();
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMobileMenu();
    closeMobileControl();
  }
}

onMounted(() => {
  window.addEventListener('hashchange', syncCurrentHash);
  window.addEventListener('popstate', syncCurrentHash);
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleDocumentKeydown);
});

onUnmounted(() => {
  window.removeEventListener('hashchange', syncCurrentHash);
  window.removeEventListener('popstate', syncCurrentHash);
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleDocumentKeydown);
});
</script>

<template>
  <header data-testid="layout-top-nav" class="layout-top-nav layout-top-nav--editor">
    <div class="layout-top-nav__left">
      <a class="layout-top-nav__brand" :href="brandHref">
        <span v-if="showBrandMark" class="layout-top-nav__mark">{{ brandText.slice(0, 1).toUpperCase() }}</span>
        <span>{{ brandText }}</span>
      </a>

      <a
        v-if="homeAction"
        class="layout-top-nav__home"
        :href="getActionHref(homeAction) || '#'"
      >
        {{ getActionLabel(homeAction) }}
      </a>
    </div>

    <div class="layout-top-nav__right">
      <div v-if="utilityControls.length" class="layout-top-nav__controls">
        <div
          v-for="control in utilityControls"
          :key="control.id || control.label || control.value"
          class="layout-top-nav__control"
          @click.stop
        >
          <span class="layout-top-nav__control-label">{{ controlLabel(control) }}</span>
          <button
            class="layout-top-nav__control-button"
            type="button"
            :data-testid="control.id ? `layout-top-nav-mobile-control-${control.id}` : undefined"
            :aria-label="mobileControlAriaLabel(control)"
            aria-haspopup="menu"
            :aria-expanded="isMobileControlOpen(control)"
            @click="toggleMobileControl(control)"
          >
            <svg class="layout-top-nav__control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path :d="mobileControlIconPath(control)" />
            </svg>
          </button>
          <select
            class="layout-top-nav__select"
            :value="controlValue(control)"
            :aria-label="controlLabel(control)"
            :data-testid="control.id ? `layout-top-nav-control-${control.id}` : undefined"
            @change="handleControlChange(control, ($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="option in control.options"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <div
            v-if="isMobileControlOpen(control)"
            class="layout-top-nav__control-menu"
            :data-testid="control.id ? `layout-top-nav-mobile-control-menu-${control.id}` : undefined"
            role="menu"
          >
            <button
              v-for="option in control.options"
              :key="option.value"
              class="layout-top-nav__control-option"
              :class="{ 'layout-top-nav__control-option--active': option.value === controlValue(control) }"
              type="button"
              role="menuitem"
              @click="handleMobileControlChange(control, option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>

      <nav class="layout-top-nav__links" aria-label="Main navigation">
        <a
          v-for="item in items"
          :key="`${item.label}-${item.href}`"
          class="layout-top-nav__link"
          :class="{ 'layout-top-nav__link--active': isActiveItem(item) }"
          :href="normalizeHref(item.href)"
        >
          <span class="layout-top-nav__link-text">{{ item.label }}</span>
          <span v-if="getMenuItemBadge(item)" class="layout-top-nav__link-badge">{{ getMenuItemBadge(item) }}</span>
        </a>
      </nav>

      <div
        v-if="items.length"
        ref="mobileMenuRef"
        class="layout-top-nav__menu"
        @click.stop
      >
        <button
          class="layout-top-nav__menu-button"
          type="button"
          data-testid="layout-top-nav-menu-button"
          aria-haspopup="menu"
          :aria-expanded="isMobileMenuOpen"
          aria-label="Main navigation"
          @click="toggleMobileMenu"
        >
          <span class="layout-top-nav__menu-button-text">{{ activeMobileMenuLabel }}</span>
          <span class="layout-top-nav__menu-chevron" aria-hidden="true">⌄</span>
        </button>

        <div
          v-if="isMobileMenuOpen"
          class="layout-top-nav__menu-list"
          data-testid="layout-top-nav-menu-list"
          role="menu"
        >
          <a
            v-for="item in items"
            :key="`${item.label}-${item.href}`"
            class="layout-top-nav__menu-item"
            :class="{ 'layout-top-nav__menu-item--active': isActiveItem(item) }"
            :href="normalizeHref(item.href)"
            role="menuitem"
            @click="closeMobileMenu"
          >
            <span>{{ item.label }}</span>
            <span v-if="getMenuItemBadge(item)" class="layout-top-nav__menu-badge">{{ getMenuItemBadge(item) }}</span>
          </a>
        </div>
      </div>

      <div class="layout-top-nav__actions">
        <TopNavAction
          v-for="action in visibleActions"
          :key="action.id || `${action.type}-${getActionLabel(action)}`"
          :action="action"
        />
      </div>
    </div>
  </header>
</template>

<style scoped>
.layout-top-nav {
  position: sticky;
  top: 0;
  z-index: 10;
  box-sizing: border-box;
  display: flex;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  align-items: center;
  gap: 20px;
  justify-content: space-between;
  min-height: 64px;
  border: 1px solid rgb(226 232 240);
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 8px rgb(15 23 42 / 0.08);
  margin: 0;
  overflow: hidden;
  padding: 12px 16px;
}

.layout-top-nav *,
.layout-top-nav *::before,
.layout-top-nav *::after {
  box-sizing: border-box;
}

.layout-top-nav__left,
.layout-top-nav__right,
.layout-top-nav__brand,
.layout-top-nav__links,
.layout-top-nav__actions,
.layout-top-nav__controls {
  display: flex;
  align-items: center;
}

.layout-top-nav__left {
  flex: none;
  gap: 14px;
  min-width: 0;
}

.layout-top-nav__right {
  max-width: 100%;
  min-width: 0;
  flex: 1;
  gap: 12px;
  justify-content: flex-end;
}

.layout-top-nav__brand {
  flex: none;
  gap: 10px;
  min-width: 0;
  color: rgb(15 23 42);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  text-decoration: none;
}

.layout-top-nav__brand > span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout-top-nav__mark {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 8px;
  background: rgb(15 118 110);
  color: white;
}

.layout-top-nav__home,
.layout-top-nav__select,
.layout-top-nav__action {
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  padding: 6px 12px;
}

.layout-top-nav__home {
  flex: none;
  border: 1px solid rgb(203 213 225);
  background: white;
  color: rgb(51 65 85);
  text-decoration: none;
}

.layout-top-nav__controls {
  flex: none;
  gap: 8px;
  min-width: 0;
}

.layout-top-nav__control {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
}

.layout-top-nav__control-label {
  position: absolute;
  overflow: hidden;
  width: 1px;
  height: 1px;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.layout-top-nav__select {
  min-width: 88px;
  max-width: 100%;
  border: 1px solid rgb(203 213 225);
  background: white;
  color: rgb(51 65 85);
  padding-right: 32px;
}

.layout-top-nav__control-button,
.layout-top-nav__menu {
  display: none;
}

.layout-top-nav__control-button,
.layout-top-nav__menu-button {
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(203 213 225);
  border-radius: 8px;
  background: white;
  color: rgb(51 65 85);
  cursor: pointer;
  font-family: inherit;
}

.layout-top-nav__control-button {
  width: 30px;
  height: 30px;
  padding: 0;
}

.layout-top-nav__control-icon {
  width: 16px;
  height: 16px;
}

.layout-top-nav__control-menu,
.layout-top-nav__menu-list {
  position: absolute;
  z-index: 40;
  display: grid;
  gap: 3px;
  border: 1px solid rgb(203 213 225);
  border-radius: 10px;
  background: white;
  box-shadow: 0 14px 28px rgb(15 23 42 / 0.16);
  padding: 5px;
}

.layout-top-nav__control-menu {
  top: calc(100% + 6px);
  left: 0;
  min-width: 108px;
}

.layout-top-nav__control-option,
.layout-top-nav__menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: rgb(51 65 85);
  font-family: inherit;
  font-size: 13px;
  font-weight: 650;
  line-height: 18px;
  text-align: left;
  text-decoration: none;
  white-space: nowrap;
  padding: 6px 9px;
}

.layout-top-nav__control-option {
  cursor: pointer;
}

.layout-top-nav__control-option--active,
.layout-top-nav__menu-item--active,
.layout-top-nav__control-option:hover,
.layout-top-nav__menu-item:hover {
  background: rgb(238 242 255);
  color: rgb(79 70 229);
}

.layout-top-nav__menu {
  position: relative;
}

.layout-top-nav__menu-button {
  display: inline-flex;
  width: 100%;
  gap: 8px;
  padding: 0 9px;
}

.layout-top-nav__menu-button-text {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout-top-nav__menu-chevron {
  flex: none;
  color: rgb(71 85 105);
  font-size: 14px;
  line-height: 1;
  transform: translateY(-1px);
}

.layout-top-nav__menu-list {
  top: calc(100% + 6px);
  right: 0;
  min-width: 132px;
  max-height: 260px;
  overflow-y: auto;
}

.layout-top-nav__menu-item {
  justify-content: space-between;
}

.layout-top-nav__menu-badge {
  color: rgb(239 68 68);
  font-size: 12px;
  line-height: 1;
}

.layout-top-nav__links {
  max-width: 100%;
  min-width: 0;
  flex: 0 1 auto;
  justify-content: center;
  border-radius: 8px;
  background: rgb(241 245 249);
  gap: 2px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding: 4px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.layout-top-nav__links::-webkit-scrollbar {
  display: none;
}

.layout-top-nav__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  border-radius: 6px;
  color: rgb(71 85 105);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  padding: 6px 12px;
  text-decoration: none;
  white-space: nowrap;
}

.layout-top-nav__link-badge {
  flex: none;
  color: rgb(239 68 68);
  font-size: 12px;
  line-height: 1;
}

.layout-top-nav__link--active,
.layout-top-nav__link:hover {
  background: white;
  color: rgb(15 23 42);
  box-shadow: 0 1px 4px rgb(15 23 42 / 0.08);
}

.layout-top-nav__actions {
  flex: none;
  gap: 8px;
  min-width: 0;
}

.layout-top-nav__action {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  text-decoration: none;
}

.layout-top-nav__action-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.layout-top-nav__action-icon {
  width: 16px;
  height: 16px;
  flex: none;
}

.layout-top-nav__action-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  display: grid;
  min-width: 16px;
  height: 16px;
  place-items: center;
  border-radius: 999px;
  background: rgb(239 68 68);
  color: white;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  padding: 0 4px;
}

.layout-top-nav__avatar {
  display: block;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 74% 24%, rgb(255 255 255 / 0.95), transparent 16%),
    conic-gradient(from 210deg, rgb(36 99 235), rgb(6 182 212), rgb(168 85 247), rgb(36 99 235));
}

.layout-top-nav__action--shape-icon,
.layout-top-nav__action--shape-avatar {
  width: 36px;
  height: 36px;
  padding: 0;
}

.layout-top-nav__action--primary {
  border-color: rgb(79 70 229);
  background: rgb(79 70 229);
  color: white;
}

.layout-top-nav__action--teal {
  border-color: rgb(15 118 110);
  background: rgb(15 118 110);
  color: white;
}

.layout-top-nav__action--success {
  border-color: rgb(16 185 129);
  background: rgb(16 185 129);
  color: white;
}

.layout-top-nav__action--secondary {
  border-color: rgb(203 213 225);
  background: white;
  color: rgb(15 23 42);
}

.layout-top-nav__action--ghost {
  color: rgb(51 65 85);
}

.dark .layout-top-nav {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
}

.dark .layout-top-nav__brand {
  color: rgb(248 250 252);
}

.dark .layout-top-nav__home,
.dark .layout-top-nav__select,
.dark .layout-top-nav__control-button,
.dark .layout-top-nav__menu-button {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

.dark .layout-top-nav__control-menu,
.dark .layout-top-nav__menu-list {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  box-shadow: 0 16px 32px rgb(0 0 0 / 0.28);
}

.dark .layout-top-nav__control-option,
.dark .layout-top-nav__menu-item {
  color: rgb(226 232 240);
}

.dark .layout-top-nav__control-option--active,
.dark .layout-top-nav__menu-item--active,
.dark .layout-top-nav__control-option:hover,
.dark .layout-top-nav__menu-item:hover {
  background: rgb(79 70 229 / 0.22);
  color: rgb(199 210 254);
}

.dark .layout-top-nav__menu-chevron {
  color: rgb(203 213 225);
}

.dark .layout-top-nav__links {
  background: rgb(30 41 59);
}

.dark .layout-top-nav__link {
  color: rgb(203 213 225);
}

.dark .layout-top-nav__link--active,
.dark .layout-top-nav__link:hover {
  background: rgb(15 23 42);
  color: rgb(248 250 252);
}

.dark .layout-top-nav__action--secondary {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

.dark .layout-top-nav__action--ghost {
  color: rgb(203 213 225);
}

@media (max-width: 720px) {
  .layout-top-nav {
    align-items: stretch;
    flex-direction: column;
    gap: 6px;
    overflow: visible;
    padding: 8px;
  }

  .layout-top-nav__left {
    width: 100%;
    max-width: 100%;
    justify-content: space-between;
    gap: 10px;
  }

  .layout-top-nav__brand {
    flex: 1 1 auto;
    font-size: 15px;
    line-height: 22px;
  }

  .layout-top-nav__home {
    flex: none;
  }

  .layout-top-nav__right {
    display: grid;
    width: 100%;
    max-width: 100%;
    align-items: stretch;
    grid-template-columns: minmax(0, 1fr) minmax(98px, auto);
    gap: 6px;
  }

  .layout-top-nav__controls {
    display: flex;
    width: auto;
    min-width: 0;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    overflow: visible;
  }

  .layout-top-nav__select {
    display: none;
  }

  .layout-top-nav__control-button {
    display: inline-flex;
  }

  .layout-top-nav__links {
    display: none;
  }

  .layout-top-nav__menu {
    display: block;
    min-width: 0;
  }

  .layout-top-nav__menu-button {
    height: 30px;
    min-width: 98px;
    font-size: 13px;
    font-weight: 650;
    line-height: 18px;
  }

  .layout-top-nav__actions {
    grid-column: 1 / -1;
    max-width: 100%;
    justify-content: flex-start;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .layout-top-nav__actions::-webkit-scrollbar {
    display: none;
  }
}
</style>
