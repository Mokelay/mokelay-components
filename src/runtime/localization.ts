export type LocaleCode = string;

export interface LocalizedValue {
  $i18n: Record<LocaleCode, string>;
}

export type LocalizedTextValue = string | LocalizedValue;

export interface PageLocaleConfig {
  defaultLocale: LocaleCode;
  supportedLocales: LocaleCode[];
}

export interface LocalizedFieldMetadata {
  paths?: string[];
}

export interface MissingTranslation {
  blockId?: string;
  blockType: string;
  path: string;
  locale: LocaleCode;
}

export const DEFAULT_PAGE_LOCALE_CONFIG: PageLocaleConfig = {
  defaultLocale: 'zh-CN',
  supportedLocales: ['zh-CN', 'en-US']
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeLocale(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizePageLocaleConfig(
  value: unknown,
  fallbackLocale = DEFAULT_PAGE_LOCALE_CONFIG.defaultLocale
): PageLocaleConfig {
  const record = isRecord(value) ? value : {};
  const requestedDefault = normalizeLocale(record.defaultLocale ?? record.default_locale) || fallbackLocale;
  const requestedLocales = Array.isArray(record.supportedLocales ?? record.supported_locales)
    ? (record.supportedLocales ?? record.supported_locales) as unknown[]
    : [];
  const supportedLocales = [...new Set(requestedLocales.map(normalizeLocale).filter(Boolean))];
  if (!supportedLocales.includes(requestedDefault)) supportedLocales.unshift(requestedDefault);
  if (!requestedLocales.length) {
    for (const locale of DEFAULT_PAGE_LOCALE_CONFIG.supportedLocales) {
      if (!supportedLocales.includes(locale)) supportedLocales.push(locale);
    }
  }
  return { defaultLocale: requestedDefault, supportedLocales };
}

export function isLocalizedValue(value: unknown): value is LocalizedValue {
  if (!isRecord(value) || !isRecord(value.$i18n)) return false;
  return Object.values(value.$i18n).every((item) => typeof item === 'string');
}

export function normalizeLocalizedValue(value: unknown, localeConfig?: PageLocaleConfig): LocalizedValue {
  const config = normalizePageLocaleConfig(localeConfig);
  const source = isLocalizedValue(value) ? value.$i18n : {};
  const translations: Record<string, string> = {};
  for (const locale of config.supportedLocales) translations[locale] = source[locale] ?? '';
  for (const [locale, text] of Object.entries(source)) {
    if (!(locale in translations)) translations[locale] = text;
  }
  return { $i18n: translations };
}

export function resolveLocalizedValue(
  value: unknown,
  locale: LocaleCode,
  localeConfig?: PageLocaleConfig
): string {
  if (typeof value === 'string') return value;
  if (!isLocalizedValue(value)) return '';
  const config = normalizePageLocaleConfig(localeConfig, locale || undefined);
  const current = value.$i18n[locale];
  if (typeof current === 'string' && current.trim()) return current;
  const fallback = value.$i18n[config.defaultLocale];
  if (typeof fallback === 'string' && fallback.trim()) return fallback;
  return Object.values(value.$i18n).find((item) => item.trim()) ?? '';
}

export function resolveLocalizedTree(
  value: unknown,
  context: { locale: LocaleCode; localeConfig?: PageLocaleConfig },
  _metadata?: LocalizedFieldMetadata
): unknown {
  if (isLocalizedValue(value)) return resolveLocalizedValue(value, context.locale, context.localeConfig);
  if (Array.isArray(value)) return value.map((item) => resolveLocalizedTree(item, context, _metadata));
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveLocalizedTree(item, context, _metadata)]));
}

export function migrateLegacyLocalizedValue(value: unknown): LocalizedValue | undefined {
  if (isLocalizedValue(value)) return value;
  if (!isRecord(value)) return undefined;
  const allowed = new Set(['zh', 'en', 'zh-CN', 'en-US']);
  const keys = Object.keys(value);
  if (!keys.length || !keys.every((key) => allowed.has(key))) return undefined;
  if (!keys.every((key) => typeof value[key] === 'string')) return undefined;
  return {
    $i18n: {
      ...(typeof value.zh === 'string' ? { 'zh-CN': value.zh } : {}),
      ...(typeof value.en === 'string' ? { 'en-US': value.en } : {}),
      ...(typeof value['zh-CN'] === 'string' ? { 'zh-CN': value['zh-CN'] } : {}),
      ...(typeof value['en-US'] === 'string' ? { 'en-US': value['en-US'] } : {})
    }
  };
}

export function normalizeLocalizedTextValue(value: unknown, fallback = ''): LocalizedTextValue {
  if (typeof value === 'string') return value.trim() ? value : fallback;
  const migrated = migrateLegacyLocalizedValue(value);
  return migrated ?? fallback;
}

type LocalizableBlock = { id?: string; type: string; data?: Record<string, unknown> };

export function collectMissingTranslations(
  page: { blocks?: LocalizableBlock[]; localeConfig?: PageLocaleConfig },
  fieldsByBlock: Record<string, string[]> = {}
): MissingTranslation[] {
  const config = normalizePageLocaleConfig(page.localeConfig);
  const issues: MissingTranslation[] = [];
  for (const block of page.blocks ?? []) {
    const declaredPaths = fieldsByBlock[block.type];
    if (!declaredPaths) {
      collectLocalizedNodes(block.data, '', (path, value) => {
        for (const locale of config.supportedLocales) {
          if (!value.$i18n[locale]?.trim()) issues.push({ blockId: block.id, blockType: block.type, path, locale });
        }
      });
      continue;
    }
    for (const path of declaredPaths) {
      const values = readPathValues(block.data, path.split('.'));
      for (const value of values) {
        if (!isLocalizedValue(value)) continue;
        for (const locale of config.supportedLocales) {
          if (!value.$i18n[locale]?.trim()) issues.push({ blockId: block.id, blockType: block.type, path, locale });
        }
      }
    }
  }
  return issues;
}

function collectLocalizedNodes(value: unknown, path: string, visit: (path: string, value: LocalizedValue) => void) {
  if (isLocalizedValue(value)) {
    visit(path, value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectLocalizedNodes(item, `${path}[${index}]`, visit));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, item] of Object.entries(value)) {
    collectLocalizedNodes(item, path ? `${path}.${key}` : key, visit);
  }
}

function readPathValues(value: unknown, parts: string[]): unknown[] {
  if (!parts.length) return [value];
  if (!isRecord(value)) return [];
  const [part, ...rest] = parts;
  if (part.endsWith('[]')) {
    const collection = value[part.slice(0, -2)];
    return Array.isArray(collection) ? collection.flatMap((item) => readPathValues(item, rest)) : [];
  }
  return readPathValues(value[part], rest);
}
