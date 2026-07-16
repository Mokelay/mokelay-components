import { describe, expect, it } from 'vitest';
import { normalizeActions } from './normalizer';

describe('actions', () => {
  it('normalizes values and removes duplicate ids', () => {
    expect(normalizeActions([
      { uuid: ' a ', action: ' confirm ', outputs: [' result ', ''] },
      { uuid: 'a', action: 'confirm' },
      { uuid: '', action: 'confirm' }
    ])).toEqual([{ uuid: 'a', action: 'confirm', outputs: ['result'] }]);
  });
});
