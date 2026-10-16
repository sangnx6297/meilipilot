import type { SearchQuery } from './types';

/** Every POST /indexes/{uid}/search SearchQuery property (Meilisearch OpenAPI). */
export const SEARCH_QUERY_FIELDS = [
  'q',
  'offset',
  'limit',
  'page',
  'hitsPerPage',
  'attributesToRetrieve',
  'attributesToCrop',
  'cropLength',
  'cropMarker',
  'attributesToHighlight',
  'highlightPreTag',
  'highlightPostTag',
  'showMatchesPosition',
  'filter',
  'sort',
  'distinct',
  'facets',
  'matchingStrategy',
  'attributesToSearchOn',
  'rankingScoreThreshold',
  'locales',
  'hybrid',
  'vector',
  'retrieveVectors',
  'media',
  'personalize',
  'useNetwork',
  'showRankingScore',
  'showRankingScoreDetails',
  'showPerformanceDetails',
  'inlineRule'
] as const satisfies readonly (keyof SearchQuery)[];

type ListedSearchField = (typeof SEARCH_QUERY_FIELDS)[number];
type MissingSearchField = Exclude<keyof SearchQuery, ListedSearchField>;
const _allSearchQueryFields: MissingSearchField extends never ? true : MissingSearchField = true;
void _allSearchQueryFields;

export type SearchFormState = {
  q: string;
  offset: string;
  limit: string;
  hitsPerPage: string;
  page: string;
  filter: string;
  facets: string;
  attributesToRetrieve: string;
  attributesToCrop: string;
  cropLength: string;
  cropMarker: string;
  highlightAll: boolean;
  attributesToHighlight: string;
  highlightPreTag: string;
  highlightPostTag: string;
  showMatchesPosition: boolean;
  sort: string;
  matchingStrategy: SearchQuery['matchingStrategy'] | '';
  showRankingScore: boolean;
  showRankingScoreDetails: boolean;
  rankingScoreThreshold: string;
  attributesToSearchOn: string;
  hybridEmbedder: string;
  hybridSemanticRatio: string;
  vector: string;
  retrieveVectors: boolean;
  locales: string;
  distinct: string;
  showPerformanceDetails: boolean;
  mediaJson: string;
  personalizeUserContext: string;
  useNetwork: '' | 'true' | 'false';
  inlineRuleJson: string;
};

export const EMPTY_SEARCH_FORM: SearchFormState = {
  q: '',
  offset: '0',
  limit: '20',
  hitsPerPage: '',
  page: '',
  filter: '',
  facets: '',
  attributesToRetrieve: '',
  attributesToCrop: '',
  cropLength: '',
  cropMarker: '',
  highlightAll: true,
  attributesToHighlight: '',
  highlightPreTag: '',
  highlightPostTag: '',
  showMatchesPosition: false,
  sort: '',
  matchingStrategy: 'last',
  showRankingScore: true,
  showRankingScoreDetails: true,
  rankingScoreThreshold: '',
  attributesToSearchOn: '',
  hybridEmbedder: '',
  hybridSemanticRatio: '',
  vector: '',
  retrieveVectors: false,
  locales: '',
  distinct: '',
  showPerformanceDetails: false,
  mediaJson: '',
  personalizeUserContext: '',
  useNetwork: '',
  inlineRuleJson: ''
};

export function csvList(raw: string): string[] | undefined {
  const items = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

export function optInt(raw: string, field: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) throw new Error(`${field} phải là số nguyên`);
  return Math.trunc(n);
}

export function optNumber(raw: string, field: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) throw new Error(`${field} phải là số`);
  return n;
}

export function parseNumberList(raw: string, field: string): number[] | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const items = t
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);
  if (!items.length || items.some((n) => !Number.isFinite(n))) {
    throw new Error(`${field} phải là danh sách số, cách nhau bởi dấu phẩy`);
  }
  return items;
}

export function parseJsonObject(raw: string, field: string): Record<string, unknown> | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  let v: unknown;
  try {
    v = JSON.parse(t);
  } catch {
    throw new Error(`${field} phải là JSON object`);
  }
  if (v === null || typeof v !== 'object' || Array.isArray(v)) {
    throw new Error(`${field} phải là JSON object`);
  }
  return v as Record<string, unknown>;
}

export function parseFilterInput(raw: string): SearchQuery['filter'] | undefined {
  const filter = raw.trim();
  if (!filter) return undefined;
  if (filter.startsWith('[')) {
    try {
      const parsed = JSON.parse(filter) as unknown;
      if (Array.isArray(parsed)) return parsed as string[] | string[][];
    } catch {
      return filter;
    }
  }
  return filter;
}

export function parseSearchBody(raw: string): SearchQuery {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Search body phải là JSON object');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Search body phải là JSON object');
  }
  const source = parsed as Record<string, unknown>;
  const out: SearchQuery = {};
  for (const key of SEARCH_QUERY_FIELDS) {
    if (key in source) (out as Record<string, unknown>)[key] = source[key];
  }
  return out;
}

function csvOf(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value.map((item) => String(item)).join(', ');
}

