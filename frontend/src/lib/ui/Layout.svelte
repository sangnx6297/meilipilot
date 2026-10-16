<script lang="ts">
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Database from '@lucide/svelte/icons/database';
  import Search from '@lucide/svelte/icons/search';
  import Layers from '@lucide/svelte/icons/layers';
  import ListTodo from '@lucide/svelte/icons/list-todo';
  import KeyRound from '@lucide/svelte/icons/key-round';
  import Server from '@lucide/svelte/icons/server';
  import MessageSquare from '@lucide/svelte/icons/message-square';
  import Scale from '@lucide/svelte/icons/scale';
  import LogOut from '@lucide/svelte/icons/log-out';
  import Cable from '@lucide/svelte/icons/cable';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import GitCompare from '@lucide/svelte/icons/git-compare';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Bot from '@lucide/svelte/icons/bot';
  import ScrollText from '@lucide/svelte/icons/scroll-text';
  import { onMount } from 'svelte';
  import { DEFAULT_CAPS, navAllowed, type EngineCapability } from '../api/capability';
  import { type Profile, type Session } from '../store/connection';
  import { parentHash } from './parent-hash';
  import BrandMark from './BrandMark.svelte';
  import CommandPalette from './CommandPalette.svelte';
  import EnvChips from './EnvChips.svelte';
  import { setShell } from './shell-context';
  import { APP_COPYRIGHT, APP_NAME, APP_VERSION } from '../app-meta';
  import { onLogsPage } from '../log-session';
  import { logSession } from '../log-session.svelte';
  import LogDock from './LogDock.svelte';

  let {
    session,
    profiles = [],
    path = '',
    caps = DEFAULT_CAPS,
    onlogout,
    onswitch,
    onmanage,
    onrefreshcaps,
    children
  }: {
    session: Session | null;
    profiles?: Profile[];
    path?: string;
    caps?: EngineCapability;
    onlogout: () => void;
    onswitch: (id: string) => void;
    onmanage: () => void;
    onrefreshcaps?: () => Promise<void>;
    children: import('svelte').Snippet;
  } = $props();

  setShell(() => ({ session, caps, refreshCaps: onrefreshcaps ?? (async () => {}) }));

  $effect(() => {
    logSession.follow(path, onLogsPage(path));
  });
  let palette = $state(false);
  const adminItems = $derived(admin.filter((item) => navAllowed(item.href, caps)));

  onMount(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        palette = !palette;
      }
      if (e.key === 'Escape' && palette) {
        e.preventDefault();
        palette = false;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const workspace = [
    { href: '#/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: '/dashboard' },
    { href: '#/indexes', label: 'Indexes', icon: Database, match: '/indexes' },
    { href: '#/search', label: 'Search', icon: Search, match: '/search' },
    { href: '#/settings-diff', label: 'Settings Diff', icon: GitCompare, match: '/settings-diff' },
    { href: '#/multi-search', label: 'Multi-search', icon: Layers, match: '/multi-search' },
    { href: '#/tasks', label: 'Tasks', icon: ListTodo, match: '/tasks' }
  ];
  const admin = [
    { href: '#/keys', label: 'Keys', icon: KeyRound, match: '/keys' },
    { href: '#/instance', label: 'Instance', icon: Server, match: '/instance' },
    { href: '#/logs', label: 'Logs', icon: ScrollText, match: '/logs' },
    { href: '#/chat', label: 'Chat', icon: MessageSquare, match: '/chat' },
    { href: '#/rules', label: 'Rules', icon: Scale, match: '/rules' },
    { href: '#/mcp', label: 'MCP', icon: Bot, match: '/mcp' }
  ];

  function active(match: string) {
    if (match === '/dashboard') return path === '/dashboard' || path === '/' || path === '';
    if (match === '/search') return path === '/search' || path.startsWith('/search?');
    return path === match || path.startsWith(match + '/');
  }

  const backHref = $derived(parentHash(path));
  let sessionMenu = $state<HTMLDetailsElement | null>(null);

  function pickSession(id: string) {
    onswitch(id);
    if (sessionMenu) sessionMenu.open = false;
  }
</script>

{#snippet navGroup(title: string, items: typeof workspace)}
  <p class="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-content/40">{title}</p>
  <ul class="menu menu-sm px-2 gap-0.5">
    {#each items as item}
      <li>
        <a href={item.href} class:menu-active={active(item.match)}>
          <item.icon class="size-4 opacity-80" />
          {item.label}
        </a>
      </li>
    {/each}
  </ul>
{/snippet}

<div class="pilot-shell flex h-screen flex-col bg-base-200">
  <div class="flex min-h-0 flex-1">
    <aside class="flex w-60 min-w-0 shrink-0 flex-col bg-neutral text-neutral-content">
      <div class="min-w-0 px-3 py-4">
        <div class="flex min-w-0 items-center gap-2.5">
          <BrandMark size="h-8 w-8" />
          <div class="min-w-0">
            <div class="truncate text-[15px] font-semibold tracking-tight leading-none">{APP_NAME}</div>
            <div class="mt-1 text-[10px] text-neutral-content/50">v{APP_VERSION}</div>
          </div>
        </div>
        {#if session}
          <div class="mt-4 min-w-0 overflow-hidden rounded-lg bg-white/5 px-2.5 py-2">
            <p class="truncate text-xs font-medium leading-tight" title={session.name}>{session.name}</p>
            <div class="mt-1.5">
              <EnvChips env={session.environment} readOnly={session.readOnly} />
            </div>
            <p class="mt-1.5 truncate font-mono text-[10px] text-neutral-content/45" title={session.host}>{session.host}</p>
          </div>
        {/if}
      </div>
      {#if profiles.length}
        <div class="relative z-20 min-w-0 px-3 pb-2">
          <p class="text-[10px] uppercase tracking-wide text-neutral-content/40">Session</p>
          <details class="dropdown mt-1 w-full" bind:this={sessionMenu}>
            <summary class="session-switch">
              <span class="min-w-0 truncate">{session?.name ?? 'Chọn session'}</span>
              <ChevronDown class="size-3.5 shrink-0 opacity-70" />
            </summary>
            <ul class="dropdown-content z-50 mt-1 w-full rounded-lg border border-base-300 bg-white p-1 text-base-content shadow-lg">
              {#each profiles as p}
                <li>
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-base-200"
                    class:font-semibold={p.id === session?.id}
                    onclick={() => pickSession(p.id)}
                  >
                    <span class="w-3 shrink-0 text-primary">{p.id === session?.id ? '✓' : ''}</span>
                    <span class="min-w-0 truncate" title={p.name}>{p.name}</span>
                  </button>
                </li>
              {/each}
            </ul>
          </details>
        </div>
      {/if}
      <nav class="min-h-0 flex-1 overflow-auto pb-2">
        {@render navGroup('Workspace', workspace)}
        {@render navGroup('Admin', adminItems)}
      </nav>
      <div class="border-t border-white/10 p-2">
        <p class="px-2 pb-1 font-mono text-[10px] text-neutral-content/35">Ctrl+K</p>
        <button class="btn btn-ghost btn-sm w-full justify-start text-neutral-content/80" onclick={onmanage}>
          <Cable class="size-4" /> Quản lý kết nối
        </button>
        <button class="btn btn-ghost btn-sm w-full justify-start text-neutral-content/80" onclick={onlogout}>
          <LogOut class="size-4" /> Đăng xuất
        </button>
      </div>
    </aside>
    <div class="flex min-w-0 flex-1 flex-col" class:with-log-dock={logSession.detached}>
      <section class="min-h-0 min-w-0 flex-1 overflow-auto px-7 py-5">
        {#if session?.environment === 'production' && !session.readOnly}
          <div class="mb-3 rounded-md border border-error/35 bg-error/10 px-3 py-1.5 text-xs text-error">
            PROD đang mở ghi — PATCH/DELETE/index sẽ chạy. Bật readOnly trên session nếu chỉ cần xem.
          </div>
        {/if}
        {#if backHref}
          <a class="btn btn-ghost btn-sm mb-3 -ml-2 gap-1" href={backHref}>
            <ArrowLeft class="size-4" /> Quay lại
          </a>
        {/if}
        {@render children()}
      </section>
      <footer class="flex h-8 min-w-0 shrink-0 items-center justify-between gap-3 border-t border-base-300 bg-base-100 px-4 font-mono text-[11px] text-base-content/55">
        <span class="min-w-0 truncate">
          {#if session}
            {session.name} · {session.host}
            {#if session.readOnly} · read-only{/if}
          {/if}
        </span>
        <span class="shrink-0">{APP_NAME} {APP_VERSION} · {APP_COPYRIGHT}</span>
      </footer>
    </div>
  </div>
</div>
{#if logSession.detached}
  <LogDock />
{/if}
<CommandPalette open={palette} {caps} onclose={() => (palette = false)} />
