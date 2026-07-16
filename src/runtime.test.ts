import { afterEach, describe, expect, it } from 'vitest';
import { configureMokelayComponents, requireMokelayCapability } from './runtime';
import { i18n } from './i18n';
import {
  getGlobalSettingValue,
  setGlobalSettingValue
} from './runtime/globalSettingsRuntime';

describe('runtime adapter', () => {
  afterEach(() => configureMokelayComponents({}));

  it('reports an explicitly named missing capability', () => {
    configureMokelayComponents({});
    expect(() => requireMokelayCapability('getPage')).toThrow('Missing adapter capability: getPage');
  });

  it('returns configured capabilities', () => {
    const t = (key: string) => key;
    configureMokelayComponents({ t });
    expect(requireMokelayCapability('t')).toBe(t);
  });

  it('uses safe global-setting fallbacks and delegates configured updates', () => {
    configureMokelayComponents({});
    expect(getGlobalSettingValue('theme')).toBe('light');
    expect(getGlobalSettingValue('language')).toBe('zh');

    const values: Record<string, string> = {};
    configureMokelayComponents({
      getGlobalSetting: (key) => values[key] ?? '',
      setGlobalSetting: (key, value) => {
        values[key] = value;
      }
    });
    expect(setGlobalSettingValue('theme', 'dark')).toBe(true);
    expect(values.theme).toBe('dark');
    expect(getGlobalSettingValue('theme')).toBe('dark');
  });

  it('drives runtime translations from the host adapter without browser locale state', () => {
    configureMokelayComponents({});
    expect(i18n.locale).toBe('zh');
    expect(i18n.t('advanceTable.noColumns')).toBe('请先设置表格列');

    const values: Record<string, string> = { language: 'en' };
    configureMokelayComponents({
      t: (key) => `host:${key}`,
      getGlobalSetting: (key) => values[key] ?? '',
      setGlobalSetting: (key, value) => {
        values[key] = value;
      }
    });

    expect(i18n.locale).toBe('en');
    expect(i18n.t('advanceTable.noColumns')).toBe('host:advanceTable.noColumns');
    i18n.setLocale('zh');
    expect(values.language).toBe('zh');
  });
});
