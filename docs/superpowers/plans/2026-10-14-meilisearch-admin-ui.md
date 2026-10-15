# Meilisearch Admin + Search UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây một **ứng dụng desktop Windows** (cửa sổ native, double-click `.exe`) để quản trị và search đầy đủ trên instance Meilisearch hiện có, bám OpenAPI Meilisearch 1.55.0 (143 operations).

**Architecture:** Wails v2 mở cửa sổ WebView2, embed frontend Svelte 5. Go giữ session (host + API key) trong process; frontend gọi binding `App.Forward` / `App.StartStream` — **không** fetch Meilisearch trực tiếp, **không** mở Chrome/Edge, **không** cookie trình duyệt. Go gắn `Authorization: Bearer` khi forward. Mọi thao tác ghi trả `SummarizedTaskView`; UI poll `GET /tasks/{uid}` đến `succeeded|failed|canceled`. Stream (logs, tasks/stream, chat completions) đi qua Wails Events.

**Tech Stack:** Go 1.23+, Wails v2, Svelte 5, Vite 6, TypeScript 5.6, Vitest, Tailwind CSS 4. Target OS: Windows 10 19041+ (WebView2 Evergreen). Meilisearch target: `1.55.x` (`docs/ref/openapi.json`).

## Global Constraints

- App chạy **cửa sổ desktop** (Wails + WebView2). User không mở browser, không gõ URL. Dev dùng `wails dev`.
- Cửa sổ: title `Meilisearch UI`, size 1280×800, min 960×640, start centered. Đóng cửa sổ = thoát process.
- App là **admin UI**, không reimplement search engine. Mọi chức năng đi qua HTTP API Meilisearch 1.55.0.
- Auth: `Authorization: Bearer <apiKey>` cho mọi route trừ `GET /health`. `/keys` chỉ dùng master key (hoặc key có `keys.*`).
- Key chỉ nằm trong memory process Go. Không log, không `localStorage`, không hiện trong UI sau khi connect (trừ dialog copy key lúc tạo API key).
- Mutating routes trả task; UI **bắt buộc** poll task, không giả định sync success.
- List GET dùng `offset`/`limit`. Tasks/batches dùng `from`/`limit` (uid-based).
- Search UI dùng **POST** (`/indexes/{uid}/search`, `/multi-search`, `/facet-search`, `/similar`). Không dùng GET search.
- Settings UI dùng `GET|PATCH|DELETE /indexes/{uid}/settings` + `DELETE` từng sub-route để reset một setting.
- UI tiếng Việt, identifier/API field giữ tiếng Anh.
- Meilisearch mặc định `http://127.0.0.1:7700`. App **không** lắng nghe port công khai; không HTTP server cho user.
- Unary API: `App.Forward`. Stream API: `App.StartStream` + `runtime.EventsEmit` + `App.StopStream`.
- Frontend `meili()` đi qua `Transport` inject được (Wails prod, mock trong Vitest). Không `fetch('/meili/...')`.
- Không thêm lib HTTP client phía Go ngoài stdlib.
- Mỗi task kết thúc bằng test chạy được + commit riêng.

## Capability matrix (API → UI)

Nguồn: `docs/ref/openapi.json` (version 1.55.0), 72 paths / 143 operations.

| Module | Routes | Màn hình | Task |
|---|---|---|---|
| Health / Version / Stats / Metrics | `GET /health`, `GET /version`, `GET /stats`, `GET /indexes/{uid}/stats`, `GET /metrics` | Dashboard | 3 |
| Indexes | `GET/POST /indexes`, `GET/PATCH/DELETE /indexes/{uid}`, `POST /swap-indexes`, `POST /indexes/{uid}/compact`, `POST /indexes/{uid}/fields` | Indexes | 4 |
| Documents | `GET/POST/PUT/DELETE /indexes/{uid}/documents`, `POST .../documents/fetch`, `POST .../delete`, `POST .../delete-batch`, `POST .../edit`, `GET/DELETE .../documents/{id}` | Documents | 5 |
| Search | `POST /indexes/{uid}/search`, `POST /multi-search`, `POST /indexes/{uid}/facet-search`, `POST /indexes/{uid}/similar` | Search | 6 |
| Settings (22 groups) | `GET/PATCH/DELETE /indexes/{uid}/settings` + 21 sub-routes GET/PUT|PATCH/DELETE | Settings | 7 |
| Tasks / Batches | `GET /tasks`, `GET /tasks/{id}`, `GET /tasks/{id}/documents`, `POST /tasks/cancel`, `DELETE /tasks`, `POST /tasks/compact`, `GET /tasks/stream`, `GET /batches`, `GET /batches/{id}`, `GET /batches/stream` | Tasks | 8 |
| Keys | `GET/POST /keys`, `GET/PATCH/DELETE /keys/{key}` | Keys | 9 |
| Backups / Export | `POST /dumps`, `POST /snapshots`, `POST /export` | Instance | 10 |
| Webhooks | `GET/POST /webhooks`, `GET/PATCH/DELETE /webhooks/{uuid}` | Instance | 10 |
| Experimental / Network | `GET/PATCH /experimental-features`, `GET/PATCH /network`, `POST /network/control` | Instance | 10 |
| Logs | `POST /logs/stream`, `DELETE /logs/stream`, `POST /logs/stderr` | Instance | 10 |
| Chats | `GET /chats`, `GET/DELETE /chats/{uid}`, `POST .../chat/completions`, `GET/PATCH/DELETE .../settings` | Chat | 11 |
| Search rules | `GET/DELETE /dynamic-search-rules`, `GET/PATCH/DELETE /dynamic-search-rules/{uid}` | Rules | 11 |
| Template / MCP | `POST /render-template`, `POST /mcp` | Instance (template only; MCP skip UI) | 10 |

`POST /mcp` không làm UI (protocol riêng cho LLM). `GET` search/similar bị bỏ vì POST đủ.

## File structure

```
main.go                            # Wails entry: wails.Run, window options
app.go                             # App bindings: Connect, Session, Forward, StartStream, StopStream
wails.json
go.mod
internal/proxy/proxy.go            # Do(method, path, query, body) → Meilisearch
internal/proxy/proxy_test.go
internal/proxy/stream.go           # StartStream/StopStream + EventsEmit
internal/proxy/stream_test.go
internal/session/session.go        # current connection in-process
internal/session/session_test.go
frontend/package.json
frontend/vite.config.ts
frontend/tsconfig.json
frontend/vitest.config.ts
frontend/index.html
frontend/src/main.ts
frontend/src/app.css
frontend/src/App.svelte
frontend/src/lib/api/types.ts
frontend/src/lib/api/errors.ts
frontend/src/lib/api/client.ts     # Transport → App.Forward
frontend/src/lib/api/client.test.ts
frontend/src/lib/api/search.ts
frontend/src/lib/api/search.test.ts
frontend/src/lib/api/tasks.ts
frontend/src/lib/api/tasks.test.ts
frontend/src/lib/store/connection.ts
frontend/src/lib/ui/Layout.svelte
frontend/src/lib/ui/TaskToast.svelte
frontend/src/lib/ui/JsonEditor.svelte
frontend/src/lib/ui/Pager.svelte
frontend/src/lib/ui/ErrorBanner.svelte
frontend/src/pages/Connect.svelte
frontend/src/pages/Dashboard.svelte
frontend/src/pages/Indexes.svelte
frontend/src/pages/IndexDetail.svelte
frontend/src/pages/Documents.svelte
frontend/src/pages/DocumentEdit.svelte
frontend/src/pages/Search.svelte
frontend/src/pages/MultiSearch.svelte
frontend/src/pages/Settings.svelte
frontend/src/pages/Tasks.svelte
frontend/src/pages/TaskDetail.svelte
frontend/src/pages/Keys.svelte
frontend/src/pages/Instance.svelte
frontend/src/pages/Chat.svelte
frontend/src/pages/Rules.svelte
build/windows/icon.ico
build/windows/wails.exe.manifest
docker-compose.yml                 # chỉ Meilisearch engine, không phải UI
Makefile
README.md
```

---

### Task 1: Scaffold Wails desktop window + session + proxy.Do

**Files:**
- Create: `go.mod`
- Create: `main.go`
- Create: `app.go`
- Create: `wails.json`
- Create: `internal/proxy/proxy.go`
- Create: `internal/proxy/proxy_test.go`
- Create: `internal/session/session.go`
- Create: `internal/session/session_test.go`
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.ts`
- Create: `frontend/src/App.svelte`
- Create: `frontend/src/app.css`
- Create: `Makefile`

**Interfaces:**
- Consumes: nothing
- Produces: `session.Store` với `Set/Get/Clear` (một connection hiện tại); `proxy.New() *Proxy`; `(*Proxy).SetTarget(host, apiKey string)`; `(*Proxy).Do(method, path string, query map[string]string, body []byte) (Result, error)`; Wails `App.Connect/Disconnect/Session/Forward`; cửa sổ native 1280×800

- [ ] **Step 1: Write failing Go tests for session + proxy.Do**

```go
// internal/session/session_test.go
package session

import "testing"

func TestSetGetClear(t *testing.T) {
	s := NewStore()
	s.Set(Conn{Host: "http://127.0.0.1:7700", APIKey: "master-key-16bytes", Name: "local"})
	got, ok := s.Get()
	if !ok || got.Host != "http://127.0.0.1:7700" || got.APIKey != "master-key-16bytes" {
		t.Fatalf("get mismatch: %+v ok=%v", got, ok)
	}
	s.Clear()
	if _, ok := s.Get(); ok {
		t.Fatal("expected cleared")
	}
}
```

```go
// internal/proxy/proxy_test.go
package proxy

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDoForwardsAuthorizationAndPath(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/health" {
			t.Errorf("path=%s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer secret-key" {
			t.Errorf("auth=%s", r.Header.Get("Authorization"))
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(200)
		_, _ = w.Write([]byte(`{"status":"available"}`))
	}))
	defer upstream.Close()

	p := New()
	p.SetTarget(upstream.URL, "secret-key")
	res, err := p.Do("GET", "/health", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	if res.Status != 200 {
		t.Fatalf("status=%d body=%s", res.Status, res.Body)
	}
	if !strings.Contains(string(res.Body), "available") {
		t.Fatalf("body=%s", res.Body)
	}
}

