import { ProcessorError, invalidProcessorConfig } from '@/processors/errors';
import { cloneProcessorValue, isRecord } from '@/processors/shared';
import type {
  AiDslConversationHistoryTurn,
  AiDslGenerationPayload,
  AiDslRequestContextParam,
  ProcessorExecutor
} from '@/processors/types';

const processorName = 'ai_dsl_request_context';
const defaultHistoryLimit = 5;

const upgradePlanKeys = [
  ['processors', 'processor'],
  ['blocks', 'block'],
  ['actions', 'action'],
  ['controls', 'control'],
  ['components', 'component']
] as const;

function readString(value: unknown, key: string) {
  return isRecord(value) && typeof value[key] === 'string' ? value[key].trim() : '';
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function upgradeTitle(item: unknown, fallback: string) {
  return readString(item, 'name') ||
    readString(item, 'functionName') ||
    readString(item, 'action') ||
    readString(item, 'type') ||
    fallback;
}

export function summarizeAiDslResponse(response: unknown): AiDslConversationHistoryTurn['response'] {
  const record = isRecord(response) ? response : {};
  const upgradePlan = isRecord(record.upgradePlan) ? record.upgradePlan : {};
  const summarizedUpgradePlan = Object.fromEntries(upgradePlanKeys.map(([key, fallbackPrefix]) => [
    key,
    readArray(upgradePlan[key]).map((item, index) => upgradeTitle(item, `${fallbackPrefix}_${index + 1}`))
  ])) as AiDslConversationHistoryTurn['response']['upgradePlan'];

  return {
    status: readString(record, 'status'),
    summary: readString(record, 'summary'),
    pages: readArray(record.pages).map((page) => ({
      uuid: readString(page, 'uuid'),
      name: readString(page, 'name')
    })),
    apis: readArray(record.apis).map((api) => ({
      uuid: readString(api, 'uuid'),
      alias: readString(api, 'alias'),
      method: readString(api, 'method')
    })),
    upgradePlan: summarizedUpgradePlan
  };
}

type NormalizedAiDslRequestContextParam = {
  history: unknown;
  historyOrder: 'newest_first' | 'oldest_first';
  historyLimit: number;
  includeHistoryInRequirement: boolean;
  includeHistoryInDslContext: boolean;
};

export function readAiDslRequestContextParam(param: unknown): NormalizedAiDslRequestContextParam {
  if (param !== undefined && !isRecord(param)) {
    invalidProcessorConfig(processorName, 'param must be an object.');
  }

  const config = isRecord(param) ? param : {};
  if (config.historyOrder !== undefined &&
    config.historyOrder !== 'newest_first' &&
    config.historyOrder !== 'oldest_first') {
    invalidProcessorConfig(processorName, 'historyOrder must be newest_first or oldest_first.');
  }
  if (config.historyLimit !== undefined &&
    (typeof config.historyLimit !== 'number' || !Number.isFinite(config.historyLimit) || config.historyLimit < 0)) {
    invalidProcessorConfig(processorName, 'historyLimit must be a non-negative finite number.');
  }
  if (config.includeHistoryInRequirement !== undefined && typeof config.includeHistoryInRequirement !== 'boolean') {
    invalidProcessorConfig(processorName, 'includeHistoryInRequirement must be a boolean.');
  }
  if (config.includeHistoryInDslContext !== undefined && typeof config.includeHistoryInDslContext !== 'boolean') {
    invalidProcessorConfig(processorName, 'includeHistoryInDslContext must be a boolean.');
  }

  return {
    history: config.history,
    historyOrder: config.historyOrder === 'oldest_first' ? 'oldest_first' : 'newest_first',
    historyLimit: typeof config.historyLimit === 'number'
      ? Math.floor(config.historyLimit)
      : defaultHistoryLimit,
    includeHistoryInRequirement: config.includeHistoryInRequirement !== false,
    includeHistoryInDslContext: config.includeHistoryInDslContext !== false
  };
}

export function normalizeAiDslConversationHistory(
  history: unknown,
  historyLimit: number,
  historyOrder: 'newest_first' | 'oldest_first' = 'newest_first'
) {
  if (!Array.isArray(history) || historyLimit === 0) {
    return [];
  }

  const successfulTurns = history.flatMap((turn): AiDslConversationHistoryTurn[] => {
    if (!isRecord(turn) || turn.status !== 'success' || !isRecord(turn.response)) {
      return [];
    }

    const requirementDocument = readString(turn, 'requirementDocument');
    if (!requirementDocument) {
      return [];
    }

    return [{
      requirementDocument,
      response: summarizeAiDslResponse(turn.response)
    }];
  });

  if (historyOrder === 'oldest_first') {
    return successfulTurns.slice(-historyLimit).reverse();
  }

  return successfulTurns.slice(0, historyLimit);
}

function buildRequirementWithHistory(
  requirementDocument: string,
  history: AiDslConversationHistoryTurn[]
) {
  if (!history.length) {
    return requirementDocument;
  }

  const compactHistory = history.slice().reverse().map((turn, index) => ({
    turn: index + 1,
    requirementDocument: turn.requirementDocument,
    response: turn.response
  }));

  return [
    '这是一次连续对话。请基于下面的历史需求和历史生成结果继续生成，不要把本轮需求当成全新独立任务，除非用户明确要求重做。',
    '',
    '历史对话上下文：',
    JSON.stringify(compactHistory, null, 2),
    '',
    '本轮用户新增/修改需求：',
    requirementDocument
  ].join('\n');
}

function mergeConversationHistory(
  dslContext: unknown,
  history: AiDslConversationHistoryTurn[]
) {
  if (isRecord(dslContext)) {
    return {
      ...cloneProcessorValue(dslContext),
      conversationHistory: history
    };
  }

  if (dslContext !== undefined) {
    return {
      value: cloneProcessorValue(dslContext),
      conversationHistory: history
    };
  }

  return { conversationHistory: history };
}

function invalidRequest(
  code: 'AI_DSL_REQUEST_INVALID' | 'AI_DSL_REQUIREMENT_MISSING',
  message: string
): never {
  throw new ProcessorError(code, message, processorName);
}

/**
 * @clientProcessorDoc {
 *   "version": "1.0",
 *   "sourcePackage": "mokelay-components",
 *   "processorName": "ai_dsl_request_context",
 *   "displayName": "组装 AI DSL 请求上下文",
 *   "category": "ai",
 *   "description": "把当前 AI DSL 生成请求与最近成功会话合成为新的请求 payload。Processor 会校验并 trim requirementDocument、筛选和压缩历史响应、按配置把历史写入需求文本和 dslContext，同时深拷贝所有透传上下文，适用于 MPageState 驱动的连续生成流程。",
 *   "inputs": [
 *     {
 *       "key": "value",
 *       "type": "AiDslRequestSource",
 *       "required": true,
 *       "description": "当前生成请求对象；不会被原地修改。",
 *       "fields": [
 *         { "key": "requirementDocument", "type": "string", "required": true, "description": "本轮用户需求；执行时 trim，trim 后不能为空。" },
 *         { "key": "projectContext", "type": "unknown", "required": false, "description": "项目上下文，存在时深拷贝到输出。当前 AI Chat 使用 { app, datasource }。" },
 *         { "key": "dslContext", "type": "unknown", "required": false, "description": "可选兼容上下文；启用历史注入时会生成或浅扩展为含 conversationHistory 的 object。当前服务端会自行注入 DSL 能力文档。" },
 *         { "key": "generationPreferences", "type": "unknown", "required": false, "description": "可选兼容字段，存在时深拷贝透传；当前 ai-generate-dsl 由服务端固定生成偏好，客户端通常不传。" }
 *       ]
 *     }
 *   ],
 *   "params": [
 *     {
 *       "key": "history",
 *       "type": "unknown[]",
 *       "required": false,
 *       "defaultValue": [],
 *       "description": "页面会话 turns。仅保留 status=success、requirementDocument 非空且 response 为 object 的记录；失败、处理中和结构非法的记录会被忽略。"
 *     },
 *     {
 *       "key": "historyOrder",
 *       "type": "newest_first|oldest_first",
 *       "required": false,
 *       "defaultValue": "newest_first",
 *       "description": "声明传入 history 的排列顺序。MPageState.append 形成的时间正序数组使用 oldest_first；筛选后的 conversationHistory 统一按最新记录优先输出。"
 *     },
 *     {
 *       "key": "historyLimit",
 *       "type": "number",
 *       "required": false,
 *       "defaultValue": 5,
 *       "description": "最多采用最近 N 条成功历史；必须为非负有限数，执行时向下取整，0 表示禁用历史。"
 *     },
 *     {
 *       "key": "includeHistoryInRequirement",
 *       "type": "boolean",
 *       "required": false,
 *       "defaultValue": true,
 *       "description": "有成功历史时，是否把按时间正序排列的压缩历史和本轮需求合成为新的 requirementDocument。"
 *     },
 *     {
 *       "key": "includeHistoryInDslContext",
 *       "type": "boolean",
 *       "required": false,
 *       "defaultValue": true,
 *       "description": "有成功历史时，是否把最新记录优先的摘要数组写入 dslContext.conversationHistory。"
 *     }
 *   ],
 *   "outputs": [
 *     {
 *       "key": "value",
 *       "type": "AiDslGenerationPayload",
 *       "description": "可直接交给后续数据源动作的请求 payload。只包含 requirementDocument 及输入中存在或由历史生成的可选上下文字段。",
 *       "fields": [
 *         { "key": "requirementDocument", "type": "string", "description": "trim 后的本轮需求，或包含历史摘要的连续对话需求。" },
 *         { "key": "projectContext", "type": "unknown", "optional": true, "description": "深拷贝后的项目上下文。" },
 *         { "key": "dslContext", "type": "unknown", "optional": true, "description": "原上下文深拷贝，或附加 conversationHistory 后的 object。" },
 *         { "key": "generationPreferences", "type": "unknown", "optional": true, "description": "输入存在时的兼容透传值。" }
 *       ]
 *     }
 *   ],
 *   "errors": [
 *     { "code": "PROCESSOR_INVALID_CONFIG", "description": "param 不是 object，historyOrder 非法，historyLimit 不是非负有限数，或两个 include 开关不是 boolean。" },
 *     { "code": "AI_DSL_REQUEST_INVALID", "description": "value 不是非数组 JSON object。" },
 *     { "code": "AI_DSL_REQUIREMENT_MISSING", "description": "requirementDocument 不是 string，或 trim 后为空。" }
 *   ],
 *   "config": [],
 *   "runtime": [
 *     { "key": "pure", "value": true, "description": "相同输入和参数产生相同输出。" },
 *     { "key": "async", "value": false, "description": "纯客户端同步处理，不发起网络请求。" },
 *     { "key": "mutatesInput", "value": false, "description": "输入、历史和透传字段均不会被原地修改。" },
 *     { "key": "historyCompression", "value": "summary_only", "description": "历史响应只保留 status、summary、页面/API 标识和 upgradePlan 条目名称，不携带完整 blocks。" },
 *     { "key": "conversationHistoryOrder", "value": "newest_first", "description": "写入 dslContext 的历史摘要固定为最新记录优先。" }
 *   ],
 *   "examples": [
 *     {
 *       "title": "无历史请求",
 *       "processor": "ai_dsl_request_context",
 *       "param": { "history": [], "historyOrder": "oldest_first", "historyLimit": 5 },
 *       "input": { "requirementDocument": "  生成客户列表  ", "projectContext": { "app": "crm", "datasource": "Mokelay" } },
 *       "output": { "requirementDocument": "生成客户列表", "projectContext": { "app": "crm", "datasource": "Mokelay" } }
 *     },
 *     {
 *       "title": "使用 MPageState 连续对话",
 *       "processor": "ai_dsl_request_context",
 *       "param": {
 *         "historyOrder": "oldest_first",
 *         "historyLimit": 5,
 *         "includeHistoryInRequirement": true,
 *         "includeHistoryInDslContext": true,
 *         "history": [
 *           {
 *             "status": "success",
 *             "requirementDocument": "生成客户列表",
 *             "response": {
 *               "status": "complete",
 *               "summary": "已生成客户列表。",
 *               "pages": [{ "uuid": "550e8400-e29b-41d4-a716-446655440000", "name": "客户列表" }],
 *               "apis": [{ "uuid": "list_customers", "alias": "客户列表接口", "method": "GET" }],
 *               "upgradePlan": { "processors": [], "blocks": [], "actions": [], "controls": [], "components": [] }
 *             }
 *           }
 *         ]
 *       },
 *       "input": { "requirementDocument": "增加导出功能" },
 *       "outputContains": {
 *         "requirementDocument": "连续对话说明、历史摘要和本轮需求",
 *         "dslContext": { "conversationHistory": "最新记录优先的压缩摘要数组" }
 *       }
 *     },
 *     {
 *       "title": "只筛选历史但不注入",
 *       "processor": "ai_dsl_request_context",
 *       "param": { "history": [], "includeHistoryInRequirement": false, "includeHistoryInDslContext": false },
 *       "input": { "requirementDocument": "生成订单页", "dslContext": { "scope": "order" } },
 *       "output": { "requirementDocument": "生成订单页", "dslContext": { "scope": "order" } }
 *     }
 *   ],
 *   "sourceRefs": [
 *     { "file": "submodule/mokelay-components/src/processors/executors/aiDslRequestContext.ts", "reason": "Processor implementation, history normalization and response summarization" },
 *     { "file": "submodule/mokelay-components/src/processors/registry.ts", "reason": "Registered runtime Processor" }
 *   ]
 * }
 */
export const aiDslRequestContextProcessor: ProcessorExecutor = (value, param) => {
  if (!isRecord(value)) {
    invalidRequest('AI_DSL_REQUEST_INVALID', 'AI DSL request must be a JSON object.');
  }

  const requirementDocument = readString(value, 'requirementDocument');
  if (!requirementDocument) {
    invalidRequest('AI_DSL_REQUIREMENT_MISSING', 'AI DSL request.requirementDocument is required.');
  }

  const config = readAiDslRequestContextParam(param);
  const history = normalizeAiDslConversationHistory(
    config.history,
    config.historyLimit,
    config.historyOrder
  );
  const payload: AiDslGenerationPayload = {
    requirementDocument: history.length && config.includeHistoryInRequirement
      ? buildRequirementWithHistory(requirementDocument, history)
      : requirementDocument
  };

  if (value.projectContext !== undefined) {
    payload.projectContext = cloneProcessorValue(value.projectContext);
  }
  if (history.length && config.includeHistoryInDslContext) {
    payload.dslContext = mergeConversationHistory(value.dslContext, history);
  } else if (value.dslContext !== undefined) {
    payload.dslContext = cloneProcessorValue(value.dslContext);
  }
  if (value.generationPreferences !== undefined) {
    payload.generationPreferences = cloneProcessorValue(value.generationPreferences);
  }

  return payload;
};
