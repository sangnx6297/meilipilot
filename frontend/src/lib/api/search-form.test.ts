import { describe, it, expect } from 'vitest';
import {
  EMPTY_SEARCH_FORM,
  SEARCH_QUERY_FIELDS,
  csvList,
  formToSearchQuery,
  type SearchFormState
} from './search-form';

const filled = (): SearchFormState => ({
  q: 'ninja',
  offset: '10',
  limit: '5',
  hitsPerPage: '8',
  page: '2',
  filter: 'genres = action',
  facets: 'genres, year',
  attributesToRetrieve: 'id, title',
  attributesToCrop: 'overview',
  cropLength: '12',
  cropMarker: '...',
  highlightAll: false,
  attributesToHighlight: 'title, overview',
  highlightPreTag: '<mark>',
  highlightPostTag: '</mark>',
  showMatchesPosition: true,
  sort: 'year:desc',
  matchingStrategy: 'all',
  showRankingScore: true,
  showRankingScoreDetails: true,
  rankingScoreThreshold: '0.2',
  attributesToSearchOn: 'title',
  hybridEmbedder: 'default',
  hybridSemanticRatio: '0.7',
  vector: '0.1, 0.2, 0.3',
  retrieveVectors: true,
  locales: 'en, vi',
  distinct: 'product_id',
  showPerformanceDetails: true,
  mediaJson: '{"image":{"url":"https://x"}}',
  personalizeUserContext: 'likes action movies',
  useNetwork: 'true',
  inlineRuleJson: '{"uid":"boost-action"}'
});

describe('SEARCH_QUERY_FIELDS', () => {
  it('lists every SearchQuery key exactly once', () => {
    expect([...SEARCH_QUERY_FIELDS].sort()).toEqual([...SEARCH_QUERY_FIELDS].sort());
    expect(new Set(SEARCH_QUERY_FIELDS).size).toBe(SEARCH_QUERY_FIELDS.length);
  });
});

describe('csvList', () => {
  it('splits and trims, drops empty', () => {
    expect(csvList(' a, b , ,c ')).toEqual(['a', 'b', 'c']);
    expect(csvList('  ')).toBeUndefined();
  });
});

describe('formToSearchQuery', () => {
  it('default form still sends q, pagination, ranking, highlight *', () => {
    expect(formToSearchQuery({ ...EMPTY_SEARCH_FORM })).toEqual({
      q: '',
      offset: 0,
      limit: 20,
      attributesToHighlight: ['*'],
      matchingStrategy: 'last',
      showRankingScore: true,
      showRankingScoreDetails: true
    });
  });

  it('emits every SearchQuery field when the form is fully filled', () => {
    const q = formToSearchQuery(filled());
    expect(Object.keys(q).sort()).toEqual([...SEARCH_QUERY_FIELDS].sort());
    expect(q).toEqual({
      q: 'ninja',
      offset: 10,
      limit: 5,
      hitsPerPage: 8,
      page: 2,
      filter: 'genres = action',
      facets: ['genres', 'year'],
      attributesToRetrieve: ['id', 'title'],
      attributesToCrop: ['overview'],
      cropLength: 12,
      cropMarker: '...',
      attributesToHighlight: ['title', 'overview'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
      showMatchesPosition: true,
      sort: ['year:desc'],
      matchingStrategy: 'all',
      showRankingScore: true,
      showRankingScoreDetails: true,
      rankingScoreThreshold: 0.2,
      attributesToSearchOn: ['title'],
      hybrid: { embedder: 'default', semanticRatio: 0.7 },
      vector: [0.1, 0.2, 0.3],
      retrieveVectors: true,
      locales: ['en', 'vi'],
      distinct: 'product_id',
      showPerformanceDetails: true,
      media: { image: { url: 'https://x' } },
      personalize: { userContext: 'likes action movies' },
      useNetwork: true,
      inlineRule: { uid: 'boost-action' }
    });
  });

  it('omits ranking details when score is off, and highlight * when unchecked', () => {
    const q = formToSearchQuery({
      ...EMPTY_SEARCH_FORM,
      showRankingScore: false,
      showRankingScoreDetails: true,
      highlightAll: false,
      matchingStrategy: ''
    });
    expect(q.showRankingScore).toBeUndefined();
    expect(q.showRankingScoreDetails).toBeUndefined();
    expect(q.attributesToHighlight).toBeUndefined();
    expect(q.matchingStrategy).toBeUndefined();
  });

  it('rejects invalid JSON and vector lists', () => {
    expect(() => formToSearchQuery({ ...EMPTY_SEARCH_FORM, mediaJson: '[' })).toThrow(/media/);
    expect(() => formToSearchQuery({ ...EMPTY_SEARCH_FORM, vector: 'a,b' })).toThrow(/vector/);
    expect(() => formToSearchQuery({ ...EMPTY_SEARCH_FORM, limit: 'x' })).toThrow(/limit/);
  });

  it('sends useNetwork false explicitly', () => {
    expect(formToSearchQuery({ ...EMPTY_SEARCH_FORM, useNetwork: 'false' }).useNetwork).toBe(false);
  });
});
