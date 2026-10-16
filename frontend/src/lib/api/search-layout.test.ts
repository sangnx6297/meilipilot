import { describe, expect, it } from 'vitest';
import { searchTabs } from './search-layout';

const empty = {
  filterable: 0,
  sortable: 0,
  facets: 0,
  retrieve: 0,
  searchOn: 0,
  locales: 0,
  embedders: 0,
  media: false,
  filterText: '',
  sortText: '',
  facetText: '',
  distinctText: '',
  localeText: '',
  retrieveText: '',
  searchOnText: '',
  embedderText: '',
  mediaText: ''
};

describe('searchTabs', () => {
  it('hides sort, facet and vector tabs when the index has no setup', () => {
    expect(searchTabs(empty)).toEqual(['advanced', 'debug']);
  });

  it('shows only the groups that the index has configured', () => {
    expect(
      searchTabs({
        ...empty,
        filterable: 2,
        facets: 2,
        sortable: 0,
        retrieve: 3,
        embedders: 1
      })
    ).toEqual(['filter', 'facet', 'display', 'vector', 'advanced', 'debug']);
  });

  it('keeps a tab when the form already has a value', () => {
    expect(searchTabs({ ...empty, sortText: 'year:desc' })).toContain('filter');
  });
});
