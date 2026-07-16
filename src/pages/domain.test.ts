import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureMokelayComponents } from '@/runtime';
import { loadMokelayPage, normalizeMokelayPage } from './domain';
import { normalizePageDataSources } from './runtimeContext';
import { validatePageSlug } from './slug';

describe('page domain', () => {
  afterEach(() => configureMokelayComponents({}));

  it('normalizes page documents and data sources', () => {
    expect(normalizeMokelayPage({
      uuid: 'home',
      name: 'Home',
      blocks: [{ type: 'MInput', data: {} }],
      data_sources: [{ key: 'tenant', type: 'static', value: 7 }],
      quotes: '["child", "child"]'
    })).toMatchObject({
      uuid: 'home',
      subPage: false,
      quotes: ['child'],
      dependencies: [],
      dataSources: [{ key: 'tenant', type: 'static', value: 7 }]
    });
    expect(normalizePageDataSources([{ key: '', type: 'static' }, null])).toEqual([]);
    expect(validatePageSlug(' Home_Page ')).toEqual({ valid: true, value: 'home_page' });
  });

  it('loads user and system pages through typed adapter capabilities', async () => {
    const getPage = vi.fn(async (uuid: string) => ({ uuid, name: 'User', blocks: [] }));
    const getSystemPage = vi.fn(async (uuid: string) => ({ uuid, name: 'System', blocks: [] }));
    configureMokelayComponents({ getPage, getSystemPage });

    await expect(loadMokelayPage('home')).resolves.toMatchObject({ uuid: 'home', name: 'User' });
    await expect(loadMokelayPage('docs', 'system')).resolves.toMatchObject({ uuid: 'docs', name: 'System' });
    expect(getPage).toHaveBeenCalledWith('home');
    expect(getSystemPage).toHaveBeenCalledWith('docs');
  });

  it('names a missing adapter capability', async () => {
    configureMokelayComponents({});
    await expect(loadMokelayPage('home')).rejects.toThrow('Missing adapter capability: getPage');
  });
});
