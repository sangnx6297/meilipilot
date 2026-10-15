import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSettings, patchSettings, resetSetting } from './settings';

describe('settings api', () => {
  beforeEach(() =>
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
        headers: { get: () => 'application/json' }
      })
    )
  );
  afterEach(() => vi.unstubAllGlobals());

  it('GET /indexes/{uid}/settings', async () => {
    await getSettings('movies');
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/indexes/movies/settings');
    expect((fetch as any).mock.calls[0][1].method).toBe('GET');
  });

  it('PATCH only dirty fields', async () => {
    await patchSettings('movies', { stopWords: ['the'] });
    const [, init] = (fetch as any).mock.calls[0];
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ stopWords: ['the'] }));
  });

  it('DELETE sub-route to reset one setting', async () => {
    await resetSetting('movies', 'synonyms');
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/indexes/movies/settings/synonyms');
    expect((fetch as any).mock.calls[0][1].method).toBe('DELETE');
  });
});
