import { meili } from './client';
import type { SearchQuery, SearchResult } from './types';

export function compactSearchQuery(q: SearchQuery): SearchQuery {
  const out: SearchQuery = {};
  (Object.keys(q) as (keyof SearchQuery)[]).forEach((k) => {
    const v = q[k];
    if (v === undefined || v === null) return;
    if (typeof v === 'string' && v === '' && k !== 'q') return;
    if (Array.isArray(v) && v.length === 0) return;
    (out as Record<string, unknown>)[k] = v;
  });
  return out;
}

export const searchIndex = (uid: string, q: SearchQuery) =>
  meili<SearchResult>('POST', `/indexes/${encodeURIComponent(uid)}/search`, compactSearchQuery(q));

export const facetSearch = (
  uid: string,
  body: {
    facetName: string;
    facetQuery?: string | null;
    q?: string | null;
    filter?: string;
    matchingStrategy?: SearchQuery['matchingStrategy'];
    exhaustiveFacetCount?: boolean | null;
  }
) =>
  meili<{ facetHits: { value: string; count: number }[]; processingTimeMs: number }>(
    'POST',
    `/indexes/${encodeURIComponent(uid)}/facet-search`,
    body
  );

export const similarDocuments = (
  uid: string,
  body: {
    id: string;
    embedder?: string;
    limit?: number;
    offset?: number;
    filter?: string;
    attributesToRetrieve?: string[];
    showRankingScore?: boolean;
  }
) => meili<SearchResult>('POST', `/indexes/${encodeURIComponent(uid)}/similar`, body);

export type MultiQuery = SearchQuery & { indexUid: string; federationOptions?: { weight?: number } };

export const multiSearch = (body: {
  queries: MultiQuery[];
  federation?: { limit?: number; offset?: number; facetsByIndex?: Record<string, string[]> } | null;
}) => meili<unknown>('POST', '/multi-search', body);
