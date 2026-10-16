import type { SearchQuery } from '../api/types';
import { EMPTY_SEARCH_FORM, type SearchFormState } from '../api/search-form';
import { FILTER_OPS, type FilterOp } from '../api/search-fields';
import type { SearchTab } from '../api/search-layout';
import { documentKey, rowLabel } from './hits';

export type SearchHistoryItem = {
  at: number;
  indexUid: string;
  form: SearchFormState;
  query: SearchQuery;
  processingTimeMs?: number;
  hitCount?: number;
  hitIds?: string[];
  hitLabels?: Record<string, string>;
  hitScores?: Record<string, number | null>;
};

export function snapshotKey(item: SearchHistoryItem, index: number): string {
  return `${item.at}:${index}`;
}

export function findSnapshot(items: SearchHistoryItem[], key: string): SearchHistoryItem | undefined {
  const match = /^(\d+):(\d+)$/.exec(key);
  if (!match) return undefined;
  const index = Number(match[2]);
  const item = items[index];
  if (!item || String(item.at) !== match[1]) return undefined;
  return item;
}

const PREFIX = 'meili.searchHistory:';
const LAST_INDEX_PREFIX = 'meili.searchIndex:';
const DRAFT_PREFIX = 'meili.searchDraft:';
const MAX = 30;

const SEARCH_TABS = new Set<SearchTab>(['filter', 'facet', 'display', 'vector', 'advanced', 'debug']);

export type SearchPanelState = {
  tab: SearchTab;
  sortAttr: string;
  sortOrder: 'asc' | 'desc';
  filterAttr: string;
  filterOp: FilterOp;
  filterValue: string;
  filterValueTo: string;
  filterJoin: 'AND' | 'OR';
};

export const EMPTY_SEARCH_PANEL: SearchPanelState = {
  tab: 'filter',
  sortAttr: '',
  sortOrder: 'asc',
  filterAttr: '',
  filterOp: '=',
  filterValue: '',
  filterValueTo: '',
  filterJoin: 'AND'
};

export type SearchDraft = {
  mode: 'form' | 'json';
  form: SearchFormState;
  jsonText: string;
  panel: SearchPanelState;
};

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function normalizeSearchPanel(raw: unknown): SearchPanelState {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const tab = asText(source.tab);
  const filterOp = asText(source.filterOp);
  const sortOrder = asText(source.sortOrder);
  const filterJoin = asText(source.filterJoin);
  return {
    tab: SEARCH_TABS.has(tab as SearchTab) ? (tab as SearchTab) : 'filter',
    sortAttr: asText(source.sortAttr),
    sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
    filterAttr: asText(source.filterAttr),
    filterOp: (FILTER_OPS as readonly string[]).includes(filterOp) ? (filterOp as FilterOp) : '=',
    filterValue: asText(source.filterValue),
    filterValueTo: asText(source.filterValueTo),
    filterJoin: filterJoin === 'OR' ? 'OR' : 'AND'
  };
}

const MATCHING = new Set(['', 'last', 'all', 'frequency']);
const NETWORK = new Set(['', 'true', 'false']);

export function normalizeSearchForm(raw: unknown): SearchFormState {
  const next: SearchFormState = { ...EMPTY_SEARCH_FORM };
  if (!raw || typeof raw !== 'object') return next;
  const source = raw as Record<string, unknown>;
  for (const key of Object.keys(EMPTY_SEARCH_FORM) as (keyof SearchFormState)[]) {
    const value = source[key];
    if (typeof next[key] === 'boolean') {
      if (typeof value === 'boolean') (next[key] as boolean) = value;
      continue;
    }
    if (typeof value !== 'string') continue;
    if (key === 'matchingStrategy' && !MATCHING.has(value)) continue;
    if (key === 'useNetwork' && !NETWORK.has(value)) continue;
    (next[key] as string) = value;
  }
  if (next.mediaJson.length > 500) next.mediaJson = '';
  if (next.vector.length > 200) next.vector = '';
  return next;
}

function draftKey(profileId: string, indexUid: string): string {
  return `${DRAFT_PREFIX}${profileId}:${indexUid}`;
}

