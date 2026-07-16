import {
  aiDslRequestContextProcessor,
  readAiDslRequestContextParam
} from '@/processors/executors/aiDslRequestContext';
import { dateTimeFormatProcessor, validateDateTimeFormatParam } from '@/processors/executors/dateTimeFormat';
import { filterProcessor } from '@/processors/executors/filter';
import { mergeDataProcessor, readMergeDataParam } from '@/processors/executors/mergeData';
import { randomIdProcessor } from '@/processors/executors/randomId';
import { trimProcessor } from '@/processors/executors/trim';
import { readFilterParam } from '@/processors/shared';
import type { ProcessorDefinition } from '@/processors/types';

export const processorDefinitions: ProcessorDefinition[] = [
  {
    name: 'ai_dsl_request_context',
    titleKey: 'datasource.processors.aiDslRequestContext.title',
    descriptionKey: 'datasource.processors.aiDslRequestContext.description',
    supportedTypes: ['object'],
    createDefault: () => ({
      processor: 'ai_dsl_request_context',
      param: {
        history: [],
        historyOrder: 'newest_first',
        historyLimit: 5,
        includeHistoryInRequirement: true,
        includeHistoryInDslContext: true
      }
    }),
    execute: aiDslRequestContextProcessor,
    validateParam: readAiDslRequestContextParam
  },
  {
    name: 'trim',
    titleKey: 'datasource.processors.trim.title',
    descriptionKey: 'datasource.processors.trim.description',
    supportedTypes: ['string'],
    createDefault: () => 'trim',
    execute: trimProcessor
  },
  {
    name: 'merge_data',
    titleKey: 'datasource.processors.mergeData.title',
    descriptionKey: 'datasource.processors.mergeData.description',
    supportedTypes: ['object', 'array'],
    createDefault: () => ({ processor: 'merge_data', param: [{}] }),
    execute: mergeDataProcessor,
    validateParam: readMergeDataParam
  },
  {
    name: 'filter',
    titleKey: 'datasource.processors.filter.title',
    descriptionKey: 'datasource.processors.filter.description',
    supportedTypes: ['array'],
    createDefault: () => ({
      processor: 'filter',
      param: { type: 'and', conditions: [] }
    }),
    execute: filterProcessor,
    validateParam: readFilterParam
  },
  {
    name: 'date_time_format',
    titleKey: 'datasource.processors.dateTimeFormat.title',
    descriptionKey: 'datasource.processors.dateTimeFormat.description',
    supportedTypes: ['string', 'number'],
    createDefault: () => ({ processor: 'date_time_format', param: 'yyyy-MM-dd HH:mm:SS' }),
    execute: dateTimeFormatProcessor,
    validateParam: validateDateTimeFormatParam
  },
  {
    name: 'random_id',
    titleKey: 'datasource.processors.randomId.title',
    descriptionKey: 'datasource.processors.randomId.description',
    supportedTypes: ['string'],
    createDefault: () => ({
      processor: 'random_id',
      param: { prefix: '', length: 6, when: 'empty' }
    }),
    execute: randomIdProcessor
  }
];

export const processorRegistry = Object.fromEntries(
  processorDefinitions.map((definition) => [definition.name, definition])
) as Record<string, ProcessorDefinition>;

export function getProcessorDefinition(name: string) {
  return processorRegistry[name];
}

export function getProcessorsForType(type: ProcessorDefinition['supportedTypes'][number]) {
  return processorDefinitions.filter((definition) => definition.supportedTypes.includes(type));
}
