# Hướng dẫn dùng MeiliPilot

App desktop Windows (**MeiliPilot** v0.1.0) để quản trị và search trên instance **Meilisearch 1.55**. Không mở trình duyệt — chạy cửa sổ native (Wails + WebView2).

Bản quyền: © 2026 sangnx6297@gmail.com

Mọi thao tác ghi (tạo index, import document, sửa settings…) đều **bất đồng bộ**: Meilisearch trả về task, app chờ task `succeeded` / `failed` / `canceled`. Xem tiến trình ở màn **Tasks**.

---

## 1. Cài và chạy

### Yêu cầu

- Windows 10 19041+
- [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) — Setup.exe cài từ file đã pin trong gói nếu máy chưa có hoặc bản máy **cũ hơn** bản pin (hỏi xác nhận; không hạ cấp nếu máy mới hơn)
- Máy khách **không** cần Go hay Node.js
- Instance Meilisearch 1.55 đang chạy (mặc định `http://127.0.0.1:7700`)
- Master key ≥ 16 bytes

### Bật Meilisearch (Docker)

Trong thư mục project:

```bash
docker compose up -d
```

Compose dùng image `getmeili/meilisearch:v1.55.0`, master key: `masterKeyMasterKey`.

### Dev

Cần Go 1.23+, Node.js LTS, [Wails CLI](https://wails.io):

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
wails dev
```

### Dùng file .exe

Portable: `make build` → `build/bin/MeiliPilot.exe` (double-click).

Gói cài khách (`make installer`): double-click **`MeiliPilot-Setup.exe`** — wizard GUI (WiX Burn), không phải cửa sổ console.

- License → Install → progress → Finish (mở MeiliPilot)
- WebView2 Standalone đã pin **nhét trong Setup.exe**. Thiếu hoặc cũ hơn bản pin: cài khi bấm Install. Máy **mới hơn** bản pin: bỏ qua, không hạ cấp.
- Silent: `MeiliPilot-Setup.exe /install /quiet`
- MSI nằm trong bundle; `%AppData%\MeiliPilot` giữ khi nâng cấp app.

---

## 2. Kết nối

Màn đầu tiên: **kết nối instance**.

| Field | Ý nghĩa |
|---|---|
| Tên session | Tên gợi nhớ, ví dụ `local` |
| Host | URL Meilisearch, ví dụ `http://127.0.0.1:7700` |
| API key / master key | Key có quyền tương ứng màn bạn sẽ dùng |

Bấm **Lưu và kết nối**. Session được lưu trên máy (Go process / profile), **không** nhét key vào `localStorage` trình duyệt.

- Session đã lưu: **Kết nối** / **Sửa** / **Xóa**
- Đổi instance: sidebar → **Quản lý kết nối**, hoặc dropdown **Session**
- **Đăng xuất** xóa session hiện tại

**Quyền key**

- **Master key**: vào được **Keys** (tạo/xóa API key)
- Key thường / Default Admin: đủ Indexes, Documents, Search, Settings, Tasks — không quản lý `/keys`

---

## 3. Điều hướng

Sidebar trái: Dashboard, Indexes, Search, Multi-search, Tasks, Keys, Instance, Chat, Rules.

Nút **Quay lại** (mũi tên) nằm trên đầu nội dung:

- Màn trong sidebar (trừ Dashboard) → về Dashboard
- Chi tiết index → về danh sách Indexes
- Documents / Search / Settings của index → về trang index đó
- Chi tiết task → về Tasks

---

## 4. Dashboard

Health, version, kích thước DB, bảng index (số documents, đang indexing). Bấm uid index để vào chi tiết.

---

## 5. Indexes

**Danh sách**

- Tạo index: nhập `uid` + `primaryKey` → **Tạo**
- **Swap** hai uid (đổi chỗ dữ liệu hai index)
- **Xóa** index (xác nhận)

**Chi tiết index** (`Indexes` → bấm uid)

Tab: **Overview** | **Documents** | **Search** | **Settings**

- Overview: cập nhật primary key, **Compact**, stats, fields
- Documents: xem / lọc / import / xóa
- Search: playground search của index đó
- Settings: 22 group cấu hình index

---

## 6. Documents

Vào: **Indexes → uid → Documents**.

- Ô **filter** + **Lọc** (cú pháp filter Meilisearch)
- Tick chọn → **Xóa đã chọn**
- **Xóa theo filter** / **Xóa tất cả** (gõ lại uid để xác nhận)
- **Import JSON array**: dán mảng document, chọn Replace (`PUT`) hoặc Update (`POST`)
- **Edit by function (RHAI)**: sửa hàng loạt theo script

Document không có field `id`/`uid` thì checkbox xóa theo id sẽ trống — cần primary key đúng.

---

## 7. Settings (theo index)

Vào: **Indexes → uid → Settings**.

Mỗi group một card. Badge **dirty** = đã sửa chưa lưu.

| Thao tác | Hành vi |
|---|---|
| **Lưu thay đổi** | `PATCH` **chỉ** field đã đổi |
| **Reset** trên card | `DELETE` một setting về default Meilisearch |
| **Reset all** | Xóa toàn bộ settings (gõ lại uid) |

**Cách sửa nhanh**

- List (displayed / searchable / stop words…): một field một dòng
- Ranking rules: ↑ ↓ để đổi thứ tự, **Thêm rule** (ví dụ `release_date:desc`)
- JSON (synonyms, filterable, embedders, foreign-keys): phải JSON hợp lệ mới lưu được
- Typo / faceting / pagination / chat: form sẵn

**Lưu ý embedders:** API key Meilisearch trả về dạng redacted (`***`). Đừng bấm Lưu group đó trừ khi bạn **set key mới** — PATCH lại chuỗi `*` sẽ làm hỏng cấu hình.

---

## 8. Search và Multi-search

**Search** (sidebar hoặc tab trên index)

- Chọn index, nhập `q`, Enter hoặc **Search**
- Filter, sort (`attr:asc,attr:desc`), facets, matching strategy
- Tick ranking score / highlight
- Bấm giá trị facet để gắn filter
- **Similar** (cần embedder) / **Facet search**

**Multi-search:** nhiều query (indexUid + q), tuỳ chọn federation → **Chạy**.

Search dùng **POST**, không dùng GET search.

---

## 9. Tasks (tiến trình)

Mọi ghi dữ liệu hiện ở đây.

**Bảng task**

| Cột | Ý nghĩa |
|---|---|
| uid | Mã task |
| status | `enqueued` → `processing` → `succeeded` / `failed` / `canceled` |
| tiến trình | Hàng đợi, % documents (`indexed/received`), % batch, hoặc thanh chạy khi chưa có số |
| duration | Thời gian xử lý (ISO duration, hiện `ms`/`s`) |
| **Chi tiết** | Mở trang task |

App **tự refresh mỗi 1 giây** khi còn task đang chạy.

**Chi tiết task**

- Thanh tiến trình + bước batch (nếu có)
- enqueued / started / finished
- Lỗi nếu `failed`
- **Hủy task** khi còn `enqueued` hoặc `processing`
- Details + raw JSON

**Hàng loạt**

- **Cancel enqueued**: hủy task đang chờ / đang chạy
- **Xóa finished**: xóa task đã xong khỏi lịch sử
- **Compact queue**: thu gọn hàng đợi trên disk

Phần **batch**: Meilisearch gom task tương thích; cột tiến trình lấy từ `GET /batches` khi task đang xử lý.

---

## 10. Keys

Cần **master key**.

- Tạo key: name, indexes (`*` hoặc danh sách), tick actions → **Tạo**
- Key **chỉ hiện một lần** lúc tạo — copy ngay
- Sửa name / xóa key

---

## 11. Instance

- **Dump / Snapshot**: backup
- **Export**: đẩy sang remote URL
- **Webhooks**: URL nhận sự kiện
- **Experimental**: bật/tắt feature flag
- **Network**: JSON topology
- **Logs stderr**: mức `debug` / `info`
- **Render template**: thử document template

---

## 12. Chat và Rules

**Chat:** workspace Meilisearch Chat. Nhập uid → **Mở** / **Lưu settings**. Tạo workspace = PATCH settings với uid mới. Stream completions gắn sau (Task 12).

**Rules:** dynamic search rules. Upsert JSON theo uid, xóa một rule hoặc tất cả.

---

## 13. Lỗi thường gặp

| Hiện tượng | Cách xử |
|---|---|
| Không kết nối được | Meilisearch chưa chạy; sai host; firewall |
| 401 / missing authorization | Sai API key hoặc key thiếu quyền |
| Vào Keys bị lỗi | Đang dùng key thường — cần master key |
| Settings lưu fail JSON | Sửa JSON đỏ trên card rồi Lưu lại |
| Task `failed` | Vào **Chi tiết**, đọc `error.message` + `code` |
| Nút Lưu settings mờ | Không có field dirty — chưa sửa gì |
| Embedder hỏng sau Lưu | Đã PATCH `apiKey` redacted — set lại key thật |

---

## 14. Test (dev)

```bash
go test ./...
cd frontend && npm test
```
