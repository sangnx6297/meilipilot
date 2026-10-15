import { describe, it, expect } from 'vitest';
import { formatDuration, taskProgress } from './task-progress';
import type { TaskView } from './types';

const task = (over: Partial<TaskView>): TaskView => ({
  uid: 1,
  batchUid: null,
  indexUid: 'movies',
  status: 'enqueued',
  type: 'documentAdditionOrUpdate',
  canceledBy: null,
  details: null,
  error: null,
  duration: null,
  enqueuedAt: '2024-01-01T00:00:00Z',
  startedAt: null,
  finishedAt: null,
  ...over
});

describe('taskProgress', () => {
  it('shows queue state for enqueued tasks', () => {
    expect(taskProgress(task({ status: 'enqueued' }))).toEqual({
      percent: 0,
      indeterminate: false,
      label: 'Trong hàng đợi',
      step: null,
      tone: 'muted'
    });
  });

  it('is complete when succeeded', () => {
    const p = taskProgress(task({ status: 'succeeded' }));
    expect(p.percent).toBe(100);
    expect(p.label).toBe('Hoàn thành');
    expect(p.tone).toBe('done');
  });

  it('uses indexed/received documents while processing', () => {
    const p = taskProgress(
      task({
        status: 'processing',
        details: { receivedDocuments: 200, indexedDocuments: 50 }
      })
    );
    expect(p.percent).toBe(25);
    expect(p.label).toContain('50');
    expect(p.label).toContain('200');
  });

  it('uses batch percentage when document counts are unknown', () => {
    const p = taskProgress(task({ status: 'processing' }), {
      progress: {
        percentage: 12.5,
        steps: [{ currentStep: 'indexing documents', finished: 1, total: 3 }]
      }
    });
    expect(p.percent).toBe(12.5);
    expect(p.step).toBe('indexing documents');
  });

  it('is indeterminate when processing with no numbers', () => {
    const p = taskProgress(task({ status: 'processing' }));
    expect(p.percent).toBeNull();
    expect(p.indeterminate).toBe(true);
  });
});

describe('formatDuration', () => {
  it('formats ISO-8601 durations', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration('PT0.11S')).toBe('110ms');
    expect(formatDuration('PT1S')).toBe('1s');
  });
});
