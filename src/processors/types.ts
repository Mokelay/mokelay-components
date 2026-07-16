import type { JSONSchemaType } from '@/datasource/schema';

export type ProcessorConfig =
  | string
  | {
      processor: string;
      param?: unknown;
    };

export type ProcessorErrorCode =
  | 'PROCESSOR_INVALID_CONFIG'
  | 'PROCESSOR_UNSUPPORTED'
  | 'AI_DSL_REQUEST_INVALID'
  | 'AI_DSL_REQUIREMENT_MISSING';

export type ProcessorExecutor = (value: unknown, param?: unknown) => unknown;

export type ProcessorDefinition = {
  name: string;
  titleKey: string;
  descriptionKey: string;
  supportedTypes: JSONSchemaType[];
  createDefault: () => ProcessorConfig;
  execute: ProcessorExecutor;
  validateParam?: (param: unknown) => void;
};

export type RandomIdParam = {
  prefix?: string;
  length?: number;
  alphabet?: string;
  lowerCase?: boolean;
  when?: 'always' | 'empty';
};

export type FilterConditionType = 'eq' | 'gt' | 'lt' | 'is_empty' | 'is_not_empty';

export type FilterCondition = {
  variable: string;
  condition: FilterConditionType;
  value?: unknown;
};

export type FilterParam = {
  type: 'and' | 'or';
  conditions: FilterCondition[];
};

export type AiDslRequestContextParam = {
  history?: unknown[];
  historyOrder?: 'newest_first' | 'oldest_first';
  historyLimit?: number;
  includeHistoryInRequirement?: boolean;
  includeHistoryInDslContext?: boolean;
};

type AiDslUpgradePlanKey = 'processors' | 'blocks' | 'actions' | 'controls' | 'components';

export type AiDslConversationHistoryTurn = {
  requirementDocument: string;
  response: {
    status: string;
    summary: string;
    pages: Array<{ uuid: string; name: string }>;
    apis: Array<{ uuid: string; alias: string; method: string }>;
    upgradePlan: Record<AiDslUpgradePlanKey, string[]>;
  };
};

export type AiDslGenerationPayload = {
  requirementDocument: string;
  projectContext?: unknown;
  dslContext?: unknown;
  generationPreferences?: unknown;
};