export function queryToForm(query: SearchQuery): SearchFormState {
  const highlight = Array.isArray(query.attributesToHighlight) ? query.attributesToHighlight.map(String) : [];
  const highlightAll = highlight.length === 1 && highlight[0] === '*';
  const filter =
    query.filter == null ? '' : typeof query.filter === 'string' ? query.filter : JSON.stringify(query.filter);
  return {
    q: query.q ?? '',
    offset: query.offset == null ? '' : String(query.offset),
    limit: query.limit == null ? '' : String(query.limit),
    hitsPerPage: query.hitsPerPage == null ? '' : String(query.hitsPerPage),
    page: query.page == null ? '' : String(query.page),
    filter,
    facets: csvOf(query.facets),
    attributesToRetrieve: csvOf(query.attributesToRetrieve),
    attributesToCrop: csvOf(query.attributesToCrop),
    cropLength: query.cropLength == null ? '' : String(query.cropLength),
    cropMarker: query.cropMarker ?? '',
    highlightAll,
    attributesToHighlight: highlightAll ? '' : highlight.join(', '),
    highlightPreTag: query.highlightPreTag ?? '',
    highlightPostTag: query.highlightPostTag ?? '',
    showMatchesPosition: query.showMatchesPosition === true,
    sort: csvOf(query.sort),
    matchingStrategy: query.matchingStrategy ?? '',
    showRankingScore: query.showRankingScore === true,
    showRankingScoreDetails: query.showRankingScoreDetails === true,
    rankingScoreThreshold: query.rankingScoreThreshold == null ? '' : String(query.rankingScoreThreshold),
    attributesToSearchOn: csvOf(query.attributesToSearchOn),
    hybridEmbedder: query.hybrid?.embedder ?? '',
    hybridSemanticRatio: query.hybrid?.semanticRatio == null ? '' : String(query.hybrid.semanticRatio),
    vector: Array.isArray(query.vector) ? query.vector.join(', ') : '',
    retrieveVectors: query.retrieveVectors === true,
    locales: csvOf(query.locales),
    distinct: query.distinct ?? '',
    showPerformanceDetails: query.showPerformanceDetails === true,
    mediaJson: query.media ? JSON.stringify(query.media) : '',
    personalizeUserContext: query.personalize?.userContext ?? '',
    useNetwork: query.useNetwork === true ? 'true' : query.useNetwork === false ? 'false' : '',
    inlineRuleJson: query.inlineRule ? JSON.stringify(query.inlineRule) : ''
  };
}

export function formToSearchQuery(form: SearchFormState): SearchQuery {
  const q: SearchQuery = { q: form.q };

  const offset = optInt(form.offset, 'offset');
  if (offset !== undefined) q.offset = offset;
  const limit = optInt(form.limit, 'limit');
  if (limit !== undefined) q.limit = limit;
  const hitsPerPage = optInt(form.hitsPerPage, 'hitsPerPage');
  if (hitsPerPage !== undefined) q.hitsPerPage = hitsPerPage;
  const page = optInt(form.page, 'page');
  if (page !== undefined) q.page = page;

  const filter = parseFilterInput(form.filter);
  if (filter !== undefined) q.filter = filter;
  const facets = csvList(form.facets);
  if (facets) q.facets = facets;
  const attributesToRetrieve = csvList(form.attributesToRetrieve);
  if (attributesToRetrieve) q.attributesToRetrieve = attributesToRetrieve;
  const attributesToCrop = csvList(form.attributesToCrop);
  if (attributesToCrop) q.attributesToCrop = attributesToCrop;
  const cropLength = optInt(form.cropLength, 'cropLength');
  if (cropLength !== undefined) q.cropLength = cropLength;
  if (form.cropMarker !== '') q.cropMarker = form.cropMarker;
  const attributesToHighlight = csvList(form.attributesToHighlight);
  if (attributesToHighlight) q.attributesToHighlight = attributesToHighlight;
  else if (form.highlightAll) q.attributesToHighlight = ['*'];
  if (form.highlightPreTag !== '') q.highlightPreTag = form.highlightPreTag;
  if (form.highlightPostTag !== '') q.highlightPostTag = form.highlightPostTag;
  if (form.showMatchesPosition) q.showMatchesPosition = true;
  const sort = csvList(form.sort);
  if (sort) q.sort = sort;
  if (form.matchingStrategy) q.matchingStrategy = form.matchingStrategy;
  if (form.showRankingScore) {
    q.showRankingScore = true;
    q.showRankingScoreDetails = form.showRankingScoreDetails;
  }
  const rankingScoreThreshold = optNumber(form.rankingScoreThreshold, 'rankingScoreThreshold');
  if (rankingScoreThreshold !== undefined) q.rankingScoreThreshold = rankingScoreThreshold;
  const attributesToSearchOn = csvList(form.attributesToSearchOn);
  if (attributesToSearchOn) q.attributesToSearchOn = attributesToSearchOn;

  const embedder = form.hybridEmbedder.trim();
  if (embedder) {
    const semanticRatio = optNumber(form.hybridSemanticRatio, 'hybrid.semanticRatio');
    q.hybrid = {
      embedder,
      ...(semanticRatio !== undefined ? { semanticRatio } : {})
    };
  }
  const vector = parseNumberList(form.vector, 'vector');
  if (vector) q.vector = vector;
  if (form.retrieveVectors) q.retrieveVectors = true;
  const locales = csvList(form.locales);
  if (locales) q.locales = locales;
  const distinct = form.distinct.trim();
  if (distinct) q.distinct = distinct;
  if (form.showPerformanceDetails) q.showPerformanceDetails = true;

  const media = parseJsonObject(form.mediaJson, 'media');
  if (media) q.media = media;
  const userContext = form.personalizeUserContext.trim();
  if (userContext) q.personalize = { userContext };
  if (form.useNetwork === 'true') q.useNetwork = true;
  if (form.useNetwork === 'false') q.useNetwork = false;
  const inlineRule = parseJsonObject(form.inlineRuleJson, 'inlineRule');
  if (inlineRule) q.inlineRule = inlineRule;

  return q;
}
