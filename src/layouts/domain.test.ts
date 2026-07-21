import { describe, expect, it } from 'vitest';
import {
  normalizeLayoutJson,
  normalizeMenuItems,
  normalizePageRenderBundle,
  normalizeSystemLayout
} from './domain';
import { collectMissingLayoutTranslations } from './localization';

describe('layout domain', () => {
  it('normalizes layout DSL without management API state', () => {
    expect(normalizeLayoutJson({
      uuid: 'main',
      name: 'Main',
      blocks: [{ type: 'MSiteTopNav', data: { compact: true } }]
    })).toMatchObject({
      schemaVersion: 1,
      uuid: 'main',
      localeConfig: { defaultLocale: 'zh-CN', supportedLocales: ['zh-CN', 'en-US'] },
      blocks: [{ type: 'MSiteTopNav', data: { compact: true } }]
    });
    expect(normalizeMenuItems([{ name: 'Home', url: '/' }, { name: '' }])).toEqual([
      expect.objectContaining({ label: 'Home', href: '/' })
    ]);
  });

  it('preserves localized menu labels and reports missing layout translations', () => {
    const label = { $i18n: { 'zh-CN': '首页', 'en-US': '' } };
    expect(normalizeMenuItems([{ label, href: '/' }])[0]?.label).toEqual(label);

    expect(collectMissingLayoutTranslations({
      localeConfig: { defaultLocale: 'zh-CN', supportedLocales: ['zh-CN', 'en-US'] },
      resources: { mainMenu: { type: 'static', items: [{ label, href: '/' }] } },
      blocks: [{ id: 'nav', type: 'MTopNav', data: { brand: { text: label } } }]
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ blockType: 'layout-resources', locale: 'en-US' }),
      expect.objectContaining({ blockId: 'nav', path: 'data.brand.text', locale: 'en-US' })
    ]));
  });

  it('normalizes stored system layouts and page render bundles', () => {
    expect(normalizeSystemLayout({
      uuid: 'system',
      name: 'System',
      layout_json: { blocks: [] }
    })).toMatchObject({ uuid: 'system', name: 'System', blocks: [] });

    expect(normalizePageRenderBundle({
      page: { uuid: 'home', name: 'Home', blocks: [] },
      layout: { uuid: 'main', name: 'Main', blocks: [] }
    })).toMatchObject({
      page: { uuid: 'home' },
      layout: { uuid: 'main' }
    });
  });
});
