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
    patchExperimental,
    getNetwork,
    patchNetwork,
    setLogStderr,
    renderTemplate
  } from '../lib/api/instance';
  import { waitTask } from '../lib/api/tasks';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import JsonEditor from '../lib/ui/JsonEditor.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  let error = $state<unknown>(null);
  let hooks = $state<{ uuid: string; url: string }[]>([]);
  let hookUrl = $state('');
  let features = $state<Record<string, boolean>>({});
  let network = $state('{}');
  let exportUrl = $state('');
  let template = $state('{"template":{"kind":"inlineDocumentTemplate","value":"{{doc.title}}"},"input":{"kind":"inlineDocument","document":{"title":"hi"}}}');
  onMount(async () => {
    try {
      hooks = (await listWebhooks()).results ?? [];
      features = await getExperimental();
      network = JSON.stringify(await getNetwork(), null, 2);
    } catch (e) {
      error = e;
    }
  });
</script>
<PageHeader title="Instance" hint="Backup, webhook, experimental, network, logs" />
<ErrorBanner {error} />
<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <section class="card bg-base-100 shadow-sm">
    <div class="card-body p-4">
      <h2 class="font-medium">Backups</h2>
      <div class="flex gap-2">
        <button class="btn btn-outline btn-sm" onclick={async () => { const t = await createDump(); await waitTask(t.taskUid); }}>Dump</button>
        <button class="btn btn-outline btn-sm" onclick={async () => { const t = await createSnapshot(); await waitTask(t.taskUid); }}>Snapshot</button>
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
      {#each Object.entries(features) as [k, v]}
        <label class="label cursor-pointer justify-start gap-2 text-sm py-1">
          <input type="checkbox" class="toggle toggle-sm" checked={v} onchange={async (e) => {
            features = await patchExperimental({ [k]: (e.currentTarget as HTMLInputElement).checked });
          }} /> {k}
        </label>
      {/each}
    </div>
  </section>
  <section class="card bg-base-100 shadow-sm lg:col-span-2">
    <div class="card-body p-4">
      <h2 class="font-medium">Network</h2>
      <JsonEditor bind:value={network} rows={8} />
      <button class="btn btn-outline btn-sm mt-2 w-fit" onclick={() => patchNetwork(JSON.parse(network))}>PATCH network</button>
    </div>
  </section>
  <section class="card bg-base-100 shadow-sm">
    <div class="card-body p-4">
      <h2 class="font-medium">Logs stderr</h2>
      <div class="flex gap-2">
        <button class="btn btn-outline btn-sm" onclick={() => setLogStderr('debug')}>debug</button>
        <button class="btn btn-outline btn-sm" onclick={() => setLogStderr('info')}>info</button>
      </div>
    </div>
  </section>
  <section class="card bg-base-100 shadow-sm">
    <div class="card-body p-4">
      <h2 class="font-medium">Render template</h2>
      <JsonEditor bind:value={template} rows={8} />
      <button class="btn btn-outline btn-sm mt-2 w-fit" onclick={async () => alert(JSON.stringify(await renderTemplate(JSON.parse(template))))}>Render</button>
    </div>
  </section>
</div>
