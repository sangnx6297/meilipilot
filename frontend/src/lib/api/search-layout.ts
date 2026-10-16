export const SEARCH_TAB_LABELS = {
  filter: 'Lọc',
  facet: 'Facet',
  display: 'Hiển thị',
  vector: 'Vector',
  advanced: 'Nâng cao',
  debug: 'Debug'
} as const;

export type SearchTab = keyof typeof SEARCH_TAB_LABELS;

export type SearchTabInput = {
  filterable: number;
  sortable: number;
  facets: number;
  retrieve: number;
  searchOn: number;
  locales: number;
  embedders: number;
  media: boolean;
  filterText: string;
  sortText: string;
  facetText: string;
  distinctText: string;
  localeText: string;
  retrieveText: string;
  searchOnText: string;
  embedderText: string;
  mediaText: string;
};

function filled(value: string): boolean {
  return value.trim() !== '';
}

export function searchTabs(input: SearchTabInput): SearchTab[] {
  const tabs: SearchTab[] = [];
  if (input.filterable > 0 || input.sortable > 0 || filled(input.filterText) || filled(input.sortText)) tabs.push('filter');
  if (input.facets > 0 || filled(input.facetText)) tabs.push('facet');
  if (
    input.retrieve > 0 ||
    input.searchOn > 0 ||
    input.locales > 0 ||
    filled(input.distinctText) ||
    filled(input.localeText) ||
    filled(input.retrieveText) ||
    filled(input.searchOnText)
  ) {
    tabs.push('display');
  }
  if (input.embedders > 0 || input.media || filled(input.embedderText) || filled(input.mediaText)) tabs.push('vector');
  tabs.push('advanced', 'debug');
  return tabs;
}