func TestDoMissingTargetReturns503(t *testing.T) {
	p := New()
	res, err := p.Do("GET", "/health", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	if res.Status != http.StatusServiceUnavailable {
		t.Fatalf("status=%d", res.Status)
	}
}

func TestDoPostBodyAndQuery(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		if string(b) != `{"q":"ninja"}` {
			t.Errorf("body=%s", b)
		}
		if r.URL.Query().Get("limit") != "2" {
			t.Errorf("query=%s", r.URL.RawQuery)
		}
		if r.Method != http.MethodPost {
			t.Errorf("method=%s", r.Method)
		}
		w.WriteHeader(200)
		_, _ = w.Write([]byte(`{"hits":[]}`))
	}))
	defer upstream.Close()
	p := New()
	p.SetTarget(upstream.URL, "k")
	res, err := p.Do("POST", "/indexes/movies/search", map[string]string{"limit": "2"}, []byte(`{"q":"ninja"}`))
	if err != nil {
		t.Fatal(err)
	}
	if res.Status != 200 {
		t.Fatalf("status=%d", res.Status)
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `go test ./internal/session ./internal/proxy -count=1`

Expected: FAIL because packages do not exist.

- [ ] **Step 3: Write minimal implementation**

`go.mod`:

```
module github.com/lcs/meilisearchui

go 1.23
```

Chạy `go get github.com/wailsapp/wails/v2` và cài CLI `go install github.com/wailsapp/wails/v2/cmd/wails@latest`. Windows cần WebView2 (thường đã có). `wails doctor` phải xanh trước khi `wails dev`.

```go
// internal/session/session.go
package session

import "sync"

type Conn struct {
	Host   string
	APIKey string
	Name   string
}

type Store struct {
	mu sync.RWMutex
	c  *Conn
}

func NewStore() *Store { return &Store{} }

func (s *Store) Set(c Conn) {
	s.mu.Lock()
	cp := c
	s.c = &cp
	s.mu.Unlock()
}

func (s *Store) Get() (Conn, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.c == nil {
		return Conn{}, false
	}
	return *s.c, true
}

func (s *Store) Clear() {
	s.mu.Lock()
	s.c = nil
	s.mu.Unlock()
}
```

```go
// internal/proxy/proxy.go
package proxy

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
)

type Proxy struct {
	mu     sync.RWMutex
	host   string
	apiKey string
	client *http.Client
}

func New() *Proxy { return &Proxy{client: &http.Client{}} }

func (p *Proxy) SetTarget(host, apiKey string) {
	p.mu.Lock()
	p.host = strings.TrimRight(host, "/")
	p.apiKey = apiKey
	p.mu.Unlock()
}

func (p *Proxy) Clear() {
	p.mu.Lock()
	p.host, p.apiKey = "", ""
	p.mu.Unlock()
}

type Result struct {
	Status int
	Body   []byte
}

func (p *Proxy) Do(method, path string, query map[string]string, body []byte) (Result, error) {
	p.mu.RLock()
	host, key := p.host, p.apiKey
	p.mu.RUnlock()
	if host == "" {
		return Result{Status: http.StatusServiceUnavailable, Body: []byte(`{"message":"not connected","code":"not_connected","type":"auth","link":""}`)}, nil
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	u, err := url.Parse(host + path)
	if err != nil {
		return Result{}, err
	}
	q := u.Query()
	for k, v := range query {
		if v != "" {
			q.Set(k, v)
		}
	}
	u.RawQuery = q.Encode()
	var rdr io.Reader
	if body != nil {
		rdr = bytes.NewReader(body)
	}
	req, err := http.NewRequest(method, u.String(), rdr)
	if err != nil {
		return Result{}, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if key != "" {
		req.Header.Set("Authorization", "Bearer "+key)
	}
	resp, err := p.client.Do(req)
	if err != nil {
		return Result{Status: http.StatusBadGateway, Body: []byte(fmt.Sprintf(`{"message":%q,"code":"proxy_error","type":"system","link":""}`, err.Error()))}, nil
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return Result{}, err
	}
	return Result{Status: resp.StatusCode, Body: b}, nil
}
```

```go
// app.go
package main

import (
	"context"

	"github.com/lcs/meilisearchui/internal/proxy"
	"github.com/lcs/meilisearchui/internal/session"
)

type App struct {
	ctx  context.Context
	sess *session.Store
	pxy  *proxy.Proxy
}

func NewApp() *App {
	return &App{sess: session.NewStore(), pxy: proxy.New()}
}

func (a *App) startup(ctx context.Context) { a.ctx = ctx }

type SessionDTO struct {
	Host string `json:"host"`
	Name string `json:"name"`
}

type ForwardResult struct {
	Status int    `json:"status"`
	Body   string `json:"body"`
}

func (a *App) Connect(host, apiKey, name string) SessionDTO {
	a.sess.Set(session.Conn{Host: host, APIKey: apiKey, Name: name})
	a.pxy.SetTarget(host, apiKey)
	return SessionDTO{Host: host, Name: name}
}

func (a *App) Disconnect() {
	a.sess.Clear()
	a.pxy.Clear()
}

func (a *App) Session() *SessionDTO {
	c, ok := a.sess.Get()
	if !ok {
		return nil
	}
	return &SessionDTO{Host: c.Host, Name: c.Name}
}

func (a *App) Forward(method, path string, query map[string]string, body string) (ForwardResult, error) {
	var b []byte
	if body != "" {
		b = []byte(body)
	}
	res, err := a.pxy.Do(method, path, query, b)
	if err != nil {
		return ForwardResult{}, err
	}
	return ForwardResult{Status: res.Status, Body: string(res.Body)}, nil
}
```

```go
// main.go
package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()
	err := wails.Run(&options.App{
		Title:            "Meilisearch UI",
		Width:            1280,
		Height:           800,
		MinWidth:         960,
		MinHeight:        640,
		DisableResize:    false,
		AssetServer:      &assetserver.Options{Assets: assets},
		BackgroundColour: &options.RGBA{R: 250, G: 250, B: 250, A: 255},
		OnStartup:        app.startup,
		Bind:             []interface{}{app},
		Windows:          &windows.Options{WebviewIsTransparent: false},
	})
	if err != nil {
		println("Error:", err.Error())
	}
}
```

`wails.json`:

```json
{
  "$schema": "https://wails.io/schemas/config.v2.json",
  "name": "meilisearchui",
  "outputfilename": "meilisearchui",
  "frontend:install": "npm install",
  "frontend:build": "npm run build",
  "frontend:dev:watcher": "npm run dev",
  "frontend:dev:serverUrl": "auto",
  "wailsjsdir": "./frontend/src/wailsjs",
  "author": { "name": "LCS" }
}
```

`frontend/package.json`:

```json
{
  "name": "meilisearchui-web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^5.0.0",
    "svelte": "^5.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0",
    "jsdom": "^25.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0"
  }
}
```

`frontend/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  build: { outDir: 'dist', emptyOutDir: true }
});
```

`frontend/src/App.svelte`:

```svelte
<script>
  import { Connect, Forward } from './wailsjs/go/main/App';
  let host = $state('http://127.0.0.1:7700');
  let apiKey = $state('');
  let status = $state('');
  async function connect() {
    await Connect(host, apiKey, 'local');
    const h = await Forward('GET', '/health', {}, '');
    status = h.body;
  }
</script>
<main class="p-6 max-w-lg mx-auto">
  <h1 class="text-xl font-semibold mb-4">Meilisearch UI</h1>
  <p class="text-sm text-gray-600 mb-4">Ứng dụng desktop — kết nối instance Meilisearch local.</p>
  <input class="border w-full mb-2 p-2" bind:value={host} />
  <input class="border w-full mb-2 p-2" type="password" placeholder="API key / master key" bind:value={apiKey} />
  <button class="bg-black text-white px-4 py-2" onclick={connect}>Kết nối</button>
  <pre class="mt-4 text-sm">{status}</pre>
</main>
```

`frontend/src/main.ts`:

```ts
import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';
mount(App, { target: document.getElementById('app')! });
```

`frontend/index.html`:

```html
<!doctype html>
<html lang="vi">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Meilisearch UI</title></head>
  <body><div id="app"></div><script type="module" src="/src/main.ts"></script></body>
</html>
```

`frontend/src/app.css`:

```css
@import "tailwindcss";
```

`Makefile`:

```makefile
.PHONY: test frontend test-frontend dev build
test:
	go test ./...
frontend:
	cd frontend && npm install && npm run build
test-frontend:
	cd frontend && npm test
dev:
	wails dev
build:
	wails build
```

- [ ] **Step 4: Run tests and make sure they pass**

Run: `go test ./internal/session ./internal/proxy -count=1`

Expected: `PASS`

Manual: `wails dev` mở **cửa sổ desktop** (không mở Chrome). Form kết nối hiện trong cửa sổ.

- [ ] **Step 5: Commit**

```bash
git add go.mod main.go app.go wails.json internal frontend Makefile
git commit -m "feat: scaffold Wails desktop window with session and Meilisearch proxy"
```

---

### Task 2: Typed Meilisearch client, errors, waitTask

**Files:**
- Create: `frontend/src/lib/api/types.ts`
- Create: `frontend/src/lib/api/errors.ts`
- Create: `frontend/src/lib/api/client.ts`
- Create: `frontend/src/lib/api/client.test.ts`
- Create: `frontend/src/lib/api/tasks.ts`
- Create: `frontend/src/lib/api/tasks.test.ts`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/vitest.setup.ts`
- Modify: `frontend/src/main.ts`

**Interfaces:**
- Consumes: Wails `App.Forward(method, path, query, body) → {status, body}`
- Produces: `setTransport`; `meili<T>(method, path, body?, query?)` với path kiểu `/health` (không prefix `/meili`); `MeiliError`; `waitTask(uid)`; types `IndexView`, `SummarizedTaskView`, `TaskView`, `ResponseError`, `SearchQuery`, `SearchResult`, `KeyView`, `Settings`

Vitest `setupFiles` gắn transport giả qua `fetch('/meili'+path)` để các test Task 4–11 (mock `fetch`) vẫn chạy. Production `main.ts` gắn transport Wails `Forward` — cửa sổ desktop **không** fetch Meilisearch.

- [ ] **Step 1: Write failing Vitest tests**

`frontend/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'jsdom', setupFiles: ['./vitest.setup.ts'] }
});
```

`frontend/vitest.setup.ts`:

```ts
import { setTransport } from './src/lib/api/client';

