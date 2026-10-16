import { SETTING_SLUGS, type SettingSlug } from './settings';
import type { Settings } from './types';

export type SettingEditor =
  | 'list'
  | 'ranking'
  | 'json'
  | 'string'
  | 'typo'
  | 'faceting'
  | 'pagination'
  | 'boolean'
  | 'select'
  | 'number'
  | 'chat';

export type SettingGroup = {
  slug: SettingSlug;
  field: keyof Settings;
  label: string;
  hint: string;
  editor: SettingEditor;
  options?: string[];
};

export const SETTING_GROUPS: SettingGroup[] = [
  { slug: 'displayed-attributes', field: 'displayedAttributes', label: 'Displayed attributes', hint: 'Field hiện trong hit. Mặc định *', editor: 'list' },
  { slug: 'searchable-attributes', field: 'searchableAttributes', label: 'Searchable attributes', hint: 'Field được search. Mặc định *', editor: 'list' },
  { slug: 'filterable-attributes', field: 'filterableAttributes', label: 'Filterable attributes', hint: 'JSON: string hoặc attributePatterns', editor: 'json' },
  { slug: 'sortable-attributes', field: 'sortableAttributes', label: 'Sortable attributes', hint: 'Field được sort', editor: 'list' },
  { slug: 'ranking-rules', field: 'rankingRules', label: 'Ranking rules', hint: 'Thứ tự xếp hạng, kéo lên/xuống', editor: 'ranking' },
  { slug: 'stop-words', field: 'stopWords', label: 'Stop words', hint: 'Từ bỏ qua khi search', editor: 'list' },
  { slug: 'synonyms', field: 'synonyms', label: 'Synonyms', hint: '{ "foo": ["bar"] }', editor: 'json' },
  { slug: 'distinct-attribute', field: 'distinctAttribute', label: 'Distinct attribute', hint: 'Một field, hoặc trống', editor: 'string' },
  { slug: 'typo-tolerance', field: 'typoTolerance', label: 'Typo tolerance', hint: 'Cho phép sai chính tả', editor: 'typo' },
  { slug: 'faceting', field: 'faceting', label: 'Faceting', hint: 'maxValuesPerFacet và sortFacetValuesBy', editor: 'faceting' },
  { slug: 'pagination', field: 'pagination', label: 'Pagination', hint: 'maxTotalHits', editor: 'pagination' },
  { slug: 'facet-search', field: 'facetSearch', label: 'Facet search', hint: 'Bật facet-search', editor: 'boolean' },
  { slug: 'prefix-search', field: 'prefixSearch', label: 'Prefix search', hint: 'indexingTime hoặc disabled', editor: 'select', options: ['indexingTime', 'disabled'] },
  { slug: 'separator-tokens', field: 'separatorTokens', label: 'Separator tokens', hint: 'Ký tự tách token', editor: 'list' },
  { slug: 'non-separator-tokens', field: 'nonSeparatorTokens', label: 'Non-separator tokens', hint: 'Ký tự không tách token', editor: 'list' },
  { slug: 'dictionary', field: 'dictionary', label: 'Dictionary', hint: 'Từ điển tách từ', editor: 'list' },
  { slug: 'proximity-precision', field: 'proximityPrecision', label: 'Proximity precision', hint: 'byWord hoặc byAttribute', editor: 'select', options: ['byWord', 'byAttribute'] },
  { slug: 'search-cutoff-ms', field: 'searchCutoffMs', label: 'Search cutoff (ms)', hint: 'Timeout search, trống = default', editor: 'number' },
  { slug: 'localized-attributes', field: 'localizedAttributes', label: 'Localized attributes', hint: 'JSON locales theo field', editor: 'json' },
  { slug: 'embedders', field: 'embedders', label: 'Embedders', hint: 'apiKey GET trả về redacted — đừng PATCH lại trừ khi set key mới', editor: 'json' },
  { slug: 'chat', field: 'chat', label: 'Chat', hint: 'Mô tả index cho chat + document template', editor: 'chat' },
  { slug: 'foreign-keys', field: 'foreignKeys', label: 'Foreign keys', hint: 'JSON quan hệ liên index', editor: 'json' }
];

if (SETTING_GROUPS.map((g) => g.slug).join() !== SETTING_SLUGS.join()) {
  throw new Error('SETTING_GROUPS must match SETTING_SLUGS order');
}

export type SettingCategory = {
  id: string;
  label: string;
  slugs: SettingSlug[];
};

