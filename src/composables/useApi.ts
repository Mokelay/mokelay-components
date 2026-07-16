import type { AxiosInstance } from 'axios';
import { requireMokelayCapability } from '@/runtime/adapter';

/**
 * Resolve the host application's HTTP client lazily. Keeping this as a proxy
 * preserves the existing AxiosInstance API without baking an API origin into
 * the published package.
 */
export const apiClient = new Proxy({} as AxiosInstance, {
  get(_target, property) {
    const client = requireMokelayCapability('apiClient');
    const value = Reflect.get(client, property, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
  set(_target, property, value) {
    const client = requireMokelayCapability('apiClient');
    return Reflect.set(client, property, value, client);
  }
});

export async function fetchWithNative(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}
