<script lang="ts">
  import { onMount } from 'svelte';
  import { getNetwork, patchNetwork } from '../api/instance';
  import { networkDraft, networkPatch, type NetworkDraft, type RemoteDraft } from '../api/network-form';
  import { shellReader } from './shell-context';

  const readShell = shellReader();
  const readOnly = $derived(Boolean(readShell().session?.readOnly));
  let draft = $state<NetworkDraft>({ self: '', leader: '', remotes: [] });
  let removed = $state<string[]>([]);
  let note = $state('');
  let error = $state('');
  let busy = $state(false);

  function emptyRemote(): RemoteDraft {
    return { name: '', url: '', searchApiKey: '', writeApiKey: '' };
  }

  async function load() {
    const raw = await getNetwork();
    draft = networkDraft(raw);
    removed = [];
  }

  onMount(() => {
    load().catch((err) => {
      error = err instanceof Error ? err.message : 'Không đọc được network';
    });
  });

  function drop(index: number) {
    const row = draft.remotes[index];
    if (row?.name.trim()) removed = [...removed, row.name.trim()];
    draft.remotes = draft.remotes.filter((_, i) => i !== index);
  }

  async function save() {
    if (readOnly || busy) return;
    busy = true;
    error = '';
    note = '';
    try {
      const next = await patchNetwork(networkPatch(draft, removed));
      draft = networkDraft(next);
      removed = [];
      note = 'Đã lưu cụm. Search federated dùng các node trong danh sách này.';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Không lưu được network';
    } finally {
      busy = false;
    }
  }
</script>

<section class="card bg-base-100 shadow-sm lg:col-span-2">
  <div class="card-body p-4 gap-3">
    <h2 class="font-medium">Network</h2>
    <p class="text-xs text-base-content/60">
      Cụm Meilisearch: máy này tên gì, và các node khác ở URL nào. Dùng khi search trải trên nhiều server.
      Một máy thì để trống danh sách node. Không phải card mạng của Windows.
    </p>
    <div class="flex flex-wrap gap-2">
      <label class="text-xs flex flex-col gap-1">
        Tên node này
        <input class="input input-bordered input-sm" value={draft.self} oninput={(e) => (draft.self = e.currentTarget.value)} />
      </label>
      <label class="text-xs flex flex-col gap-1">
        Leader
        <input class="input input-bordered input-sm" placeholder="cùng tên node này" value={draft.leader} oninput={(e) => (draft.leader = e.currentTarget.value)} />
      </label>
    </div>
    {#each draft.remotes as row, i}
      <div class="grid grid-cols-1 gap-2 rounded-box border border-base-300 p-2 md:grid-cols-4">
        <input class="input input-bordered input-sm" placeholder="tên node" value={row.name} oninput={(e) => (draft.remotes[i].name = e.currentTarget.value)} />
        <input class="input input-bordered input-sm md:col-span-2" placeholder="http://host:7700" value={row.url} oninput={(e) => (draft.remotes[i].url = e.currentTarget.value)} />
        <button class="btn btn-ghost btn-sm" type="button" onclick={() => drop(i)}>Bỏ node</button>
        <input class="input input-bordered input-sm" type="password" placeholder="search API key" value={row.searchApiKey} oninput={(e) => (draft.remotes[i].searchApiKey = e.currentTarget.value)} />
        <input class="input input-bordered input-sm" type="password" placeholder="write API key" value={row.writeApiKey} oninput={(e) => (draft.remotes[i].writeApiKey = e.currentTarget.value)} />
      </div>
    {/each}
    <div class="flex flex-wrap gap-2">
      <button class="btn btn-outline btn-sm" type="button" onclick={() => (draft.remotes = [...draft.remotes, emptyRemote()])}>Thêm node</button>
      <button class="btn btn-primary btn-sm" type="button" disabled={readOnly || busy} onclick={save}>Lưu cụm</button>
    </div>
    <p class="text-xs text-base-content/50">Key để trống thì không gửi, key cũ trên engine giữ nguyên. Bỏ node sẽ xóa node đó khỏi cụm.</p>
    {#if readOnly}<p class="text-xs text-warning">Session read-only, không PATCH được.</p>{/if}
    {#if note}<p class="text-xs">{note}</p>{/if}
    {#if error}<p class="text-xs text-error break-all">{error}</p>{/if}
  </div>
</section>
