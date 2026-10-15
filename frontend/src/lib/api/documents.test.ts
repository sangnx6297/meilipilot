import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchDocuments, addOrReplace, deleteByFilter, editByFunction } from './documents';

describe('documents api', () => {
  beforeEach(() =>
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ results: [], total: 0 }),
        headers: { get: () => 'application/json' }
      })
    )
  );
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs /documents/fetch', async () => {
    await fetchDocuments('movies', { offset: 0, limit: 20, filter: 'id > 1' });
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('/meili/indexes/movies/documents/fetch');
    expect(JSON.parse(init.body)).toEqual({ offset: 0, limit: 20, filter: 'id > 1' });
  });

  it('PUTs documents for replace', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        taskUid: 9,
        indexUid: 'movies',
        status: 'enqueued',
        type: 'documentAdditionOrUpdate',
        enqueuedAt: ''
      }),
      headers: { get: () => 'application/json' }
    });
    await addOrReplace('movies', [{ id: 1, title: 'x' }], 'id');
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('/meili/indexes/movies/documents?primaryKey=id');
    expect(init.method).toBe('PUT');
  });

  it('POSTs delete by filter and edit by function', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        taskUid: 10,
        indexUid: 'movies',
        status: 'enqueued',
        type: 'documentDeletion',
        enqueuedAt: ''
      }),
      headers: { get: () => 'application/json' }
    });
    await deleteByFilter('movies', 'genres = horror');
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/indexes/movies/documents/delete');
    await editByFunction('movies', { function: 'doc.title = "a"; doc', filter: 'id = 1' });
    expect((fetch as any).mock.calls[1][0]).toBe('/meili/indexes/movies/documents/edit');
  });
});
