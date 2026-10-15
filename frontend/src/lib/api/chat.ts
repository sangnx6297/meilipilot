import { meili } from './client';

export const listChats = (offset = 0, limit = 20) =>
  meili<{ results: { uid: string }[]; offset: number; limit: number; total: number }>(
    'GET',
    '/chats',
    undefined,
    { offset, limit }
  );

export const getChat = (uid: string) => meili<unknown>('GET', `/chats/${encodeURIComponent(uid)}`);
export const deleteChat = (uid: string) => meili<void>('DELETE', `/chats/${encodeURIComponent(uid)}`);
export const getChatSettings = (uid: string) =>
  meili<Record<string, unknown>>('GET', `/chats/${encodeURIComponent(uid)}/settings`);
export const patchChatSettings = (uid: string, patch: Record<string, unknown>) =>
  meili<unknown>('PATCH', `/chats/${encodeURIComponent(uid)}/settings`, patch);
export const resetChatSettings = (uid: string) =>
  meili<unknown>('DELETE', `/chats/${encodeURIComponent(uid)}/settings`);
