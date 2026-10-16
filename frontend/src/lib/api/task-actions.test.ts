import { describe, expect, it } from 'vitest';
import { CANCELABLE_STATUSES, DELETABLE_STATUSES, uidsWithStatus } from './task-actions';

describe('task selection', () => {
  const tasks = [
    { uid: 1, status: 'enqueued' },
    { uid: 2, status: 'processing' },
    { uid: 3, status: 'succeeded' },
    { uid: 4, status: 'failed' },
    { uid: 5, status: 'canceled' }
  ];

  it('cancels only queued or running tasks', () => {
    expect(uidsWithStatus(tasks, CANCELABLE_STATUSES)).toEqual([1, 2]);
  });

  it('deletes only finished tasks', () => {
    expect(uidsWithStatus(tasks, DELETABLE_STATUSES)).toEqual([3, 4, 5]);
  });
});
