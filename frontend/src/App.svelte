<script lang="ts">
  import { onMount } from 'svelte';
  import Layout from './lib/ui/Layout.svelte';
  import Connect from './pages/Connect.svelte';
  import Dashboard from './pages/Dashboard.svelte';
  import Indexes from './pages/Indexes.svelte';
  import IndexDetail from './pages/IndexDetail.svelte';
  import Documents from './pages/Documents.svelte';
  import Search from './pages/Search.svelte';
  import MultiSearch from './pages/MultiSearch.svelte';
  import Settings from './pages/Settings.svelte';
  import Tasks from './pages/Tasks.svelte';
  import TaskDetail from './pages/TaskDetail.svelte';
  import Keys from './pages/Keys.svelte';
  import Instance from './pages/Instance.svelte';
  import Chat from './pages/Chat.svelte';
  import Rules from './pages/Rules.svelte';
  import SettingsDiff from './pages/SettingsDiff.svelte';
  import { meili } from './lib/api/client';
  import { capabilitiesFrom, DEFAULT_CAPS } from './lib/api/capability';
  import { getExperimental } from './lib/api/instance';
  import type { VersionResponse } from './lib/api/types';
  import { titleFromHash } from './lib/document-title';
  import { currentSession, disconnect, listProfiles, useProfile, type Profile, type Session } from './lib/store/connection';
  import { loadLastHash, saveLastHash } from './lib/workspace-prefs';

  let session = $state<Session | null>(null);
  let profiles = $state<Profile[]>([]);
  let hash = $state(location.hash.slice(1) || '/connect');
  let caps = $state(DEFAULT_CAPS);

  $effect(() => {
    const h = hash.startsWith('#') ? hash : `#${hash}`;
    document.title = titleFromHash(h);
    if (session) saveLastHash(h);
  });

  async function probeCaps() {
    try {
      const v = await meili<VersionResponse>('GET', '/version');
      let exp: Record<string, boolean> = {};
      try {
        exp = await getExperimental();
      } catch {
        exp = {};
      }
      caps = capabilitiesFrom(v.pkgVersion, exp);
    } catch {
      caps = DEFAULT_CAPS;
    }
  }

  function parse() {
    hash = location.hash.slice(1) || (session ? '/dashboard' : '/connect');
  }

  onMount(async () => {
    if (import.meta.env.DEV && new URLSearchParams(location.search).get('preview') === 'sidebar') {
      session = {
        id: 'preview',
        host: 'http://172.17.6.4:33068',
        name: '172.17.6.4 - meilisearch53',
        environment: 'production',
        readOnly: true
      };
      profiles = [
        {
          id: 'preview',
          name: '172.17.6.4 - meilisearch53',
          host: 'http://172.17.6.4:33068',
          environment: 'production',
          readOnly: true,
          hasKey: true
        },
        {
          id: 'local',
          name: 'local',
          host: 'http://127.0.0.1:7700',
          environment: 'dev',
          readOnly: false,
          hasKey: true
        }
      ];
      hash = '/dashboard';
      caps = capabilitiesFrom('1.55.0', {});
      parse();
      window.addEventListener('hashchange', parse);
      return () => window.removeEventListener('hashchange', parse);
    }
    profiles = await listProfiles();
    session = await currentSession();
    if (session) {
      await probeCaps();
      if (!location.hash || location.hash === '#/connect') {
        location.hash = loadLastHash() ?? '#/dashboard';
      }
    }
    parse();
    window.addEventListener('hashchange', parse);
    return () => window.removeEventListener('hashchange', parse);
  });

  async function refreshAuth() {
    profiles = await listProfiles();
    session = await currentSession();
    if (session) await probeCaps();
  }

  async function logout() {
    await disconnect();
    session = null;
    profiles = await listProfiles();
    location.hash = '#/connect';
  }

  async function switchProfile(id: string) {
    if (!id || id === session?.id) return;
    await useProfile(id);
    await refreshAuth();
    location.hash = '#/dashboard';
    location.reload();
  }

  async function manage() {
    session = null;
    location.hash = '#/connect';
  }

  const parts = $derived(hash.split('/').filter(Boolean));
</script>

{#if !session}
  <Connect onconnected={async () => { await refreshAuth(); location.hash = '#/dashboard'; }} />
{:else}
  <Layout {session} {profiles} {caps} path={hash} onlogout={logout} onswitch={switchProfile} onmanage={manage}>
    {#if parts[0] === 'indexes' && parts[1] && parts[2] === 'documents'}
      <Documents uid={parts[1]} />
    {:else if parts[0] === 'indexes' && parts[1] && parts[2] === 'search'}
      <Search uid={parts[1]} />
    {:else if parts[0] === 'indexes' && parts[1] && parts[2] === 'settings'}
      <Settings uid={parts[1]} />
    {:else if parts[0] === 'indexes' && parts[1]}
      <IndexDetail uid={parts[1]} />
    {:else if parts[0] === 'indexes'}
      <Indexes />
    {:else if parts[0] === 'search'}
      <Search />
    {:else if parts[0] === 'multi-search'}
      <MultiSearch />
    {:else if parts[0] === 'settings-diff'}
      <SettingsDiff />
    {:else if parts[0] === 'tasks' && parts[1]}
      <TaskDetail uid={Number(parts[1])} />
    {:else if parts[0] === 'tasks'}
      <Tasks />
    {:else if parts[0] === 'keys'}
      <Keys />
    {:else if parts[0] === 'instance'}
      <Instance />
    {:else if parts[0] === 'chat'}
      <Chat />
    {:else if parts[0] === 'rules'}
      <Rules />
    {:else}
      <Dashboard />
    {/if}
  </Layout>
{/if}
