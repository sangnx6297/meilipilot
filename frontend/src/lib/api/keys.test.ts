import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MeiliError } from './errors';
import { buildCreateKeyBody, createKey, keyWriteHint, updateKey } from './keys';

describe('keys api', () => {
  beforeEach(() =>
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ uid: 'u', key: 'secret', actions: ['search'], indexes: ['*'] }),
        headers: { get: () => 'application/json' }
      })
    )
  );
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs /keys', async () => {
    await createKey({ actions: ['search'], indexes: ['movies'], expiresAt: null, name: 'front' });
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('/meili/keys');
    expect(JSON.parse(init.body).actions).toEqual(['search']);
  });

  it('PATCHes name/description only', async () => {
    await updateKey('u', { name: 'n', description: 'd' });
    expect((fetch as any).mock.calls[0][1].method).toBe('PATCH');
  });
});

describe('buildCreateKeyBody', () => {
  it('sends expiresAt null and trims indexes', () => {
    const got = buildCreateKeyBody({
      name: ' front ',
      indexesText: ' * , movies ',
      actions: ['search', 'search']
    });
    expect(got).toEqual({
      ok: true,
      body: { name: 'front', actions: ['search'], indexes: ['*', 'movies'], expiresAt: null }
    });
  });

  it('rejects empty actions or indexes', () => {
    expect(buildCreateKeyBody({ name: '', indexesText: '*', actions: [] }).ok).toBe(false);
    expect(buildCreateKeyBody({ name: '', indexesText: '  ,  ', actions: ['search'] }).ok).toBe(false);
  });
});

describe('keyWriteHint', () => {
  it('explains readOnly and master key', () => {
    expect(
      keyWriteHint(new MeiliError(403, 'connection_read_only', 'auth', '', 'ro'))
    ).toMatch(/readOnly/);
    expect(
      keyWriteHint(new MeiliError(403, 'invalid_api_key', 'auth', '', 'nope'))
    ).toMatch(/master key/);
  });
});
