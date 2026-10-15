import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listTasks, cancelTasks } from './async';

describe('tasks api', () => {
  beforeEach(() =>
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [], total: 0, limit: 20, from: null, next: null }),
        headers: { get: () => 'application/json' }
      })
    )
  );
  afterEach(() => vi.unstubAllGlobals());

  it('lists tasks with statuses and types as comma lists', async () => {
    await listTasks({ statuses: 'enqueued,processing', types: 'documentAdditionOrUpdate', limit: 20 });
    expect((fetch as any).mock.calls[0][0]).toBe(
      '/meili/tasks?statuses=enqueued%2Cprocessing&types=documentAdditionOrUpdate&limit=20'
    );
  });

  it('cancels via POST /tasks/cancel', async () => {
    await cancelTasks({ uids: '1,2' });
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('/meili/tasks/cancel?uids=1%2C2');
    expect(init.method).toBe('POST');
  });
});
