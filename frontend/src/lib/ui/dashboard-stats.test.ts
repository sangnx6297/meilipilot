import { describe, it, expect } from 'vitest';
import type { InstanceStats } from '../api/types';
import {
  formatBytes,
  formatByteLabel,
  formatLastUpdate,
  indexChartBars,
  indexStorageRows,
  parsePrometheus,
  summarizeMetrics,
  summarizeStats
} from './dashboard-stats';

const sample: InstanceStats = {
  databaseSize: 1130496,
  usedDatabaseSize: 456000,
  lastUpdate: '2026-10-15T07:00:00.000Z',
  indexes: {
    movies: {
      numberOfDocuments: 31944,
      isIndexing: false,
      fieldDistribution: { title: 31944 },
      indexSize: 800000,
      usedIndexSize: 400000,
      numberOfEmbeddings: 100
    },
    books: {
      numberOfDocuments: 12,
      isIndexing: true,
      fieldDistribution: {},
      indexSize: 20000,
      usedIndexSize: 15000
    }
  }
};

describe('formatBytes', () => {
  it('formats SI-ish binary sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(567)).toBe('567 B');
    expect(formatBytes(1130496)).toBe('1.1 MB');
    expect(formatBytes(456)).toBe('456 B');
    expect(formatBytes(4836487168)).toBe('4.5 GB');
    expect(formatBytes(undefined)).toBe('—');
    expect(formatBytes(null)).toBe('—');
  });

  it('keeps the exact byte count next to the human size', () => {
    expect(formatByteLabel(4836487168)).toBe('4.5 GB (4,836,487,168 bytes)');
    expect(formatByteLabel(null)).toBe('—');
  });
});

describe('formatLastUpdate', () => {
  it('uses relative Vietnamese labels', () => {
    const now = Date.parse('2026-10-15T07:00:10.000Z');
    expect(formatLastUpdate(null, now)).toBe('—');
    expect(formatLastUpdate('2026-10-15T07:00:00.000Z', now)).toBe('10s trước');
    expect(formatLastUpdate('2026-10-15T06:50:00.000Z', now)).toBe('10 phút trước');
  });
});

describe('summarizeStats', () => {
  it('rolls up storage, docs, and indexing', () => {
    const s = summarizeStats(sample);
    expect(s.indexCount).toBe(2);
    expect(s.documentCount).toBe(31956);
    expect(s.indexingCount).toBe(1);
    expect(s.databaseSize).toBe(1130496);
    expect(s.usedDatabaseSize).toBe(456000);
    expect(s.reclaimable).toBe(1130496 - 456000);
    expect(s.usedPct).toBeCloseTo((456000 / 1130496) * 100);
  });

  it('hides reclaimable when used size is missing', () => {
    const s = summarizeStats({ databaseSize: 100, lastUpdate: null, indexes: {} });
    expect(s.usedDatabaseSize).toBeNull();
    expect(s.reclaimable).toBeNull();
    expect(s.usedPct).toBeNull();
  });
});

describe('indexStorageRows', () => {
  it('sorts by index size descending and computes reclaimable', () => {
    const rows = indexStorageRows(sample);
    expect(rows.map((r) => r.uid)).toEqual(['movies', 'books']);
    expect(rows[0].reclaimable).toBe(400000);
    expect(rows[0].embeddings).toBe(100);
    expect(rows[1].isIndexing).toBe(true);
  });
});

describe('indexChartBars', () => {
  it('scales docs bars to the largest index', () => {
    const bars = indexChartBars(indexStorageRows(sample), 'docs');
    expect(bars.map((b) => b.uid)).toEqual(['movies', 'books']);
    expect(bars[0].pct).toBe(100);
    expect(bars[1].pct).toBeCloseTo((12 / 31944) * 100);
    expect(bars[0].label).toBe('31,944');
  });

  it('uses index size and folds overflow into others', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      uid: `i${i}`,
      docs: 0,
      isIndexing: false,
      indexSize: (12 - i) * 100,
      usedIndexSize: 10,
      reclaimable: (12 - i) * 100 - 10,
      embeddings: null
    }));
    const bars = indexChartBars(many, 'size', 3);
    expect(bars).toHaveLength(4);
    expect(bars[0].uid).toBe('i0');
    expect(bars[3].uid).toBe('(others)');
    expect(bars[3].value).toBe(4500);
    expect(bars[3].pct).toBe(100);
    expect(bars[0].pct).toBeCloseTo((1200 / 4500) * 100);
  });
});

const prom = `
# HELP meilisearch_is_indexing Meilisearch is indexing
# TYPE meilisearch_is_indexing gauge
meilisearch_is_indexing 1
meilisearch_searches_running 3
meilisearch_searches_waiting_to_be_processed 2
meilisearch_search_queue_size 1000
meilisearch_task_queue_latency_seconds 4.5
meilisearch_nb_tasks{kind="statuses",value="enqueued"} 7
meilisearch_nb_tasks{kind="statuses",value="processing"} 1
meilisearch_nb_tasks{kind="statuses",value="failed"} 2
meilisearch_http_requests_total{method="GET",path="/health",status="200"} 10
meilisearch_http_requests_total{method="POST",path="/indexes/{index_uid}/search",status="200"} 5
meilisearch_degraded_search_requests 1
`;

describe('parsePrometheus + summarizeMetrics', () => {
  it('reads gauges, labeled tasks, and HTTP totals', () => {
    const m = summarizeMetrics(parsePrometheus(prom));
    expect(m.isIndexing).toBe(true);
    expect(m.searchesRunning).toBe(3);
    expect(m.searchesWaiting).toBe(2);
    expect(m.searchQueueSize).toBe(1000);
    expect(m.taskQueueLatencySec).toBe(4.5);
    expect(m.tasksEnqueued).toBe(7);
    expect(m.tasksProcessing).toBe(1);
    expect(m.tasksFailed).toBe(2);
    expect(m.httpRequests).toBe(15);
    expect(m.degradedSearches).toBe(1);
  });
});
