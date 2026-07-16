import { invalidProcessorConfig } from '@/processors/errors';
import type { ProcessorExecutor } from '@/processors/types';

const dateFormatTokens = /yyyy|MM|dd|HH|mm|SS/g;

export function validateDateTimeFormatParam(param: unknown): asserts param is string {
  if (typeof param !== 'string' || !param.trim()) {
    invalidProcessorConfig('date_time_format', 'param must be a non-empty format string.');
  }
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

/**
 * @clientProcessorDoc {
 *   "version": "1.0",
 *   "processorName": "date_time_format",
 *   "displayName": "日期时间格式化",
 *   "category": "format",
 *   "description": "将日期、时间戳或日期字符串按指定格式格式化。",
 *   "inputs": [{"key":"value","type":"Date|string|number","required":true,"description":"待格式化日期。"}],
 *   "params": [{"key":"param","type":"string","required":true,"defaultValue":"yyyy-MM-dd HH:mm:SS","description":"日期格式模板，支持 yyyy、MM、dd、HH、mm、SS。"}],
 *   "outputs": [{"key":"value","type":"string|same-as-input","description":"格式化后的日期字符串或无效输入原值。"}],
 *   "errors": [{"code":"PROCESSOR_INVALID_CONFIG","description":"格式参数必须是非空字符串。"}],
 *   "config": [],
 *   "runtime": [{"key":"pure","value":true},{"key":"async","value":false},{"key":"mutatesInput","value":false}],
 *   "examples": [{"processor":"date_time_format","param":"yyyy/MM/dd","input":"2026-07-10T00:00:00.000Z","output":"2026/07/10"}]
 * }
 */
export const dateTimeFormatProcessor: ProcessorExecutor = (value, param) => {
  validateDateTimeFormatParam(param);
  if (!(value instanceof Date) && typeof value !== 'string' && typeof value !== 'number') return value;
  if (typeof value === 'number' && !Number.isFinite(value)) return value;
  if (typeof value === 'string' && !value.trim()) return value;

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) return value;

  const replacements: Record<string, string> = {
    yyyy: String(date.getFullYear()).padStart(4, '0'),
    MM: pad(date.getMonth() + 1),
    dd: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    SS: pad(date.getSeconds())
  };

  return param.replace(dateFormatTokens, (token) => replacements[token]);
};
