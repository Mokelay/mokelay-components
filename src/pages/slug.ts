export const PAGE_SLUG_MAX_LENGTH = 128;
export const PAGE_SLUG_PATTERN = /^[a-z0-9_-]{1,128}$/;
export const PAGE_SLUG_HINT = '仅支持小写字母、数字、下划线和连字符，最长 128 个字符。';

const PAGE_SLUG_RANDOM_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const PAGE_SLUG_RANDOM_LENGTH = 6;

export type PageSlugValidation =
  | {
      valid: true;
      value: string;
    }
  | {
      valid: false;
      value: string;
      message: string;
    };

export function normalizePageSlug(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validatePageSlug(value: unknown): PageSlugValidation {
  const normalized = normalizePageSlug(value);

  if (!normalized) {
    return {
      valid: false,
      value: normalized,
      message: '请输入页面标识。'
    };
  }

  if (normalized.length > PAGE_SLUG_MAX_LENGTH) {
    return {
      valid: false,
      value: normalized,
      message: `页面标识不能超过 ${PAGE_SLUG_MAX_LENGTH} 个字符。`
    };
  }

  if (!PAGE_SLUG_PATTERN.test(normalized)) {
    return {
      valid: false,
      value: normalized,
      message: `页面标识格式无效。${PAGE_SLUG_HINT}`
    };
  }

  return {
    valid: true,
    value: normalized
  };
}

export function generatePageSlug() {
  let suffix = '';
  for (let index = 0; index < PAGE_SLUG_RANDOM_LENGTH; index += 1) {
    suffix += PAGE_SLUG_RANDOM_ALPHABET[randomAlphabetIndex()];
  }
  return `page_${suffix}`;
}

function randomAlphabetIndex() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const maxAcceptedValue = 256 - (256 % PAGE_SLUG_RANDOM_ALPHABET.length);
    const randomByte = new Uint8Array(1);
    do {
      cryptoApi.getRandomValues(randomByte);
    } while ((randomByte[0] ?? 0) >= maxAcceptedValue);
    return (randomByte[0] ?? 0) % PAGE_SLUG_RANDOM_ALPHABET.length;
  }

  return Math.floor(Math.random() * PAGE_SLUG_RANDOM_ALPHABET.length);
}
