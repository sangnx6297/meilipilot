<script lang="ts">
  import { onMount } from 'svelte';
  import { applyDump, buildDump, dumpFileName, listAllIndexUids, parseDump } from '../api/dump';
  import { openTextFile, saveTextFile } from '../store/connection';
  import { shellReader } from './shell-context';

  let {
    scope,
    uid = '',
    ondone
  }: {
    scope: 'index' | 'instance';
    uid?: string;
    ondone?: () => void;
  } = $props();

  const readShell = shellReader();
  const readOnly = $derived(Boolean(readShell().session?.readOnly));
  let busy = $state(false);
  let note = $state('');
  let error = $state('');
  let replaceDocuments = $state(true);
  let indexes = $state<string[]>([]);
  let picked = $state('');

  onMount(() => {
    if (scope !== 'instance') return;
    listAllIndexUids()
      .then((uids) => {
        indexes = uids;
        if (!picked && uids[0]) picked = uids[0];
      })
      .catch((err) => {
        error = err instanceof Error ? err.message : 'Không đọc được danh sách index';
      });
  });

  function targetUid() {
    return scope === 'index' ? uid : picked;
  }

  async function dumpOne() {
    const target = targetUid();
    if (!target) {
      error = 'Chưa chọn index';
      return;
    }
    await runDump([target]);
  }

  async function dumpAll() {
    const uids = indexes.length ? indexes : await listAllIndexUids();
    indexes = uids;
    await runDump(uids);
  }

  async function runDump(uids: string[]) {
    if (busy) return;
    busy = true;
    error = '';
    note = 'Đang dump…';
    try {
      const dump = await buildDump(uids, (message) => {
        note = message;
      });
      const path = await saveTextFile(dumpFileName(dump), JSON.stringify(dump));
      note = path ? `Đã lưu ${path}` : 'Đã hủy lưu file';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Dump thất bại';
      note = '';
    } finally {
      busy = false;
    }
  }

  async function restore() {
    if (busy || readOnly) return;
    busy = true;
    error = '';
    note = '';
    try {
      const text = await openTextFile();
      if (!text) {
        note = 'Đã hủy chọn file';
        return;
      }
      const dump = parseDump(text);
      const targets = scope === 'index' ? dump.indexes.filter((index) => index.uid === uid) : dump.indexes;
      if (!targets.length) throw new Error(scope === 'index' ? `File không có index ${uid}` : 'Dump không có index');
      const label = targets.map((index) => index.uid).join(', ');
      const word = targets.length === 1 ? targets[0].uid : 'RESTORE';
      const docs = replaceDocuments ? 'Documents cũ sẽ bị xóa rồi ghi lại.' : 'Documents trong file được thêm hoặc cập nhật, document khác giữ nguyên.';
      if (prompt(`Gõ ${word} để restore ${label}. ${docs}`) !== word) {
        note = 'Đã hủy restore';
        return;
      }
      const restored = await applyDump(dump, {
        replaceDocuments,
        onlyUid: scope === 'index' ? uid : undefined,
        onStatus: (message) => {
          note = message;
        }
      });
      note = `Đã restore ${restored.join(', ')}. apiKey embedder không có trong file, key cũ trên engine được giữ.`;
      ondone?.();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Restore thất bại';
    } finally {
      busy = false;
    }
  }
</script>

<div class="flex flex-col gap-2">
  {#if scope === 'instance'}
    <select class="select select-bordered select-sm w-full max-w-xs" bind:value={picked} disabled={busy || !indexes.length}>
      {#each indexes as item}
        <option value={item}>{item}</option>
      {/each}
    </select>
  {/if}
  <div class="flex flex-wrap items-center gap-2">
    <button class="btn btn-outline btn-sm" type="button" disabled={busy || (scope === 'index' ? !uid : !picked)} onclick={dumpOne}>
      Dump {scope === 'index' ? 'index' : 'index này'}
    </button>
    {#if scope === 'instance'}
      <button class="btn btn-outline btn-sm" type="button" disabled={busy} onclick={dumpAll}>Dump tất cả</button>
    {/if}
    <button class="btn btn-outline btn-sm" type="button" disabled={busy || readOnly} onclick={restore}>Restore</button>
    <label class="label cursor-pointer gap-2 py-0 text-xs">
      <input type="checkbox" class="checkbox checkbox-xs" bind:checked={replaceDocuments} disabled={busy || readOnly} />
      Thay documents
    </label>
    {#if busy}<span class="loading loading-spinner loading-xs"></span>{/if}
  </div>
  {#if readOnly}<p class="text-xs text-warning">Session read-only, chỉ dump được.</p>{/if}
  {#if note}<p class="text-xs text-base-content/70 break-all">{note}</p>{/if}
  {#if error}<p class="text-xs text-error break-all">{error}</p>{/if}
</div>