setTransport(async ({ method, path, query, body }) => {
  const p = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      p.set(k, String(v));
    }
  }
  const qs = p.toString();
  const res = await fetch(`/meili${path}${qs ? `?${qs}` : ''}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: JSON.stringify(json) };
});
```

```ts
// frontend/src/lib/api/client.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { meili, MeiliError } from './client';

describe('meili', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('GETs /meili path and parses json', async () => {
    (fetch as any).mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ status: 'available' }),
      headers: { get: () => 'application/json' }
    });
    const got = await meili<{ status: string }>('GET', '/health');
    expect(got.status).toBe('available');
    expect(fetch).toHaveBeenCalledWith('/meili/health', expect.objectContaining({ method: 'GET' }));
  });

  it('encodes query and JSON body', async () => {
    (fetch as any).mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ hits: [] }),
      headers: { get: () => 'application/json' }
    });
    await meili('POST', '/indexes/movies/search', { q: 'ninja' }, { limit: 2 });
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('/meili/indexes/movies/search?limit=2');
    expect(init.body).toBe(JSON.stringify({ q: 'ninja' }));
  });

  it('throws MeiliError from ResponseError body', async () => {
    (fetch as any).mockResolvedValue({
      ok: false, status: 401,
      json: async () => ({
        message: 'The Authorization header is missing.',
        code: 'missing_authorization_header',
        type: 'auth',
        link: 'https://docs.meilisearch.com/errors#missing_authorization_header'
      }),
      headers: { get: () => 'application/json' }
    });
    await expect(meili('GET', '/keys')).rejects.toMatchObject({
      code: 'missing_authorization_header',
      httpStatus: 401
    });
    expect(MeiliError).toBeDefined();
  });
});
```

```ts
// frontend/src/lib/api/tasks.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitTask } from './tasks';

describe('waitTask', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('resolves when status is succeeded', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ uid: 1, status: 'processing' }),
        headers: { get: () => 'application/json' }
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ uid: 1, status: 'succeeded' }),
        headers: { get: () => 'application/json' }
      });
    const t = await waitTask(1, { intervalMs: 1, timeoutMs: 1000 });
    expect(t.status).toBe('succeeded');
  });

  it('throws when task failed', async () => {
    (fetch as any).mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ uid: 2, status: 'failed', error: { message: 'boom', code: 'x', type: 'internal', link: '' } }),
      headers: { get: () => 'application/json' }
    });
    await expect(waitTask(2, { intervalMs: 1, timeoutMs: 1000 })).rejects.toMatchObject({ code: 'x' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test`

Expected: FAIL module not found `./client` / `./tasks`.

- [ ] **Step 3: Write types + client + waitTask**

```ts
// frontend/src/lib/api/errors.ts
export type ErrorType = 'internal' | 'invalid_request' | 'auth' | 'system';

export type ResponseError = {
  message: string;
  code: string;
  type: ErrorType;
  link: string;
};

export class MeiliError extends Error {
  constructor(
    public httpStatus: number,
    public code: string,
    public type: ErrorType | string,
    public link: string,
    message: string
  ) {
    super(message);
    this.name = 'MeiliError';
  }
}
```

```ts
// frontend/src/lib/api/types.ts
export type IndexView = {
  uid: string;
  createdAt: string;
  updatedAt: string;
  primaryKey: string | null;
};

export type Pagination<T> = {
  results: T[];
  offset: number;
  limit: number;
  total: number;
};

export type TaskStatus = 'enqueued' | 'processing' | 'succeeded' | 'failed' | 'canceled';

export type TaskKind =
  | 'documentAdditionOrUpdate'
  | 'documentEdition'
  | 'documentDeletion'
  | 'settingsUpdate'
  | 'indexCreation'
  | 'indexDeletion'
  | 'indexUpdate'
  | 'indexSwap'
  | 'taskCancelation'
  | 'taskDeletion'
  | 'dumpCreation'
  | 'snapshotCreation'
  | 'export'
  | 'upgradeDatabase'
  | 'indexCompaction'
  | 'networkTopologyChange'
  | 'dsrUpdate'
  | 'dsrClear';

export type SummarizedTaskView = {
  taskUid: number;
  indexUid: string | null;
  status: TaskStatus;
  type: TaskKind;
  enqueuedAt: string;
  customMetadata?: string | null;
};

export type TaskView = {
  uid: number;
  batchUid: number | null;
  indexUid: string | null;
  status: TaskStatus;
  type: TaskKind;
  canceledBy: number | null;
  details: Record<string, unknown> | null;
  error: { message: string; code: string; type: string; link: string } | null;
  duration: string | null;
  enqueuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  customMetadata?: string | null;
};

export type MatchingStrategy = 'last' | 'all' | 'frequency';

export type SearchQuery = {
  q?: string | null;
  offset?: number;
  limit?: number;
  page?: number | null;
  hitsPerPage?: number | null;
  attributesToRetrieve?: string[] | null;
  attributesToCrop?: string[] | null;
  cropLength?: number;
  cropMarker?: string;
  attributesToHighlight?: string[] | null;
  highlightPreTag?: string;
  highlightPostTag?: string;
  showMatchesPosition?: boolean;
  filter?: string | string[] | string[][];
  sort?: string[] | null;
  distinct?: string | null;
  facets?: string[] | null;
  matchingStrategy?: MatchingStrategy;
  attributesToSearchOn?: string[] | null;
  rankingScoreThreshold?: number | null;
  locales?: string[] | null;
  hybrid?: { embedder?: string; semanticRatio?: number } | null;
  vector?: number[] | null;
  retrieveVectors?: boolean;
  showRankingScore?: boolean;
  showRankingScoreDetails?: boolean;
  showPerformanceDetails?: boolean;
};

export type SearchResult = {
  hits: Record<string, unknown>[];
  offset?: number;
  limit?: number;
  estimatedTotalHits?: number;
  totalHits?: number;
  totalPages?: number;
  page?: number;
  hitsPerPage?: number;
  processingTimeMs: number;
  query: string;
  facetDistribution?: Record<string, Record<string, number>>;
  facetStats?: Record<string, { min: number; max: number }>;
};

export type KeyAction =
  | '*'
  | 'search'
  | 'documents.*' | 'documents.add' | 'documents.get' | 'documents.delete'
  | 'indexes.*' | 'indexes.create' | 'indexes.get' | 'indexes.update' | 'indexes.delete' | 'indexes.swap' | 'indexes.compact'
  | 'tasks.*' | 'tasks.cancel' | 'tasks.delete' | 'tasks.get' | 'tasks.compact'
  | 'settings.*' | 'settings.get' | 'settings.update'
  | 'stats.*' | 'stats.get'
  | 'metrics.*' | 'metrics.get'
  | 'dumps.*' | 'dumps.create'
  | 'snapshots.*' | 'snapshots.create'
  | 'version'
  | 'keys.create' | 'keys.get' | 'keys.update' | 'keys.delete'
  | 'experimental.get' | 'experimental.update'
  | 'export'
  | 'network.get' | 'network.update'
  | 'chatCompletions'
  | 'chats.*' | 'chats.get' | 'chats.delete'
  | 'chatsSettings.*' | 'chatsSettings.get' | 'chatsSettings.update'
  | '*.get'
  | 'webhooks.get' | 'webhooks.update' | 'webhooks.delete' | 'webhooks.create' | 'webhooks.*'
  | 'fields.post'
  | 'dynamicSearchRules.get' | 'dynamicSearchRules.create' | 'dynamicSearchRules.update' | 'dynamicSearchRules.delete' | 'dynamicSearchRules.*';

export type KeyView = {
  name: string | null;
  description: string | null;
  key: string;
  uid: string;
  actions: KeyAction[];
  indexes: string[];
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateApiKey = {
  name?: string | null;
  description?: string | null;
  uid?: string | null;
  actions: KeyAction[];
  indexes: string[];
  expiresAt?: string | null;
};

export type Settings = {
  displayedAttributes: string[] | null;
  searchableAttributes: string[] | null;
  filterableAttributes: unknown[] | null;
  sortableAttributes: string[] | null;
  foreignKeys: unknown[] | null;
  rankingRules: string[] | null;
  stopWords: string[] | null;
  nonSeparatorTokens: string[] | null;
  separatorTokens: string[] | null;
  dictionary: string[] | null;
  synonyms: Record<string, string[]> | null;
  distinctAttribute: string | null;
  proximityPrecision: string | null;
  typoTolerance: {
    enabled?: boolean | null;
    minWordSizeForTypos?: { oneTypo?: number; twoTypos?: number } | null;
    disableOnWords?: string[] | null;
    disableOnAttributes?: string[] | null;
    disableOnNumbers?: boolean | null;
  } | null;
  faceting: { maxValuesPerFacet?: number | null; sortFacetValuesBy?: Record<string, string> | null } | null;
  pagination: { maxTotalHits?: number | null } | null;
  embedders: Record<string, unknown> | null;
  searchCutoffMs: number | null;
  localizedAttributes: unknown[] | null;
  facetSearch: boolean | null;
  prefixSearch: string | null;
  chat: {
    description?: string | null;
    documentTemplate?: string | null;
    documentTemplateMaxBytes?: number | null;
    searchParameters?: Record<string, unknown> | null;
  } | null;
};

export type IndexStats = {
  numberOfDocuments: number;
  isIndexing: boolean;
  fieldDistribution: Record<string, number>;
  numberOfEmbeddings?: number | null;
  numberOfEmbeddedDocuments?: number | null;
};

export type InstanceStats = {
  databaseSize: number;
  usedDatabaseSize?: number;
  lastUpdate: string | null;
  indexes: Record<string, IndexStats>;
};

export type VersionResponse = {
  commitSha: string;
  commitDate: string;
  pkgVersion: string;
};
```

```ts
// frontend/src/lib/api/client.ts
import { MeiliError, type ResponseError } from './errors';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type TransportReq = {
  method: Method;
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
};

export type TransportRes = { status: number; body: string };

export type Transport = (req: TransportReq) => Promise<TransportRes>;

let transport: Transport | null = null;

export function setTransport(t: Transport): void {
  transport = t;
}

export async function meili<T>(
  method: Method,
  path: string,
  body?: unknown,
  query?: Record<string, string | number | boolean | undefined | null>
): Promise<T> {
  if (!transport) {
    throw new Error('transport not set');
  }
  const res = await transport({ method, path, query, body });
  const data = res.body ? JSON.parse(res.body) : {};
  if (res.status < 200 || res.status >= 300) {
    const err = data as ResponseError;
    throw new MeiliError(res.status, err.code ?? 'http_error', err.type ?? 'system', err.link ?? '', err.message ?? String(res.status));
  }
  return data as T;
}

export { MeiliError };
```

Trong `frontend/src/main.ts`, **trước** `mount`, gắn Wails transport:

```ts
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
```

```ts
// frontend/src/lib/api/tasks.ts
import { meili, MeiliError } from './client';
import type { TaskView } from './types';

const DONE: TaskView['status'][] = ['succeeded', 'failed', 'canceled'];

export async function waitTask(
  uid: number,
  opts: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<TaskView> {
  const intervalMs = opts.intervalMs ?? 200;
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const t = await meili<TaskView>('GET', `/tasks/${uid}`);
    if (DONE.includes(t.status)) {
      if (t.status === 'failed') {
        const e = t.error;
        throw new MeiliError(400, e?.code ?? 'task_failed', e?.type ?? 'internal', e?.link ?? '', e?.message ?? 'task failed');
      }
      return t;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new MeiliError(408, 'task_timeout', 'system', '', `task ${uid} timeout`);
}
```

- [ ] **Step 4: Run tests**

Run: `cd frontend && npm test`

Expected: PASS both files.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: add typed Meilisearch client, errors, and waitTask"
```

---

### Task 3: Connect screen + Dashboard (health, version, stats)

**Files:**
- Create: `frontend/src/lib/ui/Layout.svelte`
- Create: `frontend/src/lib/ui/ErrorBanner.svelte`
- Create: `frontend/src/pages/Connect.svelte`
- Create: `frontend/src/pages/Dashboard.svelte`
- Create: `frontend/src/lib/store/connection.ts`
- Modify: `frontend/src/App.svelte`

**Interfaces:**
- Consumes: `meili`; Wails `Connect`, `Session`, `Disconnect`
- Produces: routes `#/connect`, `#/dashboard`; nav shell trong cửa sổ desktop

- [ ] **Step 1: Write failing test for session helpers**

```ts
// frontend/src/lib/store/connection.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../wailsjs/go/main/App', () => ({
  Connect: vi.fn(async (host: string, _key: string, name: string) => ({ host, name })),
  Session: vi.fn(async () => null),
  Disconnect: vi.fn(async () => {})
}));

import { Connect, Session, Disconnect } from '../../wailsjs/go/main/App';
import { connect, disconnect, currentSession } from './connection';

describe('connection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls Wails Connect', async () => {
    await connect({ host: 'http://127.0.0.1:7700', apiKey: 'k', name: 'local' });
    expect(Connect).toHaveBeenCalledWith('http://127.0.0.1:7700', 'k', 'local');
  });

  it('currentSession returns null when Session is null', async () => {
    (Session as any).mockResolvedValueOnce(null);
    expect(await currentSession()).toBeNull();
  });

  it('disconnect calls Wails Disconnect', async () => {
    await disconnect();
    expect(Disconnect).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd frontend && npx vitest run src/lib/store/connection.test.ts`

Expected: FAIL module not found.

- [ ] **Step 3: Implement store + pages**

```ts
// frontend/src/lib/store/connection.ts
import { Connect, Disconnect, Session as WailsSession } from '../../wailsjs/go/main/App';

export type Session = { host: string; name: string };

export async function connect(input: { host: string; apiKey: string; name: string }): Promise<Session> {
  return Connect(input.host, input.apiKey, input.name);
}

export async function currentSession(): Promise<Session | null> {
  return WailsSession();
}

export async function disconnect(): Promise<void> {
  await Disconnect();
}
```

Hash router tối giản trong `App.svelte`: parse `location.hash` (`#/dashboard`, `#/indexes`, …). `Layout.svelte` sidebar: Dashboard, Indexes, Search, Tasks, Keys, Instance, Chat, Rules, Đăng xuất.

`Connect.svelte`: form host + apiKey, gọi `connect`, rồi `meili('GET','/health')` và `meili('GET','/version')`. Fail → `ErrorBanner` hiện `MeiliError.message` + `code`.

`Dashboard.svelte` load song song:

- `GET /health` → badge `available`
- `GET /version` → `pkgVersion`, `commitSha`, `commitDate`
- `GET /stats` → `databaseSize`, `lastUpdate`, bảng indexes (`numberOfDocuments`, `isIndexing`)
- `GET /metrics` (optional): nếu 404/403 thì ẩn, không fail cả trang

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run src/lib/store/connection.test.ts`

Expected: PASS

Manual: `wails dev` mở cửa sổ desktop (không mở Chrome). Kết nối instance local, thấy version + stats trong cửa sổ.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: add connect flow and instance dashboard"
```

---

### Task 4: Indexes (CRUD, swap, compact, fields)

**Files:**
- Create: `frontend/src/pages/Indexes.svelte`
- Create: `frontend/src/pages/IndexDetail.svelte`
- Create: `frontend/src/lib/api/indexes.ts`
- Create: `frontend/src/lib/api/indexes.test.ts`
- Create: `frontend/src/lib/ui/TaskToast.svelte`

**Interfaces:**
- Consumes: `meili`, `waitTask`, `IndexView`, `SummarizedTaskView`
- Produces: `listIndexes`, `createIndex`, `updateIndex`, `deleteIndex`, `swapIndexes`, `compactIndex`, `listIndexFields`

API:

```
GET    /indexes?offset&limit
POST   /indexes                 { uid, primaryKey? }
GET    /indexes/{uid}
PATCH  /indexes/{uid}           { primaryKey?, uid? }
DELETE /indexes/{uid}
POST   /swap-indexes            { indexes: [[a,b], ...] }
POST   /indexes/{uid}/compact
POST   /indexes/{uid}/fields    { offset?, limit? }   // list fields metadata
GET    /indexes/{uid}/stats
```

- [ ] **Step 1: Write failing tests**

```ts
// frontend/src/lib/api/indexes.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createIndex, swapIndexes } from './indexes';

describe('indexes api', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs /indexes with uid and primaryKey', async () => {
    (fetch as any).mockResolvedValue({
      ok: true, status: 202,
      json: async () => ({ taskUid: 1, indexUid: 'movies', status: 'enqueued', type: 'indexCreation', enqueuedAt: '' }),
      headers: { get: () => 'application/json' }
    });
    const t = await createIndex({ uid: 'movies', primaryKey: 'id' });
    expect(t.taskUid).toBe(1);
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('/meili/indexes');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ uid: 'movies', primaryKey: 'id' }));
  });

  it('POSTs /swap-indexes', async () => {
    (fetch as any).mockResolvedValue({
      ok: true, status: 202,
      json: async () => ({ taskUid: 2, indexUid: null, status: 'enqueued', type: 'indexSwap', enqueuedAt: '' }),
      headers: { get: () => 'application/json' }
    });
    await swapIndexes([['movies', 'movies_new']]);
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('/meili/swap-indexes');
    expect(JSON.parse(init.body).indexes).toEqual([['movies', 'movies_new']]);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd frontend && npx vitest run src/lib/api/indexes.test.ts`

Expected: FAIL module not found.

- [ ] **Step 3: Implement API + pages**

```ts
// frontend/src/lib/api/indexes.ts
import { meili } from './client';
import type { IndexView, Pagination, SummarizedTaskView, IndexStats } from './types';

export const listIndexes = (offset = 0, limit = 20) =>
  meili<Pagination<IndexView>>('GET', '/indexes', undefined, { offset, limit });

export const getIndex = (uid: string) => meili<IndexView>('GET', `/indexes/${encodeURIComponent(uid)}`);

export const createIndex = (body: { uid: string; primaryKey?: string | null }) =>
  meili<SummarizedTaskView>('POST', '/indexes', body);

export const updateIndex = (uid: string, body: { primaryKey?: string | null; uid?: string }) =>
  meili<SummarizedTaskView>('PATCH', `/indexes/${encodeURIComponent(uid)}`, body);

export const deleteIndex = (uid: string) =>
  meili<SummarizedTaskView>('DELETE', `/indexes/${encodeURIComponent(uid)}`);

export const swapIndexes = (pairs: string[][]) =>
  meili<SummarizedTaskView>('POST', '/swap-indexes', { indexes: pairs });

export const compactIndex = (uid: string) =>
  meili<SummarizedTaskView>('POST', `/indexes/${encodeURIComponent(uid)}/compact`);

export const getIndexStats = (uid: string) =>
  meili<IndexStats>('GET', `/indexes/${encodeURIComponent(uid)}/stats`);

export const listIndexFields = (uid: string, offset = 0, limit = 100) =>
  meili<unknown>('POST', `/indexes/${encodeURIComponent(uid)}/fields`, { offset, limit });
```

`Indexes.svelte`: bảng uid / primaryKey / dates / doc count (từ stats nếu đã load). Nút Tạo index (modal uid + primaryKey) → `createIndex` → `waitTask`. Nút Swap (chọn 2 uid). Confirm trước khi xóa.

`IndexDetail.svelte`: tabs Documents | Search | Settings | Fields | Stats. Compact button.

`TaskToast.svelte`: hiện `taskUid`, `status`, link `#/tasks/{uid}`.

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run src/lib/api/indexes.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: add index CRUD, swap, compact, and fields"
```

---

### Task 5: Documents (browse, CRUD, import, filter delete, edit-by-function)

**Files:**
- Create: `frontend/src/pages/Documents.svelte`
- Create: `frontend/src/pages/DocumentEdit.svelte`
- Create: `frontend/src/lib/api/documents.ts`
- Create: `frontend/src/lib/api/documents.test.ts`
- Create: `frontend/src/lib/ui/JsonEditor.svelte`

**Interfaces:**
- Consumes: `meili`, `waitTask`
- Produces: `fetchDocuments`, `getDocument`, `addOrReplace`, `addOrUpdate`, `deleteDocument`, `deleteAllDocuments`, `deleteByFilter`, `deleteBatch`, `editByFunction`

API:

```
POST   /indexes/{uid}/documents/fetch     { offset, limit, fields?, filter?, sort? }
GET    /indexes/{uid}/documents/{id}?fields=
PUT    /indexes/{uid}/documents?primaryKey=   // replace
POST   /indexes/{uid}/documents?primaryKey=   // update (upsert merge)
DELETE /indexes/{uid}/documents/{id}
DELETE /indexes/{uid}/documents               // all
POST   /indexes/{uid}/documents/delete        { filter }
POST   /indexes/{uid}/documents/delete-batch  [id, id]
POST   /indexes/{uid}/documents/edit          { filter?, context?, function: rhai }
```

- [ ] **Step 1: Write failing tests**

```ts
// frontend/src/lib/api/documents.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchDocuments, addOrReplace, deleteByFilter, editByFunction } from './documents';

describe('documents api', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, status: 200, json: async () => ({ results: [], total: 0 }), headers: { get: () => 'application/json' }
  })));
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs /documents/fetch', async () => {
    await fetchDocuments('movies', { offset: 0, limit: 20, filter: 'id > 1' });
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('/meili/indexes/movies/documents/fetch');
    expect(JSON.parse(init.body)).toEqual({ offset: 0, limit: 20, filter: 'id > 1' });
  });

  it('PUTs documents for replace', async () => {
    (fetch as any).mockResolvedValue({
      ok: true, json: async () => ({ taskUid: 9, indexUid: 'movies', status: 'enqueued', type: 'documentAdditionOrUpdate', enqueuedAt: '' }),
      headers: { get: () => 'application/json' }
    });
    await addOrReplace('movies', [{ id: 1, title: 'x' }], 'id');
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('/meili/indexes/movies/documents?primaryKey=id');
    expect(init.method).toBe('PUT');
  });

  it('POSTs delete by filter and edit by function', async () => {
    (fetch as any).mockResolvedValue({
      ok: true, json: async () => ({ taskUid: 10, indexUid: 'movies', status: 'enqueued', type: 'documentDeletion', enqueuedAt: '' }),
      headers: { get: () => 'application/json' }
    });
    await deleteByFilter('movies', 'genres = horror');
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/indexes/movies/documents/delete');
    await editByFunction('movies', { function: 'doc.title = "a"; doc', filter: 'id = 1' });
    expect((fetch as any).mock.calls[1][0]).toBe('/meili/indexes/movies/documents/edit');
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd frontend && npx vitest run src/lib/api/documents.test.ts`

Expected: FAIL module not found.

- [ ] **Step 3: Implement**

```ts
// frontend/src/lib/api/documents.ts
import { meili } from './client';
import type { SummarizedTaskView } from './types';

export type FetchDocsQuery = {
  offset?: number;
  limit?: number;
  fields?: string[];
  filter?: string;
  sort?: string[];
  retrieveVectors?: boolean;
};

export const fetchDocuments = (uid: string, q: FetchDocsQuery) =>
  meili<{ results: Record<string, unknown>[]; offset: number; limit: number; total: number }>(
    'POST', `/indexes/${encodeURIComponent(uid)}/documents/fetch`, q
  );

export const getDocument = (uid: string, id: string, fields?: string) =>
  meili<Record<string, unknown>>('GET', `/indexes/${encodeURIComponent(uid)}/documents/${encodeURIComponent(id)}`, undefined, { fields });

export const addOrReplace = (uid: string, docs: unknown[], primaryKey?: string) =>
  meili<SummarizedTaskView>('PUT', `/indexes/${encodeURIComponent(uid)}/documents`, docs, { primaryKey });

export const addOrUpdate = (uid: string, docs: unknown[], primaryKey?: string) =>
  meili<SummarizedTaskView>('POST', `/indexes/${encodeURIComponent(uid)}/documents`, docs, { primaryKey });

export const deleteDocument = (uid: string, id: string) =>
  meili<SummarizedTaskView>('DELETE', `/indexes/${encodeURIComponent(uid)}/documents/${encodeURIComponent(id)}`);

export const deleteAllDocuments = (uid: string) =>
  meili<SummarizedTaskView>('DELETE', `/indexes/${encodeURIComponent(uid)}/documents`);

export const deleteByFilter = (uid: string, filter: string) =>
  meili<SummarizedTaskView>('POST', `/indexes/${encodeURIComponent(uid)}/documents/delete`, { filter });

export const deleteBatch = (uid: string, ids: Array<string | number>) =>
  meili<SummarizedTaskView>('POST', `/indexes/${encodeURIComponent(uid)}/documents/delete-batch`, ids);

export const editByFunction = (uid: string, body: { function: string; filter?: string; context?: Record<string, unknown> }) =>
  meili<SummarizedTaskView>('POST', `/indexes/${encodeURIComponent(uid)}/documents/edit`, body);
```

UI:

- Bảng documents: pager `offset/limit`, cột theo keys của hit đầu, click mở editor.
- Import: textarea JSON array hoặc file `.json` → radio Replace (PUT) / Update (POST) → `waitTask`.
- Multi-select → delete-batch.
- Toolbar filter string → Apply filter trên fetch; nút "Xóa theo filter" confirm.
- Edit-by-function: textarea RHAI (`doc.price = doc.price * 0.9; doc`) + optional filter.
- `JsonEditor.svelte`: textarea + `JSON.parse` validation trước khi save.
- Xóa all: gõ đúng uid index để confirm.

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run src/lib/api/documents.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: add document browse, import, delete, and RHAI edit"
```

---

### Task 6: Search playground (search, facets, similar, multi-search)

**Files:**
- Create: `frontend/src/lib/api/search.ts`
- Create: `frontend/src/lib/api/search.test.ts`
- Create: `frontend/src/pages/Search.svelte`
- Create: `frontend/src/pages/MultiSearch.svelte`

**Interfaces:**
- Consumes: `SearchQuery`, `SearchResult`, `meili`
- Produces: `searchIndex`, `facetSearch`, `similarDocuments`, `multiSearch`; UI gửi **đúng** field OpenAPI, bỏ field empty

SearchQuery fields bắt buộc hỗ trợ trên form (OpenAPI `SearchQuery`):

`q, offset, limit, page, hitsPerPage, attributesToRetrieve, attributesToCrop, cropLength, cropMarker, attributesToHighlight, highlightPreTag, highlightPostTag, showMatchesPosition, filter, sort, distinct, facets, matchingStrategy (last|all|frequency), attributesToSearchOn, rankingScoreThreshold, locales, hybrid.embedder, hybrid.semanticRatio, vector, retrieveVectors, showRankingScore, showRankingScoreDetails, showPerformanceDetails`

Response hiển thị: `hits`, `_formatted`, `_rankingScore`, `facetDistribution`, `facetStats`, `processingTimeMs`, `estimatedTotalHits` hoặc `totalHits/totalPages`.

API:

```
POST /indexes/{uid}/search
POST /indexes/{uid}/facet-search   { facetName, facetQuery?, q?, filter?, matchingStrategy?, exhaustiveFacetCount? }
POST /indexes/{uid}/similar        { id, embedder?, limit?, offset?, filter?, attributesToRetrieve?, showRankingScore? }
POST /multi-search                 { queries: SearchQueryWithIndex[], federation?: object }
```

- [ ] **Step 1: Write failing tests**

```ts
// frontend/src/lib/api/search.test.ts
import { describe, it, expect } from 'vitest';
import { compactSearchQuery } from './search';

describe('compactSearchQuery', () => {
  it('drops empty optional fields but keeps q empty string as placeholder search', () => {
    expect(compactSearchQuery({ q: '', limit: 20, filter: '', sort: [], hybrid: null })).toEqual({
      q: '',
      limit: 20
    });
  });

  it('keeps matchingStrategy and facets', () => {
    expect(compactSearchQuery({
      q: 'ninja',
      matchingStrategy: 'all',
      facets: ['genres'],
      showRankingScore: true
    })).toEqual({
      q: 'ninja',
      matchingStrategy: 'all',
      facets: ['genres'],
      showRankingScore: true
    });
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd frontend && npx vitest run src/lib/api/search.test.ts`

Expected: FAIL module not found.

- [ ] **Step 3: Implement**

```ts
// frontend/src/lib/api/search.ts
import { meili } from './client';
import type { SearchQuery, SearchResult } from './types';

export function compactSearchQuery(q: SearchQuery): SearchQuery {
  const out: SearchQuery = {};
  (Object.keys(q) as (keyof SearchQuery)[]).forEach((k) => {
    const v = q[k];
    if (v === undefined || v === null) return;
    if (typeof v === 'string' && v === '' && k !== 'q') return;
    if (Array.isArray(v) && v.length === 0) return;
    (out as any)[k] = v;
  });
  return out;
}

export const searchIndex = (uid: string, q: SearchQuery) =>
  meili<SearchResult>('POST', `/indexes/${encodeURIComponent(uid)}/search`, compactSearchQuery(q));

export const facetSearch = (uid: string, body: {
  facetName: string;
  facetQuery?: string | null;
  q?: string | null;
  filter?: string;
  matchingStrategy?: SearchQuery['matchingStrategy'];
  exhaustiveFacetCount?: boolean | null;
}) => meili<{ facetHits: { value: string; count: number }[]; processingTimeMs: number }>(
  'POST', `/indexes/${encodeURIComponent(uid)}/facet-search`, body
);

export const similarDocuments = (uid: string, body: {
  id: string;
  embedder?: string;
  limit?: number;
  offset?: number;
  filter?: string;
  attributesToRetrieve?: string[];
  showRankingScore?: boolean;
}) => meili<SearchResult>('POST', `/indexes/${encodeURIComponent(uid)}/similar`, body);

export type MultiQuery = SearchQuery & { indexUid: string; federationOptions?: { weight?: number } };

export const multiSearch = (body: { queries: MultiQuery[]; federation?: { limit?: number; offset?: number; facetsByIndex?: Record<string, string[]> } | null }) =>
  meili<unknown>('POST', '/multi-search', body);
```

`Search.svelte` layout 3 cột:

1. Index select + ô `q` + nút Search (Enter).
2. Panel tham số (collapsible groups: Pagination, Filter/Sort, Highlight/Crop, Ranking/Hybrid, Facets). Filter textarea. Facets input comma-separated → `facets: string[]`. matchingStrategy select `last|all|frequency`.
3. Hits: render `_formatted` HTML (highlight mặc định `<em>`), JSON toggle, pager. Sidebar facetDistribution click → append filter `attr = "value"`. Ô facet-search (facetName + facetQuery). Nút Similar trên mỗi hit (cần embedder name).

`MultiSearch.svelte`: list query blocks (indexUid + q + filter + limit) + checkbox federation. Hiện hits theo index hoặc federated list.

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run src/lib/api/search.test.ts`

Expected: PASS

Manual: search `q` rỗng = placeholder search; phrase `"Winter Feast"`; exclude `-word`; filter `genres = horror`; sort `release_date:desc` (cần sortableAttributes).

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: add search playground with facets, similar, and multi-search"
```

---

### Task 7: Settings editor (all 22 setting groups)

**Files:**
- Create: `frontend/src/lib/api/settings.ts`
- Create: `frontend/src/lib/api/settings.test.ts`
- Create: `frontend/src/pages/Settings.svelte`

**Interfaces:**
- Consumes: `Settings`, `waitTask`
- Produces: `getSettings`, `patchSettings`, `resetAllSettings`, `resetSetting(uid, name)`

Setting names (sub-route slug → field):

| slug | field | editor |
|---|---|---|
| displayed-attributes | displayedAttributes | string list, default `["*"]` |
| searchable-attributes | searchableAttributes | string list, default `["*"]` |
| filterable-attributes | filterableAttributes | JSON (string hoặc object attributePatterns) |
| sortable-attributes | sortableAttributes | string list |
| ranking-rules | rankingRules | ordered list, default `["words","typo","proximity","attribute","sort","exactness"]` |
| stop-words | stopWords | string list |
| synonyms | synonyms | JSON object `{ "foo": ["bar"] }` |
| distinct-attribute | distinctAttribute | string/null |
| typo-tolerance | typoTolerance | form enabled, minWordSizeForTypos.oneTypo/twoTypos, disableOnWords, disableOnAttributes, disableOnNumbers |
| faceting | faceting | maxValuesPerFacet, sortFacetValuesBy JSON |
| pagination | pagination | maxTotalHits |
| faceted-search / facet-search | facetSearch | boolean |
| prefix-search | prefixSearch | indexingTime / disabled |
| separator-tokens | separatorTokens | string list |
| non-separator-tokens | nonSeparatorTokens | string list |
| dictionary | dictionary | string list |
| proximity-precision | proximityPrecision | byWord / byAttribute |
| search-cutoff-ms | searchCutoffMs | number |
| localized-attributes | localizedAttributes | JSON |
| embedders | embedders | JSON object (ẩn apiKey sau get nếu Meilisearch redacted) |
| chat | chat | form description + documentTemplate |
| foreign-keys | foreignKeys | JSON |

Reset một setting: `DELETE /indexes/{uid}/settings/{slug}`  
Reset all: `DELETE /indexes/{uid}/settings`  
Save all: `PATCH /indexes/{uid}/settings` body chỉ gồm field đã đổi (partial). `null` = reset field đó theo spec.

- [ ] **Step 1: Write failing tests**

```ts
// frontend/src/lib/api/settings.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSettings, patchSettings, resetSetting } from './settings';

describe('settings api', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, json: async () => ({}), headers: { get: () => 'application/json' }
  })));
  afterEach(() => vi.unstubAllGlobals());

  it('GET /indexes/{uid}/settings', async () => {
    await getSettings('movies');
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/indexes/movies/settings');
    expect((fetch as any).mock.calls[0][1].method).toBe('GET');
  });

  it('PATCH only dirty fields', async () => {
    await patchSettings('movies', { stopWords: ['the'] });
    const [, init] = (fetch as any).mock.calls[0];
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ stopWords: ['the'] }));
  });

  it('DELETE sub-route to reset one setting', async () => {
    await resetSetting('movies', 'synonyms');
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/indexes/movies/settings/synonyms');
    expect((fetch as any).mock.calls[0][1].method).toBe('DELETE');
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd frontend && npx vitest run src/lib/api/settings.test.ts`

Expected: FAIL module not found.

- [ ] **Step 3: Implement**

```ts
// frontend/src/lib/api/settings.ts
import { meili } from './client';
import type { Settings, SummarizedTaskView } from './types';

export const SETTING_SLUGS = [
  'displayed-attributes',
  'searchable-attributes',
  'filterable-attributes',
  'sortable-attributes',
  'ranking-rules',
  'stop-words',
  'synonyms',
  'distinct-attribute',
  'typo-tolerance',
  'faceting',
  'pagination',
  'facet-search',
  'prefix-search',
  'separator-tokens',
  'non-separator-tokens',
  'dictionary',
  'proximity-precision',
  'search-cutoff-ms',
  'localized-attributes',
  'embedders',
  'chat',
  'foreign-keys'
] as const;

export type SettingSlug = (typeof SETTING_SLUGS)[number];

export const getSettings = (uid: string) =>
  meili<Settings>('GET', `/indexes/${encodeURIComponent(uid)}/settings`);

export const patchSettings = (uid: string, patch: Partial<Settings>) =>
  meili<SummarizedTaskView>('PATCH', `/indexes/${encodeURIComponent(uid)}/settings`, patch);

export const resetAllSettings = (uid: string) =>
  meili<SummarizedTaskView>('DELETE', `/indexes/${encodeURIComponent(uid)}/settings`);

export const resetSetting = (uid: string, slug: SettingSlug) =>
  meili<SummarizedTaskView>('DELETE', `/indexes/${encodeURIComponent(uid)}/settings/${slug}`);
```

`Settings.svelte`: load `getSettings`, mỗi group một card, nút Reset group → `resetSetting` + `waitTask` + reload. Nút Lưu → diff với snapshot gốc → `patchSettings`. Nút Reset all (confirm gõ uid).

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run src/lib/api/settings.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: add full index settings editor with per-setting reset"
```

---

### Task 8: Tasks + Batches

**Files:**
- Create: `frontend/src/lib/api/async.ts`
- Create: `frontend/src/lib/api/async.test.ts`
- Create: `frontend/src/pages/Tasks.svelte`
- Create: `frontend/src/pages/TaskDetail.svelte`

**Interfaces:**
- Consumes: `TaskView`, `waitTask`
- Produces: `listTasks`, `getTask`, `getTaskDocuments`, `cancelTasks`, `deleteTasks`, `compactTasks`, `listBatches`, `getBatch`

API filters (`GET /tasks` query): `uids`, `batchUids`, `indexUids`, `statuses`, `types`, `canceledBy`, `beforeEnqueuedAt`, `afterEnqueuedAt`, `beforeStartedAt`, `afterStartedAt`, `beforeFinishedAt`, `afterFinishedAt`, `limit`, `from`, `reverse`.

`POST /tasks/cancel` và `DELETE /tasks` dùng **cùng bộ filter**, bắt buộc ≥1 filter.

`GET /tasks/{id}/documents` chỉ khi task document đang enqueued/processing.

`GET /tasks/stream` và `GET /batches/stream`: gọi `App.StartStream(id, "GET", "/tasks/stream", "")`. Go đọc chunk và `runtime.EventsEmit(ctx, "meili:stream:"+id, chunk)`. Frontend `EventsOn` append vào bảng. Stop = `App.StopStream(id)`. UI có toggle Live.

- [ ] **Step 1: Write failing tests**

```ts
// frontend/src/lib/api/async.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listTasks, cancelTasks } from './async';

describe('tasks api', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, json: async () => ({ results: [], total: 0, limit: 20, from: null, next: null }),
    headers: { get: () => 'application/json' }
  })));
  afterEach(() => vi.unstubAllGlobals());

  it('lists tasks with statuses and types as comma lists', async () => {
    await listTasks({ statuses: 'enqueued,processing', types: 'documentAdditionOrUpdate', limit: 20 });
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/tasks?statuses=enqueued%2Cprocessing&types=documentAdditionOrUpdate&limit=20');
  });

  it('cancels via POST /tasks/cancel', async () => {
    await cancelTasks({ uids: '1,2' });
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('/meili/tasks/cancel?uids=1%2C2');
    expect(init.method).toBe('POST');
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd frontend && npx vitest run src/lib/api/async.test.ts`

Expected: FAIL module not found.

- [ ] **Step 3: Implement**

```ts
// frontend/src/lib/api/async.ts
import { meili } from './client';
import type { SummarizedTaskView, TaskView } from './types';

export type TaskFilters = {
  uids?: string;
  batchUids?: string;
  indexUids?: string;
  statuses?: string;
  types?: string;
  canceledBy?: string;
  beforeEnqueuedAt?: string;
  afterEnqueuedAt?: string;
  limit?: number;
  from?: number;
  reverse?: boolean;
};

export type AllTasks = {
  results: TaskView[];
  total: number;
  limit: number;
  from: number | null;
  next: number | null;
};

export const listTasks = (f: TaskFilters) => meili<AllTasks>('GET', '/tasks', undefined, f as any);
export const getTask = (uid: number) => meili<TaskView>('GET', `/tasks/${uid}`);
export const getTaskDocuments = (uid: number) => meili<unknown>('GET', `/tasks/${uid}/documents`);
export const cancelTasks = (f: TaskFilters) => meili<SummarizedTaskView>('POST', '/tasks/cancel', undefined, f as any);
export const deleteTasks = (f: TaskFilters) => meili<SummarizedTaskView>('DELETE', '/tasks', undefined, f as any);
export const compactTasks = () => meili<{ preSize: string; postSize: string; status: string; actionRequired: string | null }>('POST', '/tasks/compact');
export const listBatches = (f: { uids?: string; limit?: number; from?: number }) => meili<unknown>('GET', '/batches', undefined, f);
export const getBatch = (id: number) => meili<unknown>('GET', `/batches/${id}`);
```

`Tasks.svelte`: filter chips theo Status enum (`enqueued,processing,succeeded,failed,canceled`) và Kind enum (đủ 16 type). Table click → `TaskDetail`. Nút Cancel selected / Cancel by filter. Nút Delete finished tasks (`statuses=succeeded,failed,canceled`). Compact task queue với warning phải restart instance.

`TaskDetail.svelte`: JSON `details` + `error` + link batchUid + nút payload documents nếu 200.

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run src/lib/api/async.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: add task and batch monitoring with cancel/delete/compact"
```

---

### Task 9: API keys

**Files:**
- Create: `frontend/src/lib/api/keys.ts`
- Create: `frontend/src/lib/api/keys.test.ts`
- Create: `frontend/src/pages/Keys.svelte`

**Interfaces:**
- Consumes: `KeyView`, `CreateApiKey`, `KeyAction`
- Produces: `listKeys`, `getKey`, `createKey`, `updateKey`, `deleteKey`

API (cần master key):

```
GET    /keys?offset&limit
POST   /keys          { name?, description?, uid?, actions[], indexes[], expiresAt? }
GET    /keys/{keyOrUid}
PATCH  /keys/{keyOrUid}  { name?, description? }
DELETE /keys/{keyOrUid}
```

Sau `POST`, Meilisearch trả `key` **một lần**. UI bắt buộc hiện dialog copy key, cảnh báo không xem lại được. List vẫn có field `key` trên một số version — vẫn mask `••••` + nút copy.

Actions checklist = enum `Action` OpenAPI (task 2 `KeyAction`). Indexes: `["*"]` hoặc list uid. `expiresAt` datetime-local → ISO8601 hoặc null.

- [ ] **Step 1: Write failing tests**

```ts
// frontend/src/lib/api/keys.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createKey, updateKey } from './keys';

describe('keys api', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, json: async () => ({ uid: 'u', key: 'secret', actions: ['search'], indexes: ['*'] }),
    headers: { get: () => 'application/json' }
  })));
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs /keys', async () => {
    await createKey({ actions: ['search'], indexes: ['movies'], expiresAt: null, name: 'front' });
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('/meili/keys');
    expect(JSON.parse(init.body).actions).toEqual(['search']);
  });

  it('PATCHes name/description only', async () => {
    await updateKey('u', { name: 'n', description: 'd' });
    expect((fetch as any).mock.calls[0][1].method).toBe('PATCH');
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd frontend && npx vitest run src/lib/api/keys.test.ts`

Expected: FAIL module not found.

- [ ] **Step 3: Implement**

```ts
// frontend/src/lib/api/keys.ts
import { meili } from './client';
import type { CreateApiKey, KeyView, Pagination } from './types';

export const listKeys = (offset = 0, limit = 20) =>
  meili<Pagination<KeyView>>('GET', '/keys', undefined, { offset, limit });

export const getKey = (keyOrUid: string) =>
  meili<KeyView>('GET', `/keys/${encodeURIComponent(keyOrUid)}`);

export const createKey = (body: CreateApiKey) => meili<KeyView>('POST', '/keys', body);

export const updateKey = (keyOrUid: string, body: { name?: string | null; description?: string | null }) =>
  meili<KeyView>('PATCH', `/keys/${encodeURIComponent(keyOrUid)}`, body);

export const deleteKey = (keyOrUid: string) =>
  meili<void>('DELETE', `/keys/${encodeURIComponent(keyOrUid)}`);
```

`Keys.svelte`: nếu `MeiliError.code` là `invalid_api_key` / `missing_authorization_header` hiện hướng dẫn dùng master key. Bảng keys. Tạo key form. Không log `key` ra console.

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run src/lib/api/keys.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: add API key management UI"
```

---

### Task 10: Instance ops (dumps, snapshots, export, webhooks, experimental, network, logs, template)

**Files:**
- Create: `frontend/src/lib/api/instance.ts`
- Create: `frontend/src/lib/api/instance.test.ts`
- Create: `frontend/src/pages/Instance.svelte`

**Interfaces:**
- Consumes: `meili`, `waitTask`
- Produces: wrappers cho backups, webhooks, experimental, network, logs, render-template

API:

```
POST /dumps
POST /snapshots
POST /export                  { url, apiKey?, payloadSize?, indexes? }
GET/POST /webhooks            { url, headers? }
GET/PATCH/DELETE /webhooks/{uuid}
GET/PATCH /experimental-features
GET/PATCH /network
POST /network/control
POST /logs/stream             { mode?, target? }  // streaming; UI dùng fetch ReadableStream
DELETE /logs/stream
POST /logs/stderr             { target: "info"|"debug"|... }
POST /render-template
GET /metrics
```

- [ ] **Step 1: Write failing tests**

```ts
// frontend/src/lib/api/instance.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDump, createWebhook, patchExperimental } from './instance';

describe('instance api', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, json: async () => ({ taskUid: 1, status: 'enqueued', type: 'dumpCreation', indexUid: null, enqueuedAt: '' }),
    headers: { get: () => 'application/json' }
  })));
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs /dumps', async () => {
    await createDump();
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/dumps');
    expect((fetch as any).mock.calls[0][1].method).toBe('POST');
  });

  it('POSTs /webhooks', async () => {
    (fetch as any).mockResolvedValue({
      ok: true, json: async () => ({ uuid: 'x', url: 'http://example.com', headers: {} }),
      headers: { get: () => 'application/json' }
    });
    await createWebhook({ url: 'http://example.com', headers: { Authorization: 'Bearer z' } });
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/webhooks');
  });

  it('PATCHes experimental features', async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: async () => ({ metrics: true }), headers: { get: () => 'application/json' } });
    await patchExperimental({ metrics: true });
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/experimental-features');
    expect((fetch as any).mock.calls[0][1].method).toBe('PATCH');
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd frontend && npx vitest run src/lib/api/instance.test.ts`

Expected: FAIL module not found.

- [ ] **Step 3: Implement**

```ts
// frontend/src/lib/api/instance.ts
import { meili } from './client';
import type { SummarizedTaskView } from './types';

