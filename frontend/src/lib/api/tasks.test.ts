import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitTask } from './tasks';

describe('waitTask', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('resolves when status is succeeded', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ uid: 1, status: 'processing' }),
        headers: { get: () => 'application/json' }
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ uid: 1, status: 'succeeded' }),
        headers: { get: () => 'application/json' }
      });
    const t = await waitTask(1, { intervalMs: 1, timeoutMs: 1000 });
    expect(t.status).toBe('succeeded');
  });

  it('throws when task failed', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        uid: 2,
        status: 'failed',
        error: { message: 'boom', code: 'x', type: 'internal', link: '' }
      }),
      headers: { get: () => 'application/json' }
    });
    await expect(waitTask(2, { intervalMs: 1, timeoutMs: 1000 })).rejects.toMatchObject({ code: 'x' });
  });
});
