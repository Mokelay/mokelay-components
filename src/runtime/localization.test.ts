import { describe, expect, it } from 'vitest';
import {
  collectMissingTranslations,
  isLocalizedValue,
  migrateLegacyLocalizedValue,
  normalizePageLocaleConfig,
  normalizeLocalizedTextValue,
  resolveLocalizedTree,
  resolveLocalizedValue
} from './localization';

describe('localized page content', () => {
  const config = { defaultLocale: 'zh-CN', supportedLocales: ['zh-CN', 'en-US', 'ja-JP'] };

  it('recognizes only explicitly marked values', () => {
    expect(isLocalizedValue({ $i18n: { 'zh-CN': '你好' } })).toBe(true);
    expect(isLocalizedValue({ zh: '你好', en: 'Hello' })).toBe(false);
    expect(isLocalizedValue({ $variable: { path: 'name' } })).toBe(false);
  });

  it('uses current, default, then first non-empty translation', () => {
    const value = { $i18n: { 'zh-CN': '你好', 'en-US': 'Hello', 'ja-JP': '' } };
    expect(resolveLocalizedValue(value, 'en-US', config)).toBe('Hello');
    expect(resolveLocalizedValue(value, 'ja-JP', config)).toBe('你好');
    expect(resolveLocalizedValue({ $i18n: { 'zh-CN': '', 'en-US': 'Hello' } }, 'fr-FR', config)).toBe('Hello');
  });

  it('resolves marked values without changing ordinary objects', () => {
    const variable = { $variable: { path: 'profile.name' } };
    expect(resolveLocalizedTree({ placeholder: { $i18n: { 'zh-CN': '输入' } }, variable }, { locale: 'zh-CN', localeConfig: config }))
      .toEqual({ placeholder: '输入', variable });
  });

  it('normalizes locale config and migrates legacy values explicitly', () => {
    expect(normalizePageLocaleConfig({ defaultLocale: 'ja-JP', supportedLocales: ['en-US'] }))
      .toEqual({ defaultLocale: 'ja-JP', supportedLocales: ['ja-JP', 'en-US'] });
    expect(migrateLegacyLocalizedValue({ zh: '输入', en: 'Enter' }))
      .toEqual({ $i18n: { 'zh-CN': '输入', 'en-US': 'Enter' } });
  });

  it('preserves marked and legacy localized text while retaining plain strings', () => {
    expect(normalizeLocalizedTextValue('Label')).toBe('Label');
    expect(normalizeLocalizedTextValue({ $i18n: { 'en-US': 'Label' } })).toEqual({ $i18n: { 'en-US': 'Label' } });
    expect(normalizeLocalizedTextValue({ zh: '字段', en: 'Field' })).toEqual({ $i18n: { 'zh-CN': '字段', 'en-US': 'Field' } });
  });

  it('collects missing translations for declared nested fields', () => {
    expect(collectMissingTranslations({
      localeConfig: config,
      blocks: [{ id: 'table', type: 'MTable', data: { columns: [{ title: { $i18n: { 'zh-CN': '姓名', 'en-US': '', 'ja-JP': '' } } }] } }]
    }, { MTable: ['columns[].title'] })).toHaveLength(2);
  });
});
