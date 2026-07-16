import { describe, expect, it } from 'vitest';
import {
  attachInternalBlockEventsToData,
  finalizeEditorOutputWithEvents,
  prepareEditorOutputWithEvents
} from './blockEvents';
import {
  cloneSelectorBlock,
  createParagraphBlock,
  normalizeSelectorBlock,
  normalizeStoredBlocks
} from './storedBlocks';
import {
  inferAdvanceTableColumnVariable,
  normalizeAdvanceTableColumns
} from './advanceTableColumns';

describe('shared block domain helpers', () => {
  it('round-trips block events between saved and editor data', () => {
    const saved = {
      blocks: [{
        id: 'button',
        type: 'MButton',
        data: { label: 'Save' },
        events: [{ event: 'click', actions: [{ uuid: 'confirm', action: 'confirm' }] }]
      }]
    };

    const prepared = prepareEditorOutputWithEvents(saved);
    expect(prepared.blocks[0]).not.toHaveProperty('events');
    expect(prepared.blocks[0]?.data).toHaveProperty('__mokelayBlockEvents');
    expect(finalizeEditorOutputWithEvents(prepared)).toEqual(saved);
  });

  it('normalizes selector and stored blocks with cloned data', () => {
    const selector = normalizeSelectorBlock({ type: 'MInput', data: { value: 'a' } });
    expect(selector?.id).toBeTruthy();
    expect(cloneSelectorBlock(selector!)).toEqual(selector);
    expect(normalizeStoredBlocks([createParagraphBlock('hello', 'p')])).toEqual([
      { id: 'p', type: 'paragraph', data: { text: 'hello' } }
    ]);
    expect(attachInternalBlockEventsToData({}, [])).toEqual({});
  });

  it('shares advance-table column normalization with editor consumers', () => {
    const columns = normalizeAdvanceTableColumns([{
      columnName: ' Name ',
      columnContent: [createParagraphBlock('{{ user.name }}')],
      width: 120.4,
      fixed: 'left'
    }]);

    expect(columns[0]).toMatchObject({
      columnName: 'Name',
      fieldVariable: 'user.name',
      width: 120,
      fixed: 'left'
    });
    expect(inferAdvanceTableColumnVariable(columns[0]?.columnContent)).toBe('user.name');
  });
});
