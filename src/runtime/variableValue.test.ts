import { describe, expect, it } from 'vitest';
import {
  normalizeVariableOptions,
  normalizeVariableValueConfig,
  resolveRuntimeValue,
  stringifyVariableValue
} from './variableValue';

describe('variable value runtime', () => {
  it('normalizes variable options and resolves nested runtime values', () => {
    expect(normalizeVariableOptions([
      { name: ' user ', label: 'User', type: 'object' },
      { name: 'user', label: 'Duplicate' },
      { variable: 'count', type: 'number' }
    ])).toEqual([
      { name: 'user', label: 'User', type: 'object' },
      { name: 'count', label: 'count', type: 'number' }
    ]);

    const config = normalizeVariableValueConfig({ mode: 'variable', blockId: 'profile', variable: 'name' });
    expect(resolveRuntimeValue({ greeting: config }, {
      blocks: { profile: { name: 'Ada' } }
    })).toEqual({ greeting: 'Ada' });
    expect(stringifyVariableValue(config)).toContain('name');
  });
});
