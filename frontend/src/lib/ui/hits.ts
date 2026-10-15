export type HitsViewMode = 'table' | 'detail' | 'json';

export const HITS_VIEW_MODE_KEY = 'meili.hitsViewMode';

const MODES = new Set<HitsViewMode>(['table', 'detail', 'json']);

export function splitDocMeta(row: Record<string, unknown>): {
  doc: Record<string, unknown>;
  meta: Record<string, unknown>;
} {
  const doc: Record<string, unknown> = {};
  const meta: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith('_')) meta[k] = v;
    else doc[k] = v;
  }
  return { doc, meta };
}

export function rowId(row: Record<string, unknown>): string {
  if (row.id !== undefined && row.id !== null) return String(row.id);
  if (row.uid !== undefined && row.uid !== null) return String(row.uid);
  return '';
}

function scalarLabel(v: unknown): string | null {
  if (typeof v === 'string') {
    const s = v.trim();
    return s ? s : null;
  }
  if (typeof v === 'number') return String(v);
  return null;
}

export function rowLabel(row: Record<string, unknown>): string {
  const { doc } = splitDocMeta(row);
  for (const k of ['title', 'name', 'id', 'uid'] as const) {
    const s = scalarLabel(doc[k]);
    if (s) return s;
  }
  let numeric: string | null = null;
  for (const v of Object.values(doc)) {
    if (typeof v === 'string') {
      const s = scalarLabel(v);
      if (s) return s;
    }
    if (numeric === null && typeof v === 'number') numeric = String(v);
  }
  return numeric ?? '(untitled)';
}

export function hasMeta(row: Record<string, unknown>): boolean {
  return Object.keys(splitDocMeta(row).meta).length > 0;
}

const RANKING_META_KEYS = new Set(['_rankingScore', '_rankingScoreDetails', '_semanticScore']);

export function rankingMeta(row: Record<string, unknown>): Record<string, unknown> {
  const { meta } = splitDocMeta(row);
  const out: Record<string, unknown> = {};
  for (const k of RANKING_META_KEYS) {
    if (k in meta) out[k] = meta[k];
  }
  return out;
}

export function hasRankingMeta(row: Record<string, unknown>): boolean {
  return Object.keys(rankingMeta(row)).length > 0;
}

export function tableColumns(rows: Record<string, unknown>[]): string[] {
  const cols: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(splitDocMeta(row).doc)) {
      if (seen.has(k)) continue;
      seen.add(k);
      cols.push(k);
    }
  }
  return cols;
}

export function cellPreview(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === 'object') return '{…}';
  return String(value);
}

export function cellTitle(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function columnAlign(rows: Record<string, unknown>[], col: string): 'left' | 'right' {
  let sawNumber = false;
  for (const row of rows) {
    const v = splitDocMeta(row).doc[col];
    if (v === undefined || v === null || v === '') continue;
    if (typeof v === 'number') {
      sawNumber = true;
      continue;
    }
    return 'left';
  }
  return sawNumber ? 'right' : 'left';
}

export function visibleColumns(all: string[], selected: string[]): string[] {
  if (selected.length === 0) return all;
  const known = new Set(all);
  const cols = selected.filter((c) => known.has(c));
  return cols.length ? cols : all;
}

export function moveColumn(cols: string[], from: number, to: number): string[] {
  if (!Number.isInteger(from) || !Number.isInteger(to)) return [...cols];
  if (from === to || from < 0 || to < 0 || from >= cols.length || to >= cols.length) return [...cols];
  const next = [...cols];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function visibleFieldsKey(indexUid: string): string {
  return `meili.hitsVisibleFields:${indexUid}`;
}

export function loadVisibleFields(indexUid: string): string[] {
  if (!indexUid) return [];
  try {
    const raw = localStorage.getItem(visibleFieldsKey(indexUid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string' && x !== '');
  } catch {
    return [];
  }
}

export function saveVisibleFields(indexUid: string, fields: string[]): void {
  if (!indexUid) return;
  try {
    localStorage.setItem(visibleFieldsKey(indexUid), JSON.stringify(fields));
  } catch {
    /* ignore */
  }
}

export function formattedHtml(meta: Record<string, unknown>, field: string): string | null {
  const formatted = meta._formatted;
  if (!formatted || typeof formatted !== 'object' || Array.isArray(formatted)) return null;
  const v = (formatted as Record<string, unknown>)[field];
  return typeof v === 'string' ? v : null;
}

export function loadHitsViewMode(): HitsViewMode {
  try {
    const v = localStorage.getItem(HITS_VIEW_MODE_KEY);
    if (v && MODES.has(v as HitsViewMode)) return v as HitsViewMode;
  } catch {
    /* ignore */
  }
  return 'table';
}

export function saveHitsViewMode(mode: HitsViewMode): void {
  try {
    localStorage.setItem(HITS_VIEW_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}
