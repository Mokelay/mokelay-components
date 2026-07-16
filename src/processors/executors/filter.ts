import {
  deepStrictEqual,
  isEmptyProcessorValue,
  readFilterParam,
  readPath
} from '@/processors/shared';
import type { FilterCondition, ProcessorExecutor } from '@/processors/types';

function matchesCondition(item: unknown, condition: FilterCondition) {
  const current = readPath(item, condition.variable);

  if (condition.condition === 'is_empty') return isEmptyProcessorValue(current);
  if (condition.condition === 'is_not_empty') return !isEmptyProcessorValue(current);
  if (condition.condition === 'eq') return deepStrictEqual(current, condition.value);

  return typeof current === 'number' && Number.isFinite(current) &&
    typeof condition.value === 'number' && Number.isFinite(condition.value) &&
    (condition.condition === 'gt' ? current > condition.value : current < condition.value);
}

/**
 * @clientProcessorDoc {
 *   "version": "1.0",
 *   "processorName": "filter",
 *   "displayName": "数组筛选",
 *   "category": "array",
 *   "description": "按 and/or 条件筛选数组记录，支持等于、大于、小于和空值判断。",
 *   "inputs": [{"key":"value","type":"array","required":true,"description":"待筛选数组。"}],
 *   "params": [{"key":"type","type":"and|or","required":true,"description":"条件组合方式。"},{"key":"conditions","type":"FilterCondition[]","required":true,"description":"筛选条件。"}],
 *   "outputs": [{"key":"value","type":"array","description":"筛选后的新数组。"}],
 *   "errors": [{"code":"PROCESSOR_INVALID_CONFIG","description":"筛选参数结构或条件不合法。"}],
 *   "config": [],
 *   "runtime": [{"key":"pure","value":true},{"key":"async","value":false},{"key":"mutatesInput","value":false}],
 *   "examples": [{"processor":"filter","param":{"type":"and","conditions":[{"variable":"status","condition":"eq","value":"active"}]},"input":[{"status":"active"},{"status":"draft"}],"output":[{"status":"active"}]}]
 * }
 */
export const filterProcessor: ProcessorExecutor = (value, param) => {
  const filter = readFilterParam(param);
  if (!Array.isArray(value)) return value;
  if (!filter.conditions.length) return [...value];

  return value.filter((item) => {
    const results = filter.conditions.map((condition) => matchesCondition(item, condition));
    return filter.type === 'and' ? results.every(Boolean) : results.some(Boolean);
  });
};
