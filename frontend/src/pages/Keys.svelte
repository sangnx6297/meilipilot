<script lang="ts">
  import { onMount } from 'svelte';
  import { listKeys, createKey, deleteKey, updateKey, buildCreateKeyBody, keyWriteHint } from '../lib/api/keys';
  import type { KeyAction, KeyView } from '../lib/api/types';
  import { confirmBody } from '../lib/ui/confirm-copy';
  import ConfirmDialog from '../lib/ui/ConfirmDialog.svelte';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import { copyText, maskKey } from '../lib/store/connection';
  import { shellReader } from '../lib/ui/shell-context';
  let copied = $state('');
  async function copy(value: string, label: string) {
    if (!value) return;
    await copyText(value);
    copied = label;
    setTimeout(() => {
      if (copied === label) copied = '';
    }, 1500);
  }
  const actionsCatalog: KeyAction[] = [
    '*',
    'search',
    'documents.*',
    'indexes.*',
    'tasks.*',
    'settings.*',
    'stats.get',
    'dumps.create',
    'snapshots.create',
    'version',
    'keys.get'
  ];
  let keys = $state<KeyView[]>([]);
  let name = $state('');
  let indexes = $state('*');
  let chosen = $state<KeyAction[]>(['search']);
  let createdKey = $state('');
  let error = $state<unknown>(null);
  let pendingKey = $state<KeyView | null>(null);
  let busy = $state(false);
  const readShell = shellReader();
  const shell = $derived(readShell());
  const locked = $derived(Boolean(shell.session?.readOnly));
  const writeHint = $derived(keyWriteHint(error));
  async function load() {
    try {
      keys = (await listKeys(0, 50)).results;
      error = null;
    } catch (e) {
      error = e;
    }
  }
  onMount(load);
  async function create() {
    createdKey = '';
    const built = buildCreateKeyBody({ name, indexesText: indexes, actions: chosen });
    if (!built.ok) {
      error = new Error(built.message);
      return;
    }
    if (locked) {
      error = new Error('Session đang readOnly — tắt RO trên Kết nối rồi tạo key.');
      return;
    }
    busy = true;
    try {
      const k = await createKey(built.body);
      createdKey = k.key;
      error = null;
      await load();
    } catch (e) {
      error = e;
    } finally {
      busy = false;
    }
  }
</script>
<PageHeader title="API keys" hint="Cần master key. Key chỉ hiện một lần khi tạo." />
<ErrorBanner {error} />
{#if writeHint}
  <p class="mb-4 text-sm text-warning">{writeHint}</p>
{/if}
{#if locked}
  <div role="status" class="alert alert-warning mb-4 text-sm">
    Session đang <strong>readOnly</strong> — MeiliPilot chặn POST/PATCH/DELETE /keys. Vào Kết nối, tắt readOnly rồi tạo lại.
  </div>
{/if}
{#if createdKey}
  <div role="alert" class="alert alert-warning mb-4 text-sm">
    <code class="break-all flex-1">{createdKey}</code>
    <button class="btn btn-sm" onclick={() => copy(createdKey, 'new')}>{copied === 'new' ? 'Đã copy' : 'Copy'}</button>
  </div>
{/if}
<div class="card bg-base-100 mb-4">
  <div class="card-body gap-3 p-4">
    <div class="flex min-w-0 flex-wrap items-center gap-2">
      <input class="input input-bordered input-sm min-w-0 flex-1" placeholder="Tên key (name)" bind:value={name} disabled={locked || busy} />
      <input class="input input-bordered input-sm min-w-0 flex-1" placeholder="indexes (comma hoặc *)" bind:value={indexes} disabled={locked || busy} />
      <button class="btn btn-primary btn-sm shrink-0" onclick={create} disabled={locked || busy}>{busy ? 'Đang tạo…' : 'Tạo'}</button>
    </div>
    <div>
      <p class="mb-1.5 text-xs font-medium text-base-content/70">Actions</p>
      <div class="flex flex-wrap gap-1.5">
        {#each actionsCatalog as a}
          <label class="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#8b9aab] bg-[#f4f7fa] px-2 py-1 font-mono text-xs font-medium text-base-content">
            <input type="checkbox" class="checkbox checkbox-sm" value={a} bind:group={chosen} disabled={locked || busy} />
            {a}
          </label>
        {/each}
      </div>
    </div>
  </div>
</div>
<div class="overflow-x-auto bg-base-100 rounded-box shadow-sm">
  <table class="table table-sm">
    <thead><tr><th>name</th><th>actions</th><th>indexes</th><th></th></tr></thead>
    <tbody>
      {#each keys as k}
        <tr>
          <td class="max-w-[10rem] truncate">{k.name ?? k.uid}</td>
          <td class="max-w-[14rem] text-xs break-words">{k.actions.join(', ')}</td>
          <td class="max-w-[10rem] text-xs break-words">{k.indexes.join(', ')}</td>
          <td class="whitespace-nowrap text-right">
            {#if k.key}
              <span class="text-xs text-base-content/50 mr-2">{maskKey(k.key)}</span>
              <button class="btn btn-ghost btn-xs mr-1" onclick={() => copy(k.key, k.uid)}>{copied === k.uid ? 'Đã copy' : 'Copy'}</button>
            {/if}
            <button
              class="btn btn-ghost btn-xs"
              disabled={locked}
              onclick={async () => {
                const n = prompt('name', k.name ?? '');
                if (n == null) return;
                try {
                  await updateKey(k.uid, { name: n });
                  await load();
                } catch (e) {
                  error = e;
                }
              }}>Sửa</button>
            <button class="btn btn-ghost btn-xs text-error" disabled={locked} onclick={() => (pendingKey = k)}>Xóa</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
<ConfirmDialog
  open={pendingKey != null}
  title="Xóa API key"
  body={confirmBody({
    env: shell.session?.environment,
    host: shell.session?.host,
    uid: pendingKey?.name ?? pendingKey?.uid,
    detail: `Xóa key ${pendingKey?.uid}?`
  })}
  confirmLabel="Xóa"
  oncancel={() => (pendingKey = null)}
  onconfirm={async () => {
    if (!pendingKey) return;
    const id = pendingKey.uid;
    pendingKey = null;
    try {
      await deleteKey(id);
      await load();
    } catch (e) {
      error = e;
    }
  }}
/>
