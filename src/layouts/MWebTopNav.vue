<script setup lang="ts">
import { computed } from 'vue';
import TopNavAction from '@/layouts/TopNavAction.vue';
import type { TopNavProps } from '@/layouts/topNavTypes';
import {
  getActionLabel,
  getMenuItemBadge,
  getVisibleTopNavActions,
  normalizeHref
} from '@/layouts/topNavRuntime';

defineOptions({
  name: 'MWebTopNav'
});

const props = withDefaults(defineProps<TopNavProps>(), {
  variant: 'web',
  brand: () => ({ text: 'Mokelay', href: '#', showMark: false }),
  homeAction: undefined,
  utilityControls: () => [],
  items: () => [],
  actions: () => [],
  guestActions: () => [],
  userActions: () => [],
  auth: () => ({ loggedIn: false, user: null, pending: false })
});

const visibleActions = computed(() => getVisibleTopNavActions(props));
const brandText = computed(() => props.brand?.text?.trim() || 'Mokelay');
const brandHref = computed(() => normalizeHref(props.brand?.href || '#'));
</script>

<template>
  <header data-testid="layout-top-nav" class="layout-top-nav layout-top-nav--web">
    <div class="layout-top-nav__left">
      <a class="layout-top-nav__brand" :href="brandHref">
        <span>{{ brandText }}</span>
      </a>
    </div>

    <div class="layout-top-nav__right">
      <nav class="layout-top-nav__links" aria-label="Main navigation">
        <a
          v-for="item in items"
          :key="`${item.label}-${item.href}`"
          class="layout-top-nav__link"
          :class="{
            'layout-top-nav__link--active': item.active,
            'layout-top-nav__link--highlight': item.highlight
          }"
          :href="normalizeHref(item.href)"
        >
          <span class="layout-top-nav__link-text">{{ item.label }}</span>
          <span v-if="getMenuItemBadge(item)" class="layout-top-nav__link-badge">{{ getMenuItemBadge(item) }}</span>
          <span v-if="item.caret" class="layout-top-nav__link-caret" aria-hidden="true">⌄</span>
        </a>
      </nav>

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
  display: flex;
  align-items: center;
  min-height: 56px;
  justify-content: space-between;
  border: 0;
  border-bottom: 1px solid rgb(255 255 255 / 0.08);
  background: rgb(0 0 0 / 0.92);
  box-shadow: none;
  color: white;
  gap: 22px;
  padding: 0 16px;
  backdrop-filter: blur(12px);
}

.layout-top-nav__left,
.layout-top-nav__right,
.layout-top-nav__brand,
.layout-top-nav__links,
.layout-top-nav__actions {
  display: flex;
  align-items: center;
}

.layout-top-nav__left {
  min-width: 0;
  flex: none;
  gap: 28px;
}

.layout-top-nav__right {
  min-width: 0;
  flex: 1;
  gap: 18px;
  justify-content: flex-end;
}

.layout-top-nav__brand {
  flex: none;
  color: white;
  font-size: 22px;
  font-weight: 800;
  line-height: 28px;
  text-decoration: none;
}

.layout-top-nav__links {
  min-width: 0;
  flex: 1 1 auto;
  justify-content: flex-start;
  gap: 20px;
  overflow-x: auto;
  scrollbar-width: none;
}

.layout-top-nav__links::-webkit-scrollbar {
  display: none;
}

.layout-top-nav__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  border-radius: 0;
  color: rgb(255 255 255 / 0.78);
  font-size: 13px;
  font-weight: 650;
  line-height: 56px;
  padding: 0;
  text-decoration: none;
  white-space: nowrap;
}

.layout-top-nav__link:hover,
.layout-top-nav__link--active,
.layout-top-nav__link--highlight {
  background: transparent;
  color: white;
}

.layout-top-nav__link-badge {
  flex: none;
  color: rgb(255 130 67);
  font-size: 12px;
  line-height: 1;
}

.layout-top-nav__link-caret {
  flex: none;
  color: rgb(255 255 255 / 0.66);
  font-size: 12px;
  line-height: 1;
  transform: translateY(-1px);
}

.layout-top-nav__actions {
  flex: none;
  gap: 8px;
}

.layout-top-nav__action {
  position: relative;
  display: inline-flex;
  height: 32px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgb(255 255 255 / 0.88);
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 650;
  line-height: 18px;
  padding: 0 8px;
  text-decoration: none;
}

.layout-top-nav__action:hover {
  background: rgb(255 255 255 / 0.08);
  color: white;
}

.layout-top-nav__action-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.layout-top-nav__action--web-primary {
  min-width: 58px;
  background: rgb(25 103 255);
  color: white;
  padding: 0 18px;
}

.layout-top-nav__action--web-primary:hover {
  background: rgb(50 123 255);
}

.layout-top-nav__action--shape-icon,
.layout-top-nav__action--shape-avatar {
  width: 30px;
  height: 32px;
  padding: 0;
}

:deep(.layout-top-nav__action-icon) {
  width: 17px;
  height: 17px;
}

:deep(.layout-top-nav__action-badge) {
  top: 1px;
  right: -1px;
  min-width: 15px;
  height: 15px;
  border: 1px solid rgb(0 0 0);
  background: rgb(239 68 68);
  font-size: 9px;
  padding: 0 3px;
}

:deep(.layout-top-nav__avatar) {
  width: 26px;
  height: 26px;
}

.dark .layout-top-nav {
  border-bottom-color: rgb(255 255 255 / 0.08);
  background: rgb(0 0 0 / 0.92);
}

@media (max-width: 720px) {
  .layout-top-nav {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
    padding: 12px 16px;
  }

  .layout-top-nav__right {
    align-items: stretch;
    flex-direction: column;
  }

  .layout-top-nav__links,
  .layout-top-nav__actions {
    justify-content: flex-start;
    overflow-x: auto;
  }
}
</style>
