import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';
import { setTransport } from './lib/api/client';
import { Forward } from './wailsjs/go/main/App';

setTransport(async ({ method, path, query, body }) => {
  const q: Record<string, string> = {};
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      q[k] = String(v);
    }
  }
  const r = await Forward(method, path, q, body === undefined ? '' : JSON.stringify(body));
  return { status: r.status, body: r.body };
});

mount(App, { target: document.getElementById('app')! });
