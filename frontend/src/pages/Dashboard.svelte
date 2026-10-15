<script lang="ts">
  import { onMount } from 'svelte';
  import { MeiliError, meili } from '../lib/api/client';
  import { getMetrics } from '../lib/api/instance';
  import type { InstanceStats, VersionResponse } from '../lib/api/types';
  import EmptyState from '../lib/ui/EmptyState.svelte';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import { createPoll } from '../lib/ui/poll';
  import {
    formatBytes,
    formatByteLabel,
    formatLastUpdate,
    indexChartBars,
    indexStorageRows,
    parsePrometheus,
    summarizeMetrics,
    summarizeStats,
    type ChartBar,
    type HealthMetrics,
    type StorageSummary
  } from '../lib/ui/dashboard-stats';

  let health = $state('');
  let version = $state<VersionResponse | null>(null);
  let stats = $state<InstanceStats | null>(null);
  let metrics = $state<HealthMetrics | null>(null);
  let metricsOff = $state(false);
  let metricsDisabled = $state(false);
  let error = $state<unknown>(null);

  const summary = $derived(stats ? summarizeStats(stats) : null);
  const rows = $derived(stats ? indexStorageRows(stats) : []);
  const docBars = $derived(indexChartBars(rows, 'docs'));
  const sizeBars = $derived(indexChartBars(rows, 'size'));

  async function loadMetrics() {
    if (metricsDisabled) return;
    try {
      metrics = summarizeMetrics(parsePrometheus(await getMetrics()));
      metricsOff = false;
    } catch (e) {
      metrics = null;
      metricsOff = true;
      if (e instanceof MeiliError && e.code === 'feature_not_enabled') metricsDisabled = true;
    }
  }

  async function load() {
    try {
      const [h, v, s] = await Promise.all([
        meili<{ status: string }>('GET', '/health'),
        meili<VersionResponse>('GET', '/version'),
        meili<InstanceStats>('GET', '/stats')
      ]);
      health = h.status;
      version = v;
      stats = s;
      error = null;
      await loadMetrics();
    } catch (e) {
      error = e;
    }
  }

  onMount(() => createPoll(load, 2000));

  function n(v: number | null | undefined): string {
    if (v == null) return '—';
    return v.toLocaleString('en-US');
  }

  function metricCard(label: string, value: string, hint = '') {
    return { label, value, hint };
  }

  const healthCards = $derived.by(() => {
    const s = summary as StorageSummary | null;
    const cards = [
      metricCard('Health', health || '…', health === 'available' ? 'instance sẵn sàng' : ''),
      metricCard('Version', version?.pkgVersion ?? '…', version ? `${version.commitSha.slice(0, 8)} · ${version.commitDate}` : ''),
      metricCard('Disk', s ? formatBytes(s.databaseSize) : '…', s ? `${s.databaseSize.toLocaleString('en-US')} bytes on disk` : ''),
      metricCard('Documents', s ? n(s.documentCount) : '…'),
      metricCard('Indexes', s ? n(s.indexCount) : '…'),
      metricCard('Indexing', s ? n(s.indexingCount) : '…', s && s.indexingCount ? 'đang ingest' : 'idle'),
      metricCard('Last update', s ? formatLastUpdate(s.lastUpdate) : '…')
    ];
    return cards;
  });
</script>

<PageHeader title="Dashboard" hint="Tự refresh mỗi 2 giây — health, storage, indexing" />
<ErrorBanner {error} />

