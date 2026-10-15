import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createIndex, swapIndexes } from './indexes';

describe('indexes api', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs /indexes with uid and primaryKey', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({
        taskUid: 1,
        indexUid: 'movies',
        status: 'enqueued',
        type: 'indexCreation',
        enqueuedAt: ''
      }),
      headers: { get: () => 'application/json' }
    });
    const t = await createIndex({ uid: 'movies', primaryKey: 'id' });
    expect(t.taskUid).toBe(1);
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('/meili/indexes');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ uid: 'movies', primaryKey: 'id' }));
  });

  it('POSTs /swap-indexes', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({
        taskUid: 2,
        indexUid: null,
        status: 'enqueued',
        type: 'indexSwap',
        enqueuedAt: ''
      }),
      headers: { get: () => 'application/json' }
    });
    await swapIndexes([['movies', 'movies_new']]);
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('/meili/swap-indexes');
    expect(JSON.parse(init.body).indexes).toEqual([['movies', 'movies_new']]);
  });
});
