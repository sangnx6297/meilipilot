<script lang="ts">
  import { flagOn } from '../lib/api/capability';
  import { setLogStderr } from '../lib/api/instance';
  import { LOG_LEVELS } from '../lib/log-session';
  import { logSession } from '../lib/log-session.svelte';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import { shellReader } from '../lib/ui/shell-context';

  const readShell = shellReader();
  const shell = $derived(readShell());
  const capsReady = $derived(shell.caps.version !== '0.0.0');
  const logsKnown = $derived('logsRoute' in shell.caps.flags);
  const logsOn = $derived(flagOn(shell.caps, 'logsRoute'));
  const readOnly = $derived(Boolean(shell.session?.readOnly));

  let box = $state<HTMLPreElement | null>(null);

  $effect(() => {
    logSession.text;
    queueMicrotask(() => {
      if (box) box.scrollTop = box.scrollHeight;
    });
  });

  function setMode(value: string) {
    if (value === 'human' || value === 'json' || value === 'profile') logSession.setMode(value);
  }

  async function stderr(level: string) {
    if (readOnly) return;
    logSession.error = '';
    try {
      await setLogStderr(level);
      logSession.setLevel(level);
    } catch (err) {
      logSession.error = err instanceof Error ? err.message : 'Không đổi được mức console';
    }
  }
</script>

<div class="logs-screen">
  <PageHeader title="Logs" hint="Nghe log của process Meilisearch. Đổi sang màn khác thì stream mở khung riêng, không dừng. Chỉ một client được nghe cùng lúc." />
  <ErrorBanner error={logSession.error || null} />
  {#if !capsReady}
    <p class="text-sm text-base-content/60">Đang đọc /experimental-features…</p>
  {:else if !logsKnown}
    <p class="text-sm">Engine này không có field <span class="font-mono">logsRoute</span>. Không stream được log.</p>
  {:else if !logsOn}
    <p class="text-sm">Cờ <span class="font-mono">logsRoute</span> đang tắt. Bật trên <a class="link" href="#/instance">Instance</a> rồi quay lại.</p>
  {:else}
    <div class="flex flex-wrap items-end gap-2">
      <label class="text-xs flex flex-col gap-1">
        Mức stream
        <select class="select select-bordered select-sm w-32" value={logSession.level} onchange={(e) => logSession.setLevel(e.currentTarget.value)}>
          {#each LOG_LEVELS as level}
            <option value={level}>{level}</option>
          {/each}
        </select>
      </label>
      <label class="text-xs flex flex-col gap-1">
        Dạng
        <select class="select select-bordered select-sm w-28" value={logSession.mode} onchange={(e) => setMode(e.currentTarget.value)}>
          <option value="human">chữ</option>
          <option value="json">json</option>
          <option value="profile">profile</option>
        </select>
      </label>
      {#if logSession.live}
        <button class="btn btn-outline btn-sm" type="button" onclick={() => logSession.stop()}>Dừng</button>
      {:else}
        <button class="btn btn-primary btn-sm" type="button" onclick={() => logSession.start()}>Nghe log</button>
      {/if}
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs text-base-content/60">Mức console trên server:</span>
      {#each LOG_LEVELS as level}
        <button class="btn btn-outline btn-xs" type="button" disabled={readOnly} onclick={() => stderr(level)}>{level}</button>
      {/each}
      {#if readOnly}<span class="text-xs text-warning">Read-only, không đổi mức console.</span>{/if}
    </div>
    <pre class="logs-stream" bind:this={box}>{logSession.text || (logSession.live ? 'Đang chờ dòng log…' : 'Bấm Nghe log. Vùng này chiếm phần còn lại của màn hình.')}</pre>
  {/if}
</div>
