<script lang="ts">
  import { multiSearch, type MultiQuery } from '../lib/api/search';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import CodeBlock from '../lib/ui/CodeBlock.svelte';
  let queries = $state<MultiQuery[]>([
    { indexUid: '', q: '', limit: 5 },
    { indexUid: '', q: '', limit: 5 }
  ]);
  let federate = $state(false);
  let result = $state<unknown>(null);
  let error = $state<unknown>(null);
  async function run() {
    error = null;
    try {
      result = await multiSearch({
        queries: queries.filter((q) => q.indexUid),
        federation: federate ? { limit: 20 } : null
      });
    } catch (e) {
      error = e;
    }
  }
</script>
<PageHeader title="Multi-search" hint="POST /multi-search" />
<ErrorBanner {error} />
<div class="card bg-base-100 shadow-sm">
  <div class="card-body p-4">
    {#each queries as q}
      <div class="flex flex-wrap gap-2 mb-2">
        <input class="input input-bordered input-sm w-40" placeholder="indexUid" bind:value={q.indexUid} />
        <input class="input input-bordered input-sm flex-1 min-w-48" placeholder="q" bind:value={q.q} />
      </div>
    {/each}
    <div class="flex flex-wrap items-center gap-2 mt-1">
      <label class="flex cursor-pointer items-center gap-2 rounded-md border border-[#8b9aab] bg-[#f4f7fa] px-2.5 py-1.5 text-sm font-medium text-base-content">
        <input type="checkbox" class="checkbox checkbox-sm checkbox-primary" bind:checked={federate} />
        Federation
      </label>
      <button class="btn btn-primary btn-sm" onclick={run}>Chạy</button>
    </div>
  </div>
</div>
{#if result}
  <div class="mt-4"><CodeBlock value={result} /></div>
{/if}
