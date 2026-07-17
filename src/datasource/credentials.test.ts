import type { AxiosInstance } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureMokelayComponents } from '@/runtime';
import { $remote } from './datasource';

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
}

describe('datasource request credentials', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    configureMokelayComponents({});
  });

  it('includes credentials for the Mokelay API domain', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        ok: true,
        data: {
          domains: [{ uuid: 'mokelay', alias: 'Mokelay', host: 'http://localhost:8787' }]
        }
      }
    });
    configureMokelayComponents({ apiClient: { get } as unknown as AxiosInstance });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await $remote({
      type: 'API',
      domain: 'mokelay',
      path: '/api/mokelay/list_apps',
      method: 'GET',
      headerData: [],
      bodyData: [],
      queryData: []
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8787/api/mokelay/list_apps',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('keeps custom API domains on the browser default credential policy', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await $remote({
      type: 'API',
      domain: 'https://third-party.example',
      path: '/records',
      method: 'GET',
      headerData: [],
      bodyData: [],
      queryData: []
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(requestInit).not.toHaveProperty('credentials');
  });
});
