import { flagOn, type EngineCapability } from './api/capability';

export const RISKY_EXPERIMENTAL_FLAGS = new Set(['legacySearch', 'disableDocumentsFetchQueue']);

export function bulkExperimentalPatch(
  current: Record<string, boolean>,
  enabled: boolean
): Record<string, boolean> {
  const patch: Record<string, boolean> = {};
  for (const key of Object.keys(current)) {
    if (RISKY_EXPERIMENTAL_FLAGS.has(key)) continue;
    patch[key] = enabled;
  }
  return patch;
}

export function safeExperimentalEnabled(current: Record<string, boolean>): boolean {
  const keys = Object.keys(current).filter((key) => !RISKY_EXPERIMENTAL_FLAGS.has(key));
  return keys.length > 0 && keys.every((key) => current[key] === true);
}

const HINTS: Record<string, string> = {
  metrics: 'Bật GET /metrics cho Prometheus: search queue, task queue, HTTP.',
  logsRoute: 'Đổi mức log lúc chạy qua route /logs.',
  tasksStreamingRoute: 'Stream thay đổi task và batch qua SSE.',
  editDocumentsByFunction: 'Sửa document bằng script Rhai.',
  containsFilter: 'Filter thêm toán tử CONTAINS để khớp chuỗi con.',
  dynamicSearchRules: 'Luật search động: ghim, ẩn, nhân điểm document.',
  network: 'Search trên cả cụm node, không chỉ máy local.',
  getTaskDocumentsRoute: 'Xem document mà một task đang xử lý.',
  taskQueueCompactionRoute: 'Nén database hàng đợi task để lấy lại dung lượng.',
  compositeEmbedders: 'Ghép nhiều embedder cho lúc index và lúc search.',
  chatCompletions: 'Chat hỏi đáp trên document của các index.',
  multimodal: 'Search bằng ảnh và media khác.',
  foreignKeys: 'Khóa ngoại giữa các index, hydrate document liên quan.',
  disableDocumentsFetchQueue: 'Tắt hàng đợi fetch document. Route lấy document xếp vào hàng search khi hết thread.',
  legacySearch: 'Dùng pipeline search cũ.',
  renderRoute: 'Xem trước template đã render, không cần index document.',
  mcpRoute: 'Bật route POST /mcp cho agent.'
};

export function featureHint(key: string): string {
  return HINTS[key] ?? '';
}

export function appendContains(filter: string, attribute: string, value: string): string {
  const attr = attribute.trim();
  if (!attr || value.trim() === '') return filter;
  const quotedAttr = /[^A-Za-z0-9_.]/.test(attr)
    ? `"${attr.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    : attr;
  const quotedVal = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const clause = `${quotedAttr} CONTAINS "${quotedVal}"`;
  const base = filter.trim();
  return base ? `${base} AND ${clause}` : clause;
}

export function consumeNdjson(
  buffer: string,
  chunk: string
): { buffer: string; lines: string[]; error: string | null } {
  const parts = (buffer + chunk).split('\n');
  const rest = parts.pop() ?? '';
  const lines: string[] = [];
  let error: string | null = null;
  for (const raw of parts) {
    const line = raw.trim();
    if (!line) continue;
    if (line.includes('[error]')) {
      error = line;
      continue;
    }
    lines.push(line);
  }
  return { buffer: rest, lines, error };
}

export function upsertByUid<T extends { uid: number }>(list: T[], item: T): T[] {
  const index = list.findIndex((row) => row.uid === item.uid);
  if (index < 0) return [item, ...list];
  const next = list.slice();
  next[index] = item;
  return next;
}

type ChatChoice = { delta?: { content?: string }; message?: { content?: string } };

export function consumeChatSse(
  buffer: string,
  chunk: string
): { buffer: string; text: string; done: boolean; error: string | null } {
  const parts = (buffer + chunk).split('\n');
  const rest = parts.pop() ?? '';
  let text = '';
  let done = false;
  let error: string | null = null;
  for (const raw of parts) {
    const line = raw.trim();
    if (!line) continue;
    if (line.includes('[error]')) {
      error = line;
      continue;
    }
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (payload === '[DONE]') {
      done = true;
      continue;
    }
    try {
      const json = JSON.parse(payload) as { choices?: ChatChoice[] };
      const choice = json.choices?.[0];
      const delta = choice?.delta?.content;
      const message = choice?.message?.content;
      if (typeof delta === 'string') text += delta;
      else if (typeof message === 'string') text += message;
    } catch {
      /* wait for a later chunk if the line was not JSON */
    }
  }
  return { buffer: rest, text, done, error };
}

export function mediaJsonFromImageUrl(url: string): string {
  return JSON.stringify({ image: { url: url.trim() } }, null, 2);
}

export function splitDataUrl(dataUrl: string): { mime: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], data: match[2] };
}

export function mediaFromImageFile(mime: string, data: string): string {
  return JSON.stringify({ image: { mime, data } }, null, 2);
}

export function appendLogChunk(current: string, chunk: string, maxLines = 400): string {
  const lines = (current + chunk).split('\n');
  return lines.slice(-maxLines).join('\n');
}

export type SubEmbedderInput = { source: string; model: string; url: string };

function subEmbedder(input: SubEmbedderInput): Record<string, string> {
  const out: Record<string, string> = { source: input.source.trim() };
  if (input.model.trim()) out.model = input.model.trim();
  if (input.url.trim()) out.url = input.url.trim();
  return out;
}

export function compositeEmbedder(
  name: string,
  indexing: SubEmbedderInput,
  search: SubEmbedderInput
): Record<string, unknown> | null {
  const id = name.trim();
  if (!id || !indexing.source.trim() || !search.source.trim()) return null;
  return {
    [id]: {
      source: 'composite',
      indexingEmbedder: subEmbedder(indexing),
      searchEmbedder: subEmbedder(search)
    }
  };
}

export function mergeEmbedder(current: unknown, addition: Record<string, unknown>): Record<string, unknown> {
  const base =
    current && typeof current === 'object' && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};
  return { ...base, ...addition };
}

export function appendForeignKey(
  current: unknown,
  row: { foreignIndexUid: string; fieldName: string }
): { foreignIndexUid: string; fieldName: string }[] | null {
  const foreignIndexUid = row.foreignIndexUid.trim();
  const fieldName = row.fieldName.trim();
  if (!foreignIndexUid || !fieldName) return null;
  const list = Array.isArray(current)
    ? current.filter((item): item is { foreignIndexUid: string; fieldName: string } => !!item && typeof item === 'object')
    : [];
  return [...list, { foreignIndexUid, fieldName }];
}

export function settingVisible(field: string, caps: EngineCapability): boolean {
  if (field === 'foreignKeys') return flagOn(caps, 'foreignKeys');
  if (field === 'chat') return flagOn(caps, 'chatCompletions');
  return true;
}

export function embedderHint(base: string, caps: EngineCapability): string {
  if (!flagOn(caps, 'compositeEmbedders')) return base;
  return `${base} Composite embedder đang bật: ghép indexingEmbedder và searchEmbedder.`;
}
