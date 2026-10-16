import { describe, it, expect } from 'vitest';
import type { Settings } from './types';
import { SETTING_SLUGS } from './settings';
import {
  SETTING_CATEGORIES,
  SETTING_GROUPS,
  applyChatSearchFields,
  chatSearchFields,
  compactStringList,
  diffSettings,
  embeddersToRows,
  filterableToRows,
  linesToList,
  listToLines,
  localizedToRows,
  rowsToEmbedders,
  rowsToFacetSort,
  rowsToFilterable,
  rowsToLocalized,
  rowsToSynonyms,
  synonymsToRows
} from './settings-form';

const base = (): Settings => ({
  displayedAttributes: ['*'],
  searchableAttributes: ['*'],
  filterableAttributes: [],
  sortableAttributes: [],
  foreignKeys: [],
  rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
  stopWords: [],
  nonSeparatorTokens: [],
  separatorTokens: [],
  dictionary: [],
  synonyms: {},
  distinctAttribute: null,
  proximityPrecision: 'byWord',
  typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 5, twoTypos: 9 } },
  faceting: { maxValuesPerFacet: 100, sortFacetValuesBy: { '*': 'alpha' } },
  pagination: { maxTotalHits: 1000 },
  embedders: {},
  searchCutoffMs: null,
  localizedAttributes: [],
  facetSearch: true,
  prefixSearch: 'indexingTime',
  chat: { description: '', documentTemplate: '' }
});

describe('SETTING_GROUPS', () => {
  it('covers every setting slug exactly once', () => {
    const slugs = SETTING_GROUPS.map((g) => g.slug);
    expect(slugs).toEqual([...SETTING_SLUGS]);
  });
});

describe('SETTING_CATEGORIES', () => {
  it('covers every settings slug once', () => {
    const slugs = SETTING_CATEGORIES.flatMap((category) => category.slugs);
    expect([...slugs].sort()).toEqual([...SETTING_SLUGS].sort());
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('diffSettings', () => {
  it('returns empty patch when nothing changed', () => {
    const a = base();
    expect(diffSettings(a, structuredClone(a))).toEqual({});
  });

  it('PATCHes only dirty fields', () => {
    const original = base();
    const current = structuredClone(original);
    current.stopWords = ['the'];
    current.searchCutoffMs = 50;
    expect(diffSettings(original, current)).toEqual({
      stopWords: ['the'],
      searchCutoffMs: 50
    });
  });

  it('detects nested typoTolerance change', () => {
    const original = base();
    const current = structuredClone(original);
    current.typoTolerance = { ...current.typoTolerance, enabled: false };
    expect(diffSettings(original, current)).toEqual({
      typoTolerance: { enabled: false, minWordSizeForTypos: { oneTypo: 5, twoTypos: 9 } }
    });
  });
});

describe('form rows', () => {
  it('round-trips synonyms, filterable attributes, and locales', () => {
    expect(rowsToSynonyms(synonymsToRows({ car: ['auto', 'vehicle'] }))).toEqual({ car: ['auto', 'vehicle'] });
    expect(
      rowsToFilterable(
        filterableToRows(['genre', { attributePatterns: ['price_*'], features: { facetSearch: true } }])
      )
    ).toEqual(['genre', { attributePatterns: ['price_*'], features: { facetSearch: true } }]);
    expect(rowsToLocalized(localizedToRows([{ locales: ['jpn'], attributePatterns: ['*_ja'] }]))).toEqual([
      { locales: ['jpn'], attributePatterns: ['*_ja'] }
    ]);
  });

  it('builds facet sort and chat search fields without dropping other search keys', () => {
    expect(rowsToFacetSort([{ attribute: '*', order: 'alpha' }, { attribute: 'genre', order: 'count' }])).toEqual({
      '*': 'alpha',
      genre: 'count'
    });
    expect(applyChatSearchFields({ q: 'kept', limit: 5 }, chatSearchFields({ q: 'kept', limit: 20 }))).toEqual({
      q: 'kept',
      limit: 20
    });
  });

  it('keeps an existing embedder apiKey out of the form until a new key is typed', () => {
    const rows = embeddersToRows({ main: { source: 'openAi', model: 'small', apiKey: 'secret' } });
    expect(rows[0].apiKey).toBe('');
    expect(rowsToEmbedders(rows, { main: { source: 'openAi', model: 'small', apiKey: 'secret' } }).main).toEqual({
      source: 'openAi',
      model: 'small'
    });
    rows[0].apiKey = 'new-key';
    expect((rowsToEmbedders(rows, { main: { apiKey: 'secret' } }).main as { apiKey: string }).apiKey).toBe('new-key');
  });

  it('drops blank list entries', () => {
    expect(compactStringList([' title ', '', 'year'])).toEqual(['title', 'year']);
  });
});

describe('list helpers', () => {
  it('parses lines and drops blanks', () => {
    expect(linesToList('title\n\n year \n')).toEqual(['title', 'year']);
  });

  it('serializes list to lines', () => {
    expect(listToLines(['a', 'b'])).toBe('a\nb');
    expect(listToLines(null)).toBe('');
  });
});
