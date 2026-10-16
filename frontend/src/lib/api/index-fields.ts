export type IndexField = {
  name: string;
  displayed?: { enabled?: boolean };
  searchable?: { enabled?: boolean };
  sortable?: { enabled?: boolean };
  distinct?: { enabled?: boolean };
  rankingRule?: { enabled?: boolean; order?: string[] };
  filterable?: {
    enabled?: boolean;
    sortBy?: string;
    facetSearch?: boolean;
    equality?: boolean;
    comparison?: boolean;
  };
  localized?: { locales?: string[] };
};

export type IndexFieldPage = {
  results: IndexField[];
  offset: number;
  limit: number;
  total: number;
};

export function asFieldPage(raw: unknown): IndexFieldPage {
  if (!raw || typeof raw !== 'object') return { results: [], offset: 0, limit: 0, total: 0 };
  const page = raw as Partial<IndexFieldPage>;
  const results = Array.isArray(page.results)
    ? page.results.filter((item): item is IndexField => !!item && typeof item.name === 'string' && item.name.trim() !== '')
    : [];
  return {
    results,
    offset: typeof page.offset === 'number' ? page.offset : 0,
    limit: typeof page.limit === 'number' ? page.limit : results.length,
    total: typeof page.total === 'number' ? page.total : results.length
  };
}
