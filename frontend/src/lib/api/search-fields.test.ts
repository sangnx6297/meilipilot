import { describe, expect, it } from 'vitest';
import type { IndexField } from './index-fields';
import { asFieldPage } from './index-fields';
import {
  appendFilter,
  appendSort,
  buildSearchCatalog,
  facetsForQuery,
  fieldsFromFallback,
  filterClause,
  opsForField,
  toggleFilter
} from './search-fields';
import type { Settings } from './types';

const title: IndexField = {
  name: 'title',
  displayed: { enabled: true },
  searchable: { enabled: true },
  sortable: { enabled: false },
  filterable: { enabled: false, equality: false, comparison: false },
  localized: { locales: ['en'] }
};

const year: IndexField = {
  name: 'year',
  displayed: { enabled: true },
  searchable: { enabled: false },
  sortable: { enabled: true },
  filterable: { enabled: true, equality: true, comparison: true },
  localized: { locales: [] }
};

describe('buildSearchCatalog', () => {
  it('groups fields by capability', () => {
    const catalog = buildSearchCatalog([title, year]);
    expect(catalog.retrieve).toEqual(['title', 'year']);
    expect(catalog.searchOn).toEqual(['title']);
    expect(catalog.sortable).toEqual(['year']);
    expect(catalog.facets).toEqual(['year']);
    const blocked: IndexField = {
      name: 'secret',
      filterable: { enabled: true, equality: false, comparison: false }
    };
    expect(buildSearchCatalog([blocked]).facets).toEqual([]);
    expect(catalog.locales).toEqual(['en']);
  });
});

describe('filterClause', () => {
  it('quotes strings, leaves numbers, and builds IN, TO, EXISTS', () => {
    expect(filterClause({ attr: 'genres', op: '=', value: 'action', valueTo: '' })).toBe('genres = "action"');
    expect(filterClause({ attr: 'year', op: '>=', value: '2000', valueTo: '' })).toBe('year >= 2000');
    expect(filterClause({ attr: 'genres', op: 'IN', value: 'action, drama', valueTo: '' })).toBe(
      'genres IN ["action", "drama"]'
    );
    expect(filterClause({ attr: 'year', op: 'TO', value: '2000', valueTo: '2020' })).toBe('year 2000 TO 2020');
    expect(filterClause({ attr: 'overview', op: 'EXISTS', value: '', valueTo: '' })).toBe('overview EXISTS');
    expect(filterClause({ attr: 'tên', op: 'CONTAINS', value: 'áo', valueTo: '' })).toBe('"tên" CONTAINS "áo"');
  });

  it('appends with AND and replaces the same sort attribute', () => {
    expect(appendFilter('year >= 2000', 'genres = "action"', 'AND')).toBe('year >= 2000 AND genres = "action"');
    expect(appendSort('year:asc, title:asc', 'year', 'desc')).toBe('title:asc, year:desc');
  });

  it('toggles a facet clause and fills facets from settings when the form is empty', () => {
    expect(toggleFilter('', 'genres = "action"')).toBe('genres = "action"');
    expect(toggleFilter('genres = "action" AND year >= 2000', 'genres = "action"')).toBe('year >= 2000');
    expect(facetsForQuery(undefined, ['genres', 'year'])).toEqual(['genres', 'year']);
    expect(facetsForQuery(['year'], ['genres', 'year'])).toEqual(['year']);
    expect(facetsForQuery(undefined, [])).toBeUndefined();
  });
});

describe('opsForField', () => {
  it('hides comparison and contains when the field does not allow them', () => {
    expect(opsForField({ ...year, filterable: { enabled: true, equality: true, comparison: false } }, false)).not.toContain(
      '>'
    );
    expect(opsForField(year, false)).not.toContain('CONTAINS');
    expect(opsForField(year, true)).toContain('CONTAINS');
  });
});

describe('fieldsFromFallback', () => {
  it('marks filterable and sortable from settings when /fields is empty', () => {
    const settings = {
      displayedAttributes: ['*'],
      searchableAttributes: ['title'],
      filterableAttributes: ['year', { attributePatterns: ['genre*'] }],
      sortableAttributes: ['year'],
      localizedAttributes: [{ locales: ['vi'], attributePatterns: ['title'] }],
      distinctAttribute: 'year'
    } as Settings;
    const fields = fieldsFromFallback(['title', 'year', 'genres'], settings);
    const byName = Object.fromEntries(fields.map((field) => [field.name, field]));
    expect(byName.title.searchable?.enabled).toBe(true);
    expect(byName.year.searchable?.enabled).toBe(false);
    expect(byName.year.filterable?.enabled).toBe(true);
    expect(byName.year.sortable?.enabled).toBe(true);
    expect(byName.genres.filterable?.enabled).toBe(true);
    expect(byName.title.localized?.locales).toEqual(['vi']);
  });
});

describe('asFieldPage', () => {
  it('drops rows without a name', () => {
    expect(asFieldPage({ results: [{ name: 'title' }, { displayed: {} }, null], total: 3 }).results).toEqual([
      { name: 'title' }
    ]);
  });
});
