<script lang="ts">
  import { postMcp } from '../lib/api/instance';
  import { flagOn } from '../lib/api/capability';
  import CodeBlock from '../lib/ui/CodeBlock.svelte';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import FlagSwitch from '../lib/ui/FlagSwitch.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import { shellReader } from '../lib/ui/shell-context';

  const tools = [
    ['listIndexes', 'GET /indexes', 'indexes.get'],
    ['describeIndex', 'POST /indexes/{uid}/documents/fetch', 'documents.get'],
    ['searchInIndexes', 'POST /multi-search', 'search'],
    ['facetSearch', 'POST /indexes/{uid}/facet-search', 'search']
  ];
  const readShell = shellReader();
  const shell = $derived(readShell());
  const capsReady = $derived(shell.caps.version !== '0.0.0');
  const mcpSupported = $derived('mcpRoute' in shell.caps.flags);
  const endpoint = $derived(
    shell.session?.host ? `${shell.session.host.replace(/\/$/, '')}/mcp` : '/mcp'
  );
  let result = $state<unknown>(null);
  let error = $state<unknown>(null);
  let busy = $state(false);

  async function ping() {
    busy = true;
    error = null;
    try {
      result = await postMcp({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2026-07-28',
          capabilities: {},
          clientInfo: { name: 'MeiliPilot', version: '0.1.0' }
        }
      });
    } catch (e) {
      error = e;
    } finally {
      busy = false;
    }
  }
</script>

<PageHeader title="MCP" hint="POST /mcp cho agent. Protocol 2026-07-28. Chỉ search, không ghi dữ liệu." />
{#if !capsReady}
  <p class="text-sm text-base-content/60">Đang đọc /experimental-features…</p>
{:else if !mcpSupported}
  <div class="card bg-base-100 shadow-sm">
    <div class="card-body p-4 gap-2">
      <p class="text-sm">Engine này không có field <span class="font-mono">mcpRoute</span>. Không gửi PATCH, vì server trả unknown field.</p>
      <p class="text-xs text-base-content/60">POST /mcp chỉ có khi GET /experimental-features liệt kê <span class="font-mono">mcpRoute</span>. Bản đang nối không có route đó, nên agent không gọi được.</p>
      <p class="font-mono text-[11px] text-base-content/50 break-all">Cờ có trên host: {Object.keys(shell.caps.flags).join(', ') || '(không có)'}</p>
    </div>
  </div>
{:else if !flagOn(shell.caps, 'mcpRoute')}
  <FlagSwitch name="mcpRoute" />
{:else}
  <ErrorBanner {error} />
  <div class="card bg-base-100 shadow-sm mb-4">
    <div class="card-body p-4 gap-2">
      <p class="text-sm">Đăng ký host này với client MCP. Gửi API key có <span class="font-mono">indexes.get</span>, <span class="font-mono">documents.get</span>, <span class="font-mono">search</span>.</p>
      <p class="font-mono text-xs break-all">{endpoint}</p>
      <pre class="rounded-box bg-base-200 p-2 text-xs overflow-auto">claude mcp add --transport http meilisearch {endpoint} --header "Authorization: Bearer API_KEY"</pre>
      <button class="btn btn-primary btn-sm w-fit" disabled={busy} onclick={ping}>Ping initialize</button>
      {#if result}
        <CodeBlock value={result} />
      {/if}
    </div>
  </div>
  <div class="overflow-x-auto rounded-box bg-base-100 shadow-sm">
    <table class="table table-sm">
      <thead><tr><th>tool</th><th>route</th><th>quyền key</th></tr></thead>
      <tbody>
        {#each tools as [name, route, action]}
          <tr>
            <td class="font-mono">{name}</td>
            <td class="font-mono text-xs">{route}</td>
            <td class="font-mono text-xs">{action}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
