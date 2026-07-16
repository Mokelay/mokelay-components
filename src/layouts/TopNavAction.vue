<script setup lang="ts">
import { computed } from 'vue';
import type { LayoutBlock } from '@/layouts/domain';
import {
  getActionAriaLabel,
  getActionBadge,
  getActionHref,
  getActionIcon,
  getActionLabel,
  getActionShape,
  getActionVariant,
  topNavIconPaths
} from '@/layouts/topNavRuntime';

const props = withDefaults(defineProps<{
  action: LayoutBlock;
  classPrefix?: string;
}>(), {
  classPrefix: 'layout-top-nav'
});

const href = computed(() => getActionHref(props.action));
const icon = computed(() => getActionIcon(props.action));
const iconPath = computed(() => topNavIconPaths[icon.value] || '');
const label = computed(() => getActionLabel(props.action));
const badge = computed(() => getActionBadge(props.action));
const ariaLabel = computed(() => getActionAriaLabel(props.action));
const actionClass = computed(() => [
  `${props.classPrefix}__action`,
  `${props.classPrefix}__action--${getActionVariant(props.action)}`,
  `${props.classPrefix}__action--shape-${getActionShape(props.action)}`
]);
</script>

<template>
  <a
    v-if="href"
    :class="actionClass"
    :href="href"
    :aria-label="ariaLabel"
  >
    <span :class="`${classPrefix}__action-content`">
      <span
        v-if="icon === 'gradient-avatar'"
        :class="`${classPrefix}__avatar`"
        aria-hidden="true"
      />
      <svg
        v-else-if="iconPath"
        :class="`${classPrefix}__action-icon`"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path :d="iconPath" />
      </svg>
      <span v-if="label" :class="`${classPrefix}__action-label`">{{ label }}</span>
      <span v-if="badge" :class="`${classPrefix}__action-badge`">{{ badge }}</span>
    </span>
  </a>

  <button
    v-else
    type="button"
    :class="actionClass"
    :aria-label="ariaLabel"
  >
    <span :class="`${classPrefix}__action-content`">
      <span
        v-if="icon === 'gradient-avatar'"
        :class="`${classPrefix}__avatar`"
        aria-hidden="true"
      />
      <svg
        v-else-if="iconPath"
        :class="`${classPrefix}__action-icon`"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path :d="iconPath" />
      </svg>
      <span v-if="label" :class="`${classPrefix}__action-label`">{{ label }}</span>
      <span v-if="badge" :class="`${classPrefix}__action-badge`">{{ badge }}</span>
    </span>
  </button>
</template>

<style scoped>
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
</style>
