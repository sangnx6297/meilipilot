# Hits Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Search và Documents dùng chung `HitsViewer` với 3 mode Table / Detail / Pretty JSON, nhớ mode, tách field hệ thống ra card riêng.

**Architecture:** Helper thuần `hits.ts` (split/label/columns/persist) được Vitest cover. `HitsViewer.svelte` render 3 mode. Search/Documents chỉ truyền `rows` và action.

**Tech Stack:** Svelte 5, daisyUI, Vitest + jsdom, `localStorage` key `meili.hitsViewMode`.

## Global Constraints

- UI tiếng Việt, identifier API giữ tiếng Anh.
- Chỉ `{@html}` string từ `_formatted` của Meilisearch.
- Không đổi Go/proxy/search API.
- Không commit trừ khi user yêu cầu.
- TDD: helper tests fail trước, rồi mới viết `hits.ts`.

---

### Task 1: hits.ts helpers + tests

**Files:**
- Create: `frontend/src/lib/ui/hits.test.ts`
- Create: `frontend/src/lib/ui/hits.ts`

**Interfaces:**
- Consumes: `localStorage`
- Produces: `HitsViewMode`, `HITS_VIEW_MODE_KEY`, `splitDocMeta`, `rowId`, `rowLabel`, `hasMeta`, `tableColumns`, `cellPreview`, `formattedHtml`, `loadHitsViewMode`, `saveHitsViewMode`

- [ ] **Step 1: Write failing tests** in `frontend/src/lib/ui/hits.test.ts` (split, label, columns, persist, formattedHtml, cellPreview).
- [ ] **Step 2:** `cd frontend && npx vitest run src/lib/ui/hits.test.ts` — FAIL module not found.
- [ ] **Step 3: Implement** `frontend/src/lib/ui/hits.ts`.
- [ ] **Step 4:** vitest PASS.

---

### Task 2: HitsViewer.svelte

**Files:**
- Create: `frontend/src/lib/ui/HitsViewer.svelte`
- Modify: none

**Interfaces:**
- Consumes: helpers Task 1, `CodeBlock.svelte`
- Produces: props `rows`, `showSelect`, `selectedIds`, `onToggleSelect`, `onDelete`, `onSimilar`

- [ ] **Step 1: Implement** toggle `join`, 3 mode, meta card, empty “Không có kết quả”, reset selection khi `rows` đổi.

---

### Task 3: Wire Search + Documents

**Files:**
- Modify: `frontend/src/pages/Search.svelte`
- Modify: `frontend/src/pages/Documents.svelte`

- [ ] **Step 1:** Search bỏ `{#each result.hits}`, dùng `<HitsViewer rows={result.hits} onSimilar={similar} />`.
- [ ] **Step 2:** Documents bỏ table JSON, dùng HitsViewer với select/delete.
- [ ] **Step 3:** `cd frontend && npx vitest run` PASS.
- [ ] **Step 4:** Verify UI Search + Documents (browser hoặc wails) — table/detail/json, meta card, persist mode.

---

## Spec coverage

- 3 mode, master–detail, persist, split `_` fields, Search+Documents, empty, highlight `_formatted` only, no Multi-search, no index settings.
