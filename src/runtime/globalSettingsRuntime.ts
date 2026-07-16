import { computed, ref } from 'vue';
import type { GlobalSettingKey, GlobalSettingLanguage, ThemeMode } from '@/global-settings';
import { getMokelayComponentsAdapter } from '@/runtime/adapter';

const fallbackTheme = ref<ThemeMode>('light');
const fallbackLanguage = ref<GlobalSettingLanguage>('zh');

export const themeValue = computed(() => normalizeThemeMode(
  getMokelayComponentsAdapter().getGlobalSetting?.('theme') ?? fallbackTheme.value
));

export const languageValue = computed(() => normalizeLanguage(
  getMokelayComponentsAdapter().getGlobalSetting?.('language') ?? fallbackLanguage.value
));

export function getGlobalSettingValue(key: string | undefined) {
  if (key === 'theme') return themeValue.value;
  if (key === 'language') return languageValue.value;
  return '';
}

export function setGlobalSettingValue(key: string | undefined, value: string) {
  if (!isGlobalSettingKey(key)) return false;

  const normalizedValue = key === 'theme'
    ? normalizeThemeMode(value)
    : normalizeLanguage(value);
  getMokelayComponentsAdapter().setGlobalSetting?.(key, normalizedValue);

  if (key === 'theme') {
    fallbackTheme.value = normalizedValue as ThemeMode;
  } else {
    fallbackLanguage.value = normalizedValue as GlobalSettingLanguage;
  }
  return true;
}

function isGlobalSettingKey(value: string | undefined): value is GlobalSettingKey {
  return value === 'theme' || value === 'language';
}

function normalizeThemeMode(value: unknown): ThemeMode {
  return value === 'dark' ? 'dark' : 'light';
}

function normalizeLanguage(value: unknown): GlobalSettingLanguage {
  return value === 'en' ? 'en' : 'zh';
}
