import { meili } from './client';
import type { AllBatches, BatchView, SummarizedTaskView, TaskView } from './types';

export type TaskFilters = {
  uids?: string;
  batchUids?: string;
  indexUids?: string;
  statuses?: string;
  types?: string;
  canceledBy?: string;
  beforeEnqueuedAt?: string;
  afterEnqueuedAt?: string;
  limit?: number;
  from?: number;
  reverse?: boolean;
};

export type AllTasks = {
  results: TaskView[];
  total: number;
  limit: number;
  from: number | null;
  next: number | null;
};

export const listTasks = (f: TaskFilters) => meili<AllTasks>('GET', '/tasks', undefined, f);
export const getTask = (uid: number) => meili<TaskView>('GET', `/tasks/${uid}`);
export const getTaskDocuments = (uid: number) => meili<unknown>('GET', `/tasks/${uid}/documents`);
export const cancelTasks = (f: TaskFilters) =>
  meili<SummarizedTaskView>('POST', '/tasks/cancel', undefined, f);
export const deleteTasks = (f: TaskFilters) => meili<SummarizedTaskView>('DELETE', '/tasks', undefined, f);
export const compactTasks = () =>
  meili<{ preSize: string; postSize: string; status: string; actionRequired: string | null }>(
    'POST',
    '/tasks/compact'
  );
export const listBatches = (f: { uids?: string; limit?: number; from?: number }) =>
  meili<AllBatches>('GET', '/batches', undefined, f);
export const getBatch = (id: number) => meili<BatchView>('GET', `/batches/${id}`);