export const createDump = () => meili<SummarizedTaskView>('POST', '/dumps');
export const createSnapshot = () => meili<SummarizedTaskView>('POST', '/snapshots');
export const exportRemote = (body: { url: string; apiKey?: string; payloadSize?: string; indexes?: Record<string, unknown> }) =>
  meili<SummarizedTaskView>('POST', '/export', body);

export const listWebhooks = () => meili<{ results: { uuid: string; url: string; headers: Record<string, string> }[] }>('GET', '/webhooks');
export const createWebhook = (body: { url: string; headers?: Record<string, string> }) => meili<unknown>('POST', '/webhooks', body);
export const getWebhook = (uuid: string) => meili<unknown>('GET', `/webhooks/${uuid}`);
export const updateWebhook = (uuid: string, body: { url?: string; headers?: Record<string, string> }) =>
  meili<unknown>('PATCH', `/webhooks/${uuid}`, body);
export const deleteWebhook = (uuid: string) => meili<void>('DELETE', `/webhooks/${uuid}`);

export const getExperimental = () => meili<Record<string, boolean>>('GET', '/experimental-features');
export const patchExperimental = (patch: Record<string, boolean>) =>
  meili<Record<string, boolean>>('PATCH', '/experimental-features', patch);

export const getNetwork = () => meili<unknown>('GET', '/network');
export const patchNetwork = (body: unknown) => meili<unknown>('PATCH', '/network', body);
export const networkControl = (body: unknown) => meili<unknown>('POST', '/network/control', body);

