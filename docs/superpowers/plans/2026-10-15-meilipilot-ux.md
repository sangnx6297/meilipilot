# MeiliPilot UX Apply Plan

> **For Claude:** Required. Implement task-by-task. TDD cho helper/registry; visual verify sau mỗi surface. Không commit trừ khi user yêu cầu. Không thêm UI kit mới.

**Goal:** Đưa app từ “daisyUI CRUD” sang **IDE/console density** (Linear-calm + Raycast keyboard + DataGrip console) trên stack Wails + Svelte 5 + daisyUI hiện tại.

**Architecture:** Token CSS (`app.css`) + primitive Svelte (`EmptyState`, `Skeleton`, `ConfirmDialog`, `IndexContext`, `CommandPalette`). Không đổi routing hash. Không rewrite Search engine / HitsViewer 3-mode.

**Tech stack:** Svelte 5, daisyUI 5 theme `meilipilot`, existing `PageHeader`/`ErrorBanner`/`CodeBlock`, `localStorage` cho advanced/palette, Vitest cho registry helpers.

**Spec:** `docs/superpowers/specs/2026-10-15-meilipilot-ux-design.md`

---

## File map

**Create**

- `frontend/src/lib/components/EmptyState.svelte`
- `frontend/src/lib/components/Skeleton.svelte`
- `frontend/src/lib/components/ConfirmDialog.svelte`
- `frontend/src/lib/components/IndexContext.svelte`
- `frontend/src/lib/components/CommandPalette.svelte`
- `frontend/src/lib/command-palette.ts`
- `frontend/src/lib/command-palette.test.ts`
- `frontend/src/lib/document-title.ts`
- `frontend/src/lib/document-title.test.ts`

**Modify**

- `frontend/src/app.css` — table recipe, divider, focus, no leftover card-shadow
- `frontend/src/lib/components/PageHeader.svelte` — optional kbd hint
- `frontend/src/lib/components/Layout.svelte` — palette host, title, index context slot
- `frontend/src/lib/components/TaskToast.svelte` — toast góc, không chặn
- `frontend/src/pages/Search.svelte` — compact default row
- `frontend/src/pages/Indexes.svelte` — split create vs table, empty/skeleton, ConfirmDialog
- `frontend/src/pages/Documents.svelte` — empty/skeleton, confirm delete
- `frontend/src/pages/Settings.svelte` — density + IndexContext
- `frontend/src/pages/Dashboard.svelte` — empty indexes
- `frontend/src/pages/Tasks.svelte` — empty/skeleton
- `frontend/src/pages/Keys.svelte` — density
- `frontend/src/pages/Dumps.svelte` — density + confirm
- `frontend/src/pages/Batches.svelte` — density
- `frontend/src/pages/Network.svelte` — density
- `frontend/src/pages/Experimental.svelte` — density
- `frontend/src/App.svelte` — title on hash change

**Không đụng**

- Go proxy, vault, search-form API fields, HitsViewer 3-mode logic, branding navy/gold, `window.confirm` replacement chỉ qua ConfirmDialog.

---

### Task 1: Design tokens + table recipe

**Files:** `frontend/src/app.css`

- Bỏ `shadow-sm` trên `.card` trong workspace (giữ Connect brand panel).
- Table: không `table-zebra` mặc định; `hover:bg-base-200/60`; header `text-xs uppercase tracking-wide text-base-content/50`; cell `py-2`.
- Divider: `border-base-300`; focus ring `ring-2 ring-primary/40`.
- Utility: `.mono-meta` = `font-mono text-xs`.

**Step 1:** Thêm class `.app-table`, `.mono-meta`, `.card-flat` (`shadow-none border border-base-300`).

**Step 2:** Visual: Dashboard + Indexes sau khi Task 4/5 dùng class mới.

**Commit:** (chỉ khi user yêu cầu) `style: flat tables and quieter cards`

---

### Task 2: EmptyState + Skeleton primitives

**Files:**

- Create: `frontend/src/lib/components/EmptyState.svelte`
- Create: `frontend/src/lib/components/Skeleton.svelte`

EmptyState props: `title`, `hint`, optional `actionLabel` + `onclick`.

Skeleton: `rows` (default 6), `cols` optional — render `animate-pulse` bars, `aria-busy`.

**Step 1:** Viết component, không placeholder TODO.

**Step 2:** Dùng Dashboard indexes rỗng (nếu `indexes.length === 0` và không loading) trước khi wire hết pages.

**Commit:** `ui: empty and skeleton primitives`

---

### Task 3: document.title helper (TDD)

**Files:**

- Create: `frontend/src/lib/document-title.ts`
- Create: `frontend/src/lib/document-title.test.ts`

```ts
export function windowTitle(page: string, indexUid?: string): string {
  if (indexUid) return `MeiliPilot — ${page} · ${indexUid}`
  return `MeiliPilot — ${page}`
}
```

**Step 1:** RED — test Search+movies, Dashboard no uid.

**Step 2:** GREEN — implement.

**Step 3:** `App.svelte` `$effect` set `document.title` từ hash + `currentIndex`.

**Commit:** `feat: window title from page and index`

---

### Task 4: Command palette registry (TDD) + Ctrl+K

**Files:**

