<script lang="ts">
  import { onMount } from 'svelte';
  import { listChats, getChatSettings, patchChatSettings, deleteChat, resetChatSettings } from '../lib/api/chat';
  import { openStream } from '../lib/api/stream';
  import { consumeChatSse } from '../lib/experimental';
  import EmptyState from '../lib/ui/EmptyState.svelte';
  import FlagSwitch from '../lib/ui/FlagSwitch.svelte';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import JsonEditor from '../lib/ui/JsonEditor.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import { shellReader } from '../lib/ui/shell-context';

  type ChatTurn = { role: 'user' | 'assistant'; content: string };

  let workspaces = $state<{ uid: string }[]>([]);
  let current = $state('');
  let settings = $state('{}');
  let error = $state<unknown>(null);
  let model = $state('');
  let draft = $state('');
  let messages = $state<ChatTurn[]>([]);
  let streaming = $state(false);
  const readShell = shellReader();
  const shell = $derived(readShell());
  let stopChat = () => {};

  function halt() {
    stopChat();
    stopChat = () => {};
    streaming = false;
  }

  async function load() {
    workspaces = (await listChats()).results ?? [];
  }

  onMount(() => {
    if (readShell().caps.chat) void load();
    return () => halt();
  });

  async function open(uid: string) {
    halt();
    messages = [];
    current = uid;
    settings = JSON.stringify(await getChatSettings(uid), null, 2);
  }

  function appendAssistant(text: string) {
    messages = messages.map((turn, index) =>
      index === messages.length - 1 ? { ...turn, content: turn.content + text } : turn
    );
  }

  function send() {
    const content = draft.trim();
    if (!current || !model.trim() || !content || streaming) return;
    const history: ChatTurn[] = [...messages, { role: 'user', content }];
    messages = [...history, { role: 'assistant', content: '' }];
    draft = '';
    streaming = true;
    let feed = '';
    stopChat = openStream(
      'chat',
      'POST',
      `/chats/${encodeURIComponent(current)}/chat/completions`,
      { model: model.trim(), stream: true, messages: history },
      (chunk) => {
        const got = consumeChatSse(feed, chunk);
        feed = got.buffer;
        if (got.text) appendAssistant(got.text);
        if (got.error) error = got.error;
        if (got.done || got.error) halt();
      }
    );
  }
</script>
<PageHeader title="Chat workspaces" hint="Tạo workspace = PATCH settings với uid mới" />
{#if !shell.caps.chat}
  <EmptyState title="Chat tắt" hint="Bật chatCompletions để hỏi đáp trên document." />
  <div class="mt-3"><FlagSwitch name="chatCompletions" /></div>
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
<div class="card bg-base-100 shadow-sm mb-4">
  <div class="card-body p-4">
    <h2 class="font-medium text-sm">Hỏi đáp</h2>
    <p class="text-xs text-base-content/50">Chọn workspace, nhập model đã cấu hình trong settings. Câu trả lời stream qua chat completions.</p>
    <div class="mt-3 space-y-2">
      {#each messages as turn}
        <div class={turn.role === 'user' ? 'text-right' : ''}>
          <span class="inline-block max-w-full whitespace-pre-wrap rounded-box px-3 py-2 text-sm {turn.role === 'user' ? 'bg-primary text-primary-content' : 'bg-base-200'}">{turn.content || (streaming && turn.role === 'assistant' ? '…' : '')}</span>
        </div>
      {/each}
    </div>
    <div class="mt-3 flex flex-wrap gap-2">
      <input class="input input-bordered input-sm w-48" placeholder="model" bind:value={model} />
      <input class="input input-bordered input-sm flex-1 min-w-48" placeholder="câu hỏi" bind:value={draft} onkeydown={(e) => { if (e.key === 'Enter') send(); }} />
      {#if streaming}
        <button class="btn btn-outline btn-sm" onclick={halt}>Dừng</button>
      {:else}
        <button class="btn btn-primary btn-sm" disabled={!current || !model.trim() || !draft.trim()} onclick={send}>Gửi</button>
      {/if}
    </div>
  </div>
</div>
<div class="card bg-base-100 shadow-sm">
  <div class="card-body p-4">
    <JsonEditor bind:value={settings} rows={16} />
  </div>
</div>
{/if}
