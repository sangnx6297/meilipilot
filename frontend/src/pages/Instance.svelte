<script lang="ts">
  import { onMount } from 'svelte';
  import {
    createDump,
    createSnapshot,
    exportRemote,
    listWebhooks,
    createWebhook,
    deleteWebhook,
    getExperimental,
    patchExperimental
  } from '../lib/api/instance';
  import { waitTask } from '../lib/api/tasks';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import { shellReader } from '../lib/ui/shell-context';
  import { bulkExperimentalPatch, featureHint, safeExperimentalEnabled } from '../lib/experimental';
  import BackupActions from '../lib/ui/BackupActions.svelte';
  import NetworkPanel from '../lib/ui/NetworkPanel.svelte';
  import RenderPanel from '../lib/ui/RenderPanel.svelte';
  let serverNote = $state('');
  let error = $state<unknown>(null);
  let hooks = $state<{ uuid: string; url: string }[]>([]);
  let hookUrl = $state('');
  let features = $state<Record<string, boolean>>({});
  let exportUrl = $state('');
  const readShell = shellReader();
  onMount(async () => {
    try {
      hooks = (await listWebhooks()).results ?? [];
      features = await getExperimental();
    } catch (e) {
      error = e;
    }
  });
</script>
<PageHeader title="Instance" hint="Backup, webhook, experimental. Log nằm ở menu Logs." />
<ErrorBanner {error} />
<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <section class="card bg-base-100 shadow-sm lg:col-span-2">
    <div class="card-body p-4 gap-3">
      <h2 class="font-medium">Dump / Restore</h2>
      <p class="text-xs text-base-content/60">Lưu file JSON trên máy này: settings và documents. apiKey embedder không ghi vào file.</p>
      <BackupActions scope="instance" />
      <div class="border-t border-base-200 pt-3 flex flex-col gap-2">
        <p class="text-xs text-base-content/60">Dump và snapshot của engine ghi file trên máy chủ. App không tải file đó về. Restore file server phải chạy lại Meilisearch với --import-dump hoặc --import-snapshot.</p>
        <div class="flex gap-2">
          <button class="btn btn-outline btn-sm" onclick={async () => {
            try {
              const t = await createDump();
              const done = await waitTask(t.taskUid, { timeoutMs: 300_000 });
              const dumpUid = typeof done.details?.dumpUid === 'string' ? done.details.dumpUid : '';
              serverNote = dumpUid ? `Dump server xong. File ${dumpUid}.dump nằm trên máy chủ.` : `Dump server xong, task ${done.uid}.`;
            } catch (e) { error = e; }
          }}>Dump server</button>
          <button class="btn btn-outline btn-sm" onclick={async () => {
            try {
              const t = await createSnapshot();
              const done = await waitTask(t.taskUid, { timeoutMs: 300_000 });
              serverNote = `Snapshot server xong, task ${done.uid}.`;
            } catch (e) { error = e; }
          }}>Snapshot server</button>
        </div>
        {#if serverNote}<p class="text-xs break-all">{serverNote}</p>{/if}
      </div>
    </div>
  </section>
  <section class="card bg-base-100 shadow-sm">
    <div class="card-body p-4">
      <h2 class="font-medium">Export</h2>
      <div class="flex flex-wrap gap-2">
        <input class="input input-bordered input-sm flex-1 min-w-40" placeholder="remote url" bind:value={exportUrl} />
        <button class="btn btn-outline btn-sm" onclick={async () => { const t = await exportRemote({ url: exportUrl }); await waitTask(t.taskUid); }}>Export</button>
      </div>
    </div>
  </section>
  <section class="card bg-base-100 shadow-sm">
    <div class="card-body p-4">
      <h2 class="font-medium">Webhooks</h2>
      <div class="flex flex-wrap gap-2">
        <input class="input input-bordered input-sm flex-1 min-w-40" placeholder="url" bind:value={hookUrl} />
        <button class="btn btn-primary btn-sm" onclick={async () => { await createWebhook({ url: hookUrl }); hooks = (await listWebhooks()).results ?? []; }}>Thêm</button>
      </div>
      <ul class="text-sm mt-2 space-y-1">
        {#each hooks as h}
          <li class="flex items-center justify-between gap-2">
            <span class="truncate">{h.url}</span>
            <button class="btn btn-ghost btn-xs text-error" onclick={async () => { await deleteWebhook(h.uuid); hooks = (await listWebhooks()).results ?? []; }}>xóa</button>
          </li>
        {/each}
      </ul>
    </div>
  </section>
  <section class="card bg-base-100 shadow-sm">
    <div class="card-body p-4">
      <h2 class="font-medium">Experimental</h2>
      <p class="font-mono text-[10px] text-base-content/45 break-all">
        {(readShell().session?.host ?? '').replace(/\/$/, '')}/experimental-features
      </p>
      <label class="label cursor-pointer justify-start gap-2 text-sm py-1 items-start border-b border-base-200 mb-1">
        <input type="checkbox" class="toggle toggle-sm mt-0.5" checked={safeExperimentalEnabled(features)} disabled={readShell().session?.readOnly} onchange={async (e) => {
          const input = e.currentTarget as HTMLInputElement;
          const checked = input.checked;
          if (readShell().session?.readOnly) {
            input.checked = !checked;
            return;
          }
          try {
            features = await patchExperimental(bulkExperimentalPatch(features, checked));
            await readShell().refreshCaps();
          } catch (err) {
            input.checked = !checked;
            error = err;
          }
        }} />
        <span>
          <span>Bật các cờ experimental</span>
          <span class="block text-xs text-base-content/50">PATCH toàn bộ cờ trừ legacySearch và disableDocumentsFetchQueue. Hai cờ đó vẫn bật riêng bên dưới.</span>
        </span>
      </label>
      {#each Object.entries(features) as [k, v]}
        <label class="label cursor-pointer justify-start gap-2 text-sm py-1 items-start">
          <input type="checkbox" class="toggle toggle-sm mt-0.5" checked={v} onchange={async (e) => {
            const input = e.currentTarget as HTMLInputElement;
            const checked = input.checked;
            try {
              features = await patchExperimental({ [k]: checked });
              await readShell().refreshCaps();
            } catch (err) {
              input.checked = !checked;
              error = err;
            }
          }} />
          <span>
            <span class="font-mono">{k}</span>
            {#if featureHint(k)}
              <span class="block text-xs text-base-content/50">{featureHint(k)}</span>
            {/if}
          </span>
        </label>
      {/each}
    </div>
  </section>
  {#if features.network}
    <NetworkPanel />
  {/if}
  {#if features.renderRoute}
    <RenderPanel />
  {/if}
</div>
