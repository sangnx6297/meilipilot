import { describe, it, expect, vi, afterEach } from 'vitest';
import { createPoll } from './poll';

describe('createPoll', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs immediately then on each interval until stopped', async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockResolvedValue(undefined);
    const stop = createPoll(fn, 2000);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(fn).toHaveBeenCalledTimes(3);
    stop();
    await vi.advanceTimersByTimeAsync(4000);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('skips a tick while the previous run is still in flight', async () => {
    vi.useFakeTimers();
    let release!: () => void;
    const fn = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );
    const stop = createPoll(fn, 1000);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3000);
    expect(fn).toHaveBeenCalledTimes(1);
    release();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1000);
    expect(fn).toHaveBeenCalledTimes(2);
    stop();
  });
});
