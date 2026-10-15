import { describe, it, expect } from 'vitest';
import type { Settings } from './types';
import { SETTING_SLUGS } from './settings';
import { SETTING_GROUPS, diffSettings, linesToList, listToLines } from './settings-form';

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

describe('list helpers', () => {
  it('parses lines and drops blanks', () => {
    expect(linesToList('title\n\n year \n')).toEqual(['title', 'year']);
  });

  it('serializes list to lines', () => {
    expect(listToLines(['a', 'b'])).toBe('a\nb');
    expect(listToLines(null)).toBe('');
  });
});
