import type { SearchQuery } from '../api/types';
import type { SearchFormState } from '../api/search-form';
import { rowId } from './hits';

export type SearchHistoryItem = {
  at: number;
  indexUid: string;
  form: SearchFormState;
  query: SearchQuery;
  processingTimeMs?: number;
  hitCount?: number;
  hitIds?: string[];
  hitScores?: Record<string, number | null>;
};

const PREFIX = 'meili.searchHistory:';
const MAX = 30;

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

export function pushHistory(item: Omit<SearchHistoryItem, 'at'> & { at?: number }): SearchHistoryItem[] {
  const next: SearchHistoryItem = { ...item, at: item.at ?? Date.now() };
  const items = [next, ...loadHistory(item.indexUid)].slice(0, MAX);
  localStorage.setItem(PREFIX + item.indexUid, JSON.stringify(items));
  return items;
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

export function scoresFromHits(hits: Record<string, unknown>[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const hit of hits) {
    const id = rowId(hit);
    if (!id) continue;
    const score = hit._rankingScore;
    out[id] = typeof score === 'number' ? score : null;
  }
  return out;
}

export type SearchRunDoc = {
  id: string;
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
  const docs: SearchRunDoc[] = [...new Set([...idsA, ...idsB])].map((id) => {
    const ra = rankA.get(id) ?? null;
    const rb = rankB.get(id) ?? null;
    const sa = typeof scoresA[id] === 'number' ? scoresA[id]! : null;
    const sb = typeof scoresB[id] === 'number' ? scoresB[id]! : null;
    return {
      id,
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
