<script setup lang="ts">
import { computed } from 'vue';
import MEditorTopNav from '@/layouts/MEditorTopNav.vue';
import MSiteTopNav from '@/layouts/MSiteTopNav.vue';
import MWebTopNav from '@/layouts/MWebTopNav.vue';
import type { TopNavProps } from '@/layouts/topNavTypes';

defineOptions({
  name: 'MTopNav'
});

const props = withDefaults(defineProps<TopNavProps>(), {
  variant: 'site',
  brand: () => ({ text: 'Mokelay', href: '/' }),
  homeAction: undefined,
  utilityControls: () => [],
  items: () => [],
  actions: () => [],
  guestActions: () => [],
  userActions: () => [],
  auth: () => ({ loggedIn: false, user: null, pending: false })
});

const targetComponent = computed(() => {
  if (props.variant === 'editor') return MEditorTopNav;
  if (props.variant === 'web') return MWebTopNav;
  return MSiteTopNav;
});
</script>

<template>
  <component
    :is="targetComponent"
    :variant="variant"
    :brand="brand"
    :home-action="homeAction"
    :utility-controls="utilityControls"
    :items="items"
    :actions="actions"
    :guest-actions="guestActions"
    :user-actions="userActions"
    :auth="auth"
  />
</template>
