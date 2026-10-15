import { meili, MeiliError } from './client';
import type { TaskView } from './types';

const DONE: TaskView['status'][] = ['succeeded', 'failed', 'canceled'];

export async function pollUntilDone(
  load: () => Promise<TaskView>,
  opts: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<TaskView> {
  const intervalMs = opts.intervalMs ?? 200;
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const t = await load();
    if (DONE.includes(t.status)) {
      if (t.status === 'failed') {
        const e = t.error;
        throw new MeiliError(
          400,
          e?.code ?? 'task_failed',
          e?.type ?? 'internal',
          e?.link ?? '',
          e?.message ?? 'task failed'
        );
      }
      return t;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new MeiliError(408, 'task_timeout', 'system', '', 'task timeout');
}

export async function waitTask(
  uid: number,
  opts: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<TaskView> {
  return pollUntilDone(() => meili<TaskView>('GET', `/tasks/${uid}`), opts);
}