<div class="grid grid-cols-2 gap-3 mb-5 lg:grid-cols-4 xl:grid-cols-7">
  {#each healthCards as card}
    <div class="stat pilot-stat">
      <div class="stat-title">{card.label}</div>
      <div
        class="stat-value text-xl"
        class:text-success={card.label === 'Health' && health === 'available'}
        class:text-error={card.label === 'Health' && health && health !== 'available'}
        class:text-warning={card.label === 'Indexing' && summary && summary.indexingCount > 0}
      >
        {card.value}
      </div>
      {#if card.hint}
        <div class="stat-desc font-mono truncate" title={card.hint}>{card.hint}</div>
      {/if}
    </div>
  {/each}
</div>

{#if summary}
  <section class="card bg-base-100 mb-5">
    <div class="card-body gap-3 p-4">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 class="text-sm font-semibold tracking-tight">Storage</h2>
          <p class="text-xs text-base-content/55">Dung lượng file LMDB trên disk (databaseSize từ GET /stats). Reclaimable lấy lại khi compact index.</p>
        </div>
        <div class="text-right text-sm tabular-nums" title={formatByteLabel(summary.databaseSize)}>
          {#if summary.usedDatabaseSize != null}
            <span class="font-medium">{formatBytes(summary.usedDatabaseSize)}</span>
            <span class="text-base-content/45"> đã dùng / </span>
            <span class="font-medium">{formatBytes(summary.databaseSize)}</span>
            <div class="text-[11px] text-base-content/45">{summary.databaseSize.toLocaleString('en-US')} bytes</div>
          {:else}
            <span class="font-medium">{formatBytes(summary.databaseSize)}</span>
            <span class="text-base-content/45"> trên disk</span>
            <div class="text-[11px] text-base-content/45">{summary.databaseSize.toLocaleString('en-US')} bytes</div>
          {/if}
        </div>
      </div>
      {#if summary.usedPct != null}
        <div class="h-2 overflow-hidden rounded-full bg-base-300">
          <div class="h-full rounded-full bg-accent" style="width: {Math.max(2, summary.usedPct)}%"></div>
        </div>
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/60">
          <span>Used {summary.usedPct.toFixed(1)}%</span>
          <span>Reclaimable {formatBytes(summary.reclaimable)}</span>
          <span>Disk {formatBytes(summary.databaseSize)}</span>
        </div>
      {/if}
    </div>
  </section>
{/if}

{#if metrics}
  <section class="card bg-base-100 mb-5">
    <div class="card-body gap-3 p-4">
      <div>
        <h2 class="text-sm font-semibold tracking-tight">Runtime metrics</h2>
        <p class="text-xs text-base-content/55">GET /metrics (experimental). Search queue, task queue, HTTP.</p>
      </div>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <div class="rounded-lg border border-base-300 bg-base-200/60 px-3 py-2">
          <div class="text-[11px] uppercase tracking-wide text-base-content/45">Indexing</div>
          <div class="mt-0.5 text-sm font-medium">{metrics.isIndexing ? 'đang chạy' : 'idle'}</div>
        </div>
        <div class="rounded-lg border border-base-300 bg-base-200/60 px-3 py-2">
          <div class="text-[11px] uppercase tracking-wide text-base-content/45">Search running</div>
          <div class="mt-0.5 text-sm font-medium tabular-nums">{n(metrics.searchesRunning)}</div>
        </div>
        <div class="rounded-lg border border-base-300 bg-base-200/60 px-3 py-2">
          <div class="text-[11px] uppercase tracking-wide text-base-content/45">Search waiting</div>
          <div class="mt-0.5 text-sm font-medium tabular-nums">{n(metrics.searchesWaiting)}{metrics.searchQueueSize != null ? ` / ${n(metrics.searchQueueSize)}` : ''}</div>
        </div>
        <div class="rounded-lg border border-base-300 bg-base-200/60 px-3 py-2">
          <div class="text-[11px] uppercase tracking-wide text-base-content/45">Tasks</div>
          <div class="mt-0.5 text-sm font-medium tabular-nums">
            {n(metrics.tasksEnqueued)} queue · {n(metrics.tasksProcessing)} run · {n(metrics.tasksFailed)} fail
          </div>
        </div>
        <div class="rounded-lg border border-base-300 bg-base-200/60 px-3 py-2">
          <div class="text-[11px] uppercase tracking-wide text-base-content/45">HTTP requests</div>
          <div class="mt-0.5 text-sm font-medium tabular-nums">{n(metrics.httpRequests)}</div>
        </div>
        {#if metrics.degradedSearches != null && metrics.degradedSearches > 0}
          <div class="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2">
            <div class="text-[11px] uppercase tracking-wide text-warning">Degraded search</div>
            <div class="mt-0.5 text-sm font-medium tabular-nums">{n(metrics.degradedSearches)}</div>
          </div>
        {/if}
        {#if metrics.taskQueueLatencySec != null && metrics.taskQueueLatencySec > 0}
          <div class="rounded-lg border border-base-300 bg-base-200/60 px-3 py-2">
            <div class="text-[11px] uppercase tracking-wide text-base-content/45">Queue latency</div>
            <div class="mt-0.5 text-sm font-medium tabular-nums">{metrics.taskQueueLatencySec.toFixed(1)}s</div>
          </div>
        {/if}
      </div>
    </div>
  </section>
{:else if metricsOff}
  <p class="mb-5 text-xs text-base-content/45">
    Runtime metrics tắt. Bật experimental <span class="font-mono">metrics</span> trên trang Instance nếu cần search queue / HTTP.
  </p>
{/if}

{#if stats && !rows.length}
  <EmptyState title="Chưa có index" hint="Tạo index trên trang Indexes để thấy chart và bảng storage." actionLabel="Tới Indexes" onclick={() => (location.hash = '#/indexes')} />
{:else if stats}
  <section class="mb-5 grid gap-4 lg:grid-cols-2">
    {@render indexChartCard('Documents theo index', 'Số document — scale theo index lớn nhất. Top 10, còn lại gộp (others).', docBars, 'docs')}
    {@render indexChartCard('Dung lượng theo index', 'indexSize từ GET /stats — cùng list với bảng bên dưới.', sizeBars, 'size')}
  </section>

  <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
    <table class="table table-sm">
      <thead>
        <tr>
          <th>Index</th>
          <th class="text-right">Docs</th>
          <th class="text-right">Size</th>
          <th class="text-right">Used</th>
          <th class="text-right">Reclaimable</th>
          <th class="text-right">Embeddings</th>
          <th>Indexing</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row}
          <tr>
            <td><a class="link link-hover font-medium" href="#/indexes/{row.uid}">{row.uid}</a></td>
            <td class="text-right tabular-nums">{n(row.docs)}</td>
            <td class="text-right tabular-nums font-mono text-xs">{formatBytes(row.indexSize)}</td>
            <td class="text-right tabular-nums font-mono text-xs">{formatBytes(row.usedIndexSize)}</td>
            <td class="text-right tabular-nums font-mono text-xs">{formatBytes(row.reclaimable)}</td>
            <td class="text-right tabular-nums">{row.embeddings == null ? '—' : n(row.embeddings)}</td>
            <td>
              {#if row.isIndexing}
                <span class="status-chip status-chip-processing">indexing</span>
              {:else}
                <span class="status-chip status-chip-canceled">idle</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

{#snippet indexChartCard(title: string, hint: string, bars: ChartBar[], kind: 'docs' | 'size')}
  <div class="card bg-base-100">
    <div class="card-body gap-3 p-4">
      <div>
        <h2 class="text-sm font-semibold tracking-tight">{title}</h2>
        <p class="text-xs text-base-content/55">{hint}</p>
      </div>
      {#if bars.length === 0}
        <p class="text-xs text-base-content/45">Chưa có dữ liệu để vẽ.</p>
      {:else}
        <ul class="flex flex-col gap-1.5">
          {#each bars as bar (bar.uid)}
            <li class="grid grid-cols-[7.5rem_minmax(0,1fr)_5.5rem] items-center gap-2 text-xs">
              {#if bar.uid === '(others)'}
                <span class="truncate text-base-content/55" title={bar.uid}>{bar.uid}</span>
              {:else}
                <a class="link link-hover truncate font-medium" href="#/indexes/{bar.uid}" title={bar.uid}>{bar.uid}</a>
              {/if}
              <div class="index-chart-track" title="{bar.uid}: {bar.label}">
                <div
                  class="index-chart-fill"
                  class:index-chart-fill-size={kind === 'size' && !bar.isIndexing && bar.uid !== '(others)'}
                  class:index-chart-fill-indexing={bar.isIndexing}
                  class:index-chart-fill-others={bar.uid === '(others)'}
                  style="width: {Math.max(bar.pct, 0.8)}%"
                ></div>
              </div>
              <span class="text-right font-mono text-[11px] tabular-nums">{bar.label}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
{/snippet}
