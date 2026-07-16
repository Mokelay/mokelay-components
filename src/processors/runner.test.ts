import { describe, expect, it } from 'vitest';
import { applyProcessors, normalizeProcessors, validateProcessorConfig } from './runner';

describe('processors', () => {
  it('normalizes and applies processors in order', () => {
    expect(normalizeProcessors(['trim', null, { processor: 'trim' }])).toEqual(['trim', { processor: 'trim' }]);
    expect(applyProcessors('  Mokelay  ', ['trim'])).toBe('Mokelay');
  });

  it('rejects unsupported processors', () => {
    expect(() => validateProcessorConfig('missing')).toThrow('Unsupported Processor');
  });
});
