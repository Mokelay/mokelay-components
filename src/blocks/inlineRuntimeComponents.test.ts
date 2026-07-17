import { describe, expect, it } from 'vitest';
import { getInlineRuntimeComponentDefinition } from './inlineRuntimeComponents';

describe('inline runtime components', () => {
  it('normalizes interpolated MButton boolean props before Vue receives them', () => {
    const definition = getInlineRuntimeComponentDefinition('MButton');

    expect(definition?.normalizeProps({
      edit: false,
      visible: '1',
      hidden: '0',
      disabled: 'true',
      bare: 'yes'
    })).toEqual(expect.objectContaining({
      edit: false,
      visible: true,
      hidden: false,
      disabled: true,
      bare: true
    }));
  });
});
