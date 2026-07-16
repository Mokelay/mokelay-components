import { describe, expect, it } from 'vitest';
import {
  getDefaultApiDatasource,
  normalizeBodyValue,
  normalizeDatasource
} from './datasource';
import { inferJSONSchema, normalizeSchemaSelections } from './schema';

describe('datasource domain', () => {
  it('normalizes datasource and typed body values', () => {
    expect(normalizeBodyValue('boolean', 'true')).toBe(true);
    expect(normalizeBodyValue('number', 'invalid')).toBe(0);
    expect(normalizeDatasource({ type: 'API', domain: 'primary', path: '/users' })).toMatchObject({
      type: 'API',
      domain: 'primary',
      path: '/users'
    });
    expect(getDefaultApiDatasource().type).toBe('API');
  });

  it('infers schemas and removes invalid selections', () => {
    expect(inferJSONSchema({ user: { name: 'Ada' }, active: true })).toMatchObject({
      ok: true,
      schema: {
        type: 'object',
        properties: {
          user: { type: 'object' },
          active: { type: 'boolean' }
        }
      }
    });
    expect(normalizeSchemaSelections([
      { path: 'user.name', label: 'Name', type: 'string' },
      null,
      { path: '' }
    ])).toHaveLength(1);
  });
});
