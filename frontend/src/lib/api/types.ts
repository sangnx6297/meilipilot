export type IndexView = {
  uid: string;
  createdAt: string;
  updatedAt: string;
  primaryKey: string | null;
};

export type Pagination<T> = {
  results: T[];
  offset: number;
  limit: number;
  total: number;
};

export type TaskStatus = 'enqueued' | 'processing' | 'succeeded' | 'failed' | 'canceled';

export type TaskKind =
  | 'documentAdditionOrUpdate'
  | 'documentEdition'
  | 'documentDeletion'
  | 'settingsUpdate'
  | 'indexCreation'
  | 'indexDeletion'
  | 'indexUpdate'
  | 'indexSwap'
  | 'taskCancelation'
  | 'taskDeletion'
  | 'dumpCreation'
  | 'snapshotCreation'
  | 'export'
  | 'upgradeDatabase'
  | 'indexCompaction'
  | 'networkTopologyChange'
  | 'dsrUpdate'
  | 'dsrClear';

export type SummarizedTaskView = {
  taskUid: number;
  indexUid: string | null;
  status: TaskStatus;
  type: TaskKind;
  enqueuedAt: string;
  customMetadata?: string | null;
};

export type TaskView = {
  uid: number;
  batchUid: number | null;
  indexUid: string | null;
  status: TaskStatus;
  type: TaskKind;
  canceledBy: number | null;
  details: Record<string, unknown> | null;
  error: { message: string; code: string; type: string; link: string } | null;
  duration: string | null;
  enqueuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  customMetadata?: string | null;
};

export type BatchView = {
  uid: number;
  progress: {
    percentage: number;
    steps: { currentStep: string; finished: number; total: number }[];
  } | null;
  details: Record<string, unknown>;
  stats?: { totalNbTasks?: number; status?: Record<string, number>; types?: Record<string, number> };
  duration: string | null;
  startedAt?: string;
  finishedAt?: string | null;
};

export type AllBatches = {
  results: BatchView[];
  total: number;
  limit: number;
  from: number | null;
  next: number | null;
};

export type MatchingStrategy = 'last' | 'all' | 'frequency';

export type SearchQuery = {
  q?: string | null;
  offset?: number;
  limit?: number;
  page?: number | null;
  hitsPerPage?: number | null;
  attributesToRetrieve?: string[] | null;
  attributesToCrop?: string[] | null;
  cropLength?: number;
  cropMarker?: string;
  attributesToHighlight?: string[] | null;
  highlightPreTag?: string;
  highlightPostTag?: string;
  showMatchesPosition?: boolean;
  filter?: string | string[] | string[][];
  sort?: string[] | null;
  distinct?: string | null;
  facets?: string[] | null;
  matchingStrategy?: MatchingStrategy;
  attributesToSearchOn?: string[] | null;
  rankingScoreThreshold?: number | null;
  locales?: string[] | null;
  hybrid?: { embedder?: string; semanticRatio?: number } | null;
  vector?: number[] | null;
  retrieveVectors?: boolean;
  showRankingScore?: boolean;
  showRankingScoreDetails?: boolean;
  showPerformanceDetails?: boolean;
  media?: Record<string, unknown>;
  personalize?: { userContext: string };
  useNetwork?: boolean | null;
  inlineRule?: Record<string, unknown>;
};

export type SearchResult = {
  hits: Record<string, unknown>[];
  offset?: number;
  limit?: number;
  estimatedTotalHits?: number;
  totalHits?: number;
  totalPages?: number;
  page?: number;
  hitsPerPage?: number;
  processingTimeMs: number;
  query: string;
  facetDistribution?: Record<string, Record<string, number>>;
  facetStats?: Record<string, { min: number; max: number }>;
  performanceDetails?: Record<string, unknown>;
};

