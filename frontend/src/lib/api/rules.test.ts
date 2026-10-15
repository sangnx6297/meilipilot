import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { upsertRule, deleteAllRules } from './rules';

describe('rules api', () => {
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

  it('PATCHes a rule by uid', async () => {
    await upsertRule('promo', { active: true, precedence: 10, actions: { pin: [{ id: '1', position: 0 }] } });
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/dynamic-search-rules/promo');
    expect((fetch as any).mock.calls[0][1].method).toBe('PATCH');
  });

  it('DELETE all rules', async () => {
    await deleteAllRules();
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/dynamic-search-rules');
    expect((fetch as any).mock.calls[0][1].method).toBe('DELETE');
  });
});
