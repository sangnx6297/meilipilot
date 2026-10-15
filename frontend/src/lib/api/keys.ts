import { meili } from './client';
import { classifyError } from './errors';
import type { CreateApiKey, KeyAction, KeyView, Pagination } from './types';

export const listKeys = (offset = 0, limit = 20) =>
  meili<Pagination<KeyView>>('GET', '/keys', undefined, { offset, limit });

export const getKey = (keyOrUid: string) =>
  meili<KeyView>('GET', `/keys/${encodeURIComponent(keyOrUid)}`);

export const createKey = (body: CreateApiKey) => meili<KeyView>('POST', '/keys', body);

export const updateKey = (keyOrUid: string, body: { name?: string | null; description?: string | null }) =>
  meili<KeyView>('PATCH', `/keys/${encodeURIComponent(keyOrUid)}`, body);

export const deleteKey = (keyOrUid: string) =>
  meili<void>('DELETE', `/keys/${encodeURIComponent(keyOrUid)}`);

export type CreateKeyForm = {
  name: string;
  indexesText: string;
  actions: KeyAction[];
};

export function buildCreateKeyBody(
  form: CreateKeyForm
): { ok: true; body: CreateApiKey } | { ok: false; message: string } {
  const actions = [...new Set(form.actions)];
  if (actions.length === 0) {
    return { ok: false, message: 'Chọn ít nhất một action.' };
  }
  const indexes = form.indexesText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (indexes.length === 0) {
    return { ok: false, message: 'Indexes không được trống — dùng * cho mọi index.' };
  }
  const name = form.name.trim();
  return {
    ok: true,
    body: {
      name: name || null,
      actions,
      indexes,
      expiresAt: null
    }
  };
}

export function keyWriteHint(error: unknown): string {
  const kind = classifyError(error);
  if (kind === 'readonly') {
    return 'Session đang readOnly nên không tạo/sửa/xóa key. Vào Kết nối, tắt readOnly rồi thử lại.';
  }
  if (kind === 'auth' || kind === 'permission') {
    return 'Cần master key (hoặc key có keys.create / keys.delete). Default Search key không đủ.';
  }
  return '';
}
