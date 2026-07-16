import { localeMessages } from '@/langs';
import { getMokelayComponentsAdapter } from '@/runtime/adapter';
import {
  languageValue,
  setGlobalSettingValue
} from '@/runtime/globalSettingsRuntime';

export type Locale = 'zh' | 'en';

function getMessage(path: string): string {
  const hostTranslation = getMokelayComponentsAdapter().t;
  if (hostTranslation) return hostTranslation(path);

  const parts = path.split('.');
  let value: unknown = localeMessages[languageValue.value];

  for (const part of parts) {
    if (typeof value === 'object' && value !== null && part in value) {
      value = (value as Record<string, unknown>)[part];
      continue;
    }

    value = undefined;
    break;
  }

  if (typeof value === 'string') {
    return value;
  }

  return path;
}

function updateLocale(locale: Locale) {
  setGlobalSettingValue('language', locale);
}

export function useI18n() {
  return {
    locale: languageValue,
    t: getMessage,
    setLocale: updateLocale,
    localeValue: languageValue
  };
}

export const i18n = {
  t: getMessage,
  get locale() {
    return languageValue.value;
  },
  setLocale: updateLocale
};
