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
