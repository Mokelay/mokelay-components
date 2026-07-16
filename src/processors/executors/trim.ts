import type { ProcessorExecutor } from '@/processors/types';

/**
 * @clientProcessorDoc {
 *   "version": "1.0",
 *   "processorName": "trim",
 *   "displayName": "去除首尾空格",
 *   "category": "string",
 *   "description": "对字符串输入去除首尾空白，其他类型保持原值。",
 *   "inputs": [{"key":"value","type":"string|unknown","required":true,"description":"待处理值。"}],
 *   "params": [],
 *   "outputs": [{"key":"value","type":"same-as-input","description":"去除首尾空格后的字符串或原值。"}],
 *   "errors": [],
 *   "config": [],
 *   "runtime": [{"key":"pure","value":true},{"key":"async","value":false},{"key":"mutatesInput","value":false}],
 *   "examples": [{"processor":"trim","input":"  Ada  ","output":"Ada"}]
 * }
 */
export const trimProcessor: ProcessorExecutor = (value) => (
  typeof value === 'string' ? value.trim() : value
);
