<script lang="ts">
  import { onMount } from 'svelte';
  import { getIndex, compactIndex, getIndexStats, listIndexFields, updateIndex } from '../lib/api/indexes';
  import { waitTask } from '../lib/api/tasks';
  import type { IndexStats, IndexView } from '../lib/api/types';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import IndexContext from '../lib/ui/IndexContext.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import CodeBlock from '../lib/ui/CodeBlock.svelte';
  import { createPoll } from '../lib/ui/poll';
  let { uid }: { uid: string } = $props();
  let idx = $state<IndexView | null>(null);
  let stats = $state<IndexStats | null>(null);
  let fields = $state<unknown>(null);
  let pk = $state('');
  let error = $state<unknown>(null);
  let pkTouched = $state(false);
  async function load() {
    try {
      idx = await getIndex(uid);
      if (!pkTouched) pk = idx.primaryKey ?? '';
      stats = await getIndexStats(uid);
      fields = await listIndexFields(uid);
      error = null;
    } catch (e) {
      error = e;
    }
  }
  onMount(() => createPoll(load, 2000));
  async function savePk() {
    try {
      const t = await updateIndex(uid, { primaryKey: pk || null });
      await waitTask(t.taskUid);
      pkTouched = false;
      await load();
    } catch (e) {
      error = e;
    }
  }
  async function compact() {
    try {
      const t = await compactIndex(uid);
      await waitTask(t.taskUid);
      await load();
    } catch (e) {
      error = e;
    }
  }
</script>
<PageHeader title={uid} hint={idx ? `created ${idx.createdAt} · updated ${idx.updatedAt} · tự refresh 2s` : ''} />
<IndexContext {uid} active="overview" />
<ErrorBanner {error} />
{#if idx}
  <div class="card bg-base-100 shadow-sm mb-4">
    <div class="card-body p-4">
      <div class="flex flex-wrap gap-2">
        <input class="input input-bordered input-sm" bind:value={pk} placeholder="primaryKey" oninput={() => { pkTouched = true; }} />
        <button class="btn btn-primary btn-sm" onclick={savePk}>Cập nhật PK</button>
        <button class="btn btn-outline btn-sm" onclick={compact}>Compact</button>
      </div>
    </div>
  </div>
{/if}
{#if stats}
  <div class="card bg-base-100 shadow-sm mb-4">
    <div class="card-body p-4">
      <h2 class="font-medium mb-2">Stats</h2>
      <p class="text-sm mb-3">
        {stats.numberOfDocuments} documents
        {#if stats.isIndexing}
          <span class="status-chip status-chip-processing ml-1">indexing</span>
        {/if}
      </p>
      <CodeBlock value={stats.fieldDistribution} />
    </div>
  </div>
{/if}
{#if fields}
  <div class="card bg-base-100 shadow-sm">
    <div class="card-body p-4">
      <h2 class="font-medium mb-2">Fields</h2>
      <CodeBlock value={fields} />
    </div>
  </div>
{/if}