export const setLogStderr = (target: string) => meili<unknown>('POST', '/logs/stderr', { target });
export const stopLogStream = () => meili<unknown>('DELETE', '/logs/stream');

export const renderTemplate = (body: unknown) => meili<unknown>('POST', '/render-template', body);
export const getMetrics = () => meili<string>('GET', '/metrics');
```

`Instance.svelte` sections: Backups, Export, Webhooks, Experimental toggles (checkbox từ keys của GET), Network JSON editor, Logs (`App.StartStream("logs", "POST", "/logs/stream", "{}")` + `EventsOn("meili:stream:logs")` append `<pre>`; Stop = `StopStream` rồi `meili('DELETE','/logs/stream')`), Render template JSON, Metrics pre.

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run src/lib/api/instance.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: add dumps, snapshots, webhooks, experimental, network, logs"
```

---

### Task 11: Chat workspaces + dynamic search rules

**Files:**
- Create: `frontend/src/lib/api/chat.ts`
- Create: `frontend/src/lib/api/chat.test.ts`
- Create: `frontend/src/lib/api/rules.ts`
- Create: `frontend/src/lib/api/rules.test.ts`
- Create: `frontend/src/pages/Chat.svelte`
- Create: `frontend/src/pages/Rules.svelte`

**Interfaces:**
- Consumes: `meili`
- Produces: chat workspace CRUD + streamed completions; search rules CRUD

