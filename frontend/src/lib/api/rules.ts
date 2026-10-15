import { meili } from './client';

export const listRules = () => meili<{ results: unknown[] }>('GET', '/dynamic-search-rules');
export const deleteAllRules = () => meili<unknown>('DELETE', '/dynamic-search-rules');
export const getRule = (uid: string) =>
  meili<unknown>('GET', `/dynamic-search-rules/${encodeURIComponent(uid)}`);
export const upsertRule = (uid: string, patch: Record<string, unknown>) =>
  meili<unknown>('PATCH', `/dynamic-search-rules/${encodeURIComponent(uid)}`, patch);
export const deleteRule = (uid: string) =>
  meili<unknown>('DELETE', `/dynamic-search-rules/${encodeURIComponent(uid)}`);
