import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDump, createWebhook, patchExperimental } from './instance';

describe('instance api', () => {
  beforeEach(() =>
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          taskUid: 1,
          status: 'enqueued',
          type: 'dumpCreation',
          indexUid: null,
          enqueuedAt: ''
        }),
        headers: { get: () => 'application/json' }
      })
    )
  );
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs /dumps', async () => {
    await createDump();
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/dumps');
    expect((fetch as any).mock.calls[0][1].method).toBe('POST');
  });

  it('POSTs /webhooks', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ uuid: 'x', url: 'http://example.com', headers: {} }),
      headers: { get: () => 'application/json' }
    });
    await createWebhook({ url: 'http://example.com', headers: { Authorization: 'Bearer z' } });
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/webhooks');
  });

  it('PATCHes experimental features', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ metrics: true }),
      headers: { get: () => 'application/json' }
    });
    await patchExperimental({ metrics: true });
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/experimental-features');
    expect((fetch as any).mock.calls[0][1].method).toBe('PATCH');
  });
});
