export function statusChipClass(status: string): string {
  const tone =
    status === 'succeeded'
      ? 'status-chip-succeeded'
      : status === 'failed'
        ? 'status-chip-failed'
        : status === 'canceled'
          ? 'status-chip-canceled'
          : status === 'processing'
            ? 'status-chip-processing'
            : 'status-chip-enqueued';
  return `status-chip ${tone}`;
}
