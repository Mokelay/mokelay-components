import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { configureMokelayComponents } from '../runtime';
import { apiClient } from './useApi';

describe('component API client', () => {
  afterEach(() => configureMokelayComponents({}));

  it('reports the missing runtime capability', () => {
    expect(() => apiClient.defaults).toThrow(
      '[mokelay-components] Missing adapter capability: apiClient'
    );
  });

  it('delegates requests to the host API client', async () => {
    const get = vi.fn().mockResolvedValue({ data: { ok: true } });
    const hostClient = {
      defaults: { baseURL: 'http://localhost:8787' },
      get
    } as unknown as AxiosInstance;

    configureMokelayComponents({ apiClient: hostClient });

    expect(apiClient.defaults.baseURL).toBe('http://localhost:8787');
    await apiClient.get('/api/mokelay/list_apis');
    expect(get).toHaveBeenCalledWith('/api/mokelay/list_apis');
  });
});