export type KeyAction =
  | '*'
  | 'search'
  | 'documents.*'
  | 'documents.add'
  | 'documents.get'
  | 'documents.delete'
  | 'indexes.*'
  | 'indexes.create'
  | 'indexes.get'
  | 'indexes.update'
  | 'indexes.delete'
  | 'indexes.swap'
  | 'indexes.compact'
  | 'tasks.*'
  | 'tasks.cancel'
  | 'tasks.delete'
  | 'tasks.get'
  | 'tasks.compact'
  | 'settings.*'
  | 'settings.get'
  | 'settings.update'
  | 'stats.*'
  | 'stats.get'
  | 'metrics.*'
  | 'metrics.get'
  | 'dumps.*'
  | 'dumps.create'
  | 'snapshots.*'
  | 'snapshots.create'
  | 'version'
  | 'keys.create'
  | 'keys.get'
  | 'keys.update'
  | 'keys.delete'
  | 'experimental.get'
  | 'experimental.update'
  | 'export'
  | 'network.get'
  | 'network.update'
  | 'chatCompletions'
  | 'chats.*'
  | 'chats.get'
  | 'chats.delete'
  | 'chatsSettings.*'
  | 'chatsSettings.get'
  | 'chatsSettings.update'
  | '*.get'
  | 'webhooks.get'
  | 'webhooks.update'
  | 'webhooks.delete'
  | 'webhooks.create'
  | 'webhooks.*'
  | 'fields.post'
  | 'dynamicSearchRules.get'
  | 'dynamicSearchRules.create'
  | 'dynamicSearchRules.update'
  | 'dynamicSearchRules.delete'
  | 'dynamicSearchRules.*';

export type KeyView = {
  name: string | null;
  description: string | null;
  key: string;
  uid: string;
  actions: KeyAction[];
  indexes: string[];
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateApiKey = {
  name?: string | null;
  description?: string | null;
  uid?: string | null;
  actions: KeyAction[];
  indexes: string[];
  expiresAt?: string | null;
};

export type Settings = {
  displayedAttributes: string[] | null;
  searchableAttributes: string[] | null;
  filterableAttributes: unknown[] | null;
  sortableAttributes: string[] | null;
  foreignKeys: unknown[] | null;
  rankingRules: string[] | null;
  stopWords: string[] | null;
  nonSeparatorTokens: string[] | null;
  separatorTokens: string[] | null;
  dictionary: string[] | null;
  synonyms: Record<string, string[]> | null;
  distinctAttribute: string | null;
  proximityPrecision: string | null;
  typoTolerance: {
    enabled?: boolean | null;
    minWordSizeForTypos?: { oneTypo?: number; twoTypos?: number } | null;
    disableOnWords?: string[] | null;
    disableOnAttributes?: string[] | null;
    disableOnNumbers?: boolean | null;
  } | null;
  faceting: { maxValuesPerFacet?: number | null; sortFacetValuesBy?: Record<string, string> | null } | null;
  pagination: { maxTotalHits?: number | null } | null;
  embedders: Record<string, unknown> | null;
  searchCutoffMs: number | null;
  localizedAttributes: unknown[] | null;
  facetSearch: boolean | null;
  prefixSearch: string | null;
  chat: {
    description?: string | null;
    documentTemplate?: string | null;
    documentTemplateMaxBytes?: number | null;
    searchParameters?: Record<string, unknown> | null;
  } | null;
};

export type IndexStats = {
  numberOfDocuments: number;
  isIndexing: boolean;
  fieldDistribution: Record<string, number>;
  indexSize?: number;
  usedIndexSize?: number;
  rawDocumentDbSize?: number;
  avgDocumentSize?: number;
  numberOfEmbeddings?: number | null;
  numberOfEmbeddedDocuments?: number | null;
};

export type InstanceStats = {
  databaseSize: number;
  usedDatabaseSize?: number;
  lastUpdate: string | null;
  indexes: Record<string, IndexStats>;
};

export type VersionResponse = {
  commitSha: string;
  commitDate: string;
  pkgVersion: string;
};