export const SETTING_CATEGORIES: SettingCategory[] = [
  {
    id: 'attributes',
    label: 'Thuộc tính',
    slugs: [
      'displayed-attributes',
      'searchable-attributes',
      'filterable-attributes',
      'sortable-attributes',
      'distinct-attribute',
      'localized-attributes'
    ]
  },
  {
    id: 'ranking',
    label: 'Xếp hạng',
    slugs: ['ranking-rules', 'stop-words', 'synonyms', 'typo-tolerance', 'proximity-precision']
  },
  {
    id: 'facets',
    label: 'Facet',
    slugs: ['faceting', 'facet-search']
  },
  {
    id: 'search',
    label: 'Search',
    slugs: ['prefix-search', 'separator-tokens', 'non-separator-tokens', 'dictionary', 'search-cutoff-ms', 'pagination']
  },
  {
    id: 'advanced',
    label: 'Nâng cao',
    slugs: ['embedders', 'chat', 'foreign-keys']
  }
];

export function settingMenu(groups: SettingGroup[]) {
  const bySlug = new Map(groups.map((group) => [group.slug, group]));
  return SETTING_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    groups: category.slugs.flatMap((slug) => {
      const group = bySlug.get(slug);
      return group ? [group] : [];
    })
  })).filter((category) => category.groups.length > 0);
}

export function diffSettings(original: Settings, current: Settings): Partial<Settings> {
  const patch: Partial<Settings> = {};
  for (const key of Object.keys(current) as (keyof Settings)[]) {
    if (JSON.stringify(original[key]) !== JSON.stringify(current[key])) {
      (patch as Record<string, unknown>)[key] = current[key];
    }
  }
  return patch;
}

export function linesToList(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function listToLines(list: string[] | null | undefined): string {
  return (list ?? []).join('\n');
}

export type SynonymRow = { word: string; terms: string };
export type FilterableRow = { kind: 'name' | 'pattern'; text: string; facetSearch: boolean; raw?: unknown };
export type LocaleRow = { locales: string; patterns: string };
export type FacetSortRow = { attribute: string; order: 'alpha' | 'count' };
export type EmbedderRow = {
  name: string;
  source: string;
  model: string;
  url: string;
  apiKey: string;
  documentTemplate: string;
  dimensions: string;
  indexingSource: string;
  indexingModel: string;
  searchSource: string;
  searchModel: string;
};
export type ChatSearchFields = { limit: string; filter: string; attributes: string };

const splitCsv = (text: string) =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

export function synonymsToRows(value: Record<string, string[]> | null | undefined): SynonymRow[] {
  return Object.entries(value ?? {}).map(([word, terms]) => ({ word, terms: (terms ?? []).join(', ') }));
}

export function rowsToSynonyms(rows: SynonymRow[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const row of rows) {
    const word = row.word.trim();
    if (!word) continue;
    out[word] = splitCsv(row.terms);
  }
  return out;
}

export function filterableToRows(value: unknown[] | null | undefined): FilterableRow[] {
  return (value ?? []).map((item) => {
    if (typeof item === 'string') return { kind: 'name', text: item, facetSearch: false };
    if (item && typeof item === 'object' && Array.isArray((item as { attributePatterns?: unknown }).attributePatterns)) {
      const row = item as { attributePatterns: string[]; features?: { facetSearch?: boolean } };
      return {
        kind: 'pattern',
        text: row.attributePatterns.join(', '),
        facetSearch: row.features?.facetSearch === true,
        raw: item
      };
    }
    return { kind: 'name', text: '', facetSearch: false };
  });
}

export function rowsToFilterable(rows: FilterableRow[]): unknown[] {
  return rows.flatMap((row) => {
    if (row.kind === 'name') {
      const name = row.text.trim();
      return name ? [name] : [];
    }
    const attributePatterns = splitCsv(row.text);
    if (!attributePatterns.length) return [];
    const base =
      row.raw && typeof row.raw === 'object' ? { ...(row.raw as Record<string, unknown>) } : {};
    const features = {
      ...((base.features && typeof base.features === 'object' ? base.features : {}) as Record<string, unknown>)
    };
    if (row.facetSearch) features.facetSearch = true;
    else delete features.facetSearch;
    const out: Record<string, unknown> = { ...base, attributePatterns };
    if (Object.keys(features).length) out.features = features;
    else delete out.features;
    return [out];
  });
}

export function localizedToRows(value: unknown[] | null | undefined): LocaleRow[] {
  return (value ?? []).map((item) => {
    const row = (item ?? {}) as { locales?: string[]; attributePatterns?: string[] };
    return {
      locales: (row.locales ?? []).join(', '),
      patterns: (row.attributePatterns ?? []).join(', ')
    };
  });
}

export function rowsToLocalized(rows: LocaleRow[]): { locales: string[]; attributePatterns: string[] }[] {
  return rows.flatMap((row) => {
    const locales = splitCsv(row.locales);
    const attributePatterns = splitCsv(row.patterns);
    if (!locales.length && !attributePatterns.length) return [];
    return [{ locales, attributePatterns }];
  });
}

export function facetSortToRows(value: Record<string, string> | null | undefined): FacetSortRow[] {
  return Object.entries(value ?? {}).map(([attribute, order]) => ({
    attribute,
    order: order === 'count' ? 'count' : 'alpha'
  }));
}

export function rowsToFacetSort(rows: FacetSortRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const attribute = row.attribute.trim();
    if (!attribute) continue;
    out[attribute] = row.order === 'count' ? 'count' : 'alpha';
  }
  return out;
}

