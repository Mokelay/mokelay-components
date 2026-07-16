import type { MokelayBlock, MokelayPageDocument } from '@/blocks/types';

type BlockDocumentData = MokelayBlock;
type PageDocument = MokelayPageDocument;
import { cloneActions, normalizeActions, type ActionConfig } from '@/actions';

export type BlockEvent = {
  event: string;
  actions: ActionConfig[];
};

export const INTERNAL_BLOCK_EVENTS_DATA_KEY = '__mokelayBlockEvents';

type PlainRecord = Record<string, unknown>;

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toPlainRecord(value: unknown): PlainRecord {
  return isRecord(value) ? cloneJsonValue(value) as PlainRecord : {};
}

function eventFieldValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isBlockLike(value: unknown): value is BlockDocumentData {
  if (!isRecord(value)) return false;
  return typeof value.type === 'string' && isRecord(value.data);
}

function isBlockArray(value: unknown): value is BlockDocumentData[] {
  return Array.isArray(value) && value.every((item) => isBlockLike(item));
}

export function createEmptyBlockEvent(): BlockEvent {
  return {
    event: '',
    actions: []
  };
}

export function normalizeBlockEvents(value: unknown): BlockEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is PlainRecord => isRecord(item))
    .map((item) => ({
      event: eventFieldValue(item.event),
      actions: normalizeActions(item.actions)
    }))
    .filter((item) => item.event && item.actions.length);
}

export function cloneBlockEvents(value: unknown): BlockEvent[] {
  return normalizeBlockEvents(value).map((item) => ({
    event: item.event,
    actions: cloneActions(item.actions)
  }));
}

export function getInternalBlockEventsFromData(data: unknown) {
  return normalizeBlockEvents(isRecord(data) ? data[INTERNAL_BLOCK_EVENTS_DATA_KEY] : undefined);
}

export function hasInternalBlockEventsData(data: unknown) {
  return isRecord(data) && Object.prototype.hasOwnProperty.call(data, INTERNAL_BLOCK_EVENTS_DATA_KEY);
}

export function removeInternalBlockEventsFromData(data: unknown): PlainRecord {
  const record = toPlainRecord(data);
  delete record[INTERNAL_BLOCK_EVENTS_DATA_KEY];
  return record;
}

export function attachInternalBlockEventsToData(data: unknown, events: unknown, includeEmpty = false): PlainRecord {
  const record = removeInternalBlockEventsFromData(data);
  const normalizedEvents = normalizeBlockEvents(events);

  if (normalizedEvents.length || includeEmpty) {
    record[INTERNAL_BLOCK_EVENTS_DATA_KEY] = normalizedEvents;
  }

  return record;
}

function mapNestedData(data: unknown, mode: 'runtime' | 'saved'): PlainRecord {
  const record = toPlainRecord(data);

  if (isBlockArray(record.value)) {
    record.value = mapBlocks(record.value, mode);
  }

  if (Array.isArray(record.cols)) {
    record.cols = record.cols.map((column) => {
      if (!isRecord(column)) return column;
      const nextColumn = toPlainRecord(column);
      if (isBlockArray(nextColumn.blocks)) {
        nextColumn.blocks = mapBlocks(nextColumn.blocks, mode);
      }
      return nextColumn;
    });
  }

  if (Array.isArray(record.columns)) {
    record.columns = record.columns.map((column) => {
      if (!isRecord(column)) return column;
      const nextColumn = toPlainRecord(column);
      if (isBlockArray(nextColumn.columnContent)) {
        nextColumn.columnContent = mapBlocks(nextColumn.columnContent, mode);
      }
      return nextColumn;
    });
  }

  if (Array.isArray(record.items)) {
    record.items = record.items.map((item) => {
      if (!isRecord(item)) return item;
      const nextItem = toPlainRecord(item);
      if (isBlockLike(nextItem.editor)) {
        nextItem.editor = mapBlock(nextItem.editor, mode);
      }
      return nextItem;
    });
  }

  return record;
}

function mapBlock(block: BlockDocumentData, mode: 'runtime' | 'saved'): BlockDocumentData {
  const blockRecord = block as unknown as PlainRecord;
  const nestedData = mapNestedData(blockRecord.data, mode);

  if (mode === 'runtime') {
    const hasTopLevelEvents = Object.prototype.hasOwnProperty.call(blockRecord, 'events');
    const hasInternalEvents = hasInternalBlockEventsData(nestedData);
    const events = hasTopLevelEvents
      ? blockRecord.events
      : nestedData[INTERNAL_BLOCK_EVENTS_DATA_KEY];
    const data = attachInternalBlockEventsToData(nestedData, events, hasTopLevelEvents || hasInternalEvents);
    const nextBlock: PlainRecord = {
      ...blockRecord,
      data
    };
    delete nextBlock.events;
    return nextBlock as unknown as BlockDocumentData;
  }

  const hasInternalEvents = hasInternalBlockEventsData(nestedData);
  const hasTopLevelEvents = Object.prototype.hasOwnProperty.call(blockRecord, 'events');
  const events = hasInternalEvents
    ? getInternalBlockEventsFromData(nestedData)
    : normalizeBlockEvents(blockRecord.events);
  const data = removeInternalBlockEventsFromData(nestedData);
  const nextBlock: PlainRecord = {
    ...blockRecord,
    data
  };

  delete nextBlock.events;
  if (events.length || hasInternalEvents || hasTopLevelEvents) {
    nextBlock.events = events;
  }

  return nextBlock as unknown as BlockDocumentData;
}

function mapBlocks(blocks: BlockDocumentData[], mode: 'runtime' | 'saved') {
  return blocks.map((block) => mapBlock(block, mode));
}

export function prepareEditorBlocksWithEvents(blocks: PageDocument['blocks'] = []): PageDocument['blocks'] {
  return mapBlocks(blocks, 'runtime');
}

export function finalizeEditorBlocksWithEvents(blocks: PageDocument['blocks'] = []): PageDocument['blocks'] {
  return mapBlocks(blocks, 'saved');
}

export function prepareEditorOutputWithEvents(output: PageDocument): PageDocument {
  return {
    ...output,
    blocks: prepareEditorBlocksWithEvents(Array.isArray(output.blocks) ? output.blocks : [])
  };
}

export function finalizeEditorOutputWithEvents(output: PageDocument): PageDocument {
  return {
    ...output,
    blocks: finalizeEditorBlocksWithEvents(Array.isArray(output.blocks) ? output.blocks : [])
  };
}
