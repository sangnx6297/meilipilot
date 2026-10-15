# Hits viewer (Search + Documents)

Ngày: 2026-10-15  
App: Meilisearch UI (Wails + Svelte 5)

## Mục tiêu

Search và Documents dùng chung một bộ viewer cho danh sách hit/document. User chuyển **Table / Detail / Pretty JSON**; mode được nhớ. Field hệ thống Meilisearch tách ra card riêng để đối chiếu với document.

## Không làm trong spec này

- Form settings 22 group của index (đã hoãn)
- Multi-search hits viewer
- Nhớ hit đang chọn
- Mode theo từng index
- Sửa document bên trong viewer

## Quyết định đã chốt

| Mục | Quyết định |
|---|---|
| Scope | Search (`#/search`, `#/indexes/{uid}/search`) và Documents |
| Component | Một `HitsViewer` dùng chung |
| Detail layout | Master–detail: list trái, nội dung phải |
| Mode mặc định khi chưa có giá trị nhớ | `table` |
| Persist | `localStorage` key `meili.hitsViewMode`, một mode cho cả app |
| Field hệ thống | Key bắt đầu `_` → card/block meta riêng từng hit |

## Kiến trúc

```
Search.svelte / Documents.svelte
  → HitsViewer.svelte
       → hits.ts (splitDocMeta, rowLabel, tableColumns, load/save mode)
```

`HitsViewer` chỉ render rows + toggle mode + action slot. Pager, filter, facet, import JSON, ErrorBanner, TaskToast **ở ngoài** viewer.

### Mode store

File: `frontend/src/lib/ui/hits.ts`

- `HitsViewMode = 'table' | 'detail' | 'json'`
- `loadHitsViewMode()`: đọc `localStorage['meili.hitsViewMode']`; giá trị khác 3 mode trên → `'table'`
- `saveHitsViewMode(mode)`: ghi cùng key
- Search và Documents dùng chung key; đổi ở màn này, màn kia mở lên cùng mode

Không nhớ selection. Không ghi API key hay host.

## Tách field

`splitDocMeta(row)`:

- `doc`: key không bắt đầu `_`
- `meta`: key bắt đầu `_` (`_formatted`, `_matchesPosition`, `_rankingScore`, `_rankingScoreDetails`, `_semanticScore`, `_vectors`, …)

Documents từ `POST /documents/fetch` thường không có meta → **ẩn** card/block meta.

`_rankingScore` nằm trong meta, **không** thêm cột Table. Search vẫn giữ checkbox `showRankingScore` trên form để Meilisearch trả field đó vào meta.

## `HitsViewer` API

```ts
rows: Record<string, unknown>[]
showSelect?: boolean          // Documents: checkbox
selectedIds?: string[]
onToggleSelect?: (id: string, checked: boolean) => void
onDelete?: (id: string) => void          // Documents
onSimilar?: (id: string) => void         // Search, chỉ hiện khi row có id
```

Id dòng: `String(row.id ?? row.uid ?? '')`. Row không có id/uid: không checkbox, không Xóa, không Similar.

Label list Detail: `title` → `name` → `id` → `uid` → `'(untitled)'` (kiểm tra từng key, lấy giá trị string/number đầu tiên khác rỗng).

Khi `rows` đổi (search mới, đổi trang): chọn item đầu làm Detail selection.

## Từng mode

Toggle daisyUI `join` trên đầu viewer: Table · Detail · Pretty JSON. Đổi mode gọi `saveHitsViewMode`.

### Table

- Cột = union key của `doc` trên trang hiện tại, giữ thứ tự gặp trước
- Ô: string/number/boolean hiện text; object/array → JSON một dòng (cắt ~120 ký tự + `…`)
- Highlight: nếu `meta._formatted[col]` là string → render HTML highlight; không thì text đã escape của `doc[col]`
- Documents: cột checkbox trái, cột Xóa phải
- Click một row (không phải checkbox/nút) → row đó selected; **card meta** hiện ngay dưới row selected (nếu `meta` khác `{}`). Một row selected tại một thời điểm.
- Empty: “Không có kết quả”; toggle vẫn hiện

### Detail

- Trái: list label + id; item active tô nền
- Phải, 2 card chồng:
  1. **Document** — từng field `doc`, label + value; nested hiện JSON đủ; `_formatted[field]` string thì highlight HTML
  2. **Meilisearch** — từng field `meta` (JSON pretty nếu object). Ẩn card nếu không có meta
- Documents: checkbox trên list trái; nút Xóa trên pane phải
- Search: nút Similar trên pane phải khi có `id`

### Pretty JSON

Mỗi row:

- Checkbox (Documents)
- Block 1: `JSON.stringify(doc, null, 2)`
- Block 2 (nếu có meta): `JSON.stringify(meta, null, 2)`
- Similar / Xóa cùng hàng với header row

Dùng `CodeBlock` hiện có.

## Highlight HTML

Chỉ `{@html}` với string lấy từ `_formatted` do Meilisearch trả. Field `doc` luôn text node. Nested `_formatted` object: đệ quy đúng key.

Không `innerHTML` cho overview/title thô.

## Empty và lỗi

- 0 row: “Không có kết quả”
- Lỗi API: page `ErrorBanner`; viewer không bắt

## Tích hợp page

**Search.svelte**  
Bỏ vòng `{#each result.hits}`. Facet distribution, form, facet-search, similar giữ nguyên. `HitsViewer` nhận `result.hits`, `onSimilar`.

**Documents.svelte**  
Bỏ table JSON một cột. Filter / pager / import / xóa batch / xóa all giữ nguyên. `HitsViewer` nhận `results`, `showSelect`, `selectedIds`, `onToggleSelect`, `onDelete`.

## File đụng

| File | Việc |
|---|---|
| `frontend/src/lib/ui/hits.ts` | Tạo: split, label, columns, persist |
| `frontend/src/lib/ui/hits.test.ts` | Tạo: unit test helper |
| `frontend/src/lib/ui/HitsViewer.svelte` | Tạo: 3 mode + meta card |
| `frontend/src/pages/Search.svelte` | Đổi: dùng HitsViewer |
| `frontend/src/pages/Documents.svelte` | Đổi: dùng HitsViewer |

Không đổi Go/proxy/API search.

## Test

Vitest cho `hits.ts`:

- `splitDocMeta` tách `_formatted` / `_rankingScore` khỏi `title`
- `rowLabel` theo thứ tự title → name → id
- `tableColumns` union, bỏ key `_`
- `loadHitsViewMode` giá trị lạ → `table`; `'detail'` giữ nguyên

Manual:

1. Search có highlight → Table ô title có `<em>`; Detail card Document highlight; card Meilisearch có `_formatted`
2. Đổi mode Search → mở Documents cùng mode sau reload app
3. Document không có `_` → không hiện card Meilisearch
4. Xóa một document từ Table và từ Detail
5. Similar từ Detail khi hit có `id`