API:

```
GET    /chats?offset&limit
GET    /chats/{workspace_uid}
DELETE /chats/{workspace_uid}
GET    /chats/{workspace_uid}/settings
PATCH  /chats/{workspace_uid}/settings
DELETE /chats/{workspace_uid}/settings
POST   /chats/{workspace_uid}/chat/completions   { stream: true, messages: [...] }  // stream bắt buộc

GET    /dynamic-search-rules
DELETE /dynamic-search-rules
GET    /dynamic-search-rules/{uid}
PATCH  /dynamic-search-rules/{uid}
DELETE /dynamic-search-rules/{uid}
```

Chat settings fields: LLM source, prompts, search parameters. API key không bao giờ được GET trả về — form password "set new key" only.

Completions: `POST` với `stream: true`, đọc SSE/`text/event-stream` chunks, append vào transcript. Không support non-stream (spec cấm).

Search rule PATCH body: `{ description, precedence, active, conditions, actions }` với `actions.pin[]` (`id`, `position`, `indexUid?`) và `actions.scale[]` (`ids|filter`, `weight`).

- [ ] **Step 1: Write failing tests**

```ts
// frontend/src/lib/api/chat.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { patchChatSettings } from './chat';

describe('chat api', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, json: async () => ({}), headers: { get: () => 'application/json' }
  })));
  afterEach(() => vi.unstubAllGlobals());

  it('PATCHes workspace settings', async () => {
    await patchChatSettings('ws1', { source: 'openAi' });
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/chats/ws1/settings');
    expect((fetch as any).mock.calls[0][1].method).toBe('PATCH');
  });
});
```

