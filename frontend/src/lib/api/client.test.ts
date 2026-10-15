import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { meili, MeiliError } from './client';

describe('meili', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('GETs /meili path and parses json', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'available' }),
      headers: { get: () => 'application/json' }
    });
    const got = await meili<{ status: string }>('GET', '/health');
    expect(got.status).toBe('available');
    expect(fetch).toHaveBeenCalledWith('/meili/health', expect.objectContaining({ method: 'GET' }));
  });

  it('encodes query and JSON body', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hits: [] }),
      headers: { get: () => 'application/json' }
    });
    await meili('POST', '/indexes/movies/search', { q: 'ninja' }, { limit: 2 });
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('/meili/indexes/movies/search?limit=2');
    expect(init.body).toBe(JSON.stringify({ q: 'ninja' }));
  });

  it('throws MeiliError from ResponseError body', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        message: 'The Authorization header is missing.',
        code: 'missing_authorization_header',
        type: 'auth',
        link: 'https://docs.meilisearch.com/errors#missing_authorization_header'
      }),
      headers: { get: () => 'application/json' }
    });
    await expect(meili('GET', '/keys')).rejects.toMatchObject({
      code: 'missing_authorization_header',
      httpStatus: 401
    });
    expect(MeiliError).toBeDefined();
  });
});