- Create: `frontend/src/lib/command-palette.ts`
- Create: `frontend/src/lib/command-palette.test.ts`
- Create: `frontend/src/lib/components/CommandPalette.svelte`
- Modify: `frontend/src/lib/components/Layout.svelte`

Registry: `{ id, label, href, keywords, group: 'Workspace'|'Admin' }[]`.

```ts
export function filterCommands(q: string): Command[]
```

- Empty q → all, grouped.
- Match label/keywords case-insensitive.
- Arrow + Enter; Esc close.
- Layout: `Ctrl+K` / `Meta+K` toggle; hint nhỏ trên sidebar “Ctrl+K”.

**Step 1:** RED filter tests (empty, `sea` → Search, `key` → Keys).

**Step 2:** GREEN filter.

**Step 3:** Palette UI daisyUI `modal` + input; click/Enter `location.hash = href`.

**Commit:** `feat: Ctrl+K command palette`

---

### Task 5: ConfirmDialog thay window.confirm

**Files:**

- Create: `frontend/src/lib/components/ConfirmDialog.svelte`
- Modify: Indexes, Documents, Dumps (mọi `confirm(`)

Props: `open`, `title`, `body` (snippet host + env + uid), `confirmLabel` (danger), `busy`.

Không dùng `window.confirm`.

**Step 1:** Component modal `role="alertdialog"`.

**Step 2:** Indexes delete/swap dùng dialog; body gồm `envBadge` + host + uid.

**Step 3:** Documents delete; Dumps create nếu destructive-ish — dumps create không xóa, chỉ delete index/docs bắt buộc.

**Commit:** `feat: in-app confirm for destructive actions`

---

### Task 6: IndexContext header

**Files:**

- Create: `frontend/src/lib/components/IndexContext.svelte`
- Modify: Search, Documents, Settings, (optional) Hits only via those pages

Một hàng: `index uid` (select hoặc text) + badge env + link nhanh Search / Documents / Settings (hash). Thay 4 tab duplicate nếu cùng một hàng gọn hơn tab hiện tại — **giữ tab**, thêm context uid/env phía trên tab.

**Commit:** `ui: sticky index context on workspace pages`

---

### Task 7: Search compact default

**Files:** `frontend/src/pages/Search.svelte`

Mặc định (advanced off):

- Hàng 1: index select + `q` + nút Search (`Ctrl+Enter` kbd trên nút).
- Không hiện filter/sort/facets/matching/locale cho đến Advanced.
- Advanced on: giữ toàn bộ SearchQuery như hiện tại.

`localStorage` `meili.searchAdvanced` giữ nguyên.

HitsViewer không đổi 3 mode.

**Commit:** `ui: search default is one query row`

---

### Task 8: Indexes split + empty/skeleton

**Files:** `frontend/src/pages/Indexes.svelte`

- Card tạo index tách khỏi bảng (primary CTA Create).
- Loading: Skeleton; empty: EmptyState “Chưa có index”.
- Table dùng `.app-table`; uid `mono-meta`.
- Delete → ConfirmDialog (Task 5).

**Commit:** `ui: indexes list density and empty state`

---

### Task 9: Documents / Tasks / Dashboard empty+skeleton

**Files:** Documents, Tasks, Dashboard

Cùng recipe: `loading` → Skeleton; `!loading && empty` → EmptyState; data → table.

Documents: empty hint “Chọn index và bấm Load”.

**Commit:** `ui: list pages empty and loading states`

---

### Task 10: TaskToast non-blocking

**Files:** `frontend/src/lib/components/TaskToast.svelte`

- `fixed bottom-4 right-4 z-40 max-w-sm` (không full-width alert).
- PROD: vẫn `alert-warning` + copy “đọc kết quả, không giả định xong”.
- Có nút đóng; auto-dismiss 8s nếu status `succeeded`/`failed` (không dismiss `enqueued`/`processing`).

**Commit:** `ui: task toast docked instead of inline block`

---

### Task 11: Remaining admin pages density

**Files:** Settings, Keys, Dumps, Batches, Network, Experimental, PageHeader

- `card-flat`; bỏ `shadow-sm`.
- PageHeader: slot/prop `hint` cho shortcut (`Ctrl+Enter`, `Ctrl+K`).
- Settings: IndexContext (Task 6).

**Commit:** `style: flatten remaining admin surfaces`

---

### Task 12: Verify + rebuild

- `cd frontend && npx vitest run`
- `go test ./internal/proxy ./internal/session ./internal/vault`
- Manual (hoặc browser tools nếu Vite chạy): Search compact, Ctrl+K, xóa index dialog, empty Indexes, toast góc, title bar.
- `wails build`; copy `build/bin/MeiliPilot.exe` → Desktop khi exe không lock.

---

## Out of scope (backlog, không làm trong plan này)

- Multi-tab query consoles (DataGrip).
- Virtualize hits 10k.
- Light theme toggle.
- PROD readOnly default khi chọn production; banner nếu user cố ý mở ghi.
- Đổi UI kit / Tauri.

## Success criteria

- Search mặc định 1 hàng query.
- Ctrl+K mở palette, filter được.
- Destroy actions dùng ConfirmDialog có env+uid.
- List pages có empty + skeleton.
- Task toast góc phải.
- `document.title` đổi theo page/index.
- Không regress HitsViewer / SearchQuery fields / vault.