```ts
// frontend/src/lib/api/rules.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { upsertRule, deleteAllRules } from './rules';

describe('rules api', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, json: async () => ({}), headers: { get: () => 'application/json' }
  })));
  afterEach(() => vi.unstubAllGlobals());

  it('PATCHes a rule by uid', async () => {
    await upsertRule('promo', { active: true, precedence: 10, actions: { pin: [{ id: '1', position: 0 }] } });
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/dynamic-search-rules/promo');
    expect((fetch as any).mock.calls[0][1].method).toBe('PATCH');
  });

  it('DELETE all rules', async () => {
    await deleteAllRules();
    expect((fetch as any).mock.calls[0][0]).toBe('/meili/dynamic-search-rules');
    expect((fetch as any).mock.calls[0][1].method).toBe('DELETE');
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd frontend && npx vitest run src/lib/api/chat.test.ts src/lib/api/rules.test.ts`

Expected: FAIL module not found.

- [ ] **Step 3: Implement**

```ts
// frontend/src/lib/api/chat.ts
import { meili } from './client';

export const listChats = (offset = 0, limit = 20) =>
  meili<{ results: { uid: string }[]; offset: number; limit: number; total: number }>('GET', '/chats', undefined, { offset, limit });

export const getChat = (uid: string) => meili<unknown>('GET', `/chats/${encodeURIComponent(uid)}`);
export const deleteChat = (uid: string) => meili<void>('DELETE', `/chats/${encodeURIComponent(uid)}`);
export const getChatSettings = (uid: string) => meili<Record<string, unknown>>('GET', `/chats/${encodeURIComponent(uid)}/settings`);
export const patchChatSettings = (uid: string, patch: Record<string, unknown>) =>
  meili<unknown>('PATCH', `/chats/${encodeURIComponent(uid)}/settings`, patch);
export const resetChatSettings = (uid: string) =>
  meili<unknown>('DELETE', `/chats/${encodeURIComponent(uid)}/settings`);
```

