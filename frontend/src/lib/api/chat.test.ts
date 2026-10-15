import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { patchChatSettings } from './chat';

describe('chat api', () => {
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

  it('PATCHes workspace settings', async () => {
    await patchChatSettings('ws1', { source: 'openAi' });
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/chats/ws1/settings');
    expect((fetch as any).mock.calls[0][1].method).toBe('PATCH');
  });
});
