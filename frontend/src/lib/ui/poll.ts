export function createPoll(
  fn: () => void | Promise<void>,
  intervalMs: number,
  opts: { immediate?: boolean } = {}
): () => void {
  let inflight = false;
  const tick = async () => {
    if (inflight) return;
    inflight = true;
    try {
      await fn();
    } finally {
      inflight = false;
    }
  };
  if (opts.immediate !== false) void tick();
  const id = setInterval(() => void tick(), intervalMs);
  return () => clearInterval(id);
}