export function loadSearchDraft(profileId: string, indexUid: string): SearchDraft | null {
  if (!profileId || !indexUid) return null;
  try {
    const raw = localStorage.getItem(draftKey(profileId, indexUid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { mode?: unknown; form?: unknown; jsonText?: unknown; panel?: unknown };
    return {
      mode: parsed.mode === 'json' ? 'json' : 'form',
      form: normalizeSearchForm(parsed.form),
      jsonText: typeof parsed.jsonText === 'string' ? parsed.jsonText.slice(0, 20000) : '',
      panel: normalizeSearchPanel(parsed.panel)
    };
  } catch {
    return null;
  }
}

export function saveSearchDraft(profileId: string, indexUid: string, draft: Omit<SearchDraft, 'panel'> & { panel?: SearchPanelState }): void {
  if (!profileId || !indexUid) return;
  const slim: SearchDraft = {
    mode: draft.mode === 'json' ? 'json' : 'form',
    form: normalizeSearchForm(draft.form),
    jsonText: draft.jsonText.slice(0, 20000),
    panel: normalizeSearchPanel(draft.panel)
  };
  try {
    localStorage.setItem(draftKey(profileId, indexUid), JSON.stringify(slim));
  } catch {
    // quota or private mode: the open form still works
  }
}

export function loadLastIndex(profileId: string): string {
  if (!profileId) return '';
  try {
    return localStorage.getItem(LAST_INDEX_PREFIX + profileId) ?? '';
  } catch {
    return '';
  }
}

export function saveLastIndex(profileId: string, indexUid: string): void {
  if (!profileId || !indexUid) return;
  try {
    localStorage.setItem(LAST_INDEX_PREFIX + profileId, indexUid);
  } catch {
    // quota or private mode: the in-memory select still works
  }
}

export function loadHistory(indexUid: string): SearchHistoryItem[] {
  try {
    const raw = localStorage.getItem(PREFIX + indexUid);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SearchHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function slimHistoryItem(item: SearchHistoryItem): SearchHistoryItem {
  const form = { ...item.form };
  if (form.mediaJson.length > 500) form.mediaJson = '';
  if (form.vector.length > 200) form.vector = '';
  const query = { ...item.query };
  delete query.media;
  if (Array.isArray(query.vector) && query.vector.length > 32) delete query.vector;
  return { ...item, form, query };
}

export function pushHistory(item: Omit<SearchHistoryItem, 'at'> & { at?: number }): SearchHistoryItem[] {
  const next = slimHistoryItem({ ...item, at: item.at ?? Date.now() });
  let items = [next, ...loadHistory(item.indexUid)].slice(0, MAX);
  const key = PREFIX + item.indexUid;
  while (items.length) {
    try {
      localStorage.setItem(key, JSON.stringify(items));
      return items;
    } catch {
      items = items.slice(0, -1);
    }
  }
  return [next];
}

export function compareHitIds(a: string[], b: string[]): {
  onlyA: string[];
  onlyB: string[];
  orderChanged: boolean;
} {
  const setA = new Set(a);
  const setB = new Set(b);
  const onlyA = a.filter((id) => !setB.has(id));
  const onlyB = b.filter((id) => !setA.has(id));
  const sharedA = a.filter((id) => setB.has(id));
  const sharedB = b.filter((id) => setA.has(id));
  const orderChanged = sharedA.join('\0') !== sharedB.join('\0');
  return { onlyA, onlyB, orderChanged };
}

export function snapsFromHits(
  hits: Record<string, unknown>[],
  primaryKey?: string | null
): Pick<SearchHistoryItem, 'hitIds' | 'hitLabels' | 'hitScores'> {
  const hitIds: string[] = [];
  const hitLabels: Record<string, string> = {};
  const hitScores: Record<string, number | null> = {};
  for (const hit of hits) {
    const id = documentKey(hit, primaryKey);
    if (!id) continue;
    hitIds.push(id);
    hitLabels[id] = rowLabel(hit) || id;
    const score = hit._rankingScore;
    hitScores[id] = typeof score === 'number' ? score : null;
  }
  return { hitIds, hitLabels, hitScores };
}

export function scoresFromHits(hits: Record<string, unknown>[], primaryKey?: string | null): Record<string, number | null> {
  return snapsFromHits(hits, primaryKey).hitScores ?? {};
}

export type SearchRunDoc = {
  id: string;
  label: string;
  rankA: number | null;
  rankB: number | null;
  rankDelta: number | null;
  scoreA: number | null;
  scoreB: number | null;
  scoreDelta: number | null;
};

export type SearchRunCompare = {
  ids: ReturnType<typeof compareHitIds>;
  latencyA: number | null;
  latencyB: number | null;
  latencyDelta: number | null;
  docs: SearchRunDoc[];
};

export function compareSearchRuns(a: SearchHistoryItem, b: SearchHistoryItem): SearchRunCompare {
  const idsA = a.hitIds ?? [];
  const idsB = b.hitIds ?? [];
  const rankA = new Map(idsA.map((id, i) => [id, i + 1]));
  const rankB = new Map(idsB.map((id, i) => [id, i + 1]));
  const scoresA = a.hitScores ?? {};
  const scoresB = b.hitScores ?? {};
  const labels = { ...(a.hitLabels ?? {}), ...(b.hitLabels ?? {}) };
  const docs: SearchRunDoc[] = [...new Set([...idsA, ...idsB])].map((id) => {
    const ra = rankA.get(id) ?? null;
    const rb = rankB.get(id) ?? null;
    const sa = typeof scoresA[id] === 'number' ? scoresA[id]! : null;
    const sb = typeof scoresB[id] === 'number' ? scoresB[id]! : null;
    return {
      id,
      label: labels[id] || id,
      rankA: ra,
      rankB: rb,
      rankDelta: ra != null && rb != null ? rb - ra : null,
      scoreA: sa,
      scoreB: sb,
      scoreDelta: sa != null && sb != null ? Number((sb - sa).toFixed(6)) : null
    };
  });
  const latencyA = a.processingTimeMs ?? null;
  const latencyB = b.processingTimeMs ?? null;
  return {
    ids: compareHitIds(idsA, idsB),
    latencyA,
    latencyB,
    latencyDelta: latencyA != null && latencyB != null ? latencyB - latencyA : null,
    docs
  };
}
