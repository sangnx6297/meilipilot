export const CANCELABLE_STATUSES = ['enqueued', 'processing'] as const;
export const DELETABLE_STATUSES = ['succeeded', 'failed', 'canceled'] as const;

export function uidsWithStatus(tasks: { uid: number; status: string }[], allowed: readonly string[]): number[] {
  const ok = new Set<string>(allowed);
  return tasks.filter((task) => ok.has(task.status)).map((task) => task.uid);
}
