import { cloneBlockEvents, type BlockEvent } from '@/blocks/blockEvents';
import {
  isLocalizedValue,
  type LocalizedTextValue,
  type LocalizedValue
} from '@/runtime/localization';

export type StoredBlock = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  events?: BlockEvent[];
};

export function generateBlockId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 10);
  }

  return Math.random().toString(36).slice(2, 12);
}

export function createParagraphBlock(text: LocalizedTextValue, id = generateBlockId()): StoredBlock {
  return {
    id,
    type: 'paragraph',
    data: {
      text
    }
  };
}

export function getParagraphText(block: StoredBlock) {
  return typeof block.data.text === 'string' ? block.data.text : '';
}

export function getParagraphTextValue(block: StoredBlock): LocalizedTextValue {
  if (typeof block.data.text === 'string') return block.data.text;
  return isLocalizedValue(block.data.text) ? cloneJsonValue(block.data.text) : '';
}

export function mergeParagraphTextValues(
  left: LocalizedTextValue,
  right: LocalizedTextValue
): LocalizedTextValue {
  if (typeof left === 'string' && typeof right === 'string') return left + right;
  const locales = new Set<string>([
    ...(isLocalizedValue(left) ? Object.keys(left.$i18n) : []),
    ...(isLocalizedValue(right) ? Object.keys(right.$i18n) : [])
  ]);
  const merged: LocalizedValue = { $i18n: {} };
  locales.forEach((locale) => {
    const leftText = typeof left === 'string' ? left : left.$i18n[locale] ?? '';
    const rightText = typeof right === 'string' ? right : right.$i18n[locale] ?? '';
    merged.$i18n[locale] = leftText + rightText;
  });
  return merged;
}

export function getEmptyStoredBlockValue() {
  return [createParagraphBlock('')];
}

export function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function toPlainRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return cloneJsonValue(value) as Record<string, unknown>;
}

export function cloneStoredBlock(block: StoredBlock): StoredBlock {
  const events = cloneBlockEvents(block.events);
  const hasEvents = Object.prototype.hasOwnProperty.call(block, 'events');

  return {
    id: block.id,
    type: block.type,
    data: toPlainRecord(block.data),
    ...(events.length || hasEvents ? { events } : {})
  };
}

export function normalizeSelectorBlock(value?: unknown): StoredBlock | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.type !== 'string' || !record.type.trim()) return undefined;
  if (typeof record.data !== 'object' || record.data === null || Array.isArray(record.data)) return undefined;
  const events = cloneBlockEvents(record.events);
  return {
    id: typeof record.id === 'string' && record.id ? record.id : generateBlockId(),
    type: record.type,
    data: toPlainRecord(record.data),
    ...(events.length || Object.prototype.hasOwnProperty.call(record, 'events') ? { events } : {})
  };
}

export const cloneSelectorBlock = cloneStoredBlock;

export function mergeParagraphBlocks(blocks: StoredBlock[]) {
  const merged: StoredBlock[] = [];

  for (const block of blocks) {
    if (block.type === 'paragraph') {
      const previous = merged[merged.length - 1];
      if (previous?.type === 'paragraph') {
        previous.data.text = mergeParagraphTextValues(
          getParagraphTextValue(previous),
          getParagraphTextValue(block)
        );
      } else {
        merged.push(createParagraphBlock(getParagraphTextValue(block), block.id));
      }
      continue;
    }

    merged.push(cloneStoredBlock(block));
  }

  if (!merged.length) {
    return getEmptyStoredBlockValue();
  }

  return merged;
}

export function normalizeStoredBlocks(value?: StoredBlock[]): StoredBlock[] {
  if (!Array.isArray(value)) {
    return getEmptyStoredBlockValue();
  }

  const normalizedBlocks: StoredBlock[] = [];

  value.forEach((item) => {
    if (typeof item !== 'object' || item === null) {
      return;
    }

    const record = item as Record<string, unknown>;
    if (
      typeof record.id !== 'string' ||
      typeof record.type !== 'string' ||
      typeof record.data !== 'object' ||
      record.data === null ||
      Array.isArray(record.data)
    ) {
      return;
    }

    const block = {
      id: record.id,
      type: record.type,
      data: toPlainRecord(record.data),
      events: cloneBlockEvents(record.events)
    };

    normalizedBlocks.push(block.type === 'paragraph' ? createParagraphBlock(getParagraphTextValue(block), block.id) : cloneStoredBlock(block));
  });

  return mergeParagraphBlocks(normalizedBlocks);
}
