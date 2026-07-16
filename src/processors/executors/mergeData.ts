import { invalidProcessorConfig } from '@/processors/errors';
import { cloneProcessorValue, isRecord } from '@/processors/shared';
import type { ProcessorExecutor } from '@/processors/types';

export function readMergeDataParam(param: unknown) {
  const mergeValue = Array.isArray(param) && param.length === 1 ? param[0] : param;
  if (!isRecord(mergeValue)) {
    invalidProcessorConfig('merge_data', 'param must be an object or a single-element object array.');
  }
  return mergeValue;
}

/**
 * @clientProcessorDoc {
 *   "version": "1.0",
 *   "processorName": "merge_data",
 *   "displayName": "合并数据",
 *   "category": "object",
 *   "description": "将参数对象合并到对象输入，或合并到数组中的每个对象。",
 *   "inputs": [{"key":"value","type":"object|array","required":true,"description":"待合并数据。"}],
 *   "params": [{"key":"param","type":"object|object[]","required":true,"description":"要合并的字段。"}],
 *   "outputs": [{"key":"value","type":"object|array","description":"合并后的新对象或数组。"}],
 *   "errors": [{"code":"PROCESSOR_INVALID_CONFIG","description":"参数不是对象或单元素对象数组。"}],
 *   "config": [],
 *   "runtime": [{"key":"pure","value":true},{"key":"async","value":false},{"key":"mutatesInput","value":false}],
 *   "examples": [{"processor":"merge_data","param":{"active":true},"input":{"name":"Ada"},"output":{"name":"Ada","active":true}}]
 * }
 */
export const mergeDataProcessor: ProcessorExecutor = (value, param) => {
  const mergeValue = readMergeDataParam(param);

  if (Array.isArray(value)) {
    return value.map((item) => isRecord(item)
      ? { ...cloneProcessorValue(item), ...cloneProcessorValue(mergeValue) }
      : item);
  }

  if (isRecord(value)) {
    return { ...cloneProcessorValue(value), ...cloneProcessorValue(mergeValue) };
  }

  return value;
};
