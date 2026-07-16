import { isRecord } from '@/processors/shared';
import type { ProcessorExecutor, RandomIdParam } from '@/processors/types';

const defaultAlphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
const defaultLength = 6;
const maxLength = 32;

type NormalizedRandomIdParam = {
  prefix: string;
  length: number;
  alphabet: string[];
  lowerCase: boolean;
  when: 'always' | 'empty';
};

function normalizeLength(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return defaultLength;
  }

  return Math.min(maxLength, Math.trunc(value));
}

function normalizeAlphabet(value: unknown, lowerCase: boolean) {
  const raw = typeof value === 'string' && value ? value : defaultAlphabet;
  const source = lowerCase ? raw.toLowerCase() : raw;
  const chars = Array.from(source);
  const unique = chars.filter((char, index) => chars.indexOf(char) === index);
  return unique.length ? unique : Array.from(defaultAlphabet);
}

function normalizeParam(param: unknown): NormalizedRandomIdParam {
  const objectParam = isRecord(param) ? param : {};
  const lowerCase = !isRecord(param) || typeof param.lowerCase !== 'boolean'
    ? true
    : param.lowerCase;

  return {
    prefix: typeof param === 'string'
      ? param
      : typeof objectParam.prefix === 'string'
        ? objectParam.prefix
        : '',
    length: typeof param === 'number' ? normalizeLength(param) : normalizeLength(objectParam.length),
    alphabet: normalizeAlphabet(objectParam.alphabet, lowerCase),
    lowerCase,
    when: objectParam.when === 'always' ? 'always' : 'empty'
  };
}

function shouldReuseInput(value: unknown, param: NormalizedRandomIdParam) {
  return param.when === 'empty' && typeof value === 'string' && Boolean(value.trim());
}

function randomIndex(max: number) {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const range = 0x100000000;
    const limit = range - (range % max);
    const buffer = new Uint32Array(1);

    do {
      cryptoApi.getRandomValues(buffer);
    } while (buffer[0] >= limit);

    return buffer[0] % max;
  }

  return Math.floor(Math.random() * max);
}

export function readRandomIdParam(param: unknown): RandomIdParam {
  const normalized = normalizeParam(param);
  return {
    prefix: normalized.prefix,
    length: normalized.length,
    alphabet: normalized.alphabet.join(''),
    lowerCase: normalized.lowerCase,
    when: normalized.when
  };
}

/**
 * @clientProcessorDoc {
 *   "version": "1.0",
 *   "processorName": "random_id",
 *   "displayName": "生成随机 ID",
 *   "category": "string",
 *   "description": "按前缀、长度、字符表生成随机 ID，可配置仅在输入为空时生成。",
 *   "inputs": [{"key":"value","type":"string|unknown","required":false,"description":"已有值；when=empty 且非空时直接保留。"}],
 *   "params": [{"key":"prefix","type":"string","required":false,"defaultValue":"","description":"ID 前缀。"},{"key":"length","type":"number","required":false,"defaultValue":6,"description":"随机部分长度，最大 32。"},{"key":"alphabet","type":"string","required":false,"description":"随机字符表。"},{"key":"lowerCase","type":"boolean","required":false,"defaultValue":true,"description":"是否转小写。"},{"key":"when","type":"always|empty","required":false,"defaultValue":"empty","description":"生成时机。"}],
 *   "outputs": [{"key":"value","type":"string|same-as-input","description":"生成后的 ID 或复用的已有值。"}],
 *   "errors": [],
 *   "config": [],
 *   "runtime": [{"key":"pure","value":false},{"key":"async","value":false},{"key":"mutatesInput","value":false}],
 *   "examples": [{"processor":"random_id","param":{"prefix":"item_","length":8,"when":"empty"},"input":"","output":"item_a1b2c3d4"}]
 * }
 */
export const randomIdProcessor: ProcessorExecutor = (value, param) => {
  const normalized = normalizeParam(param);
  if (shouldReuseInput(value, normalized)) {
    return value;
  }

  const randomPart = Array.from({ length: normalized.length }, () =>
    normalized.alphabet[randomIndex(normalized.alphabet.length)]
  ).join('');
  const result = `${normalized.prefix}${randomPart}`;
  return normalized.lowerCase ? result.toLowerCase() : result;
};
