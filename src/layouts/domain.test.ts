import { describe, expect, it } from 'vitest';
import {
  normalizeLayoutJson,
  normalizeMenuItems,
  normalizePageRenderBundle,
  normalizeSystemLayout
} from './domain';

describe('layout domain', () => {
  it('normalizes layout DSL without management API state', () => {
    expect(normalizeLayoutJson({
      uuid: 'main',
      name: 'Main',
      blocks: [{ type: 'MSiteTopNav', data: { compact: true } }]
    })).toMatchObject({
      schemaVersion: 1,
      uuid: 'main',
      blocks: [{ type: 'MSiteTopNav', data: { compact: true } }]
    });
    expect(normalizeMenuItems([{ name: 'Home', url: '/' }, { name: '' }])).toEqual([
      expect.objectContaining({ label: 'Home', href: '/' })
    ]);
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