```ts
// frontend/src/lib/api/rules.ts
import { meili } from './client';

export const listRules = () => meili<{ results: unknown[] }>('GET', '/dynamic-search-rules');
export const deleteAllRules = () => meili<unknown>('DELETE', '/dynamic-search-rules');
export const getRule = (uid: string) => meili<unknown>('GET', `/dynamic-search-rules/${encodeURIComponent(uid)}`);
export const upsertRule = (uid: string, patch: Record<string, unknown>) =>
  meili<unknown>('PATCH', `/dynamic-search-rules/${encodeURIComponent(uid)}`, patch);
export const deleteRule = (uid: string) =>
  meili<unknown>('DELETE', `/dynamic-search-rules/${encodeURIComponent(uid)}`);
```

`Chat.svelte`: list workspaces (tạo = PATCH settings của uid mới), form settings, transcript + input gửi stream `App.StartStream("chat", "POST", "/chats/{uid}/chat/completions", JSON.stringify({stream:true, messages}))` rồi `EventsOn("meili:stream:chat")` append delta. Stop = `StopStream("chat")`.

`Rules.svelte`: table rules, editor JSON + form pin/scale, nút xóa all (confirm).

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run src/lib/api/chat.test.ts src/lib/api/rules.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: add chat workspaces and dynamic search rules"
```

---

### Task 12: Stream bindings + Windows desktop installer

**Files:**
- Create: `internal/proxy/stream.go`
- Create: `internal/proxy/stream_test.go`
- Modify: `app.go` (`StartStream`, `StopStream`)
- Create: `docker-compose.yml` (chỉ Meilisearch engine)
- Create: `README.md`
- Create: `.gitignore`
- Modify: `Makefile`
- Modify: `wails.json` (`nsis: true` nếu dùng installer)

**Interfaces:**
- Consumes: `proxy.Do`, Wails `runtime.EventsEmit`
- Produces: `(*Proxy).StartStream(ctx, id, method, path, body, emit func(string)) error`; `(*Proxy).StopStream(id)`; `build/bin/meilisearchui.exe`; NSIS installer `meilisearchui-amd64-installer.exe`

- [ ] **Step 1: Write failing stream test**

```go
// internal/proxy/stream_test.go
package proxy

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestStartStreamEmitsChunksAndStop(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/logs/stream" || r.Method != http.MethodPost {
			t.Errorf("%s %s", r.Method, r.URL.Path)
		}
		w.Header().Set("Content-Type", "text/event-stream")
		fl := w.(http.Flusher)
		for i := 0; i < 3; i++ {
			fmt.Fprintf(w, "data: %d\n\n", i)
			fl.Flush()
			time.Sleep(15 * time.Millisecond)
		}
	}))
	defer upstream.Close()

	p := New()
	p.SetTarget(upstream.URL, "k")
	var mu sync.Mutex
	var got []string
	err := p.StartStream(context.Background(), "logs", "POST", "/logs/stream", []byte(`{}`), func(chunk string) {
		mu.Lock()
		got = append(got, chunk)
		mu.Unlock()
	})
	if err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		mu.Lock()
		n := len(strings.Join(got, ""))
		mu.Unlock()
		if n > 0 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	p.StopStream("logs")
	mu.Lock()
	defer mu.Unlock()
	if !strings.Contains(strings.Join(got, ""), "data:") {
		t.Fatalf("chunks=%v", got)
	}
}

func TestStartStreamRequiresTarget(t *testing.T) {
	p := New()
	err := p.StartStream(context.Background(), "x", "GET", "/tasks/stream", nil, func(string) {})
	if err == nil {
		t.Fatal("expected error")
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `go test ./internal/proxy -count=1`

Expected: FAIL `StartStream` undefined.

- [ ] **Step 3: Implement stream + Wails bindings + Windows package**

```go
// internal/proxy/stream.go
package proxy

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
)

type streamReg struct {
	mu      sync.Mutex
	cancels map[string]context.CancelFunc
}

func (p *Proxy) ensureStreams() {
	if p.streams == nil {
		p.streams = &streamReg{cancels: map[string]context.CancelFunc{}}
	}
}

func (p *Proxy) StartStream(parent context.Context, id, method, path string, body []byte, emit func(string)) error {
	p.mu.RLock()
	host, key := p.host, p.apiKey
	p.mu.RUnlock()
	if host == "" {
		return fmt.Errorf("not connected")
	}
	p.ensureStreams()
	ctx, cancel := context.WithCancel(parent)
	p.streams.mu.Lock()
	if prev, ok := p.streams.cancels[id]; ok {
		prev()
	}
	p.streams.cancels[id] = cancel
	p.streams.mu.Unlock()

	go func() {
		defer cancel()
		req, err := http.NewRequestWithContext(ctx, method, host+path, strings.NewReader(string(body)))
		if err != nil {
			emit(fmt.Sprintf("\n[error] %v\n", err))
			return
		}
		if key != "" {
			req.Header.Set("Authorization", "Bearer "+key)
		}
		if body != nil {
			req.Header.Set("Content-Type", "application/json")
		}
		resp, err := p.client.Do(req)
		if err != nil {
			emit(fmt.Sprintf("\n[error] %v\n", err))
			return
		}
		defer resp.Body.Close()
		buf := make([]byte, 32*1024)
		for {
			n, err := resp.Body.Read(buf)
			if n > 0 {
				emit(string(buf[:n]))
			}
			if err != nil {
				if err != io.EOF && ctx.Err() == nil {
					emit(fmt.Sprintf("\n[error] %v\n", err))
				}
				return
			}
		}
	}()
	return nil
}

func (p *Proxy) StopStream(id string) {
	p.ensureStreams()
	p.streams.mu.Lock()
	if c, ok := p.streams.cancels[id]; ok {
		c()
		delete(p.streams.cancels, id)
	}
	p.streams.mu.Unlock()
}
```

Thêm field `streams *streamReg` vào `Proxy`.

`app.go` bindings:

```go
func (a *App) StartStream(id, method, path, body string) error {
	return a.pxy.StartStream(a.ctx, id, method, path, []byte(body), func(chunk string) {
		runtime.EventsEmit(a.ctx, "meili:stream:"+id, chunk)
	})
}

func (a *App) StopStream(id string) {
	a.pxy.StopStream(id)
}
```

Import `"github.com/wailsapp/wails/v2/pkg/runtime"`.

`docker-compose.yml` **chỉ** engine (UI là exe desktop, không container UI):

```yaml
services:
  meilisearch:
    image: getmeili/meilisearch:v1.55.0
    ports: ["7700:7700"]
    environment:
      MEILI_MASTER_KEY: masterKeyMasterKey
      MEILI_ENV: development
    volumes:
      - meili_data:/meili_data
volumes:
  meili_data:
```

`.gitignore`:

```
frontend/node_modules
frontend/dist
build/bin
*.exe
```

`Makefile`:

```makefile
.PHONY: test test-frontend dev build installer
test:
	go test ./...
test-frontend:
	cd frontend && npm test
dev:
	wails dev
build:
	wails build
installer:
	wails build -nsis
```

`README.md` (tiếng Việt):

1. Cài [WebView2 Evergreen](https://developer.microsoft.com/microsoft-edge/webview2/) nếu Windows chưa có (Win10 22H2 / Win11 thường đã có).
2. Cài Meilisearch 1.55 với master key ≥16 bytes, mặc định `http://127.0.0.1:7700`. Hoặc `docker compose up -d`.
3. Cài Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`.
4. Dev: `wails dev` — mở **cửa sổ desktop**.
5. Build portable: `wails build` → `build/bin/meilisearchui.exe`. Double-click để chạy, không mở browser.
6. Build installer: `wails build -nsis` → file setup trong `build/bin`.
7. Trong app: nhập host + master/admin key. Master key chỉ khi vào màn Keys.
8. Default Admin key cho thao tác ngày thường.

Không có bước "mở Chrome vào localhost:3000".

- [ ] **Step 4: Run all tests + desktop smoke**

Run:

```
go test ./... -count=1
cd frontend && npm test
wails build
```

Expected: tests PASS; `build/bin/meilisearchui.exe` tồn tại.

Manual trên Windows: double-click exe → cửa sổ `Meilisearch UI` hiện form kết nối → connect `http://127.0.0.1:7700` → Dashboard + Search một index. Alt+F4 thoát process.

- [ ] **Step 5: Commit**

```bash
git add internal/proxy app.go docker-compose.yml Makefile README.md .gitignore wails.json
git commit -m "feat: add desktop streams, Windows exe and NSIS installer"
```

---

## Self-review

**Spec coverage:** 143 operations. UI phủ toàn bộ trừ `POST /mcp` (protocol LLM, không phải màn quản trị) và các GET search/similar trùng POST. Settings 21 sub-routes được phủ qua GET/PATCH all + DELETE per slug. Desktop: Wails window, Forward unary, StartStream cho logs/tasks/chat.

**Placeholder scan:** không có TBD/TODO. Mỗi task có test code, implementation code, lệnh chạy, expected.

**Type consistency:** `meili` + `setTransport`, `waitTask`, `SummarizedTaskView`, `SearchQuery`, `KeyAction`, `SETTING_SLUGS`, `App.Connect/Session/Forward/StartStream/StopStream`, path không prefix `/meili` lúc gọi Go.

**Out of scope có chủ đích:** không host Meilisearch trong process Go (docker-compose / binary riêng). Không role-based UI ngoài ẩn nút khi API trả 403. Không app store listing. Linux/macOS có thể `wails build` sau; target chính là Windows desktop.
