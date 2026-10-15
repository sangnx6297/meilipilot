import { describe, it, expect } from 'vitest';
import { compactSearchQuery } from './search';

describe('compactSearchQuery', () => {
  it('drops empty optional fields but keeps q empty string as placeholder search', () => {
    expect(compactSearchQuery({ q: '', limit: 20, filter: '', sort: [], hybrid: null })).toEqual({
      q: '',
      limit: 20
    });
  });

  it('keeps matchingStrategy and facets', () => {
    expect(
      compactSearchQuery({
        q: 'ninja',
        matchingStrategy: 'all',
        facets: ['genres'],
        showRankingScore: true
      })
    ).toEqual({
      q: 'ninja',
      matchingStrategy: 'all',
      facets: ['genres'],
      showRankingScore: true
    });
  });
});
