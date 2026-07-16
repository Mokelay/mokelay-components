import type { AxiosInstance } from 'axios';
import type { InjectionKey } from 'vue';
import { shallowRef } from 'vue';
import type { MokelayBlockRenderDefinition } from '@/blocks/types';

export interface MokelayComponentsAdapter {
  apiClient?: AxiosInstance;
  t?: (key: string, params?: Record<string, unknown>) => string;
  confirm?: (message: string, title?: string) => Promise<boolean>;
  getPage?: (uuid: string) => Promise<unknown>;
  getSystemPage?: (uuid: string) => Promise<unknown>;
  resolveDatasourceRuntimeData?: (...args: unknown[]) => Promise<unknown>;
  loadBlockDefinition?: (type: string) => Promise<MokelayBlockRenderDefinition | undefined>;
  getGlobalSetting?: (key: 'theme' | 'language') => string;
  setGlobalSetting?: (key: 'theme' | 'language', value: string) => void;
}

const adapter = shallowRef<MokelayComponentsAdapter>({});

export function configureMokelayComponents(value: MokelayComponentsAdapter): void {
  adapter.value = { ...value };
}

export function getMokelayComponentsAdapter(): Readonly<MokelayComponentsAdapter> {
  return adapter.value;
}

export function requireMokelayCapability<K extends keyof MokelayComponentsAdapter>(name: K): NonNullable<MokelayComponentsAdapter[K]> {
  const capability = adapter.value[name];
  if (!capability) throw new Error(`[mokelay-components] Missing adapter capability: ${String(name)}`);
  return capability as NonNullable<MokelayComponentsAdapter[K]>;
}

export const MokelayComponentsAdapterKey: InjectionKey<Readonly<MokelayComponentsAdapter>> = Symbol('MokelayComponentsAdapter');
