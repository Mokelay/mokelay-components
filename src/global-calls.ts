import type { GlobalCallFunctions } from './components/global-calls/globalCalls';

export { default as GlobalCallContentRenderer } from './components/global-calls/GlobalCallContentRenderer.vue';
export { default as GlobalCallHost } from './components/global-calls/GlobalCallHost.vue';
export * from './components/global-calls/globalCalls';

declare global {
  interface Window extends GlobalCallFunctions {}
}

declare module 'vue' {
  interface ComponentCustomProperties extends GlobalCallFunctions {}
}
