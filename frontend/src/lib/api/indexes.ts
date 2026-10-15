import { meili } from './client';
import type { IndexView, Pagination, SummarizedTaskView, IndexStats } from './types';

export const listIndexes = (offset = 0, limit = 20) =>
  meili<Pagination<IndexView>>('GET', '/indexes', undefined, { offset, limit });

export const getIndex = (uid: string) => meili<IndexView>('GET', `/indexes/${encodeURIComponent(uid)}`);

export const createIndex = (body: { uid: string; primaryKey?: string | null }) =>
  meili<SummarizedTaskView>('POST', '/indexes', body);

export const updateIndex = (uid: string, body: { primaryKey?: string | null; uid?: string }) =>
  meili<SummarizedTaskView>('PATCH', `/indexes/${encodeURIComponent(uid)}`, body);

export const deleteIndex = (uid: string) =>
  meili<SummarizedTaskView>('DELETE', `/indexes/${encodeURIComponent(uid)}`);

export const swapIndexes = (pairs: string[][]) =>
  meili<SummarizedTaskView>('POST', '/swap-indexes', { indexes: pairs });

export const compactIndex = (uid: string) =>
  meili<SummarizedTaskView>('POST', `/indexes/${encodeURIComponent(uid)}/compact`);

export const getIndexStats = (uid: string) =>
  meili<IndexStats>('GET', `/indexes/${encodeURIComponent(uid)}/stats`);

export const listIndexFields = (uid: string, offset = 0, limit = 100) =>
  meili<unknown>('POST', `/indexes/${encodeURIComponent(uid)}/fields`, { offset, limit });
