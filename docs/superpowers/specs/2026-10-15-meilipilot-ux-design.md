# MeiliPilot UX — Design

**Ngày:** 2026-10-15  
**Phạm vi:** polish production cho app Wails + Svelte 5 + daisyUI hiện tại. Không rewrite stack, không clone Linear/DataGrip.

## Mục tiêu

Tool desktop dùng hàng ngày (search engineer / DevOps) phải **nhìn và thao tác như IDE/console**, không như form CRUD daisyUI mặc định. Primary task (search, documents, settings) chiếm viewport; nav và metadata im lặng.

## Tham chiếu (lấy hành vi, không lấy brand)

| Nguồn | Hành vi lấy | Không lấy |
|---|---|---|
| Linear (2025 refresh) | Ít border, chrome im, primary work nổi, semantic color tiết kiệm | Marketing glow, illustration |
| Raycast | Keyboard-first, Ctrl+K, shortcut hiện trên UI | Overlay floating window aesthetic toàn app |
| DataGrip 2025 | Query console ổn định, menu gọn, theme Islands (mềm hơn) | Đổi workflow search thành “query files” |
| Dev-tool systems | Density, 1px divider, mono chỉ cho data/ID/JSON | Shadow, hero, empty decorative space |

Flavor: **austere / utilitarian** (application interior). Connect screen được phép **hybrid** (panel navy đã có).

## Nguyên tắc

1. Hierarchy: task → supporting → controls → metadata.
2. Density có nhóm: không phình whitespace; tách bằng 1px/`base-300`, không bằng card chồng card.
3. Màu = ngôn ngữ: success/warning/error/env. Accent gold chỉ CTA chính hoặc brand mark.
4. Mono chỉ host, uid, JSON, filter, timestamps, ranking.
5. Mọi write/delete: dialog trong app, hiện **connection + index**, không `window.confirm`.
6. Loading/empty/error là 3 state bắt buộc trên list/search/table.
7. Keyboard: `Ctrl+Enter` search (đã có), `Ctrl+K` palette, `Esc` đóng overlay. Shortcut in trên nút.

## Hiện trạng (sau polish navy/gold)

Đã có: theme MeiliPilot, sidebar nhóm Workspace/Admin, Connect 2 cột, status bar, Search Advanced hide, HitsViewer 3 mode.

Còn lệch so với tham chiếu:

- Trang trong vẫn “card + form + table” rời, `shadow-sm` sót, zebra mặc định.
- Không empty/skeleton; poll 2s làm bảng nhảy.
- `window.confirm` phá hủy; TaskToast là alert chặn luồng.
- Index tabs copy-paste 4 trang; không context header (index uid + env).
- Search mặc định vẫn 4 field (filter/sort/facets/matching) — chưa progressive disclosure đủ.
- Không command palette, không đổi `document.title`.
- Indexes: tạo/xóa/swap chung một card.

## Hướng chốt (khuyến nghị)

**A — Shell + density + states (làm trước).** Token, table recipe, empty/loading, confirm dialog, index context header, Search compact hơn, task toast góc. Không multi-tab DBeaver.

**B — Full IDE tabs + dock panels.** Đắt, DataGrip vừa rollback query-file. Để sau.

**C — Đổi UI kit (Radix/shadcn).** Không. daisyUI + token là đủ.

Chọn **A**.

## Success

- Search mặc định: 1 hàng `index + q + Search + Advanced`. Filter/sort chỉ hiện Advanced hoặc hàng phụ 1 dòng.
- List rỗng có empty state; đang fetch có skeleton, không bảng trống.
- Xóa index/document: modal hiện `PROD · host · uid`.
- Ctrl+K nhảy Search/Indexes/Tasks/Diff/Dashboard.
- Title cửa sổ: `MeiliPilot — Search · movies`.
- Không thêm lib UI.
