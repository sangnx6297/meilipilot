<script lang="ts">
  import { onMount } from 'svelte';
  import { listChats, getChatSettings, patchChatSettings, deleteChat, resetChatSettings } from '../lib/api/chat';
  import EmptyState from '../lib/ui/EmptyState.svelte';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import JsonEditor from '../lib/ui/JsonEditor.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import { shellReader } from '../lib/ui/shell-context';
  let workspaces = $state<{ uid: string }[]>([]);
  let current = $state('');
  let settings = $state('{}');
  let error = $state<unknown>(null);
  const readShell = shellReader();
  const shell = $derived(readShell());
  async function load() {
    workspaces = (await listChats()).results ?? [];
  }
  onMount(() => {
    if (readShell().caps.chat) void load();
  });
  async function open(uid: string) {
    current = uid;
    settings = JSON.stringify(await getChatSettings(uid), null, 2);
  }
</script>
<PageHeader title="Chat workspaces" hint="Tạo workspace = PATCH settings với uid mới" />
{#if !shell.caps.chat}
  <EmptyState title="Chat tắt" hint="Bật experimental chatCompletions trên trang Instance." />
{:else}
<ErrorBanner {error} />
<div class="card bg-base-100 shadow-sm mb-4">
  <div class="card-body p-4">
    <div class="flex flex-wrap gap-2">
      <input class="input input-bordered input-sm" placeholder="workspace uid" bind:value={current} />
      <button class="btn btn-outline btn-sm" onclick={() => open(current)}>Mở</button>
      <button class="btn btn-primary btn-sm" onclick={async () => { await patchChatSettings(current, JSON.parse(settings || '{}')); load(); }}>Lưu settings</button>
      <button class="btn btn-outline btn-sm" onclick={() => resetChatSettings(current)}>Reset settings</button>
      <button class="btn btn-ghost btn-sm text-error" onclick={async () => { await deleteChat(current); load(); }}>Xóa</button>
    </div>
    {#if workspaces.length}
      <div class="flex flex-wrap gap-1 mt-2">
        {#each workspaces as w}
          <button class="btn btn-ghost btn-xs" class:btn-active={current === w.uid} onclick={() => open(w.uid)}>{w.uid}</button>
        {/each}
      </div>
    {/if}
  </div>
</div>
<div class="card bg-base-100 shadow-sm">
  <div class="card-body p-4">
    <JsonEditor bind:value={settings} rows={16} />
    <p class="text-xs text-base-content/50 mt-2">Chat completions stream sẽ gắn StartStream ở Task 12.</p>
  </div>
</div>
{/if}
