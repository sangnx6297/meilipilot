import { meili } from './client';
import type { SummarizedTaskView } from './types';

export type FetchDocsQuery = {
  offset?: number;
  limit?: number;
  fields?: string[];
  filter?: string;
  sort?: string[];
  retrieveVectors?: boolean;
};

export const fetchDocuments = (uid: string, q: FetchDocsQuery) =>
  meili<{ results: Record<string, unknown>[]; offset: number; limit: number; total: number }>(
    'POST',
    `/indexes/${encodeURIComponent(uid)}/documents/fetch`,
    q
  );

export const getDocument = (uid: string, id: string, fields?: string) =>
  meili<Record<string, unknown>>(
    'GET',
    `/indexes/${encodeURIComponent(uid)}/documents/${encodeURIComponent(id)}`,
    undefined,
    { fields }
  );

export const addOrReplace = (uid: string, docs: unknown[], primaryKey?: string) =>
  meili<SummarizedTaskView>('PUT', `/indexes/${encodeURIComponent(uid)}/documents`, docs, { primaryKey });

export const addOrUpdate = (uid: string, docs: unknown[], primaryKey?: string) =>
  meili<SummarizedTaskView>('POST', `/indexes/${encodeURIComponent(uid)}/documents`, docs, { primaryKey });

export const deleteDocument = (uid: string, id: string) =>
  meili<SummarizedTaskView>(
    'DELETE',
    `/indexes/${encodeURIComponent(uid)}/documents/${encodeURIComponent(id)}`
  );

export const deleteAllDocuments = (uid: string) =>
  meili<SummarizedTaskView>('DELETE', `/indexes/${encodeURIComponent(uid)}/documents`);

export const deleteByFilter = (uid: string, filter: string) =>
  meili<SummarizedTaskView>('POST', `/indexes/${encodeURIComponent(uid)}/documents/delete`, { filter });

export const deleteBatch = (uid: string, ids: Array<string | number>) =>
  meili<SummarizedTaskView>('POST', `/indexes/${encodeURIComponent(uid)}/documents/delete-batch`, ids);

export const editByFunction = (
  uid: string,
  body: { function: string; filter?: string; context?: Record<string, unknown> }
) => meili<SummarizedTaskView>('POST', `/indexes/${encodeURIComponent(uid)}/documents/edit`, body);