export function embeddersToRows(value: Record<string, unknown> | null | undefined): EmbedderRow[] {
  return Object.entries(value ?? {}).map(([name, raw]) => {
    const item = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const indexing = item.indexingEmbedder && typeof item.indexingEmbedder === 'object' ? (item.indexingEmbedder as Record<string, unknown>) : {};
    const search = item.searchEmbedder && typeof item.searchEmbedder === 'object' ? (item.searchEmbedder as Record<string, unknown>) : {};
    return {
      name,
      source: String(item.source ?? 'openAi'),
      model: String(item.model ?? ''),
      url: String(item.url ?? ''),
      apiKey: '',
      documentTemplate: String(item.documentTemplate ?? ''),
      dimensions: item.dimensions == null ? '' : String(item.dimensions),
      indexingSource: String(indexing.source ?? ''),
      indexingModel: String(indexing.model ?? ''),
      searchSource: String(search.source ?? ''),
      searchModel: String(search.model ?? '')
    };
  });
}

export function rowsToEmbedders(
  rows: EmbedderRow[],
  previous: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    const name = row.name.trim();
    if (!name) continue;
    const prior = previous?.[name];
    const base: Record<string, unknown> =
      prior && typeof prior === 'object' ? { ...(prior as Record<string, unknown>) } : {};
    delete base.apiKey;
    base.source = row.source;
    if (row.model.trim()) base.model = row.model.trim();
    else delete base.model;
    if (row.url.trim()) base.url = row.url.trim();
    else delete base.url;
    if (row.documentTemplate.trim()) base.documentTemplate = row.documentTemplate.trim();
    else delete base.documentTemplate;
    if (row.dimensions.trim()) base.dimensions = Number(row.dimensions);
    else delete base.dimensions;
    if (row.apiKey.trim()) base.apiKey = row.apiKey.trim();
    if (row.source === 'composite') {
      const indexing =
        base.indexingEmbedder && typeof base.indexingEmbedder === 'object'
          ? { ...(base.indexingEmbedder as Record<string, unknown>) }
          : {};
      const search =
        base.searchEmbedder && typeof base.searchEmbedder === 'object'
          ? { ...(base.searchEmbedder as Record<string, unknown>) }
          : {};
      indexing.source = row.indexingSource.trim();
      if (row.indexingModel.trim()) indexing.model = row.indexingModel.trim();
      search.source = row.searchSource.trim();
      if (row.searchModel.trim()) search.model = row.searchModel.trim();
      base.indexingEmbedder = indexing;
      base.searchEmbedder = search;
    }
    out[name] = base;
  }
  return out;
}

export function chatSearchFields(value: Record<string, unknown> | null | undefined): ChatSearchFields {
  const attributes = value?.attributesToRetrieve;
  return {
    limit: value?.limit == null ? '' : String(value.limit),
    filter: typeof value?.filter === 'string' ? value.filter : '',
    attributes: Array.isArray(attributes) ? attributes.map(String).join(', ') : ''
  };
}

export function applyChatSearchFields(
  current: Record<string, unknown> | null | undefined,
  fields: ChatSearchFields
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(current ?? {}) };
  if (fields.limit.trim() === '') delete next.limit;
  else next.limit = Number(fields.limit);
  if (!fields.filter.trim()) {
    if (typeof current?.filter === 'string') delete next.filter;
  } else next.filter = fields.filter.trim();
  const attributes = splitCsv(fields.attributes);
  if (!attributes.length) delete next.attributesToRetrieve;
  else next.attributesToRetrieve = attributes;
  return next;
}

export function compactStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).map((item) => item.trim()).filter(Boolean);
}
