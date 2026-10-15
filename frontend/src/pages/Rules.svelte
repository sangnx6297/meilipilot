<script lang="ts">
  import { onMount } from 'svelte';
  import { listRules, upsertRule, deleteRule, deleteAllRules } from '../lib/api/rules';
  import { confirmBody } from '../lib/ui/confirm-copy';
  import ConfirmDialog from '../lib/ui/ConfirmDialog.svelte';
  import EmptyState from '../lib/ui/EmptyState.svelte';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import JsonEditor from '../lib/ui/JsonEditor.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import CodeBlock from '../lib/ui/CodeBlock.svelte';
  import { shellReader } from '../lib/ui/shell-context';
  let rules = $state<unknown>(null);
  let uid = $state('promo');
  let body = $state('{"active":true,"precedence":10,"actions":{"pin":[]}}');
  let error = $state<unknown>(null);
  let pendingAll = $state(false);
  const readShell = shellReader();
  const shell = $derived(readShell());
  async function load() {
    rules = await listRules();
  }
  onMount(() => {
    if (readShell().caps.rules) void load();
  });
</script>
<PageHeader title="Search rules" />
{#if !shell.caps.rules}
  <EmptyState title="Search rules không hỗ trợ" hint="Cần Meilisearch ≥ 1.53." />
{:else}
<ErrorBanner {error} />
<div class="card bg-base-100 shadow-sm mb-4">
  <div class="card-body p-4">
    <CodeBlock value={rules} />
  </div>
</div>
<div class="card bg-base-100 shadow-sm">
  <div class="card-body p-4">
    <input class="input input-bordered input-sm mb-2 w-full max-w-xs" bind:value={uid} />
    <JsonEditor bind:value={body} rows={10} />
    <div class="flex flex-wrap gap-2 mt-2">
      <button class="btn btn-primary btn-sm" onclick={async () => { await upsertRule(uid, JSON.parse(body)); load(); }}>Upsert</button>
      <button class="btn btn-outline btn-sm" onclick={async () => { await deleteRule(uid); load(); }}>Xóa rule</button>
      <button class="btn btn-outline btn-error btn-sm" onclick={() => (pendingAll = true)}>Xóa tất cả</button>
    </div>
  </div>
</div>
{/if}
<ConfirmDialog
  open={pendingAll}
  title="Xóa tất cả rules"
  body={confirmBody({
    env: shell.session?.environment,
    host: shell.session?.host,
    detail: 'Xóa tất cả search rules trên instance này?'
  })}
  confirmLabel="Xóa tất cả"
  oncancel={() => (pendingAll = false)}
  onconfirm={async () => {
    pendingAll = false;
    await deleteAllRules();
    load();
  }}
/>
